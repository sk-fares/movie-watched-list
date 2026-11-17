# ReelVault - Movie & Series Watchlist Application

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- TMDB API key (free at https://www.themoviedb.org/settings/api)
- Google OAuth credentials (optional, for Google sign-in)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy `.env.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Random secret for session encryption (generate with `openssl rand -base64 32`)
   - `TMDB_API_KEY` - Your TMDB API key

   Optional variables:
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth sign-in

3. **Set up the database:**
   ```bash
   npx prisma db push
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Getting API Keys

#### TMDB API Key
1. Create an account at [themoviedb.org](https://www.themoviedb.org/)
2. Go to Settings → API → Request an API key
3. Copy the **API Key (v3 auth)** to `TMDB_API_KEY`

#### Google OAuth (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI
5. Copy Client ID and Client Secret to your `.env.local`

## Features

### Core Features
- 🎬 **Movie & TV Show Discovery** - Browse trending, popular, and top-rated content via TMDB
- 📋 **Personal Watchlist** - Add movies and series to your watchlist with grid/list views
- 🎲 **Random Pick** - Randomly select from your watchlist with animated card selection
- 📊 **Watch History** - Track everything you've watched with ratings and reviews
- 🏠 **Dashboard** - Stats, recently watched, continue watching, quick actions

### Smart Sequential Tracking (Key Feature)
- 🎯 **Franchise Management** - Import TMDB collections (MCU, Star Wars, etc.)
- 📐 **Sequential Order** - Maintains correct viewing order within franchises
- 🔗 **Automatic Linking** - When marking a movie as watched, the system automatically detects if it belongs to a franchise and updates its position
- 📈 **Progress Tracking** - See how far you are in each franchise

### Authentication
- 📧 Email/password registration and login
- 🔐 Google OAuth sign-in
- 🔒 Password reset
- 👤 Per-user data isolation

### UI/UX
- 🌙 Dark cinematic theme with purple accents
- 📱 Fully responsive design
- ✨ Smooth animations and transitions
- 🎨 Premium movie card hover effects

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS, Radix UI, Framer Motion
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (Google OAuth + Credentials)
- **API:** TMDB (The Movie Database)
- **Icons:** Lucide React

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Forgot Password
│   ├── (main)/          # Dashboard, Discover, Watchlist, etc.
│   │   ├── dashboard/
│   │   ├── discover/
│   │   ├── movies/
│   │   ├── series/
│   │   ├── watchlist/
│   │   ├── history/
│   │   ├── franchises/
│   │   ├── random-pick/
│   │   ├── settings/
│   │   └── content/[type]/[id]/
│   └── api/             # API Routes
│       ├── auth/
│       ├── tmdb/
│       ├── watchlist/
│       ├── watched/
│       ├── franchise/
│       ├── random/
│       ├── ratings/
│       ├── reviews/
│       ├── stats/
│       └── export/
├── components/          # Reusable UI components
├── lib/                 # Core utilities, Prisma, TMDB, Auth
├── hooks/               # Custom React hooks
└── types/               # TypeScript types
```

## Database Commands

```bash
npx prisma db push          # Push schema to database
npx prisma migrate dev      # Create migration
npx prisma studio           # Open database GUI
npx prisma generate         # Regenerate Prisma client
```
