const KEY = 'culms:v1:session';
let memory = null;
function storage() { try { return window.localStorage; } catch { return null; } }
export function getSession() {
  let raw;
  try { raw = storage()?.getItem(KEY) ?? (memory ? JSON.stringify(memory) : null); } catch { raw = memory ? JSON.stringify(memory) : null; }
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { clearSession(); return null; }
}
export function setSession(user) {
  const value = { id: user.id, role: user.role }; memory = value;
  try { storage()?.setItem(KEY, JSON.stringify(value)); } catch { /* memory fallback */ }
  return value;
}
export function clearSession() { memory = null; try { storage()?.removeItem(KEY); } catch { /* memory fallback */ } }
