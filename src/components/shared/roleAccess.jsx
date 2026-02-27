/**
 * Centralised role-access logic.
 * Import from here in TopNav, MobileNav and pages.
 */

// Which "execution poles" each role can see in the nav
export const ROLE_EXEC_POLES = {
  pilote_fi:               ["familles_impact"],
  copilote_fi:             ["familles_impact"],
  responsable_fi:          ["familles_impact"],
  etudiant:                ["familles_impact", "formation"],
  responsable_formation:   ["formation"],
  agent_terrain:           ["evangelisation"],
  agent_virtuel:           ["evangelisation"],
  responsable_evangelisation: ["evangelisation"],
  producteur:              ["communication"],
  createur:                ["communication"],
  responsable_communication: ["communication"],
  admin:                   ["familles_impact", "formation", "evangelisation", "communication"],
};

// Legacy aliases — keep for backward compat
export const TRONE_ROLES = ["trone", "admin", "responsable_general"];
export const GOUV_ROLES  = [
  "gouvernance_direction", "gouvernance_suivi", "gouvernance_strategie",
  // legacy aliases from Parametres (old role names)
  "directrice_execution", "responsable_suivi", "analyste_strategique",
  "admin"
];
export const EXEC_ROLES  = Object.keys(ROLE_EXEC_POLES);

// Normalize legacy role names to canonical ones
export function normalizeRole(role) {
  const MAP = {
    responsable_general:    "trone",
    directrice_execution:   "gouvernance_direction",
    responsable_suivi:      "gouvernance_suivi",
    analyste_strategique:   "gouvernance_strategie",
  };
  return MAP[role] || role;
}

// Gouvernance sub-role visibility
export const GOUV_GROUP_ROLES = {
  gouvernance_direction: ["gouvernance_direction", "directrice_execution", "admin"],
  gouvernance_suivi:     ["gouvernance_suivi",     "responsable_suivi",    "admin"],
  gouvernance_strategie: ["gouvernance_strategie", "analyste_strategique", "admin"],
};

/**
 * Returns all roles for a user (supports multi-roles via user.roles array).
 * Falls back to [user.role] for backward compatibility.
 */
export function getUserRoles(user) {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  return user.role ? [user.role] : [];
}

/**
 * Check if a user has a specific role (supports multi-roles).
 */
export function userHasRole(user, roleOrRoles) {
  const userRoles = getUserRoles(user);
  const check = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  return check.some(r => userRoles.includes(r));
}

/**
 * Given a user's roles array, return the list of execution pole keys they can see.
 */
export function getAllowedExecPoles(userRoles = []) {
  if (!Array.isArray(userRoles)) userRoles = [userRoles];
  const normalized = userRoles.map(normalizeRole);
  const poles = new Set();
  normalized.forEach(r => {
    (ROLE_EXEC_POLES[r] || []).forEach(p => poles.add(p));
  });
  return Array.from(poles);
}

/**
 * Given a user's roles array, return the gouvernance groups they can see.
 */
export function getAllowedGouvGroups(userRoles = []) {
  if (!Array.isArray(userRoles)) userRoles = [userRoles];
  if (userRoles.includes("admin")) return ["gouvernance_direction", "gouvernance_suivi", "gouvernance_strategie"];
  return Object.keys(GOUV_GROUP_ROLES).filter(group =>
    userRoles.some(r => GOUV_GROUP_ROLES[group].includes(r))
  );
}

/**
 * Primary execution pole for a user (for Equipe default tab, FI filtering, etc.)
 */
export function getPrimaryExecPole(role) {
  const first = (ROLE_EXEC_POLES[role] || [])[0];
  return first || null;
}

/**
 * For a pilote: returns the pole tab they should see by default in Equipe
 */
export const PILOTE_VISIBLE_POLES = ["familles_impact"];