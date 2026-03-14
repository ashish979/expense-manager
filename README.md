# Expense Manager

A Splitwise-like expense manager app built with Next.js 16, MongoDB Atlas, and Google OAuth.

## Features

- **Google OAuth** — sign in with Google, sessions last 30 days
- **Friends** — add friends by email, accept/decline requests, view balances
- **Groups** — create groups (trip, home, work, etc.), manage members
- **Expenses** — add expenses with 4 split types: equal, unequal, percentage, shares
- **Settlements** — record payments, simplified debt algorithm minimizes transactions
- **Dashboard** — overview of who you owe and who owes you
- **Activity log** — full history with filters and CSV export

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **MongoDB Atlas** (Mongoose ODM)
- **NextAuth.js v5** (Google OAuth, database sessions)
- **Tailwind CSS 4** (responsive, mobile-first)
- **TanStack React Query** (data fetching, optimistic updates)
- **React Hook Form + Zod** (form validation)

## Prerequisites

- Node.js 20+
- MongoDB Atlas cluster (free tier works)
- Google OAuth credentials

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd expense-manager
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/expense-manager`) |
| `NEXTAUTH_SECRET` | Random secret for session encryption. Generate with: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` for local dev) |

### 3. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Go to **APIs & Services > Credentials**
4. Create an **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret to `.env.local`

### 4. Set up MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free cluster
3. Create a database user with read/write access
4. Add your IP to the network access list (or `0.0.0.0/0` for development)
5. Get the connection string and add it to `.env.local`

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── (auth)/           # Sign-in and error pages
│   ├── (app)/            # Protected app pages (dashboard, friends, groups, etc.)
│   └── api/              # REST API routes
├── auth.ts               # NextAuth.js configuration
├── middleware.ts          # Route protection
├── models/               # Mongoose schemas (User, Expense, Group, etc.)
├── lib/                  # Utilities (DB connection, split calculator, debt simplification)
├── components/           # React components (UI primitives, layout, feature-specific)
├── hooks/                # React Query hooks with optimistic updates
└── types/                # TypeScript interfaces
```

## Deployment (Vercel)

1. Push your code to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Add all environment variables from `.env.local` to the Vercel project settings
4. Update `NEXTAUTH_URL` to your production domain
5. Add the production redirect URI to Google OAuth: `https://yourdomain.com/api/auth/callback/google`
6. In MongoDB Atlas, allow Vercel's IP range (or `0.0.0.0/0` for serverless)
7. Deploy

## License

MIT
