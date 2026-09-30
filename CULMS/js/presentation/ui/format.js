export function formatDate(value) { const date = value instanceof Date ? value : new Date(value); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date); }
export function formatMoney(value) { return `K${Number(value || 0).toFixed(2)}`; }
export function availabilityLabel(status) { return { Available: 'Available', 'All copies on loan': 'All copies on loan', Reserved: 'Reserved', 'Course reserve only': 'Course reserve only' }[status] || status; }
export function parseBookQuery(search = '') { const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search); return { query: params.get('query') || '', campus: params.get('campus') || '', category: params.get('category') || '', availableOnly: params.get('availableOnly') === '1', sortBy: params.get('sortBy') || 'title', page: Math.max(1, Number(params.get('page') || 1)) }; }
export function buildBookQuery(values = {}) { const params = new URLSearchParams(); for (const [key, value] of Object.entries(values)) { if (value !== '' && value !== false && value != null && value !== 1) params.set(key, value === true ? '1' : value); } const result = params.toString(); return result ? `?${result}` : ''; }
export function campusAvailability(campusStats = {}) { const entries = Object.values(campusStats); return { campuses: entries.length, total: entries.reduce((sum, item) => sum + item.totalCopies, 0), available: entries.reduce((sum, item) => sum + item.availableCopies, 0) }; }

export function daysRemaining(dueDate, now = new Date()) { return Math.ceil((new Date(dueDate).getTime() - new Date(now).getTime()) / 86400000); }
export function loanStatusLabel(loan, now = new Date()) { if (loan.isCourseReserve) return 'Course reserve'; const days = daysRemaining(loan.dueDate, now); if (days < 0) return `Overdue by ${Math.abs(days)} days`; if (days <= 2) return 'Due soon'; return 'On time'; }
export function reservationStatusLabel(status) { return { Pending: 'Pending', Ready: 'Ready', Fulfilled: 'Fulfilled', Expired: 'Expired', Cancelled: 'Cancelled' }[status] || status; }

export function fineStatusLabel(status) { return status === 'Paid' ? 'Paid' : 'Unpaid'; }
export function historyStatusClass(status) { return { Active: 'bg-success', Overdue: 'bg-danger', Returned: 'bg-secondary', 'Returned late': 'bg-warning text-dark' }[status] || 'bg-secondary'; }
export function historyFilter(status, filter) { return filter === 'All' || status === filter; }
export function formatCost(value) { return value === null || value === '' || value == null ? '?' : `K${Number(value).toFixed(2)}`; }

export function stepperBadgeClass(status) { return { done: 'bg-success', failed: 'bg-danger', skipped: 'bg-secondary' }[status] || 'bg-secondary'; }
export function eligibilityLabel(eligibility) { return eligibility?.eligible ? 'Eligible to borrow' : (eligibility?.reason || 'Borrowing Blocked'); }
export function relativeDaysLabel(days) { return days === 1 ? '1 day' : `${days} days`; }
