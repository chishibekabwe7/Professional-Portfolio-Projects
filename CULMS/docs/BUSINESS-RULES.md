# CULMS Business Rules

This document maps the enforced CULMS rules to the control-layer use cases and the exact error codes that the business services return.

## Rule map

| Use case | Rule | Error message | Method enforcing it | Code |
| --- | --- | --- | --- | --- |
| Borrow Book | Unpaid fines above the configured maximum block borrowing. | "Borrowing Blocked" | `BorrowingControl.borrowBook` | `BORROWING_BLOCKED` |
| Borrow Book | Student and professor borrowing limits are enforced before issuing a new loan. | "Maximum Limit Reached" | `BorrowingControl.borrowBook` | `MAX_LIMIT_REACHED` |
| Borrow Book | A copy that is already on loan cannot be borrowed by another patron. | "Copy not available" | `BorrowingControl.borrowBook` | `COPY_NOT_AVAILABLE` |
| Borrow Book | A copy returned with a Ready reservation may only be borrowed by its holder. | "Copy not available" | `BorrowingControl.borrowBook` | `COPY_NOT_AVAILABLE` |
| Borrow Book | Course-reserve copies use the configured short-term loan period and cannot be renewed. | "Course reserve loans cannot be renewed" | `BorrowingControl.borrowBook` and `BorrowingControl.renewLoan` | `VALIDATION_ERROR` |
| Return Book | Late items create a fine equal to overdue days multiplied by the daily rate. | Computed message from the fine context | `BorrowingControl.returnBook` | `NONE` |
| Return Book | A pending hold attached to the returned copy becomes Ready and notifies the patron. | "Your reserved book is ready for pickup" | `BorrowingControl.returnBook` | `NOTIFICATION` |
| Reserve Book | Available copies are rejected to force pickup in person first. | "Copies are available on the shelf. Please pick up the book in person." | `ReservationControl.reserveBook` | `COPIES_AVAILABLE` |
| Reserve Book | Reserve requests are blocked when the patron is above the fine threshold. | "Reservation Prohibited" | `ReservationControl.reserveBook` | `RESERVATION_PROHIBITED` |
| Reserve Book | Duplicate active reservations for the same title are not allowed. | "You already have an active reservation for this title" | `ReservationControl.reserveBook` | `VALIDATION_ERROR` |
| Reserve Book | Patrons may not exceed the configured active reservation limit. | "Maximum Limit Reached" | `ReservationControl.reserveBook` | `MAX_LIMIT_REACHED` |
| Reserve Book | The earliest due copy is selected as the reservation target. | Reservation target chosen by earliest due date | `ReservationControl.reserveBook` | `AF2` |
| Renew Loan | A renewed loan is rejected when it is already renewed, overdue, or course reserve. | "Loan has already been renewed" / "Loan is overdue and cannot be renewed" / "Course reserve loans cannot be renewed" | `BorrowingControl.renewLoan` | `VALIDATION_ERROR` |
| Renew Loan | Renewal is blocked while a reservation is already attached to the loaned copy. | "Reservation Prohibited" | `BorrowingControl.renewLoan` | `RESERVATION_PROHIBITED` |
| Fine Payment | Only staff with the `MANAGE_FINES` permission can record a payment. | "Not authorised" | `FineControl.recordPayment` | `NOT_AUTHORISED` |
| Catalogue | Catalogue managers can add, update and remove books and copies only with the catalogue permission. | "Not authorised" | `CatalogueControl.*` | `NOT_AUTHORISED` |
| Acquisition | Acquisition requests require a professor identity and valid metadata. | "Only professors can request acquisitions" / "Missing required acquisition fields" | `CatalogueControl.requestNewAcquisition` | `NOT_AUTHORISED` / `VALIDATION_ERROR` |
| Acquisition Review | Only staff with `APPROVE_ACQUISITIONS` can approve or reject a request. | "Not authorised" | `CatalogueControl.reviewAcquisition` | `NOT_AUTHORISED` |
| Report | Reports require `VIEW_REPORTS` permission. | "Not authorised" | `ReportControl.generateBudgetReport` | `NOT_AUTHORISED` |
| Staff | Staff permission changes require `MANAGE_STAFF` and cannot strip administrator rights from the acting administrator. | "Administrator cannot remove MANAGE_STAFF from themselves" | `StaffControl.updateStaffPermissions` | `VALIDATION_ERROR` |
| Settings | Numeric settings must remain positive. | "Setting x must be a positive number" | `SettingsControl.updateSettings` | `VALIDATION_ERROR` |

## Assumptions to confirm

- Fine rate is K2 per day.
- Loan renewals are only allowed once per loan.
- Course-reserve loans are non-renewable.
- Maximum active reservations is three per patron.
- Fines are paid in full only; partial payments are not supported in the current model.
- A reservation attaches to the earliest-due copy, but the physical copy becomes `Reserved` only when the loan is returned.
- A Ready reservation expires after the configured hold window and must be released when it expires.

## Notes

The control-layer implementation keeps all business decisions in the `js/business/` layer and relies on the data repositories for persistence. The presentation and HTML pages remain unchanged by design.


## Demo passwords and sessions

The client-side demonstration uses `culms-demo` as the default password for seeded accounts. Changed passwords require at least eight characters, one letter and one number, and cannot equal the current password. Credentials and sessions remain in the browser; this is not a security boundary and a real deployment requires server-side authentication. Sessions expire after eight hours.


## Course reserves

Only professors may place an available copy on course reserve. A course code is required and may contain letters, numbers, spaces and hyphens, up to 20 characters. Only the professor who placed a reserve may remove it, and removal is allowed only while the copy is available. Course-reserve loans use the configured course-reserve duration and cannot be renewed.
