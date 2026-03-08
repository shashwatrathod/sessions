import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { getSessionDetail } from "../lib/api";
import { getDominantColor, colorToCss } from "../lib/colors";
import TrackRow from "../components/TrackRow";
import SavePlaylistModal from "../components/SavePlaylistModal";
import SaveSessionModal from "../components/SaveSessionModal";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [accentColor, setAccentColor] = useState<[number, number, number]>([
    29, 185, 84,
  ]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSaveSessionModal, setShowSaveSessionModal] = useState(false);

  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["session", id],
    queryFn: () => getSessionDetail(decodeURIComponent(id!)),
    enabled: !!id,
  });

  // Extract color from first album art
  useEffect(() => {
    const firstImage = session?.previewImages?.[0];
    if (firstImage) {
      getDominantColor(firstImage)
        .then(setAccentColor)
        .catch(() => {});
    }
  }, [session]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const totalDuration =
    session?.tracks.reduce((acc, t) => acc + t.durationMs, 0) ?? 0;
  const totalMins = Math.round(totalDuration / 60000);

  if (isLoading) {
    return (
      <div
        className="page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div
        className="page"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 16,
        }}
      >
        <p style={{ color: "var(--text-secondary)" }}>Session not found.</p>
        <button className="btn btn-ghost" onClick={() => navigate("/sessions")}>
          ← Back to Sessions
        </button>
      </div>
    );
  }

  const accentCss = colorToCss(accentColor);
  const accentMuted = colorToCss(accentColor, 0.15);
  const accentGradient = `linear-gradient(180deg, ${colorToCss(accentColor, 0.35)} 0%, transparent 100%)`;

  return (
    <div className="page detail-page">
      {/* Hero banner */}
      <motion.div
        className="detail-hero"
        style={{ background: accentGradient }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container">
          <button className="back-btn" onClick={() => navigate("/sessions")}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            All Sessions
          </button>

          <div className="detail-header">
            {/* Album art collage */}
            <div className="album-collage">
              {session.previewImages.slice(0, 4).map((img, i) => (
                <img key={i} src={img} alt="" className="collage-img" />
              ))}
            </div>

            <div className="detail-meta">
              <p className="session-label" style={{ color: accentCss }}>
                Listening Session
              </p>
              <h1 className="detail-title">{formatDate(session.startTime)}</h1>
              <p className="detail-subtitle">
                {formatTime(session.startTime)} – {formatTime(session.endTime)}
                {" · "}
                <strong>{session.trackCount} tracks</strong>
                {" · "}
                {totalMins} minutes
              </p>

              {/* Auto-tags */}
              {session.tags?.length > 0 && (
                <div
                  className="flex gap-2 flex-wrap"
                  style={{ marginBottom: 20 }}
                >
                  {session.tags.map((tag) => (
                    <span
                      key={tag}
                      className="tag-chip detail-tag"
                      style={{ color: accentCss }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
                <button
                  className="btn btn-ghost save-btn"
                  onClick={() => setShowSaveSessionModal(true)}
                  id="save-session-btn"
                >
                  <BookmarkIcon />
                  Save Session
                </button>
                <button
                  className="btn btn-primary save-btn"
                  style={{
                    background: accentCss,
                    color: "#000",
                    boxShadow: `0 8px 24px ${colorToCss(accentColor, 0.4)}`,
                  }}
                  onClick={() => setShowSaveModal(true)}
                  id="save-playlist-btn"
                >
                  <SaveIcon />
                  Save as Playlist
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Track list */}
      <div className="container" style={{ paddingTop: 24, paddingBottom: 80 }}>
        <div className="track-list">
          {session.tracks.map((track, i) => (
            <motion.div
              key={`${track.trackUri}-${track.playedAt}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025, duration: 0.3 }}
            >
              <TrackRow track={track} index={i} accentColor={accentMuted} />
            </motion.div>
          ))}
        </div>
      </div>

      {showSaveModal && (
        <SavePlaylistModal
          session={session}
          accentColor={accentColor}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {showSaveSessionModal && (
        <SaveSessionModal
          session={session}
          accentColor={accentColor}
          onClose={() => setShowSaveSessionModal(false)}
        />
      )}

      <style>{detailStyles}</style>
    </div>
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

function SaveIcon() {
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

const detailStyles = `
.detail-page { min-height: 100vh; }

.detail-hero {
  padding: 24px 0 40px;
  border-bottom: 1px solid var(--border);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 28px;
  transition: color var(--transition);
  padding: 0;
}
.back-btn:hover { color: var(--text-primary); }

.detail-header {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.album-collage {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  width: 180px;
  height: 180px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.album-collage:has(.collage-img:only-child) { grid-template-columns: 1fr; }
.collage-img { width: 100%; height: 100%; object-fit: cover; }

.detail-meta { flex: 1; min-width: 0; }

.session-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.detail-title {
  font-size: clamp(24px, 4vw, 36px);
  margin-bottom: 10px;
  line-height: 1.2;
}
.detail-subtitle {
  color: var(--text-secondary);
  font-size: 15px;
  margin-bottom: 28px;
}

.save-btn {
  font-size: 15px;
  padding: 12px 24px;
}

.detail-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
}

.track-list { display: flex; flex-direction: column; gap: 2px; }
`;
