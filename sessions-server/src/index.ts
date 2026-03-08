import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import authRouter from "./routes/auth";
import historyRouter from "./routes/history";
import playlistsRouter from "./routes/playlists";

const app = express();
const port = process.env.PORT ?? 3000;

// CORS — allow the frontend origin with credentials
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store backed by Postgres
const PgSession = connectPgSimple(session);
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

pgPool.on("error", (err) => console.error("PG pool error:", err));

app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ?? "fallback-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // must be false for http in development
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    },
  }),
);

// Routes (all under /api — matched by the single Vite proxy rule)
app.use("/api/auth", authRouter);
app.use("/api/history", historyRouter);
app.use("/api/playlists", playlistsRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🎵 Sessions server running on http://localhost:${port}`);
});

export default app;
