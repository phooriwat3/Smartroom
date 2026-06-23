const crypto = require("crypto");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "sutsmartbus-495306";
const DATABASE_ID = "ai-studio-28114784-a066-482c-9738-dfb6c9d68ce0";
const BOOTSTRAP_SUPER_ADMINS = [
  { id: "admin1", username: "admin", password: "123", role: "SUPER_ADMIN" },
];

admin.initializeApp();
const db = getFirestore(DATABASE_ID);
const DEFAULT_YAGEO_EMAIL_DOMAIN = "yageo.com";
const TOKEN_BYTES = 32;
const TOKEN_TTL_AFTER_END_MS = 24 * 60 * 60 * 1000;
const EMAIL_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
const APP_BASE_URL = process.env.APP_BASE_URL || "";
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

function getOriginFromCallable(request, explicitOrigin) {
  if (APP_BASE_URL) {
    return APP_BASE_URL;
  }

  if (typeof explicitOrigin === "string" && explicitOrigin.trim()) {
    return explicitOrigin.trim();
  }

  const rawOrigin = request.rawRequest &&
    request.rawRequest.headers &&
    request.rawRequest.headers.origin;

  if (typeof rawOrigin === "string" && rawOrigin.trim()) {
    return rawOrigin.trim();
  }

  return "";
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
  const title = booking.title || "SmartRoom booking";
  const startTime = formatDateTimeForEmail(booking.startTime);
  const endTime = formatDateTimeForEmail(booking.endTime);

  return {
    to: email,
    subject: `[YAGEO SmartRoom] Verify booking ${bookingId}`,
    senderName: "YAGEO SmartRoom",
    message: [
      '<div style="margin:0;padding:24px;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">',
      '<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #fed7aa;border-radius:14px;overflow:hidden;">',
      '<div style="background:#f97316;padding:22px 26px;color:#ffffff;">',
      '<div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">YAGEO SmartRoom</div>',
      '<div style="font-size:24px;line-height:30px;font-weight:800;margin-top:6px;">Booking Verification</div>',
      '</div>',
      '<div style="padding:26px;">',
      '<p style="margin:0 0 14px;font-size:15px;line-height:22px;">Hello,</p>',
      '<p style="margin:0 0 20px;font-size:15px;line-height:22px;">Please verify your SmartRoom booking by pressing the button below. This confirms the booking and records your check-in.</p>',
      '<div style="border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;padding:18px;margin:0 0 22px;">',
      `<div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:12px;">${escapeHtml(title)}</div>`,
      '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;line-height:20px;">',
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Booking ID</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(bookingId)}</td></tr>`,
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Organizer</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(booking.organizer || "-")}</td></tr>`,
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Department</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(booking.department || "-")}</td></tr>`,
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Desk</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(booking.deskNumber || "-")}</td></tr>`,
      `<tr><td style="width:120px;padding:6px 0;color:#9a3412;font-weight:700;">Time</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(startTime)} - ${escapeHtml(endTime)}</td></tr>`,
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
      'This is an automated message from YAGEO SmartRoom.',
      '</div>',
      '</div>',
      '</div>',
    ].join(""),
  };
}

async function sendPowerAutomateEmail(payload) {
  const flowUrl = process.env.POWER_AUTOMATE_VERIFICATION_FLOW_URL;
  if (!flowUrl) {
    throw new HttpsError(
      "failed-precondition",
      "POWER_AUTOMATE_VERIFICATION_FLOW_URL is not configured.",
      { missingEnv: "POWER_AUTOMATE_VERIFICATION_FLOW_URL" }
    );
  }

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

function isMatchingSuperAdmin(data, credentials) {
  return (
    data &&
    data.role === "SUPER_ADMIN" &&
    typeof data.password === "string" &&
    data.password === credentials.password &&
    typeof data.username === "string" &&
    data.username === credentials.username
  );
}

function findBootstrapSuperAdmin(credentials) {
  return BOOTSTRAP_SUPER_ADMINS.find((user) => (
    user.role === "SUPER_ADMIN" &&
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

exports.deleteAdminAccount = onCall(APP_HTTPS_OPTIONS, async (request) => {
  try {
    const data = request.data || {};
    const targetAdminDocId = assertDocumentId(data.targetAdminDocId, "targetAdminDocId");
    const superAdmin = data.superAdmin || {};

    const credentials = {
      id: normalizeId(superAdmin.id),
      firestoreDocId: normalizeId(superAdmin.firestoreDocId),
      username: assertString(superAdmin.username, "superAdmin.username"),
      password: assertString(superAdmin.password, "superAdmin.password"),
      role: assertString(superAdmin.role, "superAdmin.role"),
    };

    if (credentials.role !== "SUPER_ADMIN") {
      throw new HttpsError("permission-denied", "Only Super Admin users can delete Admin accounts.");
    }

    const verifiedSuperAdmin = await findSuperAdmin(credentials);
    if (!verifiedSuperAdmin) {
      throw new HttpsError("permission-denied", "Super Admin credentials could not be verified.");
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
    if (targetData.role === "SUPER_ADMIN") {
      throw new HttpsError("failed-precondition", "Super Admin accounts are protected and cannot be deleted from this screen.");
    }

    await targetRef.delete();

    return {
      deleted: true,
      path: `admins/${targetAdminDocId}`,
      projectId: PROJECT_ID,
      databaseId: DATABASE_ID,
    };
  } catch (error) {
    if (error instanceof HttpsError || typeof (error && error.code) === "string") {
      throw error;
    }

    console.error("deleteAdminAccount failed", {
      message: error && error.message,
      code: error && error.code,
      stack: error && error.stack,
    });

    throw new HttpsError(
      "failed-precondition",
      `Admin delete failed on the server: ${error && error.message ? error.message : String(error)}`
    );
  }
});

exports.sendBookingVerificationEmail = onCall(APP_HTTPS_OPTIONS, async (request) => {
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
    if (booking.status === "REJECTED" || booking.status === "NO_SHOW") {
      throw new HttpsError("failed-precondition", "Only active bookings can receive verification email.");
    }

    const bookingEmail = typeof booking.email === "string" ? booking.email.toLowerCase() : "";
    if (bookingEmail !== email) {
      throw new HttpsError("permission-denied", "Verification email must match the booking email.");
    }

    const lastSentAt = toDate(booking.verificationEmailSentAt);
    if (lastSentAt && Date.now() - lastSentAt.getTime() < EMAIL_RESEND_COOLDOWN_MS) {
      throw new HttpsError("resource-exhausted", "Verification email was sent recently. Please wait before retrying.");
    }

    const token = createToken();
    const tokenHash = hashToken(token);
    const tokenExpiresAt = getTokenExpiresAt(booking);
    const verifyUrl = buildVerifyUrl(getOriginFromCallable(request, data.origin), bookingId, token);

    await bookingRef.update({
      email,
      verificationTokenHash: tokenHash,
      verificationTokenCreatedAt: FieldValue.serverTimestamp(),
      verificationTokenExpiresAt: tokenExpiresAt,
      verificationEmailStatus: "queued",
      verifyUrl,
    });

    const emailPayload = buildVerificationEmailPayload(email, bookingId, verifyUrl, booking);

    try {
      await sendPowerAutomateEmail(emailPayload);
    } catch (error) {
      await bookingRef.update({
        verificationEmailStatus: "failed",
        verificationEmailFailedAt: FieldValue.serverTimestamp(),
      });
      throw error;
    }

    await bookingRef.update({
      verificationEmailStatus: "sent",
      verificationEmailSentAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      bookingId,
      email,
      verifyUrl,
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

async function verifyBookingTokenInternal(bookingId, token) {
  const tokenHash = hashToken(assertString(token, "token"));
  const bookingRef = db.collection("bookings").doc(bookingId);

  let result = null;
  await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) {
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

    if (booking.status === "REJECTED" || booking.status === "NO_SHOW") {
      throw new HttpsError("failed-precondition", "This booking can no longer be verified.");
    }

    const alreadyVerified = booking.status === "VERIFIED" || !!booking.actualStartTime;
    const update = {
      status: "VERIFIED",
      verifiedAt: FieldValue.serverTimestamp(),
      verificationMethod: "qr",
    };

    if (!booking.actualStartTime) {
      update.actualStartTime = FieldValue.serverTimestamp();
    }

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

    let result = null;
    await db.runTransaction(async (transaction) => {
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists) {
        throw new HttpsError("not-found", `Booking document not found: bookings/${bookingId}`);
      }

      const booking = bookingSnap.data() || {};
      if (booking.status === "NO_SHOW") {
        result = { success: true, bookingId, status: "NO_SHOW", alreadyMarked: true };
        return;
      }

      if (booking.status === "REJECTED" || booking.status === "VERIFIED" || booking.actualStartTime) {
        throw new HttpsError("failed-precondition", "This booking is not eligible for no-show marking.");
      }

      const startTime = toDate(booking.startTime);
      if (!startTime) {
        throw new HttpsError("failed-precondition", "Booking start time is invalid.");
      }

      const cutoffTimeMs = startTime.getTime() + 15 * 60 * 1000;
      if (Date.now() <= cutoffTimeMs) {
        throw new HttpsError("failed-precondition", "Booking is not past the no-show cutoff.");
      }

      transaction.update(bookingRef, {
        status: "NO_SHOW",
        noShowMarkedAt: FieldValue.serverTimestamp(),
      });

      result = { success: true, bookingId, status: "NO_SHOW", alreadyMarked: false };
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
