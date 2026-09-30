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
