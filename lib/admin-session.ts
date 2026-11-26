export const ADMIN_IDLE_TIMEOUT_MS = 3 * 60 * 60 * 1000

const LAST_ACTIVITY_KEY = 'booka:admin:last-activity'

export function markAdminSessionActivity(now = Date.now()) {
  window.sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now))
}

export function getAdminSessionIdleTimeRemaining(now = Date.now()) {
  const lastActivity = Number(window.sessionStorage.getItem(LAST_ACTIVITY_KEY))
  if (!Number.isSafeInteger(lastActivity) || lastActivity <= 0 || lastActivity > now) return 0

  return Math.max(0, ADMIN_IDLE_TIMEOUT_MS - (now - lastActivity))
}

export function clearAdminSessionActivity() {
  window.sessionStorage.removeItem(LAST_ACTIVITY_KEY)
}
