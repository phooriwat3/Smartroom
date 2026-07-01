const crypto = require("crypto");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "sutsmartbus-495306";
const DATABASE_ID = "ai-studio-28114784-a066-482c-9738-dfb6c9d68ce0";
const BOOTSTRAP_SUPER_ADMINS = [
  { id: "admin1", username: "admin", password: "123", role: "SUPER_ADMIN" },
];
const BOOTSTRAP_ADMINS = [
  ...BOOTSTRAP_SUPER_ADMINS,
  { id: "approver1", username: "approver", password: "123", role: "APPROVER" },
];

admin.initializeApp();
const db = getFirestore(DATABASE_ID);
const DEFAULT_YAGEO_EMAIL_DOMAIN = "yageo.com";
const TOKEN_BYTES = 32;
const TOKEN_TTL_AFTER_END_MS = 24 * 60 * 60 * 1000;
const EMAIL_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const CHECK_IN_WINDOW_BEFORE_MS = 15 * 60 * 1000;
const CHECK_IN_WINDOW_AFTER_MS = 15 * 60 * 1000;
const POWER_AUTOMATE_VERIFICATION_FLOW_URL = defineSecret("POWER_AUTOMATE_VERIFICATION_FLOW_URL");
const DEFAULT_APP_BASE_URL = "https://tokinsmartroom-495306.web.app/";
const LEGACY_APP_BASE_URLS = new Set([
  "https://tokinsmartroom.web.app",
  "https://sutsmartbus-495306.web.app",
]);
const APP_BASE_URL = getConfiguredAppBaseUrl();
const APP_CORS_ORIGINS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/,
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^https:\/\/.*\.web\.app$/,
  /^https:\/\/.*\.firebaseapp\.com$/,
  APP_BASE_URL || null,
].filter(Boolean);
const APP_HTTPS_OPTIONS = {
  region: "us-central1",
  invoker: "public",
  cors: APP_CORS_ORIGINS,
};
const EMAIL_HTTPS_OPTIONS = {
  ...APP_HTTPS_OPTIONS,
  secrets: [POWER_AUTOMATE_VERIFICATION_FLOW_URL],
};

function isLocalOrLegacyAppUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol !== "https:" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
      LEGACY_APP_BASE_URLS.has(url.origin);
  } catch (error) {
    return true;
  }
}

function getConfiguredAppBaseUrl() {
  const configuredUrl = (process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || DEFAULT_APP_BASE_URL).trim().replace(/\/+$/, "");
  return isLocalOrLegacyAppUrl(configuredUrl) ? DEFAULT_APP_BASE_URL.replace(/\/+$/, "") : configuredUrl;
}

function getYageoEmailDomain() {
  return (process.env.YAGEO_EMAIL_DOMAIN || DEFAULT_YAGEO_EMAIL_DOMAIN).toLowerCase();
}

function assertYageoEmail(value) {
  const email = assertString(value, "email").toLowerCase();
  const domain = getYageoEmailDomain().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^[^\\s@]+@${domain}$`, "i");

  if (!pattern.test(email) || email.length > 254) {
    throw new HttpsError("invalid-argument", `email must be a valid @${getYageoEmailDomain()} address.`);
  }

  return email;
}

function createToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function constantTimeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch (error) {
    return false;
  }
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTokenExpiresAt(bookingData) {
  const endTime = toDate(bookingData.endTime);
  const fallback = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const expiryMs = endTime ? endTime.getTime() + TOKEN_TTL_AFTER_END_MS : fallback;
  return new Date(Math.max(Date.now() + TOKEN_TTL_AFTER_END_MS, expiryMs));
}

function getCheckInWindow(booking) {
  const startTime = toDate(booking.startTime);
  if (!startTime) return null;

  return {
    startTime,
    opensAt: new Date(startTime.getTime() - CHECK_IN_WINDOW_BEFORE_MS),
    closesAt: new Date(startTime.getTime() + CHECK_IN_WINDOW_AFTER_MS),
  };
}

function getCheckInWindowState(booking, nowMs = Date.now()) {
  const window = getCheckInWindow(booking);
  if (!window) {
    return { state: "invalid", window: null };
  }

  if (nowMs < window.opensAt.getTime()) {
    return { state: "too-early", window };
  }

  if (nowMs > window.closesAt.getTime()) {
    return { state: "expired", window };
  }

  return { state: "active", window };
}

function buildMissedCheckInArchive(bookingId, booking) {
  return {
    ...booking,
    id: bookingId,
    originalBookingId: bookingId,
    originalStatus: booking.status || "",
    status: "MISSED_CHECK_IN",
    missedCheckInAt: FieldValue.serverTimestamp(),
    archivedAt: FieldValue.serverTimestamp(),
    archivedReason: "Missed check-in window",
    archivedFromPath: `bookings/${bookingId}`,
    createdAt: booking.createdAt || FieldValue.serverTimestamp(),
  };
}

function archiveMissedCheckInInTransaction(transaction, bookingRef, historyRef, bookingId, booking) {
  transaction.set(historyRef, buildMissedCheckInArchive(bookingId, booking), { merge: true });
  transaction.delete(bookingRef);
}

async function archiveMissedCheckInById(bookingId) {
  const bookingRef = db.collection("bookings").doc(bookingId);
  const historyRef = db.collection("missedCheckInHistory").doc(bookingId);

  let archived = false;
  await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    const historySnap = await transaction.get(historyRef);
    if (!bookingSnap.exists) {
      archived = historySnap.exists;
      return;
    }

    const booking = bookingSnap.data() || {};
    if (booking.status === "REJECTED" || booking.status === "VERIFIED" || booking.actualStartTime) {
      return;
    }

    const checkInWindow = getCheckInWindowState(booking);
    if (checkInWindow.state !== "expired") {
      return;
    }

    archiveMissedCheckInInTransaction(transaction, bookingRef, historyRef, bookingId, booking);
    archived = true;
  });

  return archived;
}

function getOriginFromCallable() {
  return APP_BASE_URL;
}

function buildVerifyUrl(origin, bookingId, token) {
  if (!origin) {
    throw new HttpsError("failed-precondition", "APP_BASE_URL is required when the request origin is unavailable.");
  }

  const url = new URL("/verify", origin);
  url.searchParams.set("bookingId", bookingId);
  url.searchParams.set("token", token);
  return url.toString();
}

function canonicalizeVerifyUrl(value, bookingId) {
  const rawUrl = typeof value === "string" && value.trim() ? value.trim() : "";
  if (!rawUrl) {
    throw new HttpsError("failed-precondition", "Verification URL is missing.");
  }

  try {
    const url = new URL(rawUrl);
    const token = url.searchParams.get("token");
    if (!token) {
      throw new Error("Verification token is missing.");
    }
    return buildVerifyUrl(APP_BASE_URL, bookingId, token);
  } catch (error) {
    throw new HttpsError("failed-precondition", "Verification URL is invalid.");
  }
}

function serializeDate(value) {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

function formatDateTimeForEmail(value) {
  const date = toDate(value);
  if (!date) return "";

  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildVerificationEmailPayload(email, bookingId, verifyUrl, booking) {
  const title = booking.title || "TOKIN Smart Room booking";
  const startTime = formatDateTimeForEmail(booking.startTime);
  const endTime = formatDateTimeForEmail(booking.endTime);
  const checkInWindow = getCheckInWindow(booking);
  const checkInOpensAt = checkInWindow ? formatDateTimeForEmail(checkInWindow.opensAt) : "";
  const checkInClosesAt = checkInWindow ? formatDateTimeForEmail(checkInWindow.closesAt) : "";

  return {
    to: email,
    subject: `[TOKIN Smart Room] Verify booking ${bookingId}`,
    senderName: "TOKIN Smart Room",
    message: [
      '<div style="margin:0;padding:24px;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">',
      '<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #fed7aa;border-radius:14px;overflow:hidden;">',
      '<div style="background:#f97316;padding:22px 26px;color:#ffffff;">',
      '<div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">TOKIN Smart Room</div>',
      '<div style="font-size:24px;line-height:30px;font-weight:800;margin-top:6px;">Booking Verification</div>',
      '</div>',
      '<div style="padding:26px;">',
      '<p style="margin:0 0 14px;font-size:15px;line-height:22px;">Hello,</p>',
      '<p style="margin:0 0 20px;font-size:15px;line-height:22px;">Please verify your TOKIN Smart Room booking by pressing the button below during the allowed check-in window. This confirms the booking and records your check-in.</p>',
      '<div style="border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;padding:18px;margin:0 0 22px;">',
      `<div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:12px;">${escapeHtml(title)}</div>`,
      '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;line-height:20px;">',
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Booking ID</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(bookingId)}</td></tr>`,
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Organizer</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(booking.organizer || "-")}</td></tr>`,
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Department</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(booking.department || "-")}</td></tr>`,
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Desk</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(booking.deskNumber || "-")}</td></tr>`,
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Time</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(startTime)} - ${escapeHtml(endTime)}</td></tr>`,
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Check-in window</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(checkInOpensAt)} - ${escapeHtml(checkInClosesAt)}</td></tr>`,
      '</table>',
      '</div>',
      '<div style="text-align:center;margin:26px 0;">',
      `<a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:13px 26px;border-radius:10px;">Verify Booking</a>`,
      '</div>',
      '<div style="background:#ffffff;border:1px solid #fdba74;border-radius:10px;padding:12px 14px;margin:0 0 18px;color:#9a3412;font-size:13px;line-height:19px;">',
      'For security, only use this email for your own booking. Do not forward the verification link.',
      '</div>',
      '<p style="margin:0 0 8px;font-size:12px;line-height:18px;color:#64748b;">If the button does not work, copy and paste this URL into your browser:</p>',
      `<p style="margin:0;font-size:12px;line-height:18px;word-break:break-all;color:#c2410c;">${escapeHtml(verifyUrl)}</p>`,
      '</div>',
      '<div style="padding:16px 26px;background:#fff7ed;border-top:1px solid #fed7aa;color:#9a3412;font-size:12px;line-height:18px;">',
      'This is an automated message from TOKIN Smart Room.',
      '</div>',
      '</div>',
      '</div>',
    ].join(""),
  };
}

function buildEmailConfigError(kind, adminMessage) {
  const publicMessage = "Verification email service is not configured. Please contact an administrator.";
  return new HttpsError("failed-precondition", publicMessage, {
    code: kind,
    missingEnv: kind === "email-service-not-configured" ? "POWER_AUTOMATE_VERIFICATION_FLOW_URL" : undefined,
    invalidEnv: kind === "email-service-invalid-url" ? "POWER_AUTOMATE_VERIFICATION_FLOW_URL" : undefined,
    adminMessage,
    setup: "Set Firebase Functions secret POWER_AUTOMATE_VERIFICATION_FLOW_URL to the Power Automate HTTP trigger URL, then redeploy functions.",
  });
}

function getPowerAutomateFlowUrl() {
  let secretValue = "";
  try {
    secretValue = POWER_AUTOMATE_VERIFICATION_FLOW_URL.value() || "";
  } catch (error) {
    if (!process.env.POWER_AUTOMATE_VERIFICATION_FLOW_URL) {
      console.warn("Could not read POWER_AUTOMATE_VERIFICATION_FLOW_URL secret", {
        message: error && error.message,
      });
    }
  }

  const flowUrl = (secretValue || process.env.POWER_AUTOMATE_VERIFICATION_FLOW_URL || "").trim();
  if (!flowUrl) {
    throw buildEmailConfigError(
      "email-service-not-configured",
      "POWER_AUTOMATE_VERIFICATION_FLOW_URL is missing. Set it as a Firebase Functions secret for production or in functions/.env for local development."
    );
  }

  let parsed;
  try {
    parsed = new URL(flowUrl);
  } catch (error) {
    throw buildEmailConfigError(
      "email-service-invalid-url",
      "POWER_AUTOMATE_VERIFICATION_FLOW_URL is not a valid URL."
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw buildEmailConfigError(
      "email-service-invalid-url",
      "POWER_AUTOMATE_VERIFICATION_FLOW_URL must be an HTTP(S) URL."
    );
  }

  return flowUrl;
}

function getEmailFailureCode(error) {
  if (error && error.details && typeof error.details.code === "string") {
    return error.details.code;
  }
  if (error && typeof error.code === "string") {
    return error.code;
  }
  return "";
}

function getEmailFailureMessage(error) {
  if (error && error.details && typeof error.details.adminMessage === "string") {
    return error.details.adminMessage;
  }
  if (error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}

async function sendPowerAutomateEmail(payload) {
  const flowUrl = getPowerAutomateFlowUrl();

  let response;
  try {
    response = await fetch(flowUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Power Automate email flow request failed", {
      message: error && error.message,
      stack: error && error.stack,
    });
    throw new HttpsError("unavailable", "Power Automate email flow request failed.", {
      reason: error && error.message ? error.message : String(error),
    });
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const details = {
      status: response.status,
      statusText: response.statusText,
      body: body.slice(0, 1000),
    };
    console.error("Power Automate email flow failed", {
      ...details,
      payload: {
        to: payload.to,
        subject: payload.subject,
        senderName: payload.senderName,
      },
    });
    throw new HttpsError("unavailable", "Power Automate email flow did not accept the request.", details);
  }
}

async function getRoomName(roomId) {
  if (!roomId || typeof roomId !== "string") return "";

  try {
    const roomSnap = await db.collection("rooms").doc(roomId).get();
    if (roomSnap.exists) {
      const room = roomSnap.data() || {};
      return typeof room.name === "string" ? room.name : "";
    }
  } catch (error) {
    console.warn("Could not resolve room name for email history", {
      roomId,
      message: error && error.message,
    });
  }

  return "";
}

async function recordEmailSentHistory(history) {
  const historyRef = db.collection("emailSentHistory").doc();
  await historyRef.set({
    id: historyRef.id,
    recipientEmail: history.recipientEmail || "",
    recipientName: history.recipientName || "",
    subject: history.subject || "",
    purpose: history.purpose || "Email",
    sentAt: FieldValue.serverTimestamp(),
    status: history.status,
    relatedBookingId: history.relatedBookingId || "",
    relatedBookingTitle: history.relatedBookingTitle || "",
    relatedRoomId: history.relatedRoomId || "",
    relatedRoomName: history.relatedRoomName || "",
    errorCode: history.errorCode || "",
    errorMessage: history.errorMessage || "",
    createdAt: FieldValue.serverTimestamp(),
  });
  return historyRef.id;
}

function serializeEmailHistoryRecord(snap) {
  const data = snap.data() || {};
  return {
    id: data.id || snap.id,
    recipientEmail: data.recipientEmail || "",
    recipientName: data.recipientName || "",
    subject: data.subject || "",
    purpose: data.purpose || "",
    sentAt: serializeDate(data.sentAt || data.createdAt),
    status: data.status || "",
    relatedBookingId: data.relatedBookingId || "",
    relatedBookingTitle: data.relatedBookingTitle || "",
    relatedRoomId: data.relatedRoomId || "",
    relatedRoomName: data.relatedRoomName || "",
    errorCode: data.errorCode || "",
    errorMessage: data.errorMessage || "",
    createdAt: serializeDate(data.createdAt),
  };
}

async function dispatchVerificationEmailForBooking(bookingId, booking) {
  if (!booking || typeof booking !== "object") {
    throw new HttpsError("invalid-argument", "booking is required.");
  }

  if (booking.status !== "CONFIRMED" || booking.actualStartTime) {
    return { success: false, bookingId, skipped: true };
  }

  const email = typeof booking.email === "string" ? booking.email.toLowerCase() : "";
  if (!email) {
    throw new HttpsError("failed-precondition", "Booking email is missing.");
  }

  const verifyUrl = canonicalizeVerifyUrl(booking.verifyUrl, bookingId);

  const emailPayload = buildVerificationEmailPayload(email, bookingId, verifyUrl, booking);
  const roomName = await getRoomName(booking.roomId);
  const historyBase = {
    recipientEmail: email,
    recipientName: booking.organizer || "",
    subject: emailPayload.subject,
    purpose: "Booking Verification",
    relatedBookingId: bookingId,
    relatedBookingTitle: booking.title || "",
    relatedRoomId: booking.roomId || "",
    relatedRoomName: roomName,
  };

  try {
    await sendPowerAutomateEmail(emailPayload);
  } catch (error) {
    await Promise.all([
      db.collection("bookings").doc(bookingId).update({
        verificationEmailStatus: "failed",
        verificationEmailFailedAt: FieldValue.serverTimestamp(),
        verifyUrl,
      }),
      recordEmailSentHistory({
        ...historyBase,
        status: "failed",
        errorCode: getEmailFailureCode(error),
        errorMessage: getEmailFailureMessage(error),
      }),
    ]);
    throw error;
  }

  await Promise.all([
    db.collection("bookings").doc(bookingId).update({
      verificationEmailStatus: "sent",
      verificationEmailSentAt: FieldValue.serverTimestamp(),
      verifyUrl,
    }),
    recordEmailSentHistory({
      ...historyBase,
      status: "successful",
    }),
  ]);

  return {
    success: true,
    bookingId,
    email,
    verifyUrl,
    status: "sent",
  };
}

async function recordVerificationEmailSetupFailure(bookingRef, bookingId, booking, email, error) {
  const roomName = await getRoomName(booking.roomId);
  await Promise.all([
    bookingRef.update({
      verificationEmailStatus: "failed",
      verificationEmailFailedAt: FieldValue.serverTimestamp(),
      verificationEmailFailureCode: getEmailFailureCode(error),
      verificationEmailFailureMessage: getEmailFailureMessage(error),
    }),
    recordEmailSentHistory({
      recipientEmail: email,
      recipientName: booking.organizer || "",
      subject: "Booking Verification",
      purpose: "Booking Verification",
      relatedBookingId: bookingId,
      relatedBookingTitle: booking.title || "",
      relatedRoomId: booking.roomId || "",
      relatedRoomName: roomName,
      status: "failed",
      errorCode: getEmailFailureCode(error),
      errorMessage: getEmailFailureMessage(error),
    }),
  ]);
}

function assertString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpsError("invalid-argument", `${name} is required.`);
  }
  return value.trim();
}

function assertDocumentId(value, name) {
  const id = assertString(value, name);
  if (id.includes("/") || id.length > 1500) {
    throw new HttpsError("invalid-argument", `${name} is not a valid Firestore document ID.`);
  }
  return id;
}

function normalizeId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getAuthEmail(request) {
  return request &&
    request.auth &&
    request.auth.token &&
    typeof request.auth.token.email === "string"
    ? request.auth.token.email
    : "";
}

function normalizeAdminRoleValue(value) {
  const normalized = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (normalized === "APPROVER") return "APPROVER";
  return "";
}

async function isFirebaseSuperAdminAuth(request) {
  if (!request || !request.auth) return false;

  const token = request.auth.token || {};
  if (token.super_admin === true || normalizeAdminRoleValue(token.role) === "SUPER_ADMIN") {
    return true;
  }

  const email = getAuthEmail(request);
  if (email === "phooriwat456@gmail.com") return true;

  const candidateIds = [
    normalizeId(request.auth.uid),
    normalizeId(email),
  ].filter(Boolean);

  for (const candidateId of [...new Set(candidateIds)]) {
    const snap = await db.collection("admins").doc(candidateId).get();
    if (snap.exists && normalizeAdminRoleValue((snap.data() || {}).role) === "SUPER_ADMIN") {
      return true;
    }
  }

  if (email) {
    const querySnap = await db
      .collection("admins")
      .where("username", "==", email)
      .limit(1)
      .get();
    if (!querySnap.empty && normalizeAdminRoleValue((querySnap.docs[0].data() || {}).role) === "SUPER_ADMIN") {
      return true;
    }
  }

  return false;
}

async function isFirebaseAdminAuth(request) {
  if (!request || !request.auth) return false;

  const email = getAuthEmail(request);
  if (email === "phooriwat456@gmail.com") return true;

  const candidateIds = [
    normalizeId(request.auth.uid),
    normalizeId(email),
  ].filter(Boolean);

  for (const candidateId of [...new Set(candidateIds)]) {
    const snap = await db.collection("admins").doc(candidateId).get();
    if (snap.exists) return true;
  }

  if (email) {
    const querySnap = await db
      .collection("admins")
      .where("username", "==", email)
      .limit(1)
      .get();
    if (!querySnap.empty) return true;
  }

  return false;
}

function isMatchingSuperAdmin(data, credentials) {
  return (
    data &&
    normalizeAdminRoleValue(data.role) === "SUPER_ADMIN" &&
    typeof data.password === "string" &&
    data.password === credentials.password &&
    typeof data.username === "string" &&
    data.username === credentials.username
  );
}

function isMatchingAdmin(data, credentials) {
  return (
    data &&
    normalizeAdminRoleValue(data.role) &&
    typeof data.password === "string" &&
    data.password === credentials.password &&
    typeof data.username === "string" &&
    data.username === credentials.username
  );
}

function findBootstrapSuperAdmin(credentials) {
  return BOOTSTRAP_SUPER_ADMINS.find((user) => (
    normalizeAdminRoleValue(user.role) === "SUPER_ADMIN" &&
    user.username === credentials.username &&
    user.password === credentials.password &&
    (
      credentials.id === user.id ||
      credentials.firestoreDocId === user.id ||
      credentials.username === user.username
    )
  )) || null;
}

function findBootstrapAdmin(credentials) {
  return BOOTSTRAP_ADMINS.find((user) => (
    normalizeAdminRoleValue(user.role) &&
    user.username === credentials.username &&
    user.password === credentials.password &&
    (
      credentials.id === user.id ||
      credentials.firestoreDocId === user.id ||
      credentials.username === user.username
    )
  )) || null;
}

async function findSuperAdmin(credentials) {
  const bootstrapUser = findBootstrapSuperAdmin(credentials);
  if (bootstrapUser) {
    return { docId: bootstrapUser.id, data: bootstrapUser, source: "bootstrap" };
  }

  const candidateIds = [
    normalizeId(credentials.firestoreDocId),
    normalizeId(credentials.id),
    normalizeId(credentials.username),
  ].filter(Boolean);

  for (const candidateId of [...new Set(candidateIds)]) {
    const snap = await db.collection("admins").doc(candidateId).get();
    if (snap.exists && isMatchingSuperAdmin(snap.data(), credentials)) {
      return { docId: snap.id, data: snap.data(), source: "firestore" };
    }
  }

  const querySnap = await db
    .collection("admins")
    .where("username", "==", credentials.username)
    .limit(1)
    .get();

  if (!querySnap.empty) {
    const snap = querySnap.docs[0];
    if (isMatchingSuperAdmin(snap.data(), credentials)) {
      return { docId: snap.id, data: snap.data(), source: "firestore" };
    }
  }

  return null;
}

async function findAdmin(credentials) {
  const bootstrapUser = findBootstrapAdmin(credentials);
  if (bootstrapUser) {
    return { docId: bootstrapUser.id, data: bootstrapUser, source: "bootstrap" };
  }

  const candidateIds = [
    normalizeId(credentials.firestoreDocId),
    normalizeId(credentials.id),
    normalizeId(credentials.username),
  ].filter(Boolean);

  for (const candidateId of [...new Set(candidateIds)]) {
    const snap = await db.collection("admins").doc(candidateId).get();
    if (snap.exists && isMatchingAdmin(snap.data(), credentials)) {
      return { docId: snap.id, data: snap.data(), source: "firestore" };
    }
  }

  const querySnap = await db
    .collection("admins")
    .where("username", "==", credentials.username)
    .limit(1)
    .get();

  if (!querySnap.empty) {
    const snap = querySnap.docs[0];
    if (isMatchingAdmin(snap.data(), credentials)) {
      return { docId: snap.id, data: snap.data(), source: "firestore" };
    }
  }

  return null;
}

async function assertAdminAccess(request, data) {
  if (await isFirebaseAdminAuth(request)) {
    return { source: "firebase-auth" };
  }

  const adminUser = data.admin || {};
  const credentials = {
    id: normalizeId(adminUser.id),
    firestoreDocId: normalizeId(adminUser.firestoreDocId),
    username: assertString(adminUser.username, "admin.username"),
    password: assertString(adminUser.password, "admin.password"),
    role: normalizeAdminRoleValue(assertString(adminUser.role, "admin.role")),
  };

  if (credentials.role !== "SUPER_ADMIN" && credentials.role !== "APPROVER") {
    throw new HttpsError("permission-denied", "Only Admin users can access this operation.");
  }

  const verifiedAdmin = await findAdmin(credentials);
  if (!verifiedAdmin) {
    throw new HttpsError("permission-denied", "Admin credentials could not be verified.");
  }

  return verifiedAdmin;
}

function assertSafeDocumentId(value, name, maxLength = 128) {
  const id = assertDocumentId(value, name);
  if (id.length > maxLength || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new HttpsError("invalid-argument", `${name} is not a valid document ID.`);
  }
  return id;
}

function assertOptionalString(value, name, maxLength) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${name} must be a string.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new HttpsError("invalid-argument", `${name} is too long.`);
  }
  return normalized;
}

function assertRoomImageUrl(value) {
  const imageUrl = assertOptionalString(value, "room.imageUrl", 1000000);
  if (!imageUrl) return "";

  const isRemoteUrl = /^https?:\/\/\S{1,999980}$/i.test(imageUrl);
  const isDataImage = /^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(imageUrl);
  if (!isRemoteUrl && !isDataImage) {
    throw new HttpsError("invalid-argument", "room.imageUrl must be an HTTP(S) URL or a supported image data URL.");
  }

  return imageUrl;
}

function sanitizeRoomMaintenanceRecord(rawRecord, room) {
  if (!rawRecord || typeof rawRecord !== "object") return null;

  const id = assertSafeDocumentId(rawRecord.id, "maintenanceRecord.id", 180);
  const roomId = assertSafeDocumentId(rawRecord.roomId || room.id, "maintenanceRecord.roomId");
  if (roomId !== room.id) {
    throw new HttpsError("invalid-argument", "maintenanceRecord.roomId must match room.id.");
  }

  const startDate = assertString(rawRecord.startDate, "maintenanceRecord.startDate");
  const endDate = assertString(rawRecord.endDate, "maintenanceRecord.endDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
    throw new HttpsError("invalid-argument", "maintenanceRecord date range is invalid.");
  }

  const startTime = Number(rawRecord.startTime);
  const endTime = Number(rawRecord.endTime);
  if (
    !Number.isInteger(startTime) ||
    !Number.isInteger(endTime) ||
    startTime < 0 ||
    endTime > 24 ||
    endTime <= startTime
  ) {
    throw new HttpsError("invalid-argument", "maintenanceRecord time range is invalid.");
  }

  return {
    id,
    roomId,
    roomName: assertOptionalString(rawRecord.roomName || room.name, "maintenanceRecord.roomName", 200),
    reason: assertString(rawRecord.reason, "maintenanceRecord.reason").slice(0, 200),
    startDate,
    endDate,
    startTime,
    endTime,
  };
}

function sanitizeRoom(rawRoom) {
  if (!rawRoom || typeof rawRoom !== "object") {
    throw new HttpsError("invalid-argument", "room is required.");
  }

  const id = assertSafeDocumentId(rawRoom.id, "room.id");
  const name = assertString(rawRoom.name, "room.name");
  if (name.length > 200) {
    throw new HttpsError("invalid-argument", "room.name is too long.");
  }

  const type = assertString(rawRoom.type, "room.type");
  if (!["Meeting Room", "Reception Area", "Training Room"].includes(type)) {
    throw new HttpsError("invalid-argument", "room.type is invalid.");
  }

  const capacity = Number(rawRoom.capacity);
  if (!Number.isFinite(capacity) || capacity <= 0 || capacity > 1000) {
    throw new HttpsError("invalid-argument", "room.capacity is invalid.");
  }

  const amenities = Array.isArray(rawRoom.amenities)
    ? rawRoom.amenities
      .slice(0, 20)
      .map((item) => assertOptionalString(item, "room.amenities[]", 100))
      .filter(Boolean)
    : [];

  const isClosed = rawRoom.isClosed === true;
  const closureStartDate = assertOptionalString(rawRoom.closureStartDate, "room.closureStartDate", 10);
  const closureEndDate = assertOptionalString(rawRoom.closureEndDate, "room.closureEndDate", 10);
  const closureStartTime = Number(rawRoom.closureStartTime ?? 7);
  const closureEndTime = Number(rawRoom.closureEndTime ?? 19);

  if (
    !Number.isInteger(closureStartTime) ||
    !Number.isInteger(closureEndTime) ||
    closureStartTime < 0 ||
    closureEndTime > 24 ||
    closureEndTime <= closureStartTime
  ) {
    throw new HttpsError("invalid-argument", "room closure time range is invalid.");
  }

  if (isClosed) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(closureStartDate) || !/^\d{4}-\d{2}-\d{2}$/.test(closureEndDate)) {
      throw new HttpsError("invalid-argument", "room closure date is required.");
    }
    if (closureEndDate < closureStartDate) {
      throw new HttpsError("invalid-argument", "room closure date range is invalid.");
    }
  }

  return {
    id,
    name,
    type,
    capacity,
    amenities,
    imageUrl: assertRoomImageUrl(rawRoom.imageUrl),
    isClosed,
    closureReason: assertOptionalString(rawRoom.closureReason, "room.closureReason", 200),
    closureStartDate,
    closureEndDate,
    closureStartTime,
    closureEndTime,
  };
}

exports.saveRoomAsAdmin = onCall(APP_HTTPS_OPTIONS, async (request) => {
  try {
    const data = request.data || {};
    await assertAdminAccess(request, data);

    const room = sanitizeRoom(data.room);
    const maintenanceRecord = sanitizeRoomMaintenanceRecord(data.maintenanceRecord, room);
    const roomRef = db.collection("rooms").doc(room.id);
    const maintenanceRef = maintenanceRecord
      ? db.collection("roomMaintenanceHistory").doc(maintenanceRecord.id)
      : null;

    await db.runTransaction(async (transaction) => {
      const existingSnap = await transaction.get(roomRef);
      const existingRoom = existingSnap.exists ? existingSnap.data() || {} : {};
      const existingHistory = Array.isArray(existingRoom.maintenanceHistory)
        ? existingRoom.maintenanceHistory.filter((item) => item && item.id !== (maintenanceRecord && maintenanceRecord.id)).slice(-99)
        : [];

      const embeddedHistory = maintenanceRecord
        ? [
          ...existingHistory,
          {
            ...maintenanceRecord,
            createdAt: new Date().toISOString(),
          },
        ]
        : existingHistory;

      transaction.set(roomRef, {
        ...room,
        maintenanceHistory: embeddedHistory,
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (maintenanceRecord && maintenanceRef) {
        transaction.set(maintenanceRef, {
          ...maintenanceRecord,
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    });

    return {
      success: true,
      roomId: room.id,
      imageStoredIn: "firestore.rooms.imageUrl",
    };
  } catch (error) {
    if (error instanceof HttpsError || typeof (error && error.code) === "string") {
      throw error;
    }

    console.error("saveRoomAsAdmin failed", {
      message: error && error.message,
      code: error && error.code,
      stack: error && error.stack,
    });

    throw new HttpsError(
      "internal",
      `Room save failed: ${error && error.message ? error.message : String(error)}`
    );
  }
});

function sanitizeAdminAccount(rawAdmin) {
  if (!rawAdmin || typeof rawAdmin !== "object") {
    throw new HttpsError("invalid-argument", "adminAccount is required.");
  }

  const id = rawAdmin.id
    ? assertSafeDocumentId(rawAdmin.id, "adminAccount.id")
    : assertSafeDocumentId(`admin_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`, "adminAccount.id");
  const username = assertString(rawAdmin.username, "adminAccount.username").trim();
  if (!username || username.length > 254) {
    throw new HttpsError("invalid-argument", "adminAccount.username is required and must be 254 characters or fewer.");
  }

  const password = assertString(rawAdmin.password, "adminAccount.password").trim();
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    throw new HttpsError("invalid-argument", "adminAccount.password must be at least 8 characters and include lowercase, uppercase, and a number.");
  }

  const employeeId = assertString(rawAdmin.employeeId, "adminAccount.employeeId").trim();
  if (!/^\d{7}$/.test(employeeId)) {
    throw new HttpsError("invalid-argument", "adminAccount.employeeId must be exactly 7 digits.");
  }

  const phone = assertString(rawAdmin.phone, "adminAccount.phone").trim();
  if (!/^\d{4}$/.test(phone)) {
    throw new HttpsError("invalid-argument", "adminAccount.phone must be exactly 4 digits.");
  }

  const department = assertString(rawAdmin.department, "adminAccount.department").trim();
  if (!department || department.length > 120) {
    throw new HttpsError("invalid-argument", "adminAccount.department is required and must be 120 characters or fewer.");
  }

  const role = normalizeAdminRoleValue(assertString(rawAdmin.role, "adminAccount.role"));
  if (role !== "SUPER_ADMIN" && role !== "APPROVER") {
    throw new HttpsError("invalid-argument", "adminAccount.role must be SUPER_ADMIN or APPROVER.");
  }

  return {
    id,
    username,
    password,
    role,
    employeeId,
    department,
    phone,
  };
}

exports.createAdminAccount = onCall(APP_HTTPS_OPTIONS, async (request) => {
  let adminAccount = null;
  try {
    const data = request.data || {};

    if (!(await isFirebaseSuperAdminAuth(request))) {
      const superAdmin = data.superAdmin || data.admin || {};
      const credentials = {
        id: normalizeId(superAdmin.id),
        firestoreDocId: normalizeId(superAdmin.firestoreDocId),
        username: assertString(superAdmin.username, "superAdmin.username"),
        password: assertString(superAdmin.password, "superAdmin.password"),
        role: normalizeAdminRoleValue(assertString(superAdmin.role, "superAdmin.role")),
      };

      if (credentials.role !== "SUPER_ADMIN") {
        throw new HttpsError("permission-denied", "Only Super Admin users can create Admin accounts.");
      }

      const verifiedSuperAdmin = await findSuperAdmin(credentials);
      if (!verifiedSuperAdmin) {
        throw new HttpsError("permission-denied", "Super Admin credentials could not be verified.");
      }
    }

    adminAccount = sanitizeAdminAccount(data.adminAccount || data.newAdmin || data.adminUser);
    const targetRef = db.collection("admins").doc(adminAccount.id);

    const [targetSnap, usernameSnap] = await Promise.all([
      targetRef.get(),
      db.collection("admins").where("username", "==", adminAccount.username).limit(1).get(),
    ]);

    if (targetSnap.exists) {
      throw new HttpsError("already-exists", `Admin document already exists: admins/${adminAccount.id}`);
    }

    if (!usernameSnap.empty) {
      throw new HttpsError("already-exists", `Admin username already exists: ${adminAccount.username}`);
    }

    await targetRef.set({
      ...adminAccount,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      created: true,
      admin: adminAccount,
      path: `admins/${adminAccount.id}`,
      projectId: PROJECT_ID,
      databaseId: DATABASE_ID,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    console.error("createAdminAccount failed", {
      message: error && error.message,
      code: error && error.code,
      stack: error && error.stack,
      adminId: adminAccount && adminAccount.id,
    });

    throw new HttpsError(
      "internal",
      `Admin create failed on the server: ${error && error.message ? error.message : String(error)}`,
      {
        code: error && error.code,
        message: error && error.message,
      }
    );
  }
});

exports.deleteAdminAccount = onCall(APP_HTTPS_OPTIONS, async (request) => {
  let targetAdminDocId = "";
  try {
    const data = request.data || {};
    targetAdminDocId = assertDocumentId(data.targetAdminDocId, "targetAdminDocId");

    let verifiedSuperAdmin = null;
    let credentials = {
      id: normalizeId(request.auth && request.auth.uid),
      firestoreDocId: normalizeId(request.auth && request.auth.uid),
      username: getAuthEmail(request),
      password: "",
      role: "SUPER_ADMIN",
    };

    if (await isFirebaseSuperAdminAuth(request)) {
      verifiedSuperAdmin = {
        docId: normalizeId(request.auth && request.auth.uid) || getAuthEmail(request),
        data: { username: getAuthEmail(request), role: "SUPER_ADMIN" },
        source: "firebase-auth",
      };
    } else {
      const superAdmin = data.superAdmin || {};
      credentials = {
        id: normalizeId(superAdmin.id),
        firestoreDocId: normalizeId(superAdmin.firestoreDocId),
        username: assertString(superAdmin.username, "superAdmin.username"),
        password: assertString(superAdmin.password, "superAdmin.password"),
        role: normalizeAdminRoleValue(assertString(superAdmin.role, "superAdmin.role")),
      };

      if (credentials.role !== "SUPER_ADMIN") {
        throw new HttpsError("permission-denied", "Only Super Admin users can delete Admin accounts.");
      }

      verifiedSuperAdmin = await findSuperAdmin(credentials);
      if (!verifiedSuperAdmin) {
        throw new HttpsError("permission-denied", "Super Admin credentials could not be verified.");
      }
    }

    if (
      targetAdminDocId === verifiedSuperAdmin.docId ||
      targetAdminDocId === credentials.id ||
      targetAdminDocId === credentials.username
    ) {
      throw new HttpsError("failed-precondition", "Super Admin users cannot delete their own account.");
    }

    const targetRef = db.collection("admins").doc(targetAdminDocId);
    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) {
      throw new HttpsError("not-found", `Admin document not found: admins/${targetAdminDocId}`);
    }

    const targetData = targetSnap.data() || {};
    if (normalizeAdminRoleValue(targetData.role) === "SUPER_ADMIN") {
      throw new HttpsError("failed-precondition", "Super Admin accounts are protected and cannot be deleted from this screen.");
    }

    await targetRef.delete();

    const verifySnap = await targetRef.get();
    if (verifySnap.exists) {
      throw new HttpsError("internal", `Admin document still exists after delete: admins/${targetAdminDocId}`);
    }

    return {
      deleted: true,
      path: `admins/${targetAdminDocId}`,
      collection: "admins",
      projectId: PROJECT_ID,
      databaseId: DATABASE_ID,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    console.error("deleteAdminAccount failed", {
      message: error && error.message,
      code: error && error.code,
      stack: error && error.stack,
      targetAdminDocId,
    });

    throw new HttpsError(
      "internal",
      `Admin delete failed on the server: ${error && error.message ? error.message : String(error)}`,
      {
        code: error && error.code,
        message: error && error.message,
        targetAdminDocId,
      }
    );
  }
});

exports.sendBookingVerificationEmail = onCall(EMAIL_HTTPS_OPTIONS, async (request) => {
  try {
    const data = request.data || {};
    const bookingId = assertDocumentId(data.bookingId, "bookingId");
    const email = assertYageoEmail(data.email);

    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      throw new HttpsError("not-found", `Booking document not found: bookings/${bookingId}`);
    }

    const booking = bookingSnap.data() || {};
    if (booking.status === "REJECTED" || booking.status === "NO_SHOW" || booking.status === "MISSED_CHECK_IN" || booking.status === "VERIFIED" || booking.actualStartTime) {
      throw new HttpsError("failed-precondition", "Only active bookings can receive verification email.");
    }

    const checkInWindow = getCheckInWindowState(booking);
    if (checkInWindow.state === "invalid") {
      throw new HttpsError("failed-precondition", "Booking start time is invalid.");
    }

    if (checkInWindow.state === "expired") {
      await archiveMissedCheckInById(bookingId);
      throw new HttpsError("deadline-exceeded", "The check-in window has expired and this booking has been released.");
    }

    const bookingEmail = typeof booking.email === "string" ? booking.email.toLowerCase() : "";
    if (bookingEmail !== email) {
      throw new HttpsError("permission-denied", "Verification email must match the booking email.");
    }

    const lastSentAt = toDate(booking.verificationEmailSentAt);
    if (lastSentAt && Date.now() - lastSentAt.getTime() < EMAIL_RESEND_COOLDOWN_MS) {
      throw new HttpsError("resource-exhausted", "Verification email was sent recently. Please wait before retrying.");
    }

    try {
      getPowerAutomateFlowUrl();
    } catch (configError) {
      await recordVerificationEmailSetupFailure(bookingRef, bookingId, booking, email, configError);
      throw configError;
    }

    const token = createToken();
    const tokenHash = hashToken(token);
    const tokenExpiresAt = getTokenExpiresAt(booking);
    const verifyUrl = buildVerifyUrl(getOriginFromCallable(), bookingId, token);
    const windowStart = checkInWindow.window.opensAt;
    const windowEnd = checkInWindow.window.closesAt;
    const shouldSendNow = checkInWindow.state === "active";

    await bookingRef.update({
      email,
      verificationTokenHash: tokenHash,
      verificationTokenCreatedAt: FieldValue.serverTimestamp(),
      verificationTokenExpiresAt: tokenExpiresAt,
      verificationEmailStatus: shouldSendNow ? "sending" : "queued",
      verificationEmailQueuedAt: FieldValue.serverTimestamp(),
      verificationEmailScheduledAt: windowStart,
      verificationWindowOpenedAt: windowStart,
      verificationWindowClosedAt: windowEnd,
      verifyUrl,
    });

    if (shouldSendNow) {
      const delivery = await dispatchVerificationEmailForBooking(bookingId, {
        ...booking,
        email,
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: tokenExpiresAt,
        verificationEmailStatus: "sending",
        verificationEmailScheduledAt: windowStart,
        verificationWindowOpenedAt: windowStart,
        verificationWindowClosedAt: windowEnd,
        verifyUrl,
      });

      return {
        ...delivery,
        scheduledAt: serializeDate(windowStart),
        windowStart: serializeDate(windowStart),
        windowEnd: serializeDate(windowEnd),
        sentAt: serializeDate(new Date()),
      };
    }

    return {
      success: true,
      bookingId,
      email,
      verifyUrl,
      status: "queued",
      scheduledAt: serializeDate(windowStart),
      windowStart: serializeDate(windowStart),
      windowEnd: serializeDate(windowEnd),
    };
  } catch (error) {
    if (error instanceof HttpsError || typeof (error && error.code) === "string") {
      throw error;
    }

    console.error("sendBookingVerificationEmail failed", {
      message: error && error.message,
      code: error && error.code,
      stack: error && error.stack,
    });

    throw new HttpsError(
      "internal",
      `Verification email failed: ${error && error.message ? error.message : String(error)}`
    );
  }
});

exports.processVerificationEmailQueue = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "Asia/Bangkok",
  region: "us-central1",
  secrets: [POWER_AUTOMATE_VERIFICATION_FLOW_URL],
}, async () => {
  const nowMs = Date.now();

  try {
    const [queuedSnap, activeSnap] = await Promise.all([
      db.collection("bookings")
        .where("verificationEmailStatus", "==", "queued")
        .get(),
      db.collection("bookings")
        .where("status", "==", "CONFIRMED")
        .get(),
    ]);

    for (const snap of queuedSnap.docs) {
      const booking = snap.data() || {};
      const windowState = getCheckInWindowState(booking, nowMs);
      if (windowState.state === "expired") {
        await archiveMissedCheckInById(snap.id);
        continue;
      }

      if (windowState.state !== "active") {
        continue;
      }

      const scheduledAt = toDate(booking.verificationEmailScheduledAt) || windowState.window.opensAt;
      if (nowMs < scheduledAt.getTime()) {
        continue;
      }

      await dispatchVerificationEmailForBooking(snap.id, booking);
    }

    for (const snap of activeSnap.docs) {
      const booking = snap.data() || {};
      const windowState = getCheckInWindowState(booking, nowMs);
      if (windowState.state === "expired") {
        await archiveMissedCheckInById(snap.id);
      }
    }
  } catch (error) {
    console.error("processVerificationEmailQueue failed", {
      message: error && error.message,
      code: error && error.code,
      stack: error && error.stack,
    });
    throw error;
  }
});

exports.listEmailSentHistory = onCall(APP_HTTPS_OPTIONS, async (request) => {
  try {
    const data = request.data || {};
    await assertAdminAccess(request, data);

    const limit = Number.isInteger(data.limit) && data.limit > 0 && data.limit <= 500
      ? data.limit
      : 200;
    const snap = await db
      .collection("emailSentHistory")
      .orderBy("sentAt", "desc")
      .limit(limit)
      .get();

    return {
      history: snap.docs.map(serializeEmailHistoryRecord),
    };
  } catch (error) {
    if (error instanceof HttpsError || typeof (error && error.code) === "string") {
      throw error;
    }

    console.error("listEmailSentHistory failed", {
      message: error && error.message,
      code: error && error.code,
      stack: error && error.stack,
    });

    throw new HttpsError(
      "internal",
      `Email history load failed: ${error && error.message ? error.message : String(error)}`
    );
  }
});

async function verifyBookingTokenInternal(bookingId, token) {
  const tokenHash = hashToken(assertString(token, "token"));
  const bookingRef = db.collection("bookings").doc(bookingId);
  const historyRef = db.collection("missedCheckInHistory").doc(bookingId);

  let result = null;
  await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    const historySnap = await transaction.get(historyRef);
    if (!bookingSnap.exists) {
      if (historySnap.exists) {
        result = {
          success: false,
          bookingId,
          expired: true,
          archived: true,
          errorCode: "deadline-exceeded",
          message: "The check-in window has expired and this booking has been released.",
        };
        return;
      }
      throw new HttpsError("not-found", `Booking document not found: bookings/${bookingId}`);
    }

    const booking = bookingSnap.data() || {};
    const storedTokenHash = booking.verificationTokenHash;
    if (!constantTimeEqualHex(storedTokenHash, tokenHash)) {
      throw new HttpsError("permission-denied", "Verification token is invalid.");
    }

    const expiresAt = toDate(booking.verificationTokenExpiresAt);
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      throw new HttpsError("deadline-exceeded", "Verification token has expired.");
    }

    if (booking.status === "REJECTED" || booking.status === "NO_SHOW" || booking.status === "MISSED_CHECK_IN") {
      throw new HttpsError("failed-precondition", "This booking can no longer be verified.");
    }

    const alreadyVerified = booking.status === "VERIFIED" || !!booking.actualStartTime;
    if (alreadyVerified) {
      result = {
        success: true,
        alreadyVerified,
        bookingId,
        status: "VERIFIED",
        roomId: booking.roomId || "",
        title: booking.title || "",
        organizer: booking.organizer || "",
        startTime: serializeDate(booking.startTime),
        endTime: serializeDate(booking.endTime),
      };
      return;
    }

    const checkInWindow = getCheckInWindowState(booking);
    if (checkInWindow.state === "invalid") {
      throw new HttpsError("failed-precondition", "Booking start time is invalid.");
    }

    if (checkInWindow.state === "too-early") {
      result = {
        success: false,
        bookingId,
        tooEarly: true,
        errorCode: "failed-precondition",
        message: "Check-in is not available yet. Please verify during the allowed check-in window.",
        checkInOpensAt: checkInWindow.window.opensAt.toISOString(),
        checkInClosesAt: checkInWindow.window.closesAt.toISOString(),
      };
      return;
    }

    if (checkInWindow.state === "expired") {
      archiveMissedCheckInInTransaction(transaction, bookingRef, historyRef, bookingId, booking);
      result = {
        success: false,
        bookingId,
        expired: true,
        archived: true,
        errorCode: "deadline-exceeded",
        message: "The check-in window has expired and this booking has been released.",
        checkInOpensAt: checkInWindow.window.opensAt.toISOString(),
        checkInClosesAt: checkInWindow.window.closesAt.toISOString(),
      };
      return;
    }

    const update = {
      status: "VERIFIED",
      verifiedAt: FieldValue.serverTimestamp(),
      verificationMethod: "qr",
      checkInWindowOpenedAt: checkInWindow.window.opensAt,
      checkInWindowClosedAt: checkInWindow.window.closesAt,
    };

    update.actualStartTime = FieldValue.serverTimestamp();

    transaction.update(bookingRef, update);

    result = {
      success: true,
      alreadyVerified,
      bookingId,
      status: "VERIFIED",
      roomId: booking.roomId || "",
      title: booking.title || "",
      organizer: booking.organizer || "",
      startTime: serializeDate(booking.startTime),
      endTime: serializeDate(booking.endTime),
    };
  });

  if (result && result.tooEarly) {
    throw new HttpsError("failed-precondition", result.message, {
      bookingId: result.bookingId,
      checkInOpensAt: result.checkInOpensAt,
      checkInClosesAt: result.checkInClosesAt,
    });
  }

  if (result && result.expired) {
    throw new HttpsError("deadline-exceeded", result.message, {
      bookingId: result.bookingId,
      archived: result.archived === true,
      checkInOpensAt: result.checkInOpensAt,
      checkInClosesAt: result.checkInClosesAt,
    });
  }

  return result;
}

exports.verifyBookingToken = onCall(APP_HTTPS_OPTIONS, async (request) => {
  try {
    const data = request.data || {};
    const bookingId = assertDocumentId(data.bookingId, "bookingId");
    const token = assertString(data.token, "token");
    return await verifyBookingTokenInternal(bookingId, token);
  } catch (error) {
    if (error instanceof HttpsError || typeof (error && error.code) === "string") {
      throw error;
    }

    console.error("verifyBookingToken failed", {
      message: error && error.message,
      code: error && error.code,
      stack: error && error.stack,
    });

    throw new HttpsError(
      "internal",
      `Booking verification failed: ${error && error.message ? error.message : String(error)}`
    );
  }
});

exports.verifyBooking = onRequest(APP_HTTPS_OPTIONS, async (request, response) => {
  try {
    const bookingId = assertDocumentId(request.query.bookingId || request.body && request.body.bookingId, "bookingId");
    const token = assertString(request.query.token || request.body && request.body.token, "token");
    const result = await verifyBookingTokenInternal(bookingId, token);
    response.status(200).json(result);
  } catch (error) {
    const status = error instanceof HttpsError && error.code === "not-found" ? 404 :
      error instanceof HttpsError && error.code === "permission-denied" ? 403 :
        error instanceof HttpsError && error.code === "deadline-exceeded" ? 410 : 400;

    response.status(status).json({
      success: false,
      error: error && error.message ? error.message : String(error),
    });
  }
});

exports.markBookingNoShow = onCall(APP_HTTPS_OPTIONS, async (request) => {
  try {
    const data = request.data || {};
    const bookingId = assertDocumentId(data.bookingId, "bookingId");
    const bookingRef = db.collection("bookings").doc(bookingId);
    const historyRef = db.collection("missedCheckInHistory").doc(bookingId);

    let result = null;
    await db.runTransaction(async (transaction) => {
      const bookingSnap = await transaction.get(bookingRef);
      const historySnap = await transaction.get(historyRef);
      if (!bookingSnap.exists) {
        if (historySnap.exists) {
          result = { success: true, bookingId, archived: true, alreadyArchived: true };
          return;
        }
        throw new HttpsError("not-found", `Booking document not found: bookings/${bookingId}`);
      }

      const booking = bookingSnap.data() || {};
      if (booking.status === "REJECTED" || booking.status === "VERIFIED" || booking.actualStartTime) {
        throw new HttpsError("failed-precondition", "This booking is not eligible for no-show marking.");
      }

      const startTime = toDate(booking.startTime);
      if (!startTime) {
        throw new HttpsError("failed-precondition", "Booking start time is invalid.");
      }

      const checkInWindow = getCheckInWindowState(booking);
      if (checkInWindow.state !== "expired") {
        throw new HttpsError("failed-precondition", "Booking is not past the no-show cutoff.");
      }

      archiveMissedCheckInInTransaction(transaction, bookingRef, historyRef, bookingId, booking);

      result = {
        success: true,
        bookingId,
        archived: true,
        alreadyArchived: historySnap.exists,
      };
    });

    return result;
  } catch (error) {
    if (error instanceof HttpsError || typeof (error && error.code) === "string") {
      throw error;
    }

    console.error("markBookingNoShow failed", {
      message: error && error.message,
      code: error && error.code,
      stack: error && error.stack,
    });

    throw new HttpsError(
      "internal",
      `No-show update failed: ${error && error.message ? error.message : String(error)}`
    );
  }
});

exports.deleteBookingAsAdmin = onCall(APP_HTTPS_OPTIONS, async (request) => {
  try {
    const data = request.data || {};
    await assertAdminAccess(request, data);

    const bookingId = assertDocumentId(data.bookingId, "bookingId");
    const bookingRef = db.collection("bookings").doc(bookingId);

    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      throw new HttpsError("not-found", `Booking document not found: bookings/${bookingId}`);
    }

    await bookingRef.delete();

    return {
      success: true,
      bookingId,
    };
  } catch (error) {
    if (error instanceof HttpsError || typeof (error && error.code) === "string") {
      throw error;
    }

    console.error("deleteBookingAsAdmin failed", {
      message: error && error.message,
      code: error && error.code,
      stack: error && error.stack,
    });

    throw new HttpsError(
      "internal",
      `Booking deletion failed: ${error && error.message ? error.message : String(error)}`
    );
  }
});

