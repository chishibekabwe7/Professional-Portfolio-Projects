/** Storage interface used by repositories. */
export class StorageAdapter {
    /** @param {string} key @returns {unknown} */ get(key) { throw new Error('Not implemented'); }
    /** @param {string} key @param {unknown} value @returns {void} */ set(key, value) { throw new Error('Not implemented'); }
    /** @param {string} key @returns {void} */ remove(key) { throw new Error('Not implemented'); }
    /** @returns {string[]} */ keys() { throw new Error('Not implemented'); }
}
