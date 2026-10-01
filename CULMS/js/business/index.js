import {
  AcquisitionRequest,
  Credential,
  Book,
  BookCopy,
  Fine,
  Notification,
  Receipt,
  PERMISSIONS,
  Reservation,
  Settings,
  Staff,
  Student,
  Professor,
  LibraryAdministrator,
  Librarian,
  LoanRecord,
  BookRepository,
  PatronRepository,
  StaffRepository,
  LoanRepository,
  ReservationRepository,
  FineRepository,
  NotificationRepository,
  ReceiptRepository,
  SettingsRepository,
  AcquisitionRequestRepository,
  CredentialRepository,
  readableId,
  SCHEMA_VERSION_KEY
} from '../data/index.js';
import { resetToSeed } from '../data/seed/seed.js';
import { constantTimeEqual, generateSalt, hashPassword, base64 } from './credentials.js';

export { PERMISSIONS };

const LOAN_STEPS = [
  { step: 'scan patron ID', description: 'Scan the patron ID to identify the borrower.', status: 'done' },
  { step: 'fetch patron record', description: 'Open the patron record and confirm the membership details.', status: 'done' },
  { step: 'show loan count and fine balance', description: 'Check the active loan count and unpaid fine balance.', status: 'done' },
  { step: 'scan copy barcode', description: 'Scan the book copy barcode to locate the item.', status: 'done' },
  { step: 'verify availability', description: 'Verify that the copy is available or reserved for the correct patron.', status: 'done' },
  { step: 'create loan entry with due date', description: 'Create the loan record and calculate the due date.', status: 'done' },
  { step: 'set copy to OnLoan', description: 'Mark the copy as on loan and update the stock record.', status: 'done' },
  { step: 'hand over the copy', description: 'Release the copy to the patron and complete the transaction.', status: 'done' }
];

const success = data => ({ ok: true, data });
const failure = (code, message) => ({ ok: false, error: { code, message } });
const addDays = (date, amount) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next; };
const asDate = value => value instanceof Date ? new Date(value) : new Date(value);
const asActorId = actor => typeof actor === 'string' ? actor : actor?.staffId || actor?.patronId || actor?.id || null;
export function isValidIsbn(value) { const compact = String(value || '').replace(/[ -]/g, ''); return /^(?:\d{9}[\dX]|\d{13})$/.test(compact); }
const normalizeIsbn = value => String(value || '').replace(/[ -]/g, '');
const validConditions = new Set(['Good', 'Fair', 'Poor', 'Damaged']);
const getStaffMember = (staffRepo, actor) => {
  const actorId = asActorId(actor);
  if (!actorId) return null;
  return staffRepo.getById(actorId);
};
const hasPermission = (staffMember, permission) => !!staffMember && Boolean(staffMember.hasPermission?.(permission) || staffMember.permissions?.includes(permission));
const buildLoanSummary = (loan, patron, bookTitle) => ({
  loanId: loan.loanId,
  barcode: loan.barcode,
  patronId: loan.patronId,
  patron: patron?.name || null,
  bookTitle,
  issueDate: loan.issueDate,
  dueDate: loan.dueDate,
  returnDate: loan.returnDate,
  renewed: !!loan.renewed,
  isCourseReserve: !!loan.isCourseReserve,
  overdueDays: loan.calculateOverdueDays ? loan.calculateOverdueDays(new Date()) : 0,
  status: loan.returnDate ? 'Returned' : 'Active'
});
const deepCloneBookCopies = copies => copies.map(copy => copy instanceof BookCopy ? new BookCopy(copy.barcode, copy.isbn, copy.shelfLocation, copy.conditionStatus, copy.campus, copy.status, copy.courseReserve) : copy);

export class BorrowingControl {
  constructor(adapter) {
    this.adapter = adapter;
    this.books = new BookRepository(adapter);
    this.patrons = new PatronRepository(adapter);
    this.staff = new StaffRepository(adapter);
    this.loans = new LoanRepository(adapter);
    this.reservations = new ReservationRepository(adapter);
    this.fines = new FineRepository(adapter);
    this.notifications = new NotificationRepository(adapter);
    this.settingsRepo = new SettingsRepository(adapter);
  }

  borrowBook(patronId, barcode, now = new Date(), options = {}) {
    if (options.actor !== undefined) { const actor = getStaffMember(this.staff, options.actor); if (!hasPermission(actor, PERMISSIONS.PROCESS_LOANS)) return failure('NOT_AUTHORISED', 'Not authorised'); }
    const current = asDate(now);
    const flow = LOAN_STEPS.map(item => ({ ...item }));
    const patron = this.patrons.getById(patronId);
    if (!patron) {
      flow[0].status = 'failed';
      for (let i = 1; i < flow.length; i += 1) flow[i].status = 'skipped';
      return failure('NOT_FOUND', 'Patron not found');
    }
    flow[0].status = 'done';
    flow[1].status = 'done';
    const settings = this.settingsRepo.get();
    const activeLoanCount = this.loans.findActiveByPatron(patronId).length;
    const eligibility = patron.checkEligibility(activeLoanCount, settings.maxUnpaidFine);
    flow[2].status = 'done';
    if (!eligibility.eligible) {
      flow[2].status = 'failed';
      for (let i = 3; i < flow.length; i += 1) flow[i].status = 'skipped';
      const code = eligibility.reason === 'Borrowing Blocked' ? 'BORROWING_BLOCKED' : 'MAX_LIMIT_REACHED';
      return { ok: false, error: { code, message: eligibility.reason }, data: { flow } };
    }
    const copy = this.books.findCopyByBarcode(barcode);
    if (!copy) {
      flow[3].status = 'failed';
      for (let i = 4; i < flow.length; i += 1) flow[i].status = 'skipped';
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Copy not found' }, data: { flow } };
    }
    flow[3].status = 'done';
    let reservation = null;
    if (copy.status === 'Reserved') {
      reservation = this.reservations.getAll().find(item => item.barcode === barcode && item.status === 'Ready' && item.patronId === patronId);
      if (!reservation) {
        flow[4].status = 'failed';
        for (let i = 5; i < flow.length; i += 1) flow[i].status = 'skipped';
        return { ok: false, error: { code: 'COPY_NOT_AVAILABLE', message: 'Copy not available' }, data: { flow } };
      }
      reservation.status = 'Fulfilled';
      this.reservations.update(reservation.reservationId, { status: 'Fulfilled' });
    } else if (copy.status !== 'Available' && copy.status !== 'CourseReserve') {
      flow[4].status = 'failed';
      for (let i = 5; i < flow.length; i += 1) flow[i].status = 'skipped';
      return { ok: false, error: { code: 'COPY_NOT_AVAILABLE', message: 'Copy not available' }, data: { flow } };
    }
    flow[4].status = 'done';
    const dueDays = copy.courseReserve ? settings.courseReserveLoanDays : patron.loanPeriodDays;
    const dueDate = addDays(current, dueDays);
    const loan = new LoanRecord(
      readableId('LN', this.loans.getAll().length + 1),
      barcode,
      patronId,
      current,
      dueDate,
      null,
      false,
      Boolean(copy.courseReserve)
    );
    this.loans.add(loan);
    flow[5].status = 'done';
    const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === barcode));
    if (book) {
      const matching = book.copies.find(itemCopy => itemCopy.barcode === barcode);
      if (matching) {
        matching.status = 'OnLoan';
        this.books.update(book.isbn, { copies: book.copies });
      }
    }
    flow[6].status = 'done';
    const message = `Loan issued to ${patron.name} for ${barcode}.`;
    this.notifications.add(new Notification(readableId('NT', this.notifications.getAll().length + 1), patronId, message, current));
    flow[7].status = 'done';
    return success({ flow, loan, dueDate, patron, copy, reservation });
  }

  returnBook(barcode, now = new Date(), options = {}) {
    if (options.actor !== undefined) { const actor = getStaffMember(this.staff, options.actor); if (!hasPermission(actor, PERMISSIONS.PROCESS_LOANS)) return failure('NOT_AUTHORISED', 'Not authorised'); }
    const current = asDate(now);
    const loan = this.loans.getAll().find(item => item.barcode === barcode && item.returnDate === null);
    if (!loan) return failure('NOT_FOUND', 'Active loan not found');
    const copy = this.books.findCopyByBarcode(barcode);
    if (!copy) return failure('NOT_FOUND', 'Copy not found');
    const patron = this.patrons.getById(loan.patronId);
    const settings = this.settingsRepo.get();
    loan.returnDate = current;
    this.loans.update(loan.loanId, { returnDate: current });

    const overdueDays = Math.max(0, loan.calculateOverdueDays(current));
    let fine = null;
    if (overdueDays > 0) {
      const amount = overdueDays * settings.fineRatePerDay;
      fine = new Fine(readableId('FN', this.fines.getAll().length + 1), loan.loanId, loan.patronId, amount, 'Unpaid', current, null);
      this.fines.add(fine);
      if (patron) {
        patron.fineBalance = Number((patron.fineBalance + amount).toFixed(2));
        this.patrons.update(patron.patronId, { fineBalance: patron.fineBalance });
      }
    }

    let reservationNotified = false;
    const attachedReservation = this.reservations.getAll().find(item => item.isbn === copy.isbn && item.barcode === barcode && item.status === 'Pending');
    if (attachedReservation) {
      attachedReservation.status = 'Ready';
      attachedReservation.expirationDate = addDays(current, settings.reservationHoldDays);
      this.reservations.update(attachedReservation.reservationId, { status: 'Ready', expirationDate: attachedReservation.expirationDate });
      copy.status = 'Reserved';
      this.books.update(copy.isbn, { copies: this.books.findByIsbn(copy.isbn)?.copies || [] });
      const notification = new Notification(readableId('NT', this.notifications.getAll().length + 1), attachedReservation.patronId, 'Your reserved book is ready for pickup', current);
      this.notifications.add(notification);
      reservationNotified = true;
    } else {
      copy.status = 'Available';
      this.books.update(copy.isbn, { copies: this.books.findByIsbn(copy.isbn)?.copies || [] });
    }

    const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === barcode));
    if (book) {
      const matching = book.copies.find(itemCopy => itemCopy.barcode === barcode);
      if (matching) {
        matching.status = copy.status;
        this.books.update(book.isbn, { copies: book.copies });
      }
    }

    return success({ loan, fine, reservationNotified });
  }

  renewLoan(loanId, now = new Date()) {
    const current = asDate(now);
    const loan = this.loans.getById(loanId);
    if (!loan) return failure('NOT_FOUND', 'Loan not found');
    const copy = this.books.findCopyByBarcode(loan.barcode);
    const settings = this.settingsRepo.get();
    const patron = this.patrons.getById(loan.patronId);

    if (loan.isCourseReserve) return failure('VALIDATION_ERROR', 'Course reserve loans cannot be renewed');
    if (loan.renewed) return failure('VALIDATION_ERROR', 'Loan has already been renewed');
    if (loan.calculateOverdueDays(current) > 0) return failure('VALIDATION_ERROR', 'Loan is overdue and cannot be renewed');
    const attachedReservation = copy ? this.reservations.getAll().find(item => item.isbn === copy.isbn && item.barcode === loan.barcode && (item.status === 'Pending' || item.status === 'Ready')) : null;
    if (attachedReservation) return failure('RESERVATION_PROHIBITED', 'Reservation Prohibited');
    if (patron && patron.fineBalance > settings.maxUnpaidFine) return failure('BORROWING_BLOCKED', 'Borrowing Blocked');

    loan.dueDate = addDays(loan.dueDate, patron ? patron.loanPeriodDays : settings.studentLoanDays);
    loan.renewed = true;
    this.loans.update(loanId, { dueDate: loan.dueDate, renewed: true });
    return success({ loan });
  }

  getActiveLoans(patronId) {
    const loans = this.loans.findActiveByPatron(patronId);
    const rows = loans.map(loan => {
      const patron = this.patrons.getById(loan.patronId);
      const book = this.books.getAll().find(item => item.copies.some(copy => copy.barcode === loan.barcode));
      return { ...buildLoanSummary(loan, patron, book?.title || 'Unknown title'), loan, bookIsbn: book?.isbn || null, campus: this.books.findCopyByBarcode(loan.barcode)?.campus || null };
    });
    return success(rows);
  }

  getPatronSummary(patronId) { const patron = this.patrons.getById(patronId); return patron ? success({ id: patron.patronId, name: patron.name, email: patron.email, campus: patron.campus, maximumBorrowLimit: patron.maximumBorrowLimit, activeLoans: this.loans.findActiveByPatron(patronId).length }) : failure('NOT_FOUND', 'Patron not found'); }

  getLoanHistory(patronId) {
    const loans = this.loans.getAll().filter(item => item.patronId === patronId);
    const rows = loans.map(loan => {
      const book = this.books.getAll().find(item => item.copies.some(copy => copy.barcode === loan.barcode));
      const copy = this.books.findCopyByBarcode(loan.barcode);
      const fine = this.fines.getAll().find(item => item.loanId === loan.loanId);
      const reference = loan.returnDate || new Date();
      const overdue = loan.calculateOverdueDays(reference) > 0;
  return {
    ...buildLoanSummary(loan, this.patrons.getById(loan.patronId), book?.title || 'Unknown title'),
    loan,
    bookIsbn: book?.isbn || null,
    loanId: loan.loanId,
    isbn: book?.isbn || null,
    title: book?.title || 'Unknown title',
    barcode: loan.barcode,
    campus: copy?.campus || null,
    issueDate: loan.issueDate,
    dueDate: loan.dueDate,
    returnDate: loan.returnDate,
    renewed: !!loan.renewed,
    isCourseReserve: !!loan.isCourseReserve,
    status: loan.returnDate ? (overdue ? 'Returned late' : 'Returned') : (overdue ? 'Overdue' : 'Active'),
    fineAmount: Number(fine?.amountAccumulated || 0)
  };
    }).sort((left, right) => new Date(right.issueDate) - new Date(left.issueDate));
    return success(rows);
  }

  getPatronSnapshot(identifier) {
    const value = String(identifier || '').toLowerCase();
    const patron = this.patrons.getAll().find(item => item.patronId.toLowerCase() === value || item.email.toLowerCase() === value);
    if (!patron) return failure('NOT_FOUND', 'Patron not found');
    const activeLoans = this.getActiveLoans(patron.patronId).data;
    const eligibility = patron.checkEligibility(activeLoans.length, this.settingsRepo.get().maxUnpaidFine);
    return success({ patron: { id: patron.patronId, name: patron.name, type: patron.constructor.name, campus: patron.campus, email: patron.email }, activeLoans, loanCount: activeLoans.length, limit: patron.maximumBorrowLimit, fineBalance: patron.fineBalance, eligibility });
  }

  previewBorrow(identifier, barcode, now = new Date()) {
    const snapshot = this.getPatronSnapshot(identifier); if (!snapshot.ok) return snapshot;
    const patron = this.patrons.getById(snapshot.data.patron.id); const current = asDate(now); const copy = this.books.findCopyByBarcode(barcode);
    if (!snapshot.data.eligibility.eligible) return failure(snapshot.data.eligibility.reason === 'Borrowing Blocked' ? 'BORROWING_BLOCKED' : 'MAX_LIMIT_REACHED', snapshot.data.eligibility.reason);
    if (!copy) return failure('NOT_FOUND', 'Copy not found');
    let heldForAnotherPatron = false;
    if (copy.status === 'Reserved') { const ready = this.reservations.getAll().find(item => item.barcode === barcode && item.status === 'Ready'); if (!ready || ready.patronId !== patron.patronId) heldForAnotherPatron = true; }
    if (copy.status !== 'Available' && copy.status !== 'CourseReserve' && copy.status !== 'Reserved') return failure('COPY_NOT_AVAILABLE', 'Copy not available');
    if (copy.status === 'Reserved' && heldForAnotherPatron) return failure('COPY_NOT_AVAILABLE', 'Copy not available');
    const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === barcode));
    return success({ title: book?.title || 'Unknown title', campus: copy.campus, status: copy.status, courseReserve: !!copy.courseReserve, dueDate: addDays(current, copy.courseReserve ? this.settingsRepo.get().courseReserveLoanDays : patron.loanPeriodDays), heldForAnotherPatron });
  }

  previewReturn(barcode, now = new Date()) {
    const loan = this.loans.getAll().find(item => item.barcode === barcode && item.returnDate === null);
    if (!loan) return failure('NOT_FOUND', 'This copy is not currently on loan');
    const current = asDate(now); const patron = this.patrons.getById(loan.patronId); const book = this.books.getAll().find(item => item.copies.some(copy => copy.barcode === barcode)); const settings = this.settingsRepo.get(); const overdueDays = loan.calculateOverdueDays(current); const fine = overdueDays > 0 ? overdueDays * settings.fineRatePerDay : 0;
    const reservation = this.reservations.getAll().find(item => item.isbn === book?.isbn && item.barcode === barcode && item.status === 'Pending');
    return success({ loan, patron: patron ? { id: patron.patronId, name: patron.name, email: patron.email } : null, title: book?.title || 'Unknown title', overdueDays, fine, reservation: reservation ? { patronId: reservation.patronId, patron: this.patrons.getById(reservation.patronId)?.name || null } : null });
  }

  sendOverdueReminder(actor, loanId, now = new Date()) {
    const staffMember = getStaffMember(this.staff, actor); if (!hasPermission(staffMember, PERMISSIONS.PROCESS_LOANS)) return failure('NOT_AUTHORISED', 'Not authorised');
    const current = asDate(now); const loan = this.loans.getById(loanId); if (!loan || !loan.isActive()) return failure('NOT_FOUND', 'Active loan not found'); if (loan.calculateOverdueDays(current) <= 0) return failure('VALIDATION_ERROR', 'Loan is not overdue'); if (loan.lastReminderAt && current - loan.lastReminderAt < 86400000) return failure('VALIDATION_ERROR', 'Overdue reminder already sent within 24 hours');
    const book = this.books.getAll().find(item => item.copies.some(copy => copy.barcode === loan.barcode)); const patron = this.patrons.getById(loan.patronId); const message = `Overdue notice: ${book?.title || 'Unknown title'} was due on ${loan.dueDate.toISOString().slice(0, 10)}. Please return it to avoid further fines.`; this.notifications.add(new Notification(readableId('NT', this.notifications.getAll().length + 1), loan.patronId, message, current)); loan.lastReminderAt = current; this.loans.update(loan.loanId, { lastReminderAt: current }); return success({ loan, notification: message });
  }

  getOverdueLoans(now = new Date(), campus = '') {
    const current = asDate(now); const settings = this.settingsRepo.get();
    const rows = this.loans.findOverdue(current).map(loan => { const patron = this.patrons.getById(loan.patronId); const book = this.books.getAll().find(item => item.copies.some(copy => copy.barcode === loan.barcode)); const copy = this.books.findCopyByBarcode(loan.barcode); const daysOverdue = loan.calculateOverdueDays(current); return { loanId: loan.loanId, patronId: loan.patronId, patronName: patron?.name || '', patronEmail: patron?.email || '', title: book?.title || 'Unknown title', barcode: loan.barcode, campus: copy?.campus || '', dueDate: loan.dueDate, daysOverdue, projectedFine: daysOverdue * settings.fineRatePerDay, lastReminderAt: loan.lastReminderAt }; }).filter(item => !campus || item.campus === campus);
    return success(rows);
  }
}

export class ReservationControl {
  constructor(adapter) {
    this.adapter = adapter;
    this.books = new BookRepository(adapter);
    this.patrons = new PatronRepository(adapter);
    this.reservations = new ReservationRepository(adapter);
    this.notifications = new NotificationRepository(adapter);
    this.loans = new LoanRepository(adapter);
    this.settingsRepo = new SettingsRepository(adapter);
  }

  reserveBook(patronId, isbn, now = new Date()) {
    const current = asDate(now);
    const patron = this.patrons.getById(patronId);
    if (!patron) return failure('NOT_FOUND', 'Patron not found');

    const book = this.books.findByIsbn(isbn);
    if (!book) return failure('NOT_FOUND', 'Book not found');
    const availableCopy = book.copies.find(copy => copy.status === 'Available');
    if (availableCopy) return failure('COPIES_AVAILABLE', 'Copies are available on the shelf. Please pick up the book in person.');
    const settings = this.settingsRepo.get();
    if (patron.fineBalance > settings.maxUnpaidFine) return failure('RESERVATION_PROHIBITED', 'Reservation Prohibited');
    const activeReservations = this.reservations.getAll().filter(item => item.patronId === patronId && item.isbn === isbn && ['Pending', 'Ready'].includes(item.status));
    if (activeReservations.length > 0) return failure('VALIDATION_ERROR', 'You already have an active reservation for this title');
    const patronReservations = this.reservations.getAll().filter(item => item.patronId === patronId && ['Pending', 'Ready'].includes(item.status));
    if (patronReservations.length >= settings.maxActiveReservations) return failure('MAX_LIMIT_REACHED', 'Maximum Limit Reached');

    const onLoanCopies = book.copies.filter(copy => copy.status === 'OnLoan' || copy.status === 'Reserved');
    const targetCopy = onLoanCopies.sort((left, right) => {
      const leftLoan = this.loans.getAll().find(item => item.barcode === left.barcode && item.returnDate === null);
      const rightLoan = this.loans.getAll().find(item => item.barcode === right.barcode && item.returnDate === null);
      const leftDue = leftLoan ? leftLoan.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = rightLoan ? rightLoan.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      return leftDue - rightDue;
    })[0];

    if (!targetCopy) return failure('COPY_NOT_AVAILABLE', 'Copy not available');

    const reservationId = readableId('RS', this.reservations.getAll().length + 1);
    const reservation = new Reservation(reservationId, isbn, targetCopy.barcode, patronId, current, 'Pending', `CULMS-${String(this.reservations.getAll().length + 1).padStart(4, '0')}`);
    this.reservations.add(reservation);
    return success({ reservation, copy: targetCopy });
  }

  cancelReservation(reservationId, patronId) {
    const reservation = this.reservations.getById(reservationId);
    if (!reservation) return failure('NOT_FOUND', 'Reservation not found');
    if (reservation.patronId !== patronId) return failure('NOT_AUTHORISED', 'Not authorised');

    if (reservation.status === 'Ready') {
      const copy = this.books.findCopyByBarcode(reservation.barcode);
      if (copy) {
        copy.status = 'Available';
        const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === reservation.barcode));
        if (book) {
          const matching = book.copies.find(itemCopy => itemCopy.barcode === reservation.barcode);
          if (matching) {
            matching.status = 'Available';
            this.books.update(book.isbn, { copies: book.copies });
          }
        }
      }
      const nextPending = this.reservations.getAll().find(item => item.isbn === reservation.isbn && item.status === 'Pending' && item.reservationId !== reservationId);
      if (nextPending) {
        nextPending.status = 'Ready';
        nextPending.expirationDate = addDays(new Date(), this.settingsRepo.get().reservationHoldDays);
        this.reservations.update(nextPending.reservationId, { status: 'Ready', expirationDate: nextPending.expirationDate });
      }
    }

    reservation.status = 'Cancelled';
    this.reservations.update(reservationId, { status: 'Cancelled' });
    return success({ reservation });
  }

  expireReservations(now = new Date()) {
    const current = asDate(now);
    const expired = [];
    for (const reservation of this.reservations.getAll()) {
      if (['Pending', 'Ready'].includes(reservation.status) && reservation.expirationDate <= current) {
        reservation.status = 'Expired';
        this.reservations.update(reservation.reservationId, { status: 'Expired' });
        if (reservation.status === 'Expired' && reservation.barcode) {
          const copy = this.books.findCopyByBarcode(reservation.barcode);
          if (copy) {
            copy.status = 'Available';
            const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === reservation.barcode));
            if (book) {
              const matching = book.copies.find(itemCopy => itemCopy.barcode === reservation.barcode);
              if (matching) {
                matching.status = 'Available';
                this.books.update(book.isbn, { copies: book.copies });
              }
            }
          }
        }
        expired.push(reservation);
      }
    }
    return success(expired);
  }

  getReservationsForPatron(patronId) {
    const items = this.reservations.getAll().filter(item => item.patronId === patronId);
    return success(items);
  }

  getActiveReservation(patronId, isbn) {
    return this.getReservationsForPatron(patronId).data.find(item => item.isbn === isbn && ['Pending', 'Ready'].includes(item.status)) || null;
  }
}

export class FineControl {
  constructor(adapter) {
    this.adapter = adapter;
    this.patrons = new PatronRepository(adapter);
    this.books = new BookRepository(adapter);
    this.fines = new FineRepository(adapter);
    this.loans = new LoanRepository(adapter);
    this.staff = new StaffRepository(adapter);
    this.books = new BookRepository(adapter);
    this.receipts = new ReceiptRepository(adapter);
    this.settingsRepo = new SettingsRepository(adapter);
  }

  previewFine(loanId, now = new Date()) {
    const loan = this.loans.getById(loanId);
    if (!loan) return failure('NOT_FOUND', 'Loan not found');
    const settings = this.settingsRepo.get();
    const overdueDays = loan.calculateOverdueDays(now);
    const amount = overdueDays * settings.fineRatePerDay;
    return success({ loanId, overdueDays, amount });
  }

  getFinesForPatron(patronId) {
    const items = this.fines.findByPatron(patronId);
    return success(items);
  }

  getUnpaidTotal(patronId) {
    const sum = this.fines.findByPatron(patronId).filter(item => item.paymentStatus === 'Unpaid').reduce((total, item) => total + Number(item.amountAccumulated || 0), 0);
    return success(sum);
  }

  recordPaymentsForPatron(actor, patronId, fineIds, now = new Date()) {
    const staffMember = getStaffMember(this.staff, actor); if (!hasPermission(staffMember, PERMISSIONS.MANAGE_FINES)) return failure('NOT_AUTHORISED', 'Not authorised');
    const patron = this.patrons.getById(patronId); if (!patron) return failure('NOT_FOUND', 'Patron not found');
    const ids = [...new Set(Array.isArray(fineIds) ? fineIds : [])]; if (!ids.length) return failure('VALIDATION_ERROR', 'Select at least one fine');
    const selected = ids.map(id => this.fines.getById(id));
    if (selected.some(fine => !fine || fine.patronId !== patronId)) return failure('VALIDATION_ERROR', 'All selected fines must belong to the patron');
    if (selected.some(fine => fine.paymentStatus !== 'Unpaid')) return failure('VALIDATION_ERROR', 'All selected fines must be unpaid');
    const current = asDate(now); const total = selected.reduce((sum, fine) => sum + Number(fine.amountAccumulated || 0), 0);
    for (const fine of selected) this.fines.update(fine.fineId, { paymentStatus: 'Paid', datePaid: current });
    patron.fineBalance = Math.max(0, Number((patron.fineBalance - total).toFixed(2))); this.patrons.update(patron.patronId, { fineBalance: patron.fineBalance });
    const receipt = new Receipt(readableId('RC', this.receipts.getAll().length + 1), patronId, selected.map(fine => fine.fineId), total, asActorId(actor), current); this.receipts.add(receipt);
    const lines = selected.map(fine => { const loan = this.loans.getById(fine.loanId); const book = loan ? this.books.getAll().find(item => item.copies.some(copy => copy.barcode === loan.barcode)) : null; return { fineId: fine.fineId, title: book?.title || 'Unknown title', amount: Number(fine.amountAccumulated || 0) }; });
    return success({ receipt, patron: { id: patron.patronId, name: patron.name }, lines, total, receivedBy: staffMember.name });
  }

  recordPayment(fineId, actor, now = new Date()) {
    const fine = this.fines.getById(fineId); if (!fine) return failure('NOT_FOUND', 'Fine not found');
    return this.recordPaymentsForPatron(actor, fine.patronId, [fineId], now);
  }

  listPatronsWithUnpaidFines(limit = 10) {
    const settings = this.settingsRepo.get(); const rows = this.patrons.getAll().map(patron => { const fines = this.fines.findUnpaidByPatron(patron.patronId); const total = fines.reduce((sum, fine) => sum + Number(fine.amountAccumulated || 0), 0); return { id: patron.patronId, name: patron.name, type: patron.constructor.name, campus: patron.campus, unpaidTotal: total, unpaidCount: fines.length, blocked: total > settings.maxUnpaidFine }; }).filter(row => row.unpaidCount).sort((a,b) => b.unpaidTotal - a.unpaidTotal); return success(rows.slice(0, Math.max(0, limit)));
  }

  getReceipt(receiptId) { const receipt = this.receipts.getById(receiptId); return receipt ? success(receipt) : failure('NOT_FOUND', 'Receipt not found'); }
  listReceiptsForPatron(patronId) { return success(this.receipts.findByPatron(patronId)); }

  getFineView(patronId) {
    const patron = this.patrons.getById(patronId); if (!patron) return failure('NOT_FOUND', 'Patron not found');
    const settings = this.settingsRepo.get(); const fines = this.fines.findByPatron(patronId); const unpaidTotal = fines.filter(item => item.paymentStatus === 'Unpaid').reduce((sum, item) => sum + Number(item.amountAccumulated || 0), 0);
    const rows = fines.map(fine => { const loan = this.loans.getById(fine.loanId); const book = loan ? this.books.getAll().find(item => item.copies.some(copy => copy.barcode === loan.barcode)) : null; return { fineId: fine.fineId, loanId: fine.loanId, title: book?.title || 'Unknown title', amount: Number(fine.amountAccumulated || 0), paymentStatus: fine.paymentStatus, dateCreated: fine.dateCreated, datePaid: fine.datePaid }; });
    return success({ fines: rows, unpaidTotal, maxUnpaidFine: settings.maxUnpaidFine, blocked: unpaidTotal > settings.maxUnpaidFine });
  }

  getFineSummary(now = new Date()) {
    const records = this.fines.getAll();
    const totalUnpaid = records.filter(item => item.paymentStatus === 'Unpaid').reduce((sum, item) => sum + Number(item.amountAccumulated || 0), 0);
    const totalCollected = records.filter(item => item.paymentStatus === 'Paid').reduce((sum, item) => sum + Number(item.amountAccumulated || 0), 0);
    const blockedPatrons = this.listPatronsWithUnpaidFines(Number.MAX_SAFE_INTEGER).data.filter(item => item.blocked).length;
    return success({ totalUnpaid, totalCollected, unpaidCount: records.filter(item => item.paymentStatus === 'Unpaid').length, collectedCount: records.filter(item => item.paymentStatus === 'Paid').length, blockedPatrons });
  }
}

export class CatalogueControl {
  constructor(adapter) {
    this.adapter = adapter;
    this.books = new BookRepository(adapter);
    this.patrons = new PatronRepository(adapter);
    this.staff = new StaffRepository(adapter);
    this.acquisitionRequests = new AcquisitionRequestRepository(adapter);
    this.loans = new LoanRepository(adapter);
  }

  listCategories() {
    return [...new Set(this.books.getAll().map(book => book.category))].sort((left, right) => left.localeCompare(right));
  }

  listCampuses() {
    return [...new Set(this.books.getAll().flatMap(book => book.copies.map(copy => copy.campus)))].sort((left, right) => left.localeCompare(right));
  }

  searchBooks({ query = '', campus = '', category = '', availableOnly = false, sortBy = 'title' } = {}) {
    const text = (query || '').toLowerCase();
    const books = this.books.getAll().filter(book => {
      const matchesText = !text || [book.title, book.author, book.isbn].some(value => String(value).toLowerCase().includes(text));
      const matchesCampus = !campus || book.copies.some(copy => copy.campus === campus);
      const matchesCategory = !category || book.category === category;
      const matchesAvailable = !availableOnly || book.copies.some(copy => copy.status === 'Available');
      return matchesText && matchesCampus && matchesCategory && matchesAvailable;
    });

    const rows = books.map(book => {
      const totalCopies = book.copies.length;
      const availableCopies = book.copies.filter(copy => copy.status === 'Available').length;
      const campusStats = {};
      const campuses = [...new Set(book.copies.map(copy => copy.campus))];
      for (const campusName of campuses) {
        const campusCopies = book.copies.filter(copy => copy.campus === campusName);
        campusStats[campusName] = { totalCopies: campusCopies.length, availableCopies: campusCopies.filter(copy => copy.status === 'Available').length };
      }
      const hasReserved = book.copies.some(copy => copy.status === 'Reserved');
      const hasCourseReserve = book.copies.some(copy => copy.status === 'CourseReserve' || copy.courseReserve);
      const status = availableCopies > 0 ? 'Available' : hasReserved ? 'Reserved' : hasCourseReserve && book.copies.every(copy => copy.courseReserve || copy.status === 'CourseReserve') ? 'Course reserve only' : 'All copies on loan';
      return {
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        category: book.category,
        totalCopies,
        availableCopies,
        campusStats,
        status
      };
    });
    const comparators = {
      title: (left, right) => left.title.localeCompare(right.title),
      author: (left, right) => left.author.localeCompare(right.author),
      availability: (left, right) => right.availableCopies - left.availableCopies || left.title.localeCompare(right.title)
    };
    rows.sort(comparators[sortBy] || comparators.title);
    return success(rows);
  }

  getBookDetail(isbn) {
    const book = this.books.findByIsbn(isbn);
    if (!book) return failure('NOT_FOUND', 'Book not found');
    return success({ ...book.toJSON(), copies: book.copies.map(copy => ({ ...copy.toJSON() })) });
  }

  nextBarcode() { const numbers = this.books.getAll().flatMap(book => book.copies).map(copy => Number(String(copy.barcode).match(/^BC-(\d+)$/)?.[1] || 0)); return `BC-${String(Math.max(0, ...numbers) + 1).padStart(5, '0')}`; }

  addBook(actor, payload = {}) {
    const staffMember = getStaffMember(this.staff, actor); if (!hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised');
    const { isbn, title, author, category, initialCopies = [], copies } = payload; const sourceCopies = initialCopies.length ? initialCopies : (copies || []);
    if (!isValidIsbn(isbn)) return failure('VALIDATION_ERROR', 'ISBN must contain 10 or 13 digits'); if (String(title || '').trim().length < 2 || String(author || '').trim().length < 2 || !String(category || '').trim()) return failure('VALIDATION_ERROR', 'Title, author and category are required');
    if (this.books.getAll().some(book => normalizeIsbn(book.isbn) === normalizeIsbn(isbn))) return failure('DUPLICATE_ISBN', 'A book with this ISBN already exists');
    const campuses = this.listCampuses(); const invalid = sourceCopies.find(copy => !campuses.includes(copy.campus) || !String(copy.shelfLocation || '').trim() || !validConditions.has(copy.conditionStatus || 'Good')); if (invalid) return failure('VALIDATION_ERROR', 'Invalid initial copy details');
    let next = Math.max(0, ...this.books.getAll().flatMap(book => book.copies).map(copy => Number(String(copy.barcode).replace('BC-', '')) || 0)); const built = sourceCopies.map(copy => new BookCopy(`BC-${String(++next).padStart(5, '0')}`, isbn, copy.shelfLocation, copy.conditionStatus || 'Good', copy.campus));
    const book = new Book(String(isbn).trim(), String(title).trim(), String(author).trim(), String(category).trim(), built); this.books.add(book); return success({ book });
  }

  updateBook(actor, isbn, changes = {}) {
    const staffMember = getStaffMember(this.staff, actor); if (!hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised'); const book = this.books.findByIsbn(isbn); if (!book) return failure('NOT_FOUND', 'Book not found');
    const next = {}; for (const key of ['title', 'author', 'category']) if (changes[key] !== undefined) next[key] = String(changes[key]).trim(); if (next.title !== undefined && next.title.length < 2 || next.author !== undefined && next.author.length < 2 || next.category !== undefined && !next.category) return failure('VALIDATION_ERROR', 'Title, author and category are required'); const updated = this.books.update(isbn, next); return success({ book: updated });
  }

  deleteBook(actor, isbn) {
    const staffMember = getStaffMember(this.staff, actor); if (!hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised'); const book = this.books.findByIsbn(isbn); if (!book) return failure('NOT_FOUND', 'Book not found'); if (book.copies.some(copy => copy.status === 'OnLoan' || copy.status === 'Reserved')) return failure('VALIDATION_ERROR', 'Book cannot be deleted while copies are on loan or reserved'); const deletedCopies = book.copies.length; this.books.remove(isbn); return success({ deleted: true, deletedCopies });
  }

  addCopy(actor, isbn, payload = {}) {
    if (typeof isbn === 'object') { payload = isbn; isbn = payload.isbn; }
    const staffMember = getStaffMember(this.staff, actor); if (!hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised'); const { campus, shelfLocation, conditionStatus = 'Good' } = payload; if (!this.listCampuses().includes(campus) || !String(shelfLocation || '').trim() || !validConditions.has(conditionStatus)) return failure('VALIDATION_ERROR', 'Invalid copy details'); const book = this.books.findByIsbn(isbn); if (!book) return failure('NOT_FOUND', 'Book not found'); const copy = new BookCopy(this.nextBarcode(), isbn, shelfLocation, conditionStatus, campus); this.books.addCopy(copy); return success({ copy });
  }

  updateCopy(actor, barcode, changes = {}) {
    const staffMember = getStaffMember(this.staff, actor); if (!hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised'); const copy = this.books.findCopyByBarcode(barcode); if (!copy) return failure('NOT_FOUND', 'Copy not found'); if (Object.keys(changes).some(key => !['campus', 'shelfLocation', 'conditionStatus'].includes(key))) return failure('VALIDATION_ERROR', 'Copy status cannot be edited by hand'); if (changes.conditionStatus !== undefined && !validConditions.has(changes.conditionStatus)) return failure('VALIDATION_ERROR', 'Invalid condition'); if (changes.campus !== undefined && !this.listCampuses().includes(changes.campus)) return failure('VALIDATION_ERROR', 'Invalid campus'); if (changes.campus && changes.campus !== copy.campus && ['OnLoan', 'Reserved'].includes(copy.status)) return failure('VALIDATION_ERROR', 'Copy campus cannot change while it is on loan or reserved'); const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === barcode)); const index = book.copies.findIndex(item => item.barcode === barcode); Object.assign(book.copies[index], changes); this.books.update(book.isbn, { copies: book.copies }); return success({ copy: book.copies[index] });
  }

  listBooksForManagement({ query = '', category = '', campus = '', page = 1, pageSize = 10 } = {}) { const text = String(query).toLowerCase(); const all = this.books.getAll().filter(book => (!text || [book.title, book.author, book.isbn].some(value => String(value).toLowerCase().includes(text))) && (!category || book.category === category) && (!campus || book.copies.some(copy => copy.campus === campus))).map(book => ({ isbn: book.isbn, title: book.title, author: book.author, category: book.category, totalCopies: book.copies.length, availableCopies: book.copies.filter(copy => copy.status === 'Available').length, onLoanCopies: book.copies.filter(copy => copy.status === 'OnLoan').length })); const start = Math.max(0, (Number(page) - 1) * Number(pageSize)); return success({ rows: all.slice(start, start + Number(pageSize)), total: all.length }); }

  placeOnCourseReserve(professorId, barcode, courseCode) {
    const professor = this.patrons.getById(professorId); if (!(professor instanceof Professor)) return failure('NOT_AUTHORISED', 'Only professors can place copies on course reserve');
    const code = String(courseCode || '').trim(); if (!code) return failure('VALIDATION_ERROR', 'Course code is required'); if (code.length > 20 || !/^[A-Za-z0-9 -]+$/.test(code)) return failure('VALIDATION_ERROR', 'Course code must be 20 characters or fewer and use only letters, numbers, spaces and hyphens');
    const copy = this.books.findCopyByBarcode(barcode); if (!copy) return failure('NOT_FOUND', 'Copy not found'); if (copy.status !== 'Available') return failure('COPY_NOT_AVAILABLE', 'Copy not available'); if (copy.courseReserve) return failure('VALIDATION_ERROR', 'Copy is already on course reserve');
    const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === barcode)); const updated = { courseReserve: true, courseCode: code, placedBy: professorId, placedDate: new Date() }; Object.assign(copy, updated); if (book) this.books.update(book.isbn, { copies: book.copies }); return success({ copy });
  }

  removeFromCourseReserve(professorId, barcode) {
    const professor = this.patrons.getById(professorId); if (!(professor instanceof Professor)) return failure('NOT_AUTHORISED', 'Only professors can manage course reserves');
    const copy = this.books.findCopyByBarcode(barcode); if (!copy) return failure('NOT_FOUND', 'Copy not found'); if (!copy.courseReserve) return failure('VALIDATION_ERROR', 'Copy is not on course reserve'); if (copy.placedBy !== professorId) return failure('NOT_AUTHORISED', 'Only the placing professor can remove this copy'); if (copy.status !== 'Available') return failure('COPY_NOT_AVAILABLE', 'Copy is not available');
    const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === barcode)); Object.assign(copy, { courseReserve: false, courseCode: null, placedBy: null, placedDate: null }); if (book) this.books.update(book.isbn, { copies: book.copies }); return success({ copy });
  }

  listCourseReserveForProfessor(professorId) {
    const professor = this.patrons.getById(professorId); if (!(professor instanceof Professor)) return failure('NOT_AUTHORISED', 'Only professors can view course reserves');
    const loans = this.loans?.getAll ? this.loans.getAll() : [];
    const items = this.books.getAll().flatMap(book => book.copies.filter(copy => copy.courseReserve && copy.placedBy === professorId).map(copy => ({ title: book.title, isbn: book.isbn, barcode: copy.barcode, campus: copy.campus, status: copy.status, courseCode: copy.courseCode, placedDate: copy.placedDate, timesBorrowed: loans.filter(loan => loan.barcode === copy.barcode && copy.placedDate && new Date(loan.issueDate) >= new Date(copy.placedDate)).length, canRemove: copy.status === 'Available' })));
    return success(items);
  }

  listPlaceableCopies(isbn) { const book = this.books.findByIsbn(isbn); if (!book) return failure('NOT_FOUND', 'Book not found'); return success(book.copies.filter(copy => copy.status === 'Available' && !copy.courseReserve)); }

  requestNewAcquisition(professorId, payload = {}) {
    const patron = this.patrons.getById(professorId);
    if (!patron || patron.constructor.name !== 'Professor') return failure('NOT_AUTHORISED', 'Only professors can request acquisitions');
    const { title, author, isbn = null, justification, estimatedCost = null } = payload;
    if (!String(title || '').trim() || !String(author || '').trim()) return failure('VALIDATION_ERROR', 'Title and author are required'); if (String(justification || '').trim().length < 10) return failure('VALIDATION_ERROR', 'Justification must be at least 10 characters'); if (estimatedCost !== null && (typeof estimatedCost !== 'number' || estimatedCost < 0)) return failure('VALIDATION_ERROR', 'Estimated cost must be non-negative');
    const request = new AcquisitionRequest(
      readableId('AR', this.acquisitionRequests.getAll().length + 1),
      professorId,
      title,
      author,
      justification,
      isbn,
      estimatedCost,
      'Pending',
      new Date()
    );
    this.acquisitionRequests.add(request);
    return success({ request });
  }

  listMyAcquisitionRequests(professorId) { const professor = this.patrons.getById(professorId); if (!(professor instanceof Professor)) return failure('NOT_AUTHORISED', 'Only professors can view acquisition requests'); return success(this.acquisitionRequests.getAll().filter(item => item.professorId === professorId).sort((left, right) => new Date(right.dateCreated) - new Date(left.dateCreated))); }

  listAcquisitionRequests(actor) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !(hasPermission(staffMember, PERMISSIONS.APPROVE_ACQUISITIONS) || hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE))) {
      return failure('NOT_AUTHORISED', 'Not authorised');
    }
    return success(this.acquisitionRequests.getAll());
  }

  reviewAcquisition(requestId, decision, actor) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !hasPermission(staffMember, PERMISSIONS.APPROVE_ACQUISITIONS)) return failure('NOT_AUTHORISED', 'Not authorised');
    const request = this.acquisitionRequests.getById(requestId);
    if (!request) return failure('NOT_FOUND', 'Acquisition request not found');
    const nextDecision = String(decision || '').charAt(0).toUpperCase() + String(decision || '').slice(1).toLowerCase();
    if (!['Approved', 'Rejected'].includes(nextDecision)) return failure('VALIDATION_ERROR', 'Decision must be Approved or Rejected');
    request.status = nextDecision;
    this.acquisitionRequests.update(requestId, { status: nextDecision });
    return success({ request });
  }
}

export class ReportControl {
  constructor(adapter) {
    this.adapter = adapter;
    this.books = new BookRepository(adapter);
    this.patrons = new PatronRepository(adapter);
    this.loans = new LoanRepository(adapter);
    this.fines = new FineRepository(adapter);
    this.acquisitionRequests = new AcquisitionRequestRepository(adapter);
    this.staff = new StaffRepository(adapter);
  }

  getDashboardStats(now = new Date()) {
    const current = asDate(now);
    const activeLoans = this.loans.getAll().filter(item => item.returnDate === null);
    const overdueLoans = this.loans.getAll().filter(item => item.returnDate === null && item.calculateOverdueDays(current) > 0);
    const unpaidFines = this.fines.getAll().filter(item => item.paymentStatus === 'Unpaid');
    const collectedFines = this.fines.getAll().filter(item => item.paymentStatus === 'Paid');
    return success({
      titles: this.books.getAll().length,
      copies: this.books.getAll().reduce((sum, book) => sum + (book.copies || []).length, 0),
      patrons: this.patrons.getAll().length,
      activeLoans: activeLoans.length,
      overdueLoans: overdueLoans.length,
      unpaidFinesTotal: unpaidFines.reduce((sum, item) => sum + Number(item.amountAccumulated || 0), 0),
      finesCollectedTotal: collectedFines.reduce((sum, item) => sum + Number(item.amountAccumulated || 0), 0)
    });
  }

  getLoansPerMonth(months = 6, now = new Date()) {
    const current = asDate(now);
    const items = [];
    for (let index = months - 1; index >= 0; index -= 1) {
      const monthDate = new Date(current.getFullYear(), current.getMonth() - index, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const count = this.loans.getAll().filter(loan => {
        const loanDate = new Date(loan.issueDate);
        return loanDate.getFullYear() === monthDate.getFullYear() && loanDate.getMonth() === monthDate.getMonth();
      }).length;
      items.push({ month: monthKey, count });
    }
    return success(items);
  }

  getFineCollectionsPerMonth(months = 6, now = new Date()) {
    const current = asDate(now);
    const items = [];
    for (let index = months - 1; index >= 0; index -= 1) {
      const monthDate = new Date(current.getFullYear(), current.getMonth() - index, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const amount = this.fines.getAll().filter(fine => fine.paymentStatus === 'Paid' && fine.datePaid).reduce((sum, fine) => {
        const paidDate = new Date(fine.datePaid);
        if (paidDate.getFullYear() === monthDate.getFullYear() && paidDate.getMonth() === monthDate.getMonth()) {
          return sum + Number(fine.amountAccumulated || 0);
        }
        return sum;
      }, 0);
      items.push({ month: monthKey, total: amount });
    }
    return success(items);
  }

  getTopBorrowedBooks(limit = 5) {
    const counts = new Map();
    for (const loan of this.loans.getAll()) {
      const book = this.books.getAll().find(item => item.copies.some(copy => copy.barcode === loan.barcode));
      const key = book ? book.title : 'Unknown';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return success([...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, limit).map(([title, count]) => ({ title, count })));
  }

  getCampusStats() {
    const stats = {};
    for (const book of this.books.getAll()) {
      for (const copy of book.copies) {
        if (!stats[copy.campus]) {
          stats[copy.campus] = { copies: 0, onLoan: 0, available: 0 };
        }
        stats[copy.campus].copies += 1;
        if (copy.status === 'OnLoan') stats[copy.campus].onLoan += 1;
        if (copy.status === 'Available') stats[copy.campus].available += 1;
      }
    }
    return success(stats);
  }

  generateBudgetReport(actor, now = new Date()) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !hasPermission(staffMember, PERMISSIONS.VIEW_REPORTS)) return failure('NOT_AUTHORISED', 'Not authorised');
    const collected = this.fines.getAll().filter(item => item.paymentStatus === 'Paid').reduce((sum, item) => sum + Number(item.amountAccumulated || 0), 0);
    const outstanding = this.fines.getAll().filter(item => item.paymentStatus === 'Unpaid').reduce((sum, item) => sum + Number(item.amountAccumulated || 0), 0);
    const requestsByStatus = { Pending: 0, Approved: 0, Rejected: 0 };
    for (const request of this.acquisitionRequests.getAll()) {
      if (requestsByStatus[request.status] !== undefined) requestsByStatus[request.status] += 1;
    }
    const pendingAndApprovedCost = this.acquisitionRequests.getAll().filter(item => ['Pending', 'Approved'].includes(item.status)).reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0);
    return success({
      collected,
      outstanding,
      acquisitionRequestsByStatus: requestsByStatus,
      pendingAndApprovedCost,
      generatedAt: asDate(now),
      totalRequests: this.acquisitionRequests.getAll().length
    });
  }

  toCsv(rows, columns) {
    if (!Array.isArray(rows) || !Array.isArray(columns)) return '';
    const escape = value => {
      const text = value == null ? '' : String(value);
      const escaped = text.replace(/"/g, '""');
      return /[",\n]/.test(text) ? `"${escaped}"` : escaped;
    };
    const header = columns.map(escape).join(',');
    const body = rows.map(row => columns.map(column => escape(row?.[column])).join(',')).join('\n');
    return `${header}\n${body}`.trim();
  }
}

export class NotificationControl {
  constructor(adapter) {
    this.notifications = new NotificationRepository(adapter);
  }

  getForUser(userId) {
    return success(this.notifications.getAll().filter(item => item.recipientId === userId));
  }

  unreadCount(userId) {
    const count = this.notifications.getAll().filter(item => item.recipientId === userId && !item.read).length;
    return success(count);
  }

  markRead(notificationId) {
    const item = this.notifications.getById(notificationId);
    if (!item) return failure('NOT_FOUND', 'Notification not found');
    item.read = true;
    this.notifications.update(notificationId, { read: true });
    return success({ notification: item });
  }

  markAllRead(userId) {
    const items = this.notifications.getAll().filter(item => item.recipientId === userId && !item.read);
    for (const item of items) {
      item.read = true;
      this.notifications.update(item.notificationId, { read: true });
    }
    return success(items);
  }
}

export class StaffControl {
  constructor(adapter) {
    this.staff = new StaffRepository(adapter);
  }

  listStaff(actor) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember) return failure('NOT_AUTHORISED', 'Not authorised');
    return success(this.staff.getAll());
  }

  updateStaffPermissions(actor, staffId, permissions = []) {
    const actingMember = getStaffMember(this.staff, actor);
    if (!actingMember || !hasPermission(actingMember, PERMISSIONS.MANAGE_STAFF)) {
      return failure('NOT_AUTHORISED', 'Not authorised');
    }
    const member = this.staff.getById(staffId);
    if (!member) return failure('NOT_FOUND', 'Staff member not found');
    const validPermissions = new Set(Object.values(PERMISSIONS));
    const invalidPermission = permissions.find(item => !validPermissions.has(item));
    if (invalidPermission) return failure('VALIDATION_ERROR', `Unknown permission: ${invalidPermission}`);
    if (staffId === actor && !permissions.includes(PERMISSIONS.MANAGE_STAFF)) {
      return failure('VALIDATION_ERROR', 'Administrator cannot remove MANAGE_STAFF from themselves');
    }
    member.permissions = [...new Set(permissions)];
    this.staff.update(staffId, { permissions: member.permissions });
    return success({ staff: member });
  }
}

export class SettingsControl {
  constructor(adapter) {
    this.staff = new StaffRepository(adapter);
    this.settingsRepo = new SettingsRepository(adapter);
  }

  getSettings() {
    return success(this.settingsRepo.get());
  }

  updateSettings(actor, partial = {}) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !hasPermission(staffMember, PERMISSIONS.MANAGE_SETTINGS)) {
      return failure('NOT_AUTHORISED', 'Not authorised');
    }
    const settings = this.settingsRepo.get();
    const entries = Object.entries(partial || {});
    for (const [key, value] of entries) {
      if (['fineRatePerDay', 'maxUnpaidFine', 'maxActiveReservations', 'courseReserveLoanDays', 'reservationHoldDays', 'studentLimit', 'professorLimit', 'studentLoanDays', 'professorLoanDays'].includes(key)) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
          return failure('VALIDATION_ERROR', `Setting ${key} must be a positive number`);
        }
      }
    }
    const next = Object.assign(new Settings(settings.toJSON ? settings.toJSON() : settings), partial);
    this.settingsRepo.saveSettings(next);
    return success({ settings: next });
  }
}

export class AuthControl {
  constructor(adapter) { this.adapter = adapter; this.patrons = new PatronRepository(adapter); this.staff = new StaffRepository(adapter); this.credentials = new CredentialRepository(adapter); this.settingsRepo = new SettingsRepository(adapter); }
  listDemoAccounts() { return [...this.patrons.getAll(), ...this.staff.getAll()].map(item => ({ id: item.patronId || item.staffId, name: item.name, email: item.email, role: item instanceof Student ? 'Student' : item instanceof Professor ? 'Professor' : item instanceof Librarian ? 'Librarian' : 'Administrator', campus: item.campus })); }
  accountFor(identifier) { const value = String(identifier || '').trim().toLowerCase(); return this.listDemoAccounts().find(item => item.id.toLowerCase() === value || item.email.toLowerCase() === value) || null; }
  userFor(account) { const entity = this.patrons.getById(account.id) || this.staff.getById(account.id); return { ...account, permissions: entity.permissions || [] }; }
  async verify(account, password) { const credential = this.credentials.getById(account.id); if (!credential) return constantTimeEqual(password, this.settingsRepo.get().defaultDemoPassword); const hash = await hashPassword(password, credential.salt, credential.iterations); return constantTimeEqual(hash, credential.hash); }
  resolve(accountId, role) { const account = this.listDemoAccounts().find(item => item.id === accountId && item.role === role); return account ? success(this.userFor(account)) : failure('AUTHENTICATION_FAILED', 'Demo account not found for the selected role'); }
  async login(identifier, password) { if (!String(identifier || '').trim() || !String(password || '')) return failure('VALIDATION_ERROR', 'ID or email and password are required'); const account = this.accountFor(identifier); if (!account || !(await this.verify(account, password))) return failure('AUTHENTICATION_FAILED', 'Invalid ID or password'); return success(this.userFor(account)); }
  async changePassword(userId, currentPassword, newPassword) { const account = this.listDemoAccounts().find(item => item.id === userId); if (!account) return failure('NOT_FOUND', 'Account not found'); if (!(await this.verify(account, currentPassword))) return failure('AUTHENTICATION_FAILED', 'Current password is incorrect'); if (newPassword.length < 8) return failure('VALIDATION_ERROR', 'New password must be at least 8 characters'); if (!/[A-Za-z]/.test(newPassword)) return failure('VALIDATION_ERROR', 'New password must contain at least one letter'); if (!/[0-9]/.test(newPassword)) return failure('VALIDATION_ERROR', 'New password must contain at least one number'); if (constantTimeEqual(currentPassword, newPassword)) return failure('VALIDATION_ERROR', 'New password must be different from the current password'); const salt = generateSalt(); const iterations = 100000; this.credentials.add(new Credential(userId, account.role, base64(salt), await hashPassword(newPassword, salt, iterations), iterations)); return success(this.userFor(account)); }
  resetCredentials() { this.credentials.clear(); return success(true); }
}


export function createCULMS(adapter) {
  return {
    borrowing: new BorrowingControl(adapter),
    reservations: new ReservationControl(adapter),
    fines: new FineControl(adapter),
    catalogue: new CatalogueControl(adapter),
    reports: new ReportControl(adapter),
    notifications: new NotificationControl(adapter),
    staff: new StaffControl(adapter),
    settings: new SettingsControl(adapter),
    auth: new AuthControl(adapter),
    resetDemoData() { resetToSeed(adapter); this.auth.resetCredentials(); return success(true); }
  };
}

export const business = { AuthControl, BorrowingControl, ReservationControl, FineControl, CatalogueControl, ReportControl, NotificationControl, StaffControl, SettingsControl };
