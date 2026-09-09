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

## What's real vs example data
- Auth, Marking Guides (with numbered questions and optional lettered subparts),
  Scan Scripts (multi page uploads, live camera capture, OCR, automatic student
  name/reg number detection), Results review/confirm, and Export (Excel + PDF
  with CA scores and computed grades) are all fully wired to the backend.
- The Analytics page still shows illustrative example data — wiring it to real
  confirmed scores is the next feature to build.

## Not built yet
- OTP based two factor login
- AI assistant chat with voice input/output
- Role based UI restrictions (Lecturer/Reviewer/Admin)
