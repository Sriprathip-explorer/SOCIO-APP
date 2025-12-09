# SOCIO-APP

Mini social media application (vanilla JS frontend + Express backend).

## Overview
- **Purpose:** Small demo app for posting and viewing short messages.
- **Stack:** Node.js + Express backend, simple static frontend.

## Repository layout

- `server.js` - Root entry (runs the app in simple setups)
- `backend/` - Backend service (alternative or additional server code)
- `frontend/` - Frontend app (development files)
- `public/` - Static build files served to users
- `data.json` - Example data used by the app

## Requirements

- Node.js 16+ (Node 18+ recommended)
- npm (or yarn)

## Install

Install dependencies at the repository root:

```bash
npm install
```

## Run

- Start the app from the repository root:

```bash
npm start
```

This runs `node server.js` (see `package.json` scripts). For development with auto-restart use:

```bash
npm run dev
```

If you prefer to run backend and frontend separately, open the `backend/` and `frontend/` folders — each contains its own `package.json` or static files.

## Useful files

- `server.js` — server entry that serves the static frontend and exposes simple API endpoints.
- `frontend/index.html`, `frontend/app.js` — frontend source.
- `public/` — production-ready static files (if present).

## Notes

- This README is a basic overview. If you want, I can expand it with API documentation, example requests, or setup instructions for Docker/hosting.

---
Created automatically by assistant on request.
