/** Canonical form used by both registration and sign-in. */
export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
