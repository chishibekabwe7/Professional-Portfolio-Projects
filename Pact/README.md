# Pact — Habits, Witnessed.

**CS50W Final Project**
Author: Chishibe Kabwe
edX Username: Chishibekabwe7_gmail_com

## About

Pact is a social habit-accountability web application. Most habit trackers fail
silently — you miss a day, nobody notices, and the streak just resets in private.
Pact removes that privacy: every habit you commit to must be **witnessed**. When
you check in, a friend you've invited has to confirm it actually happened before
your streak count/home/cj/Github/My-Learning-Repository-2025-2026-main/My-Learning-Repository-2025-2026-main/Second Academic Year/Havard University/CS50 Web/Final Project/README.mds. Miss a check-in, and your pact partners see it too.

The core idea is simple: **habits are easier to keep when someone else is watching.**
Pact turns personal discipline into a small social contract between friends.

## Why This Project Is Distinct

Pact is not a to-do list, a wiki, or an e-commerce clone. Its distinctiveness comes
from the **verification workflow** at its core — a habit's streak is not simply a
counter incremented by the habit owner, it is a value derived from a relationship
between two users (the committer and the witness). This introduces:

- A **multi-actor state machine** per check-in (`pending` → `verified` / `rejected`
  / `expired`), rather than simple CRUD on a single model.
- A **live "Verification Inbox"** built with JavaScript and `fetch()`, where
  witnesses approve or reject pending check-ins without a page reload.
- **Derived streak logic** — a habit's current streak is calculated from its
  check-in history and verification status, not stored as a raw counter, so it
  self-corrects if a check-in is later rejected.

This distinguishes Pact from the single-user habit trackers in Project 1 and 2,
which never require reasoning about multi-user state or asynchronous confirmation
flows.

## Features

- **User accounts** — registration, login, logout, profile page with active pacts.
- **Create a Pact** — define a habit, frequency (daily/weekly), and invite one or
  more friends as witnesses.
- **Check in** — log a completion with an optional note/photo; status starts as
  `pending`.
- **Verification Inbox (JS-driven)** — witnesses see pending check-ins update live
  and can approve/reject with a single click, no reload required.
- **Streak tracking** — current streak, longest streak, and a visual calendar
  heatmap of check-in history per habit.
- **Friend system** — send/accept friend requests; only friends can be added as
  witnesses.
- **Notifications** — in-app alert badge when a check-in needs your verification
  or when your own check-in has been verified/rejected.
- **Responsive design** — usable on both desktop and mobile.

## Distinctiveness & Complexity Checklist

- [x] Multiple relational models beyond a single owner-object pattern
      (`User`, `Pact`, `CheckIn`, `Verification`, `Friendship`)
- [x] Derived/computed data (streaks) rather than simple stored counters
- [x] Asynchronous, JS-driven interface (verification inbox updates via `fetch()`
      without page reload)
- [x] Multi-user state — one user's action (check-in) requires another user's
      action (verification) to resolve
- [x] Not a rehash of Project 1 (Wiki) or Project 2 (Commerce/Auctions)

## Project Structure

```
pact/
├── pact/                  # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── ...
├── habits/                 # Main Django app
│   ├── models.py           # User, Pact, CheckIn, Verification, Friendship
│   ├── views.py            # Page views + JSON API endpoints for JS inbox
│   ├── urls.py
│   ├── static/habits/
│   │   ├── inbox.js         # Live verification inbox logic
│   │   ├── streaks.js       # Calendar heatmap rendering
│   │   └── styles.css
│   └── templates/habits/
│       ├── layout.html
│       ├── dashboard.html
│       ├── pact_detail.html
│       ├── inbox.html
│       └── ...
├── requirements.txt
└── README.md
```

## Models Overview

| Model         | Purpose                                                              |
|---------------|-----------------------------------------------------------------------|
| `User`        | Django's built-in auth user, extended with a small profile           |
| `Friendship`  | Symmetric friend relationship between two users                      |
| `Pact`        | A habit commitment: owner, title, frequency, list of witnesses       |
| `CheckIn`     | A single instance of the habit being logged, tied to a `Pact`        |
| `Verification`| A witness's response (approve/reject) to a specific `CheckIn`        |

## How to Run

1. Clone the repository and navigate into the project directory.
2. Create and activate a virtual environment:
   ```
   python3 -m venv env
   source env/bin/activate
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Apply migrations:
   ```
   python manage.py makemigrations
   python manage.py migrate
   ```
5. Run the development server:
   ```
   python manage.py runserver
   ```
6. Visit `http://127.0.0.1:8000` in your browser.

## What's Left / Future Improvements

- Push notifications (currently in-app only)
- Habit categories and public/discoverable pacts
- Weekly recap emails summarizing streaks and pending verifications


