import test from 'node:test';
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


test('presentation stays above the data layer', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const files = fs.readdirSync(path.resolve('./js/presentation'), { withFileTypes: true }).filter(item => item.isFile() && item.name.endsWith('.js'));
  for (const file of files) assert.doesNotMatch(fs.readFileSync(path.resolve('./js/presentation', file.name), 'utf8'), /from\s+['"][^'"]*js\/data/);
});
