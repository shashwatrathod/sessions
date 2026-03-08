import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getMe,
  logout,
  getSessions,
  syncHistory,
  getSavedSessions,
} from "../lib/api";
import SessionCard from "../components/SessionCard";
import { useState } from "react";

export default function SessionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const {
    data: sessionsData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ["sessions"],
    queryFn: ({ pageParam }) => getSessions(pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
  });

  const sessions = sessionsData?.pages.flatMap((p) => p.data) ?? [];

  // Fetch saved sessions to overlay friendly names on session cards
  const { data: savedSessions = [] } = useQuery({
    queryKey: ["savedSessions"],
    queryFn: getSavedSessions,
    staleTime: 60_000,
  });

  // Build a map: virtualSessionId → custom saved name
  const savedNameMap = new Map(
    savedSessions.map((s) => [
      `session_${new Date(s.startTime).getTime()}_${new Date(s.endTime).getTime()}`,
      s.name,
    ]),
  );

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.clear();
      navigate("/");
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncHistory();
      await qc.invalidateQueries({ queryKey: ["sessions"] });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="page sessions-page">
      {/* Header */}
      <header className="sessions-header">
        <div
          className="container flex items-center justify-between"
          style={{ height: "100%" }}
        >
          <div className="flex items-center gap-3">
            <div className="header-logo">
              <img src="/logo.svg" alt="Sessions Logo" width="24" height="24" />
            </div>
            <span className="header-brand">Sessions</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="btn btn-ghost"
              onClick={() => navigate("/saved-sessions")}
              id="saved-sessions-btn"
            >
              <BookmarkIcon />
              Saved
            </button>

            <button
              className="btn btn-ghost"
              onClick={handleSync}
              disabled={syncing}
              id="sync-btn"
            >
              <SyncIcon spinning={syncing} />
              {syncing ? "Syncing…" : "Sync History"}
            </button>

            <div className="user-pill">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="avatar"
                />
              ) : (
                <div className="avatar-placeholder">
                  {user?.displayName?.[0] ?? "?"}
                </div>
              )}
              <span className="user-name">{user?.displayName}</span>
              <button
                className="logout-btn"
                onClick={() => logoutMutation.mutate()}
                title="Logout"
                id="logout-btn"
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="sessions-main">
        <div className="container">
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Listening Sessions</h1>
              <p className="page-subtitle text-secondary">
                {sessions.length > 0
                  ? `${sessions.length} sessions discovered`
                  : "Your sessions will appear here"}
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="loading-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-card" />
              ))}
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>
                Failed to load sessions.{" "}
                <button className="btn btn-ghost" onClick={handleSync}>
                  Try syncing
                </button>
              </p>
            </div>
          )}

          {!isLoading && sessions.length === 0 && (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="empty-icon">🎵</div>
              <h2>No sessions yet</h2>
              <p className="text-secondary">
                Click "Sync History" to load your Spotify listening history.
              </p>
              <button
                className="btn btn-primary mt-4"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? "Syncing…" : "Sync Now"}
              </button>
            </motion.div>
          )}

          <AnimatePresence>
            {!isLoading && sessions.length > 0 && (
              <motion.div
                className="sessions-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.05 }}
              >
                {sessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (i % 20) * 0.04, duration: 0.4 }}
                  >
                    <SessionCard
                      session={session}
                      savedName={savedNameMap.get(session.id)}
                      onClick={() =>
                        navigate(`/sessions/${encodeURIComponent(session.id)}`)
                      }
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {hasNextPage && (
            <div style={{ textAlign: "center", marginTop: "32px" }}>
              <button
                className="btn btn-ghost"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </main>

      <style>{sessionsStyles}</style>
    </div>
  );
}

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      style={{ animation: spinning ? "spin 0.8s linear infinite" : "none" }}
    >
      <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

const sessionsStyles = `
.sessions-page { min-height: 100vh; }

.sessions-header {
  height: 64px;
  border-bottom: 1px solid var(--border);
  background: rgba(10,10,15,0.9);
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  z-index: 50;
}
.user-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 6px 6px 14px;
  background: var(--bg-glass);
  border: 1px solid var(--border);
  border-radius: 999px;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
.avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-muted);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
}
.user-name { font-size: 14px; font-weight: 500; }
.logout-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}
.logout-btn:hover { background: rgba(239,68,68,0.1); color: #f87171; }

.sessions-main { padding: 40px 0 80px; }

.page-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 32px;
}
.page-title { font-size: 32px; margin-bottom: 4px; }
.page-subtitle { font-size: 15px; }

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.skeleton-card {
  height: 240px;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state h2 { font-size: 24px; margin-bottom: 8px; }

.error-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}
`;
