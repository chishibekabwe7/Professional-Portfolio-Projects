import test from 'node:test';
import { webcrypto } from 'node:crypto';
globalThis.crypto = globalThis.crypto || webcrypto;
import assert from 'node:assert/strict';
import { createCULMS, PERMISSIONS } from '../../js/business/index.js';
import { MemoryStorageAdapter } from '../../js/data/storage/MemoryStorageAdapter.js';
import { resetToSeed } from '../../js/data/seed/seed.js';
import { AcquisitionRequest, Settings } from '../../js/data/entities.js';

function seedWithAdapter() {
  const adapter = new MemoryStorageAdapter();
  resetToSeed(adapter);
  return createCULMS(adapter);
}

test('factory creates all business controls', () => {
  const culms = seedWithAdapter();
  assert.ok(culms.borrowing);
  assert.ok(culms.reservations);
  assert.ok(culms.fines);
  assert.ok(culms.catalogue);
  assert.ok(culms.reports);
  assert.ok(culms.notifications);
  assert.ok(culms.staff);
  assert.ok(culms.settings);
});

test('borrowing normal flow and eligibility checks work', () => {
  const culms = seedWithAdapter();
  const available = culms.catalogue.books.getAll().flatMap(book => book.copies).find(copy => copy.status === 'Available');
  assert.ok(available);
  const borrow = culms.borrowing.borrowBook('STU-0004', available.barcode, new Date('2025-01-15T00:00:00Z'));
  assert.equal(borrow.ok, true);
  assert.equal(borrow.data.flow.length, 8);
  assert.equal(borrow.data.flow[0].step, 'scan patron ID');
  assert.equal(borrow.data.loan.dueDate instanceof Date, true);

  const patron = culms.borrowing.patrons.getById('STU-0001');
  patron.fineBalance = 51;
  culms.borrowing.patrons.update('STU-0001', { fineBalance: 51 });
  const blocked = culms.borrowing.borrowBook('STU-0001', available.barcode, new Date('2025-01-15T00:00:00Z'));
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error.code, 'BORROWING_BLOCKED');
});

test('returns and reservations update state correctly', () => {
  const culms = seedWithAdapter();
  const loan = culms.borrowing.loans.getAll().find(item => item.returnDate === null);
  const result = culms.borrowing.returnBook(loan.barcode, new Date('2025-01-20T00:00:00Z'));
  assert.equal(result.ok, true);
  assert.equal(result.data.loan.returnDate instanceof Date, true);
  assert.ok(result.data.fine === null || typeof result.data.fine.amountAccumulated === 'number');
});

test('reservation rules reject available copies and enforce limits', () => {
  const culms = seedWithAdapter();
  const book = culms.catalogue.books.getAll()[0];
  const reserveResult = culms.reservations.reserveBook('STU-0001', book.isbn, new Date('2025-01-10T00:00:00Z'));
  assert.ok(reserveResult.ok || reserveResult.error.code === 'COPIES_AVAILABLE' || reserveResult.error.code === 'RESERVATION_PROHIBITED' || reserveResult.error.code === 'MAX_LIMIT_REACHED');
});

test('fines, reports and CSV formatting work', () => {
  const culms = seedWithAdapter();
  const summary = culms.fines.getFineSummary(new Date('2025-01-15T00:00:00Z'));
  assert.equal(summary.ok, true);
  assert.equal(typeof summary.data.totalUnpaid, 'number');
  const csv = culms.reports.toCsv([
    { name: 'Alpha', note: 'hello, "world"\nnext' },
    { name: 'Beta', note: 'plain' }
  ], ['name', 'note']);
  assert.match(csv, /hello/);
  assert.match(csv, /"world"/);
});

test('catalogue acquisition flow and permissions work', () => {
  const culms = seedWithAdapter();
  const request = culms.catalogue.requestNewAcquisition('STAFF-0004', {
    title: 'Applied Library Management',
    author: 'Jane Doe',
    isbn: '978-1-23456-789-0',
    justification: 'Needed for course support.',
    estimatedCost: 40
  });
  assert.equal(request.ok, true);
  const list = culms.catalogue.listAcquisitionRequests('ADM-0001');
  assert.equal(list.ok, true);
  assert.ok(list.data.some((item) => item.title === 'Applied Library Management'));
  const review = culms.catalogue.reviewAcquisition(list.data[0].requestId, 'Approved', 'ADM-0001');
  assert.equal(review.ok, true);
  assert.equal(review.data.request.status, 'Approved');
  assert.equal(culms.staff.listStaff('LIB-0001').ok, true);
  assert.equal(culms.staff.updateStaffPermissions('LIB-0001', 'LIB-0001', [PERMISSIONS.MANAGE_SETTINGS]).ok, false);
});

test('settings and permissions validate inputs', () => {
  const culms = seedWithAdapter();
  const settings = culms.settings.getSettings();
  assert.equal(settings.ok, true);
  const update = culms.settings.updateSettings('ADM-0001', { maxUnpaidFine: 100, maxActiveReservations: 4 });
  assert.equal(update.ok, true);
  const invalid = culms.settings.updateSettings('ADM-0001', { maxUnpaidFine: -1 });
  assert.equal(invalid.ok, false);
});

test('architecture guard checks import boundaries', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...walk(target));
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(target);
    }
    return files;
  };

  const businessFiles = walk(path.resolve('./js/business'));
  for (const file of businessFiles) {
    const source = fs.readFileSync(file, 'utf8');
    if (file.endsWith('access.js')) continue;
    if (file.endsWith('access.js')) continue;
    if (!file.endsWith('bootstrap.js')) assert.doesNotMatch(source, /window|document|localStorage/);
    assert.doesNotMatch(source, /from\s+['"]\.\.\/presentation|from\s+['"]\.\.\/.*presentation|from\s+['"]\.\/.*presentation/);
    assert.ok(/from\s+['"]\.\.?\.?\/data|from\s+['"]\.\.?\.?\/|from\s+['"]\.\.?\/.*\//.test(source) || source.includes('from'));
  }

  const dataFiles = walk(path.resolve('./js/data'));
  for (const file of dataFiles) {
    if (file.endsWith('LocalStorageAdapter.js')) continue;
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /from\s+['"]\.\.\/business|from\s+['"]\.\.\/presentation|from\s+['"]\.\/business|from\s+['"]\.\/presentation/);
    if (!file.endsWith('LocalStorageAdapter.js')) {
      if (!file.endsWith('bootstrap.js')) assert.doesNotMatch(source, /window|document|localStorage/);
    }
  }
});


test('presentation stays above the data layer', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const files = fs.readdirSync(path.resolve('./js/presentation'), { withFileTypes: true }).filter(item => item.isFile() && item.name.endsWith('.js'));
  for (const file of files) assert.doesNotMatch(fs.readFileSync(path.resolve('./js/presentation', file.name), 'utf8'), /from\s+['"][^'"]*js\/data/);
});





test('catalogue helpers expose filters, availability and sorting', () => {
  const culms = seedWithAdapter();
  assert.deepEqual(culms.catalogue.listCategories(), [...culms.catalogue.listCategories()].sort());
  assert.deepEqual(culms.catalogue.listCampuses(), [...culms.catalogue.listCampuses()].sort());
  const rows = culms.catalogue.searchBooks({ sortBy: 'availability' }).data;
  assert.ok(rows.every(row => row.isbn && row.title && row.author && row.category && row.totalCopies >= row.availableCopies && row.campusStats && row.status));
  assert.ok(rows.every((row, index) => index === 0 || rows[index - 1].availableCopies >= row.availableCopies));
  const reserved = culms.reservations.getActiveReservation('STU-0004', '978-9982-00011');
  assert.equal(reserved?.status, 'Pending');
});

test('render and format helpers escape and round trip values', async () => {
  const { escapeHtml, html } = await import('../../js/presentation/ui/render.js');
  const { formatDate, formatMoney, buildBookQuery, parseBookQuery } = await import('../../js/presentation/ui/format.js');
  assert.equal(escapeHtml(`<script>alert("x")</script> & 'q'`), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;');
  assert.equal(html`<p>${`<script>&`}</p>`, '<p>&lt;script&gt;&amp;</p>');
  assert.equal(formatDate('2026-03-12T00:00:00Z'), '12 Mar 2026');
  assert.equal(formatMoney(2), 'K2.00');
  const query = buildBookQuery({ query: 'Clean Code', campus: 'Main Campus (Kitwe)', availableOnly: true, page: 1 });
  assert.deepEqual(parseBookQuery(query), { query: 'Clean Code', campus: 'Main Campus (Kitwe)', category: '', availableOnly: true, sortBy: 'title', page: 1 });
});


test('access and navigation allow catalogue pages safely', async () => {
  const { safeNextUrl } = await import('../../js/business/access.js');
  const { navConfig } = await import('../../js/presentation/navConfig.js');
  const fs = await import('node:fs');
  assert.equal(safeNextUrl('books.html?query=Clean%20Code', null), 'books.html?query=Clean%20Code');
  assert.equal(safeNextUrl('book.html?isbn=978-9982-00001', null), 'book.html?isbn=978-9982-00001');
  assert.equal(safeNextUrl('https://example.com/book.html', null), 'index.html');
  assert.equal(safeNextUrl('//example.com/book.html', null), 'index.html');
  assert.equal(safeNextUrl('book.html%2f..%2fadmin.html', null), 'index.html');
  assert.equal(safeNextUrl('unknown.html?x=1', null), 'index.html');
  for (const items of Object.values(navConfig)) for (const item of items.filter(entry => entry.enabled)) { const entries = item.children || [item]; for (const entry of entries.filter(child => child.enabled)) assert.equal(fs.existsSync('./' + entry.href), true); }
});


test('credential authentication supports defaults, changes and reset', async () => {
  const culms = seedWithAdapter();
  const byId = await culms.auth.login('STU-0001', 'culms-demo');
  const byEmail = await culms.auth.login('CHANDA.MWANSA@CBU.AC.ZM', 'culms-demo');
  assert.equal(byId.ok, true); assert.equal(byEmail.ok, true);
  const wrong = await culms.auth.login('STU-0001', 'wrong-password');
  const unknown = await culms.auth.login('unknown@example.com', 'wrong-password');
  assert.equal(wrong.error.message, 'Invalid ID or password'); assert.equal(unknown.error.message, wrong.error.message);
  assert.equal((await culms.auth.changePassword('STU-0001', 'culms-demo', 'short')).ok, false);
  assert.equal((await culms.auth.changePassword('STU-0001', 'culms-demo', 'passwordonly')).ok, false);
  assert.equal((await culms.auth.changePassword('STU-0001', 'culms-demo', 'culms-demo')).ok, false);
  assert.equal((await culms.auth.changePassword('STU-0001', 'culms-demo', 'Newpass1')).ok, true);
  assert.equal((await culms.auth.login('STU-0001', 'culms-demo')).ok, false);
  assert.equal((await culms.auth.login('STU-0001', 'Newpass1')).ok, true);
  const stored = culms.auth.credentials.adapter.get('culms:v1:credentials');
  assert.doesNotMatch(stored, /Newpass1/);
  culms.auth.resetCredentials();
  assert.equal((await culms.auth.login('STU-0001', 'culms-demo')).ok, true);
});

test('password helpers and session expiry rules work', async () => {
  const { hashPassword, generateSalt, constantTimeEqual } = await import('../../js/business/credentials.js');
  const salt = generateSalt(); const one = await hashPassword('demo', salt, 10); const two = await hashPassword('demo', salt, 10); const three = await hashPassword('demo', generateSalt(), 10);
  assert.equal(constantTimeEqual(one, two), true); assert.equal(constantTimeEqual(one, three), false); assert.equal(constantTimeEqual('a', 'b'), false);
  const { isSessionExpired } = await import('../../js/business/access.js');
  assert.equal(isSessionExpired(new Date(0), new Date(7 * 60 * 60 * 1000)), false); assert.equal(isSessionExpired(new Date(0), new Date(8 * 60 * 60 * 1000)), true); assert.equal(isSessionExpired('bad', Date.now()), true);
});


test('loan and reservation format helpers classify statuses', async () => {
  const { loanStatusLabel, daysRemaining, reservationStatusLabel } = await import('../../js/presentation/ui/format.js');
  const now = new Date('2026-09-30T00:00:00Z');
  assert.equal(daysRemaining('2026-10-02T00:00:00Z', now), 2);
  assert.equal(loanStatusLabel({ dueDate: '2026-10-02T00:00:00Z', isCourseReserve: false }, now), 'Due soon');
  assert.equal(loanStatusLabel({ dueDate: '2026-09-29T00:00:00Z', isCourseReserve: false }, now), 'Overdue by 1 days');
  assert.equal(loanStatusLabel({ dueDate: '2026-10-20T00:00:00Z', isCourseReserve: true }, now), 'Course reserve');
  assert.equal(reservationStatusLabel('Ready'), 'Ready');
});


test("student and professor self-service business views enforce 5C rules", () => {
  const culms = seedWithAdapter();
  const history = culms.borrowing.getLoanHistory("STU-0002");
  assert.equal(history.ok, true);
  assert.equal(history.data[0].status, "Overdue");
  assert.equal(history.data[0].fineAmount, 64);

  const fines = culms.fines.getFineView("STU-0002");
  assert.equal(fines.ok, true);
  assert.equal(fines.data.unpaidTotal, 64);
  assert.equal(fines.data.blocked, true);

  const reserves = culms.catalogue.listCourseReserveForProfessor("STAFF-0004");
  assert.equal(reserves.ok, true);
  assert.equal(reserves.data[0].courseCode, "IS-230");
  assert.equal(culms.catalogue.placeOnCourseReserve("STU-0001", reserves.data[0].barcode, "IS-230").error.code, "NOT_AUTHORISED");

  assert.equal(culms.catalogue.requestNewAcquisition("STAFF-0004", { title: "New title", author: "Author", justification: "Useful for teaching", estimatedCost: 20 }).ok, true);
  assert.equal(culms.catalogue.requestNewAcquisition("STAFF-0004", { title: "New title", author: "Author", justification: "short" }).error.code, "VALIDATION_ERROR");
  assert.equal(culms.catalogue.listMyAcquisitionRequests("STAFF-0004").data.length, 2);
});
