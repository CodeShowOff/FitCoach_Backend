# PulseLedger Backend

## About
PulseLedger Backend is an Express + MongoDB API for a fitness coaching platform. It powers coach/client workflows, workout and diet planning, product orders, subscriptions, chat, notifications, and progress tracking.

## Core Features
- Authentication with JWT access/refresh tokens and OTP email flows
- Coach and client account management
- Workout planning (templates, coach plans, client logs)
- Diet planning (food items, Indian foods, templates, coach plans, client logs)
- Product catalog, product templates, vouchers, and orders
- Subscription and platform subscription workflows
- Progress photos, water intake logging, and feedback/bug report intake
- Real-time chat with Socket.IO and unread count updates
- Scheduled background jobs for subscription expiry, reminders, and cleanup

## Tech Stack
- Node.js (ES Modules), Express 5
- MongoDB + Mongoose
- Socket.IO
- Brevo (transactional email), Cloudinary (media upload)
- ESLint for linting

## API Base URL
- Base path: `/api/v1`
- Health checks:
  - `GET /api/v1/health`
  - `GET /health`
  - `HEAD /health`

## Developer Setup

### 1) Prerequisites
- Node.js `>=20`
- npm
- MongoDB instance (local or hosted)

### 2) Install
```bash
npm install
```

### 3) Configure Environment
Create a `.env` file in the project root.

Required:
- `MONGO_URI`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`

Common optional variables:
- `PORT` (default: `5000`)
- `NODE_ENV` (`development` or `production`)
- `CLIENT_URL` (comma-separated origins; required in production)
- `FRONTEND_URL` (used in email links)
- `JWT_EXPIRES_IN` (default `15m`)
- `REFRESH_TOKEN_EXPIRES_IN` (default `7d`)
- `JWT_ALGORITHM` (default `HS256`)
- `REFRESH_TOKEN_ALGORITHM` (default `HS256`)
- `BCRYPT_SALT_ROUNDS`
- `BREVO_API_KEY`
- `BREVO_FROM_EMAIL`
- `APP_NAME`
- `CLOUDINARY_URL` or:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER_PREFIX` (default `app`)
- `DEMO_SEED_PASSWORD` (used by seed scripts)

### 4) Run Locally
Development (watch mode):
```bash
npm run dev
```

Production-style start:
```bash
npm start
```

## Scripts
- `npm run lint` — lint codebase
- `npm test` — placeholder test command
- `npm run create-indexes` — create DB indexes
- `npm run create-admin` — create admin user
- `npm run seed:exercises`
- `npm run seed:food`
- `npm run seed:indian-foods`
- `npm run seed:demo`
- `npm run seed:all`
- `npm run expire-subscriptions` — run subscription expiry job manually

## Build
This project does not require a transpilation build step. Run directly with Node.js.
