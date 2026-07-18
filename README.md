# Fit Coach Portal - Backend

This is the backend service for the **Fit Coach Portal**, a comprehensive health and fitness coaching application. It provides the RESTful API and real-time services needed to manage coaches, clients, diet/workout plans, subscriptions, and progress tracking.

## 🚀 Features

- **User Management & Authentication:** Role-based access control (Admin, Coach, Client) using JWT and refresh tokens. Secure password hashing with bcrypt.
- **Coach & Client Profiles:** Detailed profiles including health metrics, goals, and history.
- **Workout & Diet Plans:** Create, assign, and track personalized workout routines and meal plans.
- **Progress Tracking:** Clients can log their daily meals, workouts, and weight changes.
- **Subscriptions:** Manage client subscriptions and expirations.
- **Real-Time Communication:** Integrated Socket.io for live updates and chat functionality.
- **Media Uploads:** Seamless image and file uploads via Multer and Cloudinary.
- **Email Notifications:** Automated emails (e.g., welcome, password reset) powered by Brevo.
- **PDF Generation:** Generate dynamic reports and plans using PDFKit.
- **Security & Performance:** Rate limiting, XSS sanitization, Mongo sanitization, Helmet for HTTP headers, and Redis caching.

## 🛠️ Tech Stack

- **Runtime:** Node.js (>= 20)
- **Framework:** Express.js 5
- **Database:** MongoDB (via Mongoose)
- **Caching/Queue:** Redis
- **Real-time:** Socket.io
- **Storage:** Cloudinary
- **Emails:** Brevo API
- **Others:** Joi (Validation), PDFKit, Node-Cron

## ⚙️ Configuration

Before running the application, you need to set up your environment variables. Create a `.env` file in the root of the `backend` directory and configure the following variables (you can use `.env.example` if available, or reference the keys below):

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
MONGO_URI=your_mongodb_connection_string

# JWT Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Password Hashing & Cookies
BCRYPT_SALT_ROUNDS=12
COOKIE_SECRET=your_cookie_secret

# Third-Party Services
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=your_verified_sender_email
APP_NAME=FitCoach

# Cloudinary (Media Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER_PREFIX=health-app

# Firebase (Push Notifications - Optional)
FIREBASE_SERVER_KEY=your_firebase_server_key
```

## 📦 Installation

Ensure you have Node.js (version 20 or higher) installed. Then, install the dependencies:

```bash
npm install
```

## 🏗️ Build & Run

### Development Mode

Run the server with automatic restarting (using Node's native watch mode):

```bash
npm run dev
```

### Production Mode

Start the server normally:

```bash
npm start
```

### Seed Data (Optional)

You can populate your database with initial data (exercises, food items, demo accounts) using the seed scripts:

```bash
# Seed all initial data
npm run seed:all

# Or seed individually:
npm run seed:exercises
npm run seed:food
npm run seed:indian-foods
npm run seed:demo
```

### Other Scripts

- `npm run lint`: Run ESLint to check for code quality issues.
- `npm run create-admin`: Script to create an initial admin user.
- `npm run expire-subscriptions`: Manually trigger the cron job to expire outdated subscriptions.
