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
| `js/business/` | control | Future use-case services; data remains below this boundary |
| `js/presentation/` | boundary | Browser layout and presentation scripts |
| `tests/data/` | boundary | Dependency-free data-layer tests |

Data modules import only within `js/data/`; they do not import business or presentation code. Dates are persisted as ISO strings and rehydrated as `Date` objects.
