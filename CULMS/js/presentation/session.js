import { isSessionExpired } from '../business/access.js';
import { showToast } from './ui/toast.js';
const KEY = 'culms:v1:session';
let memory = null;
let expiryNotice = false;
function storage() { try { return window.localStorage; } catch { return null; } }
export function getSession() {
  let raw;
  try { raw = storage()?.getItem(KEY) ?? (memory ? JSON.stringify(memory) : null); } catch { raw = memory ? JSON.stringify(memory) : null; }
  if (!raw) return null;
  try { const session = JSON.parse(raw); if (isSessionExpired(session.startedAt)) { clearSession(); if (!expiryNotice) { expiryNotice = true; showToast('Your session expired. Please sign in again.', 'info'); } return null; } return session; } catch { clearSession(); return null; }
}
export function setSession(user) { const value = { id: user.id, role: user.role, startedAt: new Date().toISOString() }; memory = value; expiryNotice = false; try { storage()?.setItem(KEY, JSON.stringify(value)); } catch { /* memory fallback */ } return value; }
export function clearSession() { memory = null; try { storage()?.removeItem(KEY); } catch { /* memory fallback */ } }
