# CULMS Architecture

## UML class mapping

| Data-layer class | UML responsibility |
| --- | --- |
| `Patron` | Abstract patron with eligibility rules |
| `Student`, `Professor` | Polymorphic patron specializations |
| `Staff`, `Librarian`, `LibraryAdministrator` | Library employees and permissions |
| `Book`, `BookCopy` | Title composition and physical holdings |
| `LoanRecord` | Borrowing transaction |
| `Reservation` | Hold and pickup lifecycle |
| `Fine` | Charges and payment state |
| `Notification` | User message and read state |
| `Settings` | Configurable library policy |
| `BaseRepository` and repositories | Persistence and query associations |
| Storage adapters | Boundary between repositories and storage |

## Package diagram layers

| Folder | Layer | Contents |
| --- | --- | --- |
| `js/data/entities.js` | entity | Domain objects, validation, serialization |
| `js/data/storage/` | boundary | Storage interface, local storage and memory adapters |
| `js/data/repositories.js` | control | Collection persistence, queries, IDs and migrations |
| `js/data/seed/` | control | Demo dataset construction |
| `js/business/` | control | Use-case services for borrowing, reservations, fines, catalogue, reporting, staff and settings |
| `js/presentation/` | boundary | Browser layout and presentation scripts |
| `tests/data/` | boundary | Dependency-free data-layer tests |
| `tests/business/` | boundary | Business-layer regression tests and architecture guard checks |

Data modules import only within `js/data/`; they do not import business or presentation code. The business layer imports from `js/data/` only and contains no DOM, storage, or browser API access. Dates are persisted as ISO strings and rehydrated as `Date` objects.


## Browser session and navigation flow

`js/presentation/app.js` creates the browser instance through the business bootstrap, while `session.js` stores only an account id and role. Protected pages call `guard.js` before revealing their main content. The guard re-resolves the full user through `AuthControl`, redirects guests to `login.html`, and redirects unauthorized users to their role home with a toast. `navConfig.js` describes enabled links and planned screens without rendering pages that do not exist. Presentation code imports business modules only; the bootstrap is the single business-layer entry point that is allowed to construct the browser storage adapter.


## Browser session and navigation flow

`js/presentation/app.js` creates the browser instance through the business bootstrap, while `session.js` stores only an account id and role. Protected pages call `guard.js` before revealing their main content. The guard re-resolves the full user through `AuthControl`, redirects guests to `login.html`, and redirects unauthorized users to their role home with a toast. `navConfig.js` describes enabled links and planned screens without rendering pages that do not exist. Presentation code imports business modules only; the bootstrap is the single business-layer entry point that is allowed to construct the browser storage adapter.

## Public catalogue modules

`books.html` and `book.html` are public presentation pages. Their page modules call the business catalogue and reservation controls through `app.js`; they do not import data modules or access storage directly. `ui/render.js` escapes every interpolated value before dynamic markup is assigned, while `ui/format.js` contains DOM-free date, money, availability and query-string helpers. Catalogue search state is represented in the URL so filters, sorting, pagination and browser history remain linkable.


## Credentials, session expiry and member pages

Credentials are stored as browser-local PBKDF2 metadata in the data layer. Seeded accounts use the configured `culms-demo` default until a user changes the password; only the salt, hash, iteration count and update timestamp are persisted after a change. This is a client-side demonstration, not real authentication: a production deployment requires a secure server. Sessions store an account id, role and start time and expire after eight hours.

`account.html`, `my-loans.html` and `my-reservations.html` are guarded presentation pages. Their page modules call business controls for password changes, loan renewals and reservation cancellation, and dispatch `culms:changed` so the shared notification dropdown refreshes.


## Student and professor self-service

`my-fines.html` and `my-history.html` expose patron views backed by `FineControl.getFineView` and `BorrowingControl.getLoanHistory`. Professors additionally use `course-reserve.html` and `acquisitions.html`; placement, removal, ownership, copy availability and request validation remain business-layer decisions. Navigation groups these pages under the `My Library` dropdown while preserving role-specific access guards.


## Librarian circulation desk

`checkout.html`, `return.html` and `overdue.html` are guarded librarian pages backed by `BorrowingControl`. The desk modules use patron and copy preview methods before writes, render the checkout stepper and return/overdue tables with escaped values, and pass the signed-in staff actor to permission-enforced business operations. `navConfig.js` gates circulation links by `PROCESS_LOANS`; planned catalogue and fines desk entries remain disabled.
