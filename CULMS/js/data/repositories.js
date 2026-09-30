import { AcquisitionRequest, Book, BookCopy, Fine, LoanRecord, Notification, Patron, Professor, Reservation, Settings, Staff, Student } from './entities.js';

export const STORAGE_PREFIX = 'culms:v1:';
export const SCHEMA_VERSION_KEY = `${STORAGE_PREFIX}schemaVersion`;

/** @param {string} prefix @returns {string} */
const keyFor = prefix => `${STORAGE_PREFIX}${prefix}`;
/** @param {unknown} value @returns {any[]} */
const decode = value => value === null ? [] : (typeof value === 'string' ? JSON.parse(value) : value);
/** @param {unknown} value @returns {string} */
const encode = value => JSON.stringify(value);

/** Generate readable sequential ids. @param {string} prefix @param {number} number @returns {string} */
export function readableId(prefix, number) { return `${prefix}-${String(number).padStart(6, '0')}`; }

/** Generic JSON collection repository. */
export class BaseRepository {
    /** @param {import('./storage/StorageAdapter.js').StorageAdapter} adapter @param {string} collection @param {new (...args: any[]) => any} entityClass @param {(value: any) => any} [factory] */
    constructor(adapter, collection, entityClass, factory = value => entityClass.fromJSON(value)) { this.adapter = adapter; this.key = keyFor(collection); this.entityClass = entityClass; this.factory = factory; }
    /** @returns {any[]} */ getAll() { return decode(this.adapter.get(this.key)).map(this.factory); }
    /** @param {string} id @returns {any|null} */ getById(id) { return this.getAll().find(item => this.idOf(item) === id) || null; }
    /** @param {any} item @returns {any} */ add(item) { if (!(item instanceof this.entityClass)) throw new TypeError(`Expected ${this.entityClass.name}`); const items = this.getAll(); if (this.getById(this.idOf(item))) throw new Error('Duplicate id'); items.push(item); this.save(items); return item; }
    /** @param {string} id @param {Partial<any>} changes @returns {any} */ update(id, changes) { const items = this.getAll(); const index = items.findIndex(item => this.idOf(item) === id); if (index < 0) throw new Error('Entity not found'); Object.assign(items[index], changes); this.save(items); return items[index]; }
    /** @param {string} id @returns {boolean} */ remove(id) { const items = this.getAll(); const next = items.filter(item => this.idOf(item) !== id); if (next.length === items.length) return false; this.save(next); return true; }
    /** @returns {void} */ clear() { this.adapter.remove(this.key); }
    /** @param {any} item @returns {string} */ idOf(item) { return item.loanId || item.reservationId || item.fineId || item.notificationId || item.requestId || item.staffId || item.patronId || item.isbn || item.barcode || item.id; }
    /** @param {any[]} items @returns {void} */ save(items) { this.adapter.set(this.key, encode(items.map(item => item.toJSON()))); }
}

/** Repository for books and composed copies. */
export class BookRepository extends BaseRepository {
    constructor(adapter) { super(adapter, 'books', Book); }
    findByIsbn(isbn) { return this.getById(isbn); }
    findCopiesByIsbn(isbn) { return this.getById(isbn)?.copies || []; }
    findCopyByBarcode(barcode) { return this.getAll().flatMap(book => book.copies).find(copy => copy.barcode === barcode) || null; }
    addCopy(copy) { const book = this.findByIsbn(copy.isbn); if (!book) throw new Error(`Unknown ISBN: ${copy.isbn}`); book.copies.push(copy); this.update(book.isbn, { copies: book.copies }); return copy; }
    removeCopy(barcode) { const book = this.getAll().find(item => item.copies.some(copy => copy.barcode === barcode)); if (!book) return false; book.copies = book.copies.filter(copy => copy.barcode !== barcode); this.update(book.isbn, { copies: book.copies }); return true; }
    remove(isbn) { const removed = super.remove(isbn); return removed; }
    search(query = {}) { const text = (query.text || '').toLowerCase(); return this.getAll().filter(book => (!text || [book.title, book.author, book.isbn].some(value => value.toLowerCase().includes(text))) && (!query.campus || book.copies.some(copy => copy.campus === query.campus))); }
}
export class PatronRepository extends BaseRepository { constructor(adapter) { super(adapter, 'patrons', Patron, Patron.fromJSON); } }
export class StaffRepository extends BaseRepository { constructor(adapter) { super(adapter, 'staff', Staff, Staff.fromJSON); } }
export class LoanRepository extends BaseRepository { constructor(adapter) { super(adapter, 'loans', LoanRecord); } findActiveByPatron(id) { return this.getAll().filter(item => item.patronId === id && item.isActive()); } findActiveByBarcode(code) { return this.getAll().filter(item => item.barcode === code && item.isActive()); } findOverdue(referenceDate = new Date()) { return this.getAll().filter(item => item.isActive() && item.calculateOverdueDays(referenceDate) > 0); } }
export class ReservationRepository extends BaseRepository { constructor(adapter) { super(adapter, 'reservations', Reservation); } findPendingByIsbn(isbn) { return this.getAll().filter(item => item.isbn === isbn && item.status === 'Pending'); } findByPatron(id) { return this.getAll().filter(item => item.patronId === id); } }
export class FineRepository extends BaseRepository { constructor(adapter) { super(adapter, 'fines', Fine); } findByPatron(id) { return this.getAll().filter(item => item.patronId === id); } findUnpaidByPatron(id) { return this.findByPatron(id).filter(item => item.paymentStatus === 'Unpaid'); } }
export class NotificationRepository extends BaseRepository { constructor(adapter) { super(adapter, 'notifications', Notification); } }
export class AcquisitionRequestRepository extends BaseRepository { constructor(adapter) { super(adapter, 'acquisitionRequests', AcquisitionRequest); } }
export class SettingsRepository extends BaseRepository {
    constructor(adapter) { super(adapter, 'settings', Settings); }
    get() { return this.getAll()[0] || new Settings(); }
    saveSettings(settings) { if (!(settings instanceof Settings)) throw new TypeError('Expected Settings'); this.clear(); this.adapter.set(this.key, encode([{ ...settings, id: 'settings' }])); return settings; }
}

/** Initialize storage metadata and invoke the current no-op migration hook. @param {any} adapter @returns {void} */
export function migrate(adapter) { if (!adapter.get(SCHEMA_VERSION_KEY)) adapter.set(SCHEMA_VERSION_KEY, '1'); }
