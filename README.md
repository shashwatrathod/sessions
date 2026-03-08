# Sessions 🎵

> Rediscover your Spotify listening history, organized into sessions. Save any session as a Spotify playlist.

## Project Structure

```
Sessions/
├── sessions-server/    # Node.js + Express + TypeScript backend
└── sessions-client/    # Vite + React + TypeScript frontend
```

## Setup

### 1. Spotify Developer App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3001/auth/callback` as a **Redirect URI**
4. Note your **Client ID** and **Client Secret**

### 2. PostgreSQL

Make sure you have a PostgreSQL database running. You can use a local instance or a service like [Supabase](https://supabase.com).

### 3. Backend Setup

```bash
cd sessions-server

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your Spotify credentials and DATABASE_URL

# Run database migrations
npx prisma migrate dev --name init

# Start the development server
npm run dev
```

### 4. Frontend Setup

```bash
cd sessions-client

# The .env is already configured for localhost
# Start the dev server
npm run dev
```

Visit `http://localhost:5173` and connect your Spotify account.

## Environment Variables

### `sessions-server/.env`

| Variable                | Description                                |
| ----------------------- | ------------------------------------------ |
| `SPOTIFY_CLIENT_ID`     | Your Spotify app Client ID                 |
| `SPOTIFY_CLIENT_SECRET` | Your Spotify app Client Secret             |
| `SPOTIFY_REDIRECT_URI`  | `http://localhost:3001/auth/callback`      |
| `DATABASE_URL`          | PostgreSQL connection string               |
| `SESSION_SECRET`        | A random secret string for session signing |
| `FRONTEND_URL`          | `http://localhost:5173`                    |
| `PORT`                  | Backend port (default: 3001)               |

## API Endpoints

| Method  | Path                    | Description                              |
| ------- | ----------------------- | ---------------------------------------- |
| `GET`   | `/auth/login`           | Redirect to Spotify auth                 |
| `GET`   | `/auth/callback`        | OAuth callback                           |
| `GET`   | `/auth/me`              | Current user profile                     |
| `POST`  | `/auth/logout`          | Logout                                   |
| `GET`   | `/history/sync`         | Fetch & store latest tracks from Spotify |
| `GET`   | `/history/sessions`     | List all computed sessions               |
| `GET`   | `/history/sessions/:id` | Session detail with tracks               |
| `POST`  | `/playlists`            | Create Spotify playlist from session     |
| `GET`   | `/playlists/saved`      | List saved sessions                      |
| `PATCH` | `/playlists/saved/:id`  | Rename a saved session                   |

## How Sessions Work

A "session" is a group of consecutively played tracks with no gap longer than **30 minutes**. The algorithm:

1. Fetches all stored `PlayHistory` records for the user
2. Sorts them chronologically
3. Splits into groups wherever the gap between consecutive plays exceeds 30 minutes
4. Returns sessions newest-first

## Tech Stack

**Backend**: Node.js · Express · TypeScript · Prisma · PostgreSQL · express-session  
**Frontend**: Vite · React · TypeScript · React Router · TanStack Query · Framer Motion
