import {
  AcquisitionRequest,
  Book,
  BookCopy,
  Fine,
  Notification,
  PERMISSIONS,
  Reservation,
  Settings,
  Staff,
  Student,
  Professor,
  LibraryAdministrator,
  LoanRecord,
  BookRepository,
  PatronRepository,
  StaffRepository,
  LoanRepository,
  ReservationRepository,
  FineRepository,
  NotificationRepository,
  SettingsRepository,
  AcquisitionRequestRepository,
  readableId,
  SCHEMA_VERSION_KEY
} from '../data/index.js';

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
    this.loans = new LoanRepository(adapter);
    this.reservations = new ReservationRepository(adapter);
    this.fines = new FineRepository(adapter);
    this.notifications = new NotificationRepository(adapter);
    this.settingsRepo = new SettingsRepository(adapter);
  }

  borrowBook(patronId, barcode, now = new Date()) {
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

  returnBook(barcode, now = new Date()) {
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
      return { ...buildLoanSummary(loan, patron, book?.title || 'Unknown title'), loan };
    });
    return success(rows);
  }

  getLoanHistory(patronId) {
    const loans = this.loans.getAll().filter(item => item.patronId === patronId);
    const rows = loans.map(loan => {
      const patron = this.patrons.getById(loan.patronId);
      const book = this.books.getAll().find(item => item.copies.some(copy => copy.barcode === loan.barcode));
      return { ...buildLoanSummary(loan, patron, book?.title || 'Unknown title'), loan };
    });
    return success(rows);
  }

  getOverdueLoans(now = new Date()) {
    const current = asDate(now);
    const rows = this.loans.findOverdue(current).map(loan => {
      const patron = this.patrons.getById(loan.patronId);
      const book = this.books.getAll().find(item => item.copies.some(copy => copy.barcode === loan.barcode));
      const overdueDays = loan.calculateOverdueDays(current);
      return { ...buildLoanSummary(loan, patron, book?.title || 'Unknown title'), overdueDays, loan };
    });
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
}

export class FineControl {
  constructor(adapter) {
    this.adapter = adapter;
    this.patrons = new PatronRepository(adapter);
    this.fines = new FineRepository(adapter);
    this.loans = new LoanRepository(adapter);
    this.staff = new StaffRepository(adapter);
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

  recordPayment(fineId, actor, now = new Date()) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !hasPermission(staffMember, PERMISSIONS.MANAGE_FINES)) {
      return failure('NOT_AUTHORISED', 'Not authorised');
    }
    const fine = this.fines.getById(fineId);
    if (!fine) return failure('NOT_FOUND', 'Fine not found');
    if (fine.paymentStatus === 'Paid') return failure('VALIDATION_ERROR', 'Fine is already paid');
    fine.paymentStatus = 'Paid';
    fine.datePaid = asDate(now);
    this.fines.update(fineId, { paymentStatus: 'Paid', datePaid: fine.datePaid });
    const patron = this.patrons.getById(fine.patronId);
    if (patron) {
      patron.fineBalance = Math.max(0, patron.fineBalance - Number(fine.amountAccumulated || 0));
      this.patrons.update(patron.patronId, { fineBalance: patron.fineBalance });
    }
    return success({ fine });
  }

  getFineSummary(now = new Date()) {
    const records = this.fines.getAll();
    const totalUnpaid = records.filter(item => item.paymentStatus === 'Unpaid').reduce((sum, item) => sum + Number(item.amountAccumulated || 0), 0);
    const totalCollected = records.filter(item => item.paymentStatus === 'Paid').reduce((sum, item) => sum + Number(item.amountAccumulated || 0), 0);
    return success({ totalUnpaid, totalCollected, unpaidCount: records.filter(item => item.paymentStatus === 'Unpaid').length, collectedCount: records.filter(item => item.paymentStatus === 'Paid').length });
  }
}

export class CatalogueControl {
  constructor(adapter) {
    this.adapter = adapter;
    this.books = new BookRepository(adapter);
    this.patrons = new PatronRepository(adapter);
    this.staff = new StaffRepository(adapter);
    this.acquisitionRequests = new AcquisitionRequestRepository(adapter);
  }

  searchBooks({ query = '', campus = '', category = '', availableOnly = false } = {}) {
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
      return {
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        category: book.category,
        totalCopies,
        availableCopies,
        campusStats,
        status: availableCopies > 0 ? 'Available' : 'Unavailable'
      };
    });
    return success(rows);
  }

  getBookDetail(isbn) {
    const book = this.books.findByIsbn(isbn);
    if (!book) return failure('NOT_FOUND', 'Book not found');
    return success({ ...book.toJSON(), copies: book.copies.map(copy => ({ ...copy.toJSON() })) });
  }

  addBook(actor, payload) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised');
    const { isbn, title, author, category, copies = [] } = payload || {};
    if (!isbn || !title || !author || !category) return failure('VALIDATION_ERROR', 'Missing required fields');
    const book = new Book(isbn, title, author, category, copies.map(copy => new BookCopy(copy.barcode, isbn, copy.shelfLocation, copy.conditionStatus || 'Good', copy.campus, copy.status || 'Available', Boolean(copy.courseReserve))));
    this.books.add(book);
    return success({ book });
  }

  updateBook(actor, isbn, changes) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised');
    const book = this.books.findByIsbn(isbn);
    if (!book) return failure('NOT_FOUND', 'Book not found');
    const updated = this.books.update(isbn, changes);
    return success({ book: updated });
  }

  deleteBook(actor, isbn) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised');
    const book = this.books.findByIsbn(isbn);
    if (!book) return failure('NOT_FOUND', 'Book not found');
    if (book.copies.some(copy => copy.status === 'OnLoan' || copy.status === 'Reserved')) return failure('VALIDATION_ERROR', 'Book cannot be deleted while copies are on loan or reserved');
    this.books.remove(isbn);
    return success({ deleted: true });
  }

  addCopy(actor, payload) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised');
    const { isbn, barcode, shelfLocation, conditionStatus, campus, status = 'Available', courseReserve = false } = payload || {};
    if (!isbn || !barcode || !shelfLocation || !campus) return failure('VALIDATION_ERROR', 'Missing required copy fields');
    const copy = new BookCopy(barcode, isbn, shelfLocation, conditionStatus || 'Good', campus, status, courseReserve);
    this.books.addCopy(copy);
    return success({ copy });
  }

  updateCopy(actor, barcode, changes) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised');
    const copy = this.books.findCopyByBarcode(barcode);
    if (!copy) return failure('NOT_FOUND', 'Copy not found');
    const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === barcode));
    if (!book) return failure('NOT_FOUND', 'Book not found');
    const index = book.copies.findIndex(itemCopy => itemCopy.barcode === barcode);
    Object.assign(book.copies[index], changes);
    this.books.update(book.isbn, { copies: book.copies });
    return success({ copy: book.copies[index] });
  }

  removeCopy(actor, barcode) {
    const staffMember = getStaffMember(this.staff, actor);
    if (!staffMember || !hasPermission(staffMember, PERMISSIONS.MANAGE_CATALOGUE)) return failure('NOT_AUTHORISED', 'Not authorised');
    const copy = this.books.findCopyByBarcode(barcode);
    if (!copy) return failure('NOT_FOUND', 'Copy not found');
    if (copy.status === 'OnLoan' || copy.status === 'Reserved') return failure('VALIDATION_ERROR', 'Copy cannot be removed while on loan or reserved');
    const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === barcode));
    if (!book) return failure('NOT_FOUND', 'Book not found');
    book.copies = book.copies.filter(itemCopy => itemCopy.barcode !== barcode);
    this.books.update(book.isbn, { copies: book.copies });
    return success({ removed: true });
  }

  placeOnCourseReserve(professorId, barcode) {
    const patron = this.patrons.getById(professorId);
    if (!patron || patron.constructor.name !== 'Professor') return failure('NOT_AUTHORISED', 'Only professors can place copies on course reserve');
    const copy = this.books.findCopyByBarcode(barcode);
    if (!copy) return failure('NOT_FOUND', 'Copy not found');
    if (copy.status !== 'Available') return failure('COPY_NOT_AVAILABLE', 'Copy not available');
    copy.courseReserve = true;
    const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === barcode));
    if (book) {
      const index = book.copies.findIndex(itemCopy => itemCopy.barcode === barcode);
      book.copies[index].courseReserve = true;
      this.books.update(book.isbn, { copies: book.copies });
    }
    return success({ copy });
  }

  removeFromCourseReserve(professorId, barcode) {
    const patron = this.patrons.getById(professorId);
    if (!patron || patron.constructor.name !== 'Professor') return failure('NOT_AUTHORISED', 'Only professors can manage course reserves');
    const copy = this.books.findCopyByBarcode(barcode);
    if (!copy) return failure('NOT_FOUND', 'Copy not found');
    if (!copy.courseReserve) return failure('VALIDATION_ERROR', 'Copy is not on course reserve');
    copy.courseReserve = false;
    const book = this.books.getAll().find(item => item.copies.some(itemCopy => itemCopy.barcode === barcode));
    if (book) {
      const index = book.copies.findIndex(itemCopy => itemCopy.barcode === barcode);
      book.copies[index].courseReserve = false;
      this.books.update(book.isbn, { copies: book.copies });
    }
    return success({ copy });
  }

  requestNewAcquisition(professorId, payload = {}) {
    const patron = this.patrons.getById(professorId);
    if (!patron || patron.constructor.name !== 'Professor') return failure('NOT_AUTHORISED', 'Only professors can request acquisitions');
    const { title, author, isbn = null, justification, estimatedCost = null } = payload;
    if (!title || !author || !justification) return failure('VALIDATION_ERROR', 'Missing required acquisition fields');
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

export function createCULMS(adapter) {
  return {
    borrowing: new BorrowingControl(adapter),
    reservations: new ReservationControl(adapter),
    fines: new FineControl(adapter),
    catalogue: new CatalogueControl(adapter),
    reports: new ReportControl(adapter),
    notifications: new NotificationControl(adapter),
    staff: new StaffControl(adapter),
    settings: new SettingsControl(adapter)
  };
}

export const business = { BorrowingControl, ReservationControl, FineControl, CatalogueControl, ReportControl, NotificationControl, StaffControl, SettingsControl };
