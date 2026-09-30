import { AcquisitionRequest, Book, BookCopy, Fine, Librarian, LibraryAdministrator, LoanRecord, Notification, PERMISSIONS, Professor, Reservation, Settings, Student } from '../entities.js';
import { AcquisitionRequestRepository, BookRepository, FineRepository, LoanRepository, NotificationRepository, PatronRepository, ReservationRepository, SCHEMA_VERSION_KEY, SettingsRepository, StaffRepository, migrate, readableId } from '../repositories.js';

export const campuses = ['Main Campus (Kitwe)', 'Medical School (Ndola)', 'Engineering Library'];
const categories = ['Computing', 'Information Systems', 'Engineering', 'Medicine', 'Business', 'Mathematics', 'General'];
const titles = [
    ['Clean Code', 'Robert C. Martin', 'Computing'], ['The Pragmatic Programmer', 'David Thomas', 'Computing'], ['Computer Networks', 'Andrew S. Tanenbaum', 'Computing'], ['Operating System Concepts', 'Abraham Silberschatz', 'Computing'], ['Database System Concepts', 'Abraham Silberschatz', 'Computing'], ['Artificial Intelligence: A Modern Approach', 'Stuart Russell', 'Computing'],
    ['Systems Analysis and Design', 'Kenneth E. Kendall', 'Information Systems'], ['Management Information Systems', 'Kenneth C. Laudon', 'Information Systems'], ['Information Systems Strategy', 'John Ward', 'Information Systems'], ['Human-Computer Interaction', 'Alan Dix', 'Information Systems'], ['Business Data Communications', 'William Stallings', 'Information Systems'], ['Enterprise Architecture', 'Jeanne W. Ross', 'Information Systems'],
    ['Engineering Mechanics', 'J. L. Meriam', 'Engineering'], ['Engineering Materials', 'Michael F. Ashby', 'Engineering'], ['Fluid Mechanics', 'Frank M. White', 'Engineering'], ['Thermodynamics: An Engineering Approach', 'Yunus Cengel', 'Engineering'], ['Electrical Engineering Principles', 'John Bird', 'Engineering'], ['Structural Analysis', 'Aslam Kassimali', 'Engineering'],
    ['Gray’s Anatomy for Students', 'Richard Drake', 'Medicine'], ['Harrison’s Principles of Internal Medicine', 'J. Larry Jameson', 'Medicine'], ['Medical Microbiology', 'Murray Rosenthal', 'Medicine'], ['Clinical Pharmacology', 'B. G. Katzung', 'Medicine'], ['Anatomy and Physiology', 'Elaine N. Marieb', 'Medicine'], ['Community Medicine', 'K. Park', 'Medicine'],
    ['Principles of Marketing', 'Philip Kotler', 'Business'], ['Financial Accounting', 'Jerry J. Weygandt', 'Business'], ['Operations Management', 'Jay Heizer', 'Business'], ['Human Resource Management', 'Gary Dessler', 'Business'], ['Strategic Management', 'Fred R. David', 'Business'], ['Entrepreneurship', 'Robert D. Hisrich', 'Business'],
    ['Calculus', 'James Stewart', 'Mathematics'], ['Linear Algebra and Its Applications', 'David C. Lay', 'Mathematics'], ['Discrete Mathematics', 'Kenneth Rosen', 'Mathematics'], ['Engineering Mathematics', 'K. A. Stroud', 'Mathematics'], ['Probability and Statistics', 'Morris H. DeGroot', 'Mathematics'],
    ['The Craft of Research', 'Wayne C. Booth', 'General'], ['Academic Writing for Graduate Students', 'John M. Swales', 'General'], ['Research Methodology', 'C. R. Kothari', 'General'], ['Introduction to African Studies', 'Paul Tiyambe Zeleza', 'General'], ['Sustainable Development in Africa', 'Walter Leal Filho', 'General']
];
const ago = days => new Date(Date.now() - days * 86400000);
const ahead = days => new Date(Date.now() + days * 86400000);

/** Populate an empty adapter with the CULMS demonstration dataset. @param {any} adapter @returns {void} */
export function seedIfEmpty(adapter) { if (!adapter.get(`${SCHEMA_VERSION_KEY}seeded`)) { resetToSeed(adapter); } }
/** Replace all CULMS collections with deterministic demonstration data. @param {any} adapter @returns {void} */
export function resetToSeed(adapter) {
    for (const key of adapter.keys()) if (key.startsWith('culms:v1:')) adapter.remove(key);
    migrate(adapter);
    const books = new BookRepository(adapter), patrons = new PatronRepository(adapter), staff = new StaffRepository(adapter), loans = new LoanRepository(adapter), reservations = new ReservationRepository(adapter), fines = new FineRepository(adapter), notifications = new NotificationRepository(adapter), settings = new SettingsRepository(adapter), acquisitionRequests = new AcquisitionRequestRepository(adapter);
    titles.forEach(([title, author, category], index) => {
        const isbn = `978-9982-${String(index + 1).padStart(5, '0')}`;
        const copies = [];
        const copyCount = index % 4 + 1;
        for (let copy = 1; copy <= copyCount; copy++) copies.push(new BookCopy(`BC-${String(index * 4 + copy).padStart(5, '0')}`, isbn, `${String.fromCharCode(65 + index % 6)}-${100 + copy}`, 'Good', campuses[(index + copy) % campuses.length], 'Available', index === 8 && copy === 1, index === 8 && copy === 1 ? 'IS-230' : null, index === 8 && copy === 1 ? 'STAFF-0004' : null, index === 8 && copy === 1 ? ago(10) : null));
        books.add(new Book(isbn, title, author, category, copies));
    });
    const students = [
        new Student('STU-0001', 'Chanda Mwansa', 'chanda.mwansa@cbu.ac.zm', campuses[0], 'Computer Science'), new Student('STU-0002', 'Martha Chileshe', 'martha.chileshe@cbu.ac.zm', campuses[2], 'Civil Engineering'), new Student('STU-0003', 'Brian Phiri', 'brian.phiri@cbu.ac.zm', campuses[0], 'Business Administration'), new Student('STU-0004', 'Natasha Banda', 'natasha.banda@cbu.ac.zm', campuses[1], 'Medicine')
    ];
    const professors = [new Professor('STAFF-0004', 'Dr. Joseph Mulenga', 'joseph.mulenga@cbu.ac.zm', campuses[2], 'Electrical Engineering'), new Professor('STAFF-0005', 'Prof. Ruth Tembo', 'ruth.tembo@cbu.ac.zm', campuses[1], 'Public Health')];
    [...students, ...professors].forEach(item => patrons.add(item));
    staff.add(new Librarian('LIB-0001', 'Moses Nkole', 'moses.nkole@cbu.ac.zm', campuses[0], [PERMISSIONS.PROCESS_LOANS, PERMISSIONS.MANAGE_CATALOGUE, PERMISSIONS.MANAGE_FINES]));
    staff.add(new Librarian('LIB-0002', 'Agnes Zulu', 'agnes.zulu@cbu.ac.zm', campuses[1], [PERMISSIONS.PROCESS_LOANS, PERMISSIONS.MANAGE_CATALOGUE, PERMISSIONS.MANAGE_FINES]));
    staff.add(new LibraryAdministrator('ADM-0001', 'Peter Chanda', 'peter.chanda@cbu.ac.zm', campuses[0], Object.values(PERMISSIONS)));
    let loanNumber = 1;
    const issue = (patronId, isbn, daysAgo, duration, course = false) => { const copy = books.findCopiesByIsbn(isbn).find(item => item.status === 'Available'); if (!copy) throw new Error('Seed copy unavailable'); copy.updateStatus(course ? 'CourseReserve' : 'OnLoan'); books.removeCopy(copy.barcode); books.addCopy(copy); const loan = new LoanRecord(readableId('LN', loanNumber++), copy.barcode, patronId, ago(daysAgo), ahead(duration - daysAgo), null, false, course); loans.add(loan); return loan; };
    const regularIsbns = books.getAll().slice(0, 8).map(book => book.isbn);
    issue('STU-0001', regularIsbns[0], 2, 14); issue('STU-0002', regularIsbns[1], 20, 14); issue('STAFF-0004', regularIsbns[2], 3, 30, true);
    for (const isbn of regularIsbns.slice(3, 8)) issue('STU-0003', isbn, 1, 14);
    const reserveBook = books.getAll()[10]; books.findCopiesByIsbn(reserveBook.isbn).forEach(copy => { copy.updateStatus('OnLoan'); books.removeCopy(copy.barcode); books.addCopy(copy); loans.add(new LoanRecord(readableId('LN', loanNumber++), copy.barcode, 'STAFF-0005', ago(1), ahead(29), null, false, false)); });
    reservations.add(new Reservation('RS-000001', reserveBook.isbn, null, 'STU-0004', ago(1), 'Pending', 'CULMS-READY1'));
    fines.add(new Fine('FN-000001', 'LN-000002', 'STU-0002', 64, 'Unpaid', ago(4)));
    students[0].fineBalance = 0; students[1].fineBalance = 64; students[2].fineBalance = 0; students[3].fineBalance = 0; patrons.clear(); [...students, ...professors].forEach(item => patrons.add(item));
    notifications.add(new Notification('NT-000001', 'STU-0002', 'Your borrowing is blocked until your unpaid fines are reduced.', ago(1)));
    acquisitionRequests.add(new AcquisitionRequest('AR-000001', 'STAFF-0004', 'Applied Data Structures', 'Jane Doe', 'Needed for the final-year research methods module.', '978-1-23456-111-1', 35, 'Pending', new Date()));
    settings.saveSettings(new Settings());
    adapter.set(`${SCHEMA_VERSION_KEY}seeded`, '1');
}
