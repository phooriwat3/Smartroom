const BOOTSTRAP_SUPER_ADMINS = [
  { id: "admin1", username: "admin", password: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3", role: "SUPER_ADMIN" },
];
const BOOTSTRAP_ADMINS = [
  ...BOOTSTRAP_SUPER_ADMINS,
  { id: "approver1", username: "approver", password: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3", role: "APPROVER" },
];

function normalizeAdminRoleValue(value) {
  const normalized = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (normalized === "APPROVER") return "APPROVER";
  return "";
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

const credentials = {
  username: "admin",
  password: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
};

console.log("findBootstrapAdmin result:", findBootstrapAdmin(credentials));
