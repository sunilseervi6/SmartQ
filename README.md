# SmartQ — Queue Management System

A simple full‑stack app to manage queues for shops/rooms. Built with a MERN stack and real‑time updates.

## What this is
- Manage shops and rooms, let customers join queues, and track positions in real time.
- Roles for users and shop owners.
- Modern, mobile‑friendly UI.

## Project structure
- `backend/` — Node.js + Express + MongoDB API, authentication, Socket.IO
- `Queue/` — React (Vite) frontend

## Quick start
1) Backend
- cd `backend`
- npm install
- Create `.env` with: `MONGO_URI`, `JWT_SECRET`, `PORT` (optional)
- npm run dev

2) Frontend
- cd `Queue`
- npm install
- npm run dev

## Notes
- Ensure MongoDB is running and `.env` values are set.
- Access the frontend dev server URL shown in the terminal (typically http://localhost:5173/).
