/** @typedef {'Available'|'OnLoan'|'Reserved'|'CourseReserve'} CopyStatus */
/** @typedef {'Pending'|'Ready'|'Fulfilled'|'Expired'|'Cancelled'} ReservationStatus */
/** @typedef {'Unpaid'|'Paid'} PaymentStatus */

const copyStatuses = new Set(['Available', 'OnLoan', 'Reserved', 'CourseReserve']);
const reservationStatuses = new Set(['Pending', 'Ready', 'Fulfilled', 'Expired', 'Cancelled']);
const paymentStatuses = new Set(['Unpaid', 'Paid']);
const date = value => value instanceof Date ? value : new Date(value);
const iso = value => value instanceof Date ? value.toISOString() : new Date(value).toISOString();

/** Base entity with a stable JSON representation. */
export class Entity {
    /** @returns {Record<string, unknown>} */
    toJSON() { return { ...this }; }
}

/** A library patron. This class is abstract. */
export class Patron extends Entity {
    /** @param {string} patronId @param {string} name @param {string} email @param {string} campus @param {number} fineBalance */
    constructor(patronId, name, email, campus, fineBalance = 0) {
        super();
        if (new.target === Patron) throw new TypeError('Patron is abstract');
        this.patronId = patronId; this.name = name; this.email = email; this.campus = campus; this.fineBalance = fineBalance;
    }
    /** @returns {number} */ get maximumBorrowLimit() { throw new Error('Abstract getter'); }
    /** @returns {number} */ get loanPeriodDays() { throw new Error('Abstract getter'); }
    /** @param {number} activeLoanCount @param {number} maxUnpaidFine @returns {{eligible: boolean, reason: string|null}} */
    checkEligibility(activeLoanCount, maxUnpaidFine) {
        if (this.fineBalance > maxUnpaidFine) return { eligible: false, reason: 'Borrowing Blocked' };
        if (activeLoanCount >= this.maximumBorrowLimit) return { eligible: false, reason: 'Maximum Limit Reached' };
        return { eligible: true, reason: null };
    }
    /** @returns {Record<string, unknown>} */
    toJSON() { return { ...super.toJSON(), type: this.constructor.name }; }
    /** @param {Record<string, any>} value @returns {Student|Professor} */
    static fromJSON(value) { return value.type === 'Professor' ? Professor.fromJSON(value) : Student.fromJSON(value); }
}

/** Student patron. */
export class Student extends Patron {
    /** @param {string} studentId @param {string} name @param {string} email @param {string} campus @param {string} campusMajor @param {number} fineBalance */
    constructor(studentId, name, email, campus, campusMajor, fineBalance = 0) { super(studentId, name, email, campus, fineBalance); this.studentId = studentId; this.campusMajor = campusMajor; }
    get maximumBorrowLimit() { return 5; } get loanPeriodDays() { return 14; }
    toJSON() { return { ...super.toJSON(), studentId: this.studentId, campusMajor: this.campusMajor }; }
    /** @param {Record<string, any>} value @returns {Student} */
    static fromJSON(value) { return new Student(value.studentId, value.name, value.email, value.campus, value.campusMajor, value.fineBalance); }
}

/** Professor patron. */
export class Professor extends Patron {
    /** @param {string} staffId @param {string} name @param {string} email @param {string} campus @param {string} department @param {number} fineBalance */
    constructor(staffId, name, email, campus, department, fineBalance = 0) { super(staffId, name, email, campus, fineBalance); this.staffId = staffId; this.department = department; }
    get maximumBorrowLimit() { return 15; } get loanPeriodDays() { return 30; }
    toJSON() { return { ...super.toJSON(), staffId: this.staffId, department: this.department }; }
    /** @param {Record<string, any>} value @returns {Professor} */
    static fromJSON(value) { return new Professor(value.staffId, value.name, value.email, value.campus, value.department, value.fineBalance); }
}

/** Library employee, not a Patron. */
export class Staff extends Entity {
    /** @param {string} staffId @param {string} name @param {string} email @param {string} campus @param {string} role @param {string[]} permissions */
    constructor(staffId, name, email, campus, role, permissions = []) { super(); Object.assign(this, { staffId, name, email, campus, role, permissions }); }
    static fromJSON(value) { return value.role === 'Librarian' ? Librarian.fromJSON(value) : value.role === 'LibraryAdministrator' ? LibraryAdministrator.fromJSON(value) : new Staff(value.staffId, value.name, value.email, value.campus, value.role, value.permissions); }
}
/** Librarian employee. */
export class Librarian extends Staff { constructor(staffId, name, email, campus, permissions = []) { super(staffId, name, email, campus, 'Librarian', permissions); } static fromJSON(value) { return new Librarian(value.staffId, value.name, value.email, value.campus, value.permissions); } }
/** Library administrator employee. */
export class LibraryAdministrator extends Staff { constructor(staffId, name, email, campus, permissions = []) { super(staffId, name, email, campus, 'LibraryAdministrator', permissions); } static fromJSON(value) { return new LibraryAdministrator(value.staffId, value.name, value.email, value.campus, value.permissions); } }

/** Book title and its composed copies. */
export class Book extends Entity {
    /** @param {string} isbn @param {string} title @param {string} author @param {string} category @param {BookCopy[]} copies */
    constructor(isbn, title, author, category, copies = []) { super(); Object.assign(this, { isbn, title, author, category, copies }); }
    static fromJSON(value) { return new Book(value.isbn, value.title, value.author, value.category, (value.copies || []).map(BookCopy.fromJSON)); }
}
/** A physical copy of a book. */
export class BookCopy extends Entity {
    /** @param {string} barcode @param {string} isbn @param {string} shelfLocation @param {string} conditionStatus @param {string} campus @param {CopyStatus} status @param {boolean} courseReserve */
    constructor(barcode, isbn, shelfLocation, conditionStatus, campus, status = 'Available', courseReserve = false) {
        super(); if (!copyStatuses.has(status)) throw new RangeError(`Invalid copy status: ${status}`); Object.assign(this, { barcode, isbn, shelfLocation, conditionStatus, campus, status, courseReserve });
    }
    /** @param {CopyStatus} status @returns {void} */ updateStatus(status) { if (!copyStatuses.has(status)) throw new RangeError(`Invalid copy status: ${status}`); this.status = status; }
    /** @returns {boolean} */ checkAvailability() { return this.status === 'Available'; }
    static fromJSON(value) { return new BookCopy(value.barcode, value.isbn, value.shelfLocation, value.conditionStatus, value.campus, value.status, value.courseReserve); }
}

/** A borrowing transaction. */
export class LoanRecord extends Entity {
    /** @param {string} loanId @param {string} barcode @param {string} patronId @param {Date|string} issueDate @param {Date|string} dueDate @param {Date|string|null} returnDate @param {boolean} renewed @param {boolean} isCourseReserve */
    constructor(loanId, barcode, patronId, issueDate, dueDate, returnDate = null, renewed = false, isCourseReserve = false) { super(); Object.assign(this, { loanId, barcode, patronId, issueDate: date(issueDate), dueDate: date(dueDate), returnDate: returnDate ? date(returnDate) : null, renewed, isCourseReserve }); }
    /** @param {Date|string} referenceDate @returns {number} */ calculateOverdueDays(referenceDate = new Date()) { const end = this.returnDate || date(referenceDate); return Math.max(0, Math.ceil((end - this.dueDate) / 86400000)); }
    /** @returns {boolean} */ isActive() { return this.returnDate === null; }
    toJSON() { return { ...super.toJSON(), issueDate: iso(this.issueDate), dueDate: iso(this.dueDate), returnDate: this.returnDate ? iso(this.returnDate) : null }; }
    static fromJSON(value) { return new LoanRecord(value.loanId, value.barcode, value.patronId, value.issueDate, value.dueDate, value.returnDate, value.renewed, value.isCourseReserve); }
}

/** A hold placed on a title or copy. */
export class Reservation extends Entity {
    /** @param {string} reservationId @param {string} isbn @param {string|null} barcode @param {string} patronId @param {Date|string} dateCreated @param {ReservationStatus} status @param {string} confirmationCode */
    constructor(reservationId, isbn, barcode, patronId, dateCreated, status = 'Pending', confirmationCode = '') { super(); this.reservationId = reservationId; this.isbn = isbn; this.barcode = barcode; this.patronId = patronId; this.dateCreated = date(dateCreated); this.expirationDate = new Date(this.dateCreated.getTime() + 7 * 86400000); if (!reservationStatuses.has(status)) throw new RangeError(`Invalid reservation status: ${status}`); this.status = status; this.confirmationCode = confirmationCode; }
    /** @param {Date|string} referenceDate @returns {boolean} */ isExpired(referenceDate = new Date()) { return date(referenceDate) > this.expirationDate; }
    toJSON() { return { ...super.toJSON(), dateCreated: iso(this.dateCreated), expirationDate: iso(this.expirationDate) }; }
    static fromJSON(value) { const item = new Reservation(value.reservationId, value.isbn, value.barcode, value.patronId, value.dateCreated, value.status, value.confirmationCode); item.expirationDate = date(value.expirationDate); return item; }
}
/** A fine associated with a loan. */
export class Fine extends Entity {
    constructor(fineId, loanId, patronId, amountAccumulated, paymentStatus = 'Unpaid', dateCreated = new Date()) { super(); if (!paymentStatuses.has(paymentStatus)) throw new RangeError(`Invalid payment status: ${paymentStatus}`); Object.assign(this, { fineId, loanId, patronId, amountAccumulated, paymentStatus, dateCreated: date(dateCreated) }); }
    toJSON() { return { ...super.toJSON(), dateCreated: iso(this.dateCreated) }; }
    static fromJSON(value) { return new Fine(value.fineId, value.loanId, value.patronId, value.amountAccumulated, value.paymentStatus, value.dateCreated); }
}
/** A message for a library user. */
export class Notification extends Entity {
    constructor(notificationId, recipientId, message, dateCreated = new Date(), read = false) { super(); Object.assign(this, { notificationId, recipientId, message, dateCreated: date(dateCreated), read }); }
    toJSON() { return { ...super.toJSON(), dateCreated: iso(this.dateCreated) }; }
    static fromJSON(value) { return new Notification(value.notificationId, value.recipientId, value.message, value.dateCreated, value.read); }
}
/** Configurable library rules. */
export class Settings extends Entity {
    constructor(values = {}) { super(); Object.assign(this, { fineRatePerDay: 2, maxUnpaidFine: 50, courseReserveLoanDays: 2, reservationHoldDays: 7, studentLimit: 5, professorLimit: 15, studentLoanDays: 14, professorLoanDays: 30, currency: 'K' }, values); }
    static fromJSON(value) { return new Settings(value); }
}

export const entityTypes = { Book, BookCopy, Student, Professor, Staff, Librarian, LibraryAdministrator, LoanRecord, Reservation, Fine, Notification, Settings };
