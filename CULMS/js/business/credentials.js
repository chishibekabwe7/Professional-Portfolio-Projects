const encoder = new TextEncoder();
const bytes = value => typeof value === 'string' ? Uint8Array.from(atob(value), char => char.charCodeAt(0)) : new Uint8Array(value);
const base64 = value => btoa(String.fromCharCode(...new Uint8Array(value)));
export function generateSalt() { const salt = new Uint8Array(16); globalThis.crypto.getRandomValues(salt); return salt; }
export async function hashPassword(password, salt, iterations = 100000) { const key = await globalThis.crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']); const bits = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', salt: bytes(salt), iterations, hash: 'SHA-256' }, key, 256); return base64(bits); }
export function constantTimeEqual(left, right) { const a = typeof left === 'string' ? encoder.encode(left) : new Uint8Array(left); const b = typeof right === 'string' ? encoder.encode(right) : new Uint8Array(right); let result = a.length ^ b.length; const length = Math.max(a.length, b.length); for (let index = 0; index < length; index += 1) result |= (a[index % (a.length || 1)] || 0) ^ (b[index % (b.length || 1)] || 0); return result === 0; }
export { base64 };
