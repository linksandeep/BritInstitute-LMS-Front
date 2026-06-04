# Brit Institute LMS Frontend

React frontend for the Brit Institute Learning Management System. It provides role-based dashboards for students, teachers, admins, and super admins.

## Project Overview

The frontend is built with React, TypeScript, Vite, React Router, and Axios. It connects to the LMS backend API and supports:

- Professional login experience
- Student dashboard with live classes, roadmap, recordings, assignments/live projects, mentoring, analytics, certificates, and AI study assistant
- Teacher/admin workspace for batches, students, courses, curriculum, live classes, recordings, assignments, appointments, and activity analytics
- Super admin workspace for teacher management
- Session timeout handling through backend activity tracking
- 1:1 mentor booking with available/booked slot visibility

## Prerequisites

Install the following before running the frontend:

- Node.js 18 or newer
- npm 9 or newer
- Git
- Running backend API

Default backend URL expected by the frontend:

```text
http://localhost:5001/api
```

## Environment Variables

Create a `.env` file in the frontend directory:

```bash
cd frontend
cp .env.example .env
```

If `.env.example` is not present, create `.env` manually:

```env
VITE_API_URL=http://localhost:5001/api
```

Important notes:

- Vite requires frontend environment variables to start with `VITE_`.
- Restart the Vite dev server after changing `.env`.
- Do not put backend secrets, database credentials, JWT secrets, or Zoom secrets in the frontend `.env`.

## Installation

```bash
cd frontend
npm install
```

## Run Locally

Start the frontend development server:

```bash
npm run dev
```

Default local frontend URL:

```text
http://localhost:5173
```

If another service already uses port `5173`, Vite will print the next available local URL in the terminal.

## Available Scripts

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Runs TypeScript checks and creates a production build in the `dist` folder.

```bash
npm run preview
```

Serves the production build locally for final verification.

```bash
npm run lint
```

Runs ESLint checks.

## Backend Connection

The frontend API client is configured in:

```text
src/api/index.ts
```

It reads:

```text
VITE_API_URL
```

and falls back to:

```text
http://localhost:5001/api
```

The app stores the login token in browser local storage under:

```text
brit_token
```

## Application Routes

Main frontend routes:

- `/login` - login page
- `/dashboard` - student dashboard
- `/admin` - admin/teacher dashboard
- `/admin/activity` - LMS activity analytics
- `/admin/users` - student management
- `/admin/courses` - course management
- `/admin/live-classes` - live class management
- `/admin/recorded` - recorded lecture management
- `/admin/assignments` - assignment/live project management
- `/admin/batches` - batch management
- `/admin/curriculum` - curriculum management
- `/admin/appointments` - 1:1 mentor appointments
- `/superadmin` - super admin teacher management

Access is controlled by the authenticated user's role returned by the backend.

## Database Setup

The frontend does not connect directly to the database. Database configuration belongs to the backend.

To prepare application data:

1. Configure and run the backend.
2. Configure MongoDB in the backend `.env`.
3. Run backend seed if curriculum data is needed:

```bash
cd backend
npm run seed
```

## Default Credentials

The current backend seed does not create default user credentials. Use credentials created by the LMS admin/super admin workflow.

If login fails, confirm with the backend/database administrator that:

- The user exists.
- The user is active.
- The password is correct.
- The backend `JWT_SECRET` is configured consistently.

## API Endpoint Information

The frontend consumes backend route groups under:

- `/api/auth`
- `/api/admin`
- `/api/superadmin`
- `/api/admin/batches`
- `/api/curriculums`
- `/api/live-classes`
- `/api/recorded`
- `/api/assignments`
- `/api/sessions`
- `/api/student-portal`

Important auth endpoints used by the profile settings UI:

- `PUT /api/auth/password`

Important booking endpoints used by the student mentoring UI:

- `GET /api/sessions/mentors`
- `GET /api/sessions/mentors/:mentorId/availability?date=YYYY-MM-DD`
- `POST /api/sessions`
- `PATCH /api/sessions/:id/reschedule`
- `PATCH /api/sessions/:id/cancel`

## Deployment

Typical deployment steps for Vercel, Netlify, or another static frontend host:

1. Set the project root to `frontend`.
2. Add environment variable:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

3. Use build command:

```bash
npm run build
```

4. Use output directory:

```text
dist
```

5. Configure the backend `FRONTEND_URL` to the deployed frontend domain so CORS allows requests.

For single page app hosting, make sure all routes rewrite to `index.html`.

## Troubleshooting

Frontend shows a blank page:

- Run `npm run build` to catch TypeScript errors.
- Check the browser console.
- Confirm all dependencies are installed.

Login does not work:

- Confirm backend is running.
- Confirm `VITE_API_URL` points to the backend `/api` URL.
- Confirm user credentials are correct.
- Check backend logs for authentication errors.

API requests fail with CORS errors:

- Confirm backend `FRONTEND_URL` matches the frontend URL.
- For local development, use `http://localhost:5173` or `http://127.0.0.1:5173`.

Changes to `.env` are not reflected:

- Stop and restart `npm run dev`.

Build fails:

- Run `npm install`.
- Confirm Node.js 18 or newer is installed.
- Fix TypeScript errors shown by `npm run build`.

Booking slots do not appear:

- Confirm the backend is updated and running.
- Confirm at least one active teacher exists.
- Confirm the selected date has future slots.
- Confirm the student is logged in and enrolled.
