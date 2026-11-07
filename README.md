# ScriptMark — Frontend

React + Vite + Tailwind CSS frontend for ScriptMark.

## Stack
- React 18 + Vite
- Tailwind CSS
- react-router-dom
- lucide-react (icons)
- recharts (analytics charts)

## Running locally
```bash
cp .env.example .env   # if present, otherwise create .env with: VITE_API_URL=http://localhost:4000
npm install
npm run dev
```
Get the backend running first (see the backend's README) — this app expects it at
`http://localhost:4000` by default.

## What the app does
All pages are wired to the backend; none show example data.
- Login with an email code, password reset, lecturer profile.
- Marking Guides: upload the guide and question paper (PDF, Word or photos), edit questions, parts and marking points. Any mark value is accepted.
- The Marks bar at the top of a guide shows "Marks X / exam total" with the answer rule (for example Q1 + any 3), and the Check totals warnings update as you type. **Fix all** lists suggested mark changes; nothing changes until **Apply all** and **Save**.
- Scan Scripts: multi page uploads and live camera capture, with automatic student name and reg number detection.
- Results: review and confirm AI suggested scores point by point. Totals follow the answer rule, and questions that do not count are tagged "Not counted".
- Courses with Tests, Assignments and the Exam, a session Overview, notifications and result sheets.
- Export to Excel and PDF with CA scores and grades.
- Analytics from confirmed scores, an AI assistant with voice input, and an Admin page.
