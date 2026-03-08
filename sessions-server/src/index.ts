import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import authRouter from "./routes/auth";
import historyRouter from "./routes/history";
import playlistsRouter from "./routes/playlists";
import sharesRouter from "./routes/shares";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const port = config.port;

// CORS — allow the frontend origin with credentials
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CSRF Protection Middleware
// For all state-changing API requests, ensure the request came from our frontend
// (which sets this custom header on all fetch calls) and not a cross-origin form POST.
app.use("/api", (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    if (req.headers["x-requested-with"] !== "XMLHttpRequest") {
      res.status(403).json({ error: "Missing CSRF protection header" });
      return;
    }
  }
  next();
});

// Session store backed by Postgres
const PgSession = connectPgSimple(session);
const pgPool = new Pool({ connectionString: config.databaseUrl });

pgPool.on("error", (err) => console.error("PG pool error:", err));

app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.isProduction,
      httpOnly: true,
      maxAge: config.sessionCookieDays * 24 * 60 * 60 * 1000,
      sameSite: config.cookieSameSite,
    },
  }),
);

// Routes (all under /api — matched by the single Vite proxy rule)
app.use("/api/auth", authRouter);
app.use("/api/history", historyRouter);
app.use("/api/playlists", playlistsRouter);
app.use("/api/shares", sharesRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`🎵 Sessions server running on http://localhost:${port}`);
});

export default app;
