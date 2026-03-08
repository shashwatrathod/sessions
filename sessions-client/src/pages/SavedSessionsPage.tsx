import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getSavedSessions, deleteSession, createShareLink } from "../lib/api";
import { useState } from "react";

export default function SavedSessionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["savedSessions"],
    queryFn: getSavedSessions,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savedSessions"] });
      setDeletingId(null);
    },
  });

  const shareMutation = useMutation({
    mutationFn: (savedSessionId: string) => createShareLink(savedSessionId),
    onSuccess: async (data) => {
      try {
        await navigator.clipboard.writeText(data.url);
        setCopiedId(data.savedSessionId ?? sharingId ?? "");
        setSharingId(null);
        setTimeout(() => setCopiedId(null), 3000);
      } catch {
        // Fallback: show the URL in a prompt if clipboard denied
        window.prompt("Share this link:", data.url);
        setSharingId(null);
      }
    },
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  return (
    <div className="page saved-sessions-page">
      {/* Header — matches sessions header style */}
      <header className="sessions-header">
        <div className="container saved-header-inner">
          {/* Left — back button */}
          <button
            className="btn btn-ghost saved-back-btn"
            onClick={() => navigate("/sessions")}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Right — logo + brand */}
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Sessions Logo" width="24" height="24" />
            <span className="header-brand">Sessions</span>
          </div>
        </div>
      </header>

      <main className="sessions-main">
        <div className="container">
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Saved Sessions</h1>
              <p className="page-subtitle text-secondary">
                {sessions.length > 0
                  ? `${sessions.length} saved session${sessions.length !== 1 ? "s" : ""}`
                  : "Sessions you save will appear here"}
              </p>
            </div>
          </div>

          {/* Skeleton */}
          {isLoading && (
            <div className="saved-grid">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton-card"
                  style={{ height: 280 }}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && sessions.length === 0 && (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="empty-icon">🔖</div>
              <h2>No saved sessions yet</h2>
              <p className="text-secondary">
                Open any session and click "Save Session" to bookmark it here.
              </p>
              <button
                className="btn btn-ghost"
                style={{ marginTop: 16 }}
                onClick={() => navigate("/sessions")}
              >
                Browse Sessions
              </button>
            </motion.div>
          )}

          {/* Grid of saved session cards */}
          <AnimatePresence>
            {!isLoading && sessions.length > 0 && (
              <motion.div
                className="saved-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {sessions.map((session, i) => {
                  const virtualId = `session_${new Date(session.startTime).getTime()}_${new Date(session.endTime).getTime()}`;
                  const isDeleting = deletingId === session.id;
                  const isCopied = copiedId === session.id;

                  return (
                    <motion.div
                      key={session.id}
                      className="saved-card glass-card"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      {/* Album art grid — same pattern as SessionCard */}
                      <div
                        className="saved-card-art"
                        onClick={() =>
                          navigate(`/sessions/${encodeURIComponent(virtualId)}`)
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          navigate(`/sessions/${encodeURIComponent(virtualId)}`)
                        }
                      >
                        {session.previewImages.length > 0 ? (
                          session.previewImages
                            .slice(0, 4)
                            .map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt=""
                                className="saved-card-album-img"
                                loading="lazy"
                              />
                            ))
                        ) : (
                          <div className="saved-card-no-art">🎵</div>
                        )}
                      </div>

                      {/* Card body */}
                      <div
                        className="saved-card-body"
                        onClick={() =>
                          navigate(`/sessions/${encodeURIComponent(virtualId)}`)
                        }
                        role="button"
                        tabIndex={-1}
                      >
                        <div className="saved-card-date text-secondary">
                          {formatDate(session.startTime)}
                        </div>
                        <h3 className="saved-card-name">{session.name}</h3>
                        <p
                          className="text-secondary"
                          style={{ fontSize: 13, marginBottom: 12 }}
                        >
                          {formatTime(session.startTime)} –{" "}
                          {formatTime(session.endTime)}
                          {session.trackUris.length > 0 && (
                            <> · {session.trackUris.length} tracks</>
                          )}
                        </p>

                        {session.spotifyPlaylistUrl && (
                          <a
                            href={session.spotifyPlaylistUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="spotify-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SpotifyIcon /> Open in Spotify
                          </a>
                        )}
                      </div>

                      {/* Action row */}
                      <div
                        className="saved-card-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Share */}
                        <button
                          className={`action-btn ${isCopied ? "action-btn--active" : ""}`}
                          onClick={() => {
                            setSharingId(session.id);
                            shareMutation.mutate(session.id);
                          }}
                          disabled={
                            shareMutation.isPending && sharingId === session.id
                          }
                          title="Copy share link"
                        >
                          {isCopied ? <CheckIcon /> : <ShareIcon />}
                          <span>{isCopied ? "Copied!" : "Share"}</span>
                        </button>

                        {/* Delete */}
                        {isDeleting ? (
                          <div className="flex gap-2 items-center">
                            <span
                              className="text-secondary"
                              style={{ fontSize: 12 }}
                            >
                              Delete?
                            </span>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteMutation.mutate(session.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Yes
                            </button>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => setDeletingId(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            className="action-btn action-btn--danger"
                            onClick={() => setDeletingId(session.id)}
                            title="Delete"
                          >
                            <TrashIcon />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style>{savedStyles}</style>
    </div>
  );
}

// --- Icons ---
function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.371-.721.49-1.101.241-3.021-1.858-6.832-2.278-11.322-1.237-.422.1-.851-.16-.949-.58-.1-.422.159-.851.58-.949 4.91-1.121 9.12-.64 12.521 1.41.38.24.5.721.271 1.115zm1.47-3.27c-.301.461-.932.609-1.392.301-3.459-2.129-8.73-2.748-12.822-1.504-.529.16-1.09-.139-1.24-.67-.16-.531.14-1.09.67-1.24 4.671-1.42 10.479-.72 14.459 1.72.459.301.619.931.325 1.393zm.129-3.398c-4.15-2.461-10.998-2.691-14.959-1.488-.63.191-1.299-.16-1.49-.789-.189-.631.16-1.299.79-1.49 4.551-1.379 12.12-1.111 16.888 1.721.57.338.76 1.069.421 1.638-.34.568-1.069.76-1.638.42l-.012-.012z" />
    </svg>
  );
}

// --- Styles ---
const savedStyles = `
.saved-sessions-page { min-height: 100vh; }

/* Header inner layout */
.saved-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding-top: 12px;
}

/* Back button — same height/size as other header buttons */
.saved-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  padding: 7px 14px;
}

/* Card grid */
.saved-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* Card */
.saved-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  cursor: default;
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
}
.saved-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  border-color: rgba(255,255,255,0.16);
}

/* Album art — 2×2 grid identical to SessionCard */
.saved-card-art {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 160px;
  overflow: hidden;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  cursor: pointer;
  flex-shrink: 0;
}
.saved-card-art:has(.saved-card-album-img:only-child) { grid-template-columns: 1fr; }
.saved-card-album-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.saved-card-no-art {
  grid-column: span 2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  background: var(--bg-card);
}

/* Card body */
.saved-card-body {
  padding: 16px 18px 12px;
  flex: 1;
  cursor: pointer;
}
.saved-card-date {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.saved-card-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Action row */
.saved-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
  gap: 8px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}
.action-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn--active {
  background: rgba(29, 185, 84, 0.12);
  border-color: rgba(29, 185, 84, 0.3);
  color: #1db954;
}
.action-btn--danger:hover {
  background: rgba(239,68,68,0.12);
  border-color: rgba(239,68,68,0.25);
  color: #f87171;
}

.btn-sm { font-size: 11px; padding: 3px 10px; }
.btn-danger {
  background: rgba(239,68,68,0.15);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.25);
}
.btn-danger:hover { background: rgba(239,68,68,0.25); }

.spotify-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #1db954;
  text-decoration: none;
  font-weight: 500;
  transition: opacity var(--transition);
}
.spotify-link:hover { opacity: 0.8; }
`;
