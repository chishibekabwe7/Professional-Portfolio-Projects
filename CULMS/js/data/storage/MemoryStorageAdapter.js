import { StorageAdapter } from './StorageAdapter.js';

/** In-memory adapter for tests and non-browser use. */
export class MemoryStorageAdapter extends StorageAdapter {
    constructor() { super(); this.store = new Map(); }
    get(key) { return this.store.has(key) ? this.store.get(key) : null; }
    set(key, value) { this.store.set(key, value); }
    remove(key) { this.store.delete(key); }
    keys() { return [...this.store.keys()]; }
}
