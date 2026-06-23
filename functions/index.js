const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "sutsmartbus-495306";
const DATABASE_ID = "ai-studio-28114784-a066-482c-9738-dfb6c9d68ce0";
const BOOTSTRAP_SUPER_ADMINS = [
  { id: "admin1", username: "admin", password: "123", role: "SUPER_ADMIN" },
];

admin.initializeApp();
const db = getFirestore(DATABASE_ID);

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

exports.deleteAdminAccount = onCall({ region: "us-central1", invoker: "public" }, async (request) => {
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
    if (error instanceof HttpsError) {
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
