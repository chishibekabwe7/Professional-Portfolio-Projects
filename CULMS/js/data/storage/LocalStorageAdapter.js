import { MemoryStorageAdapter } from './MemoryStorageAdapter.js';

/** Browser adapter with an in-memory fallback when storage is unavailable. */
export class LocalStorageAdapter {
    constructor() { this.fallback = new MemoryStorageAdapter(); this.storage = null; try { this.storage = window.localStorage; const probe = '__culms_probe__'; this.storage.setItem(probe, probe); this.storage.removeItem(probe); } catch { this.storage = null; } }
    get(key) { try { return this.storage ? this.storage.getItem(key) : this.fallback.get(key); } catch { return this.fallback.get(key); } }
    set(key, value) { try { if (this.storage) this.storage.setItem(key, value); else this.fallback.set(key, value); } catch { this.fallback.set(key, value); } }
    remove(key) { try { if (this.storage) this.storage.removeItem(key); else this.fallback.remove(key); } catch { this.fallback.remove(key); } }
    keys() { try { return this.storage ? Object.keys(this.storage) : this.fallback.keys(); } catch { return this.fallback.keys(); } }
}
