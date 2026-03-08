import { useEffect, useState } from "react";
import type { SessionSummary } from "../types";
import { getDominantColor, colorToCss } from "../lib/colors";

interface Props {
  session: SessionSummary;
  savedName?: string; // custom name set by user when saving
  onClick: () => void;
}

export default function SessionCard({ session, savedName, onClick }: Props) {
  const [accentColor, setAccentColor] = useState<[number, number, number]>([
    29, 185, 84,
  ]);

  useEffect(() => {
    const img = session.previewImages[0];
    if (img) {
      getDominantColor(img)
        .then(setAccentColor)
        .catch(() => {});
    }
  }, [session.previewImages]);

  const accentCss = colorToCss(accentColor);
  const accentMuted = colorToCss(accentColor, 0.1);
  const accentBorder = colorToCss(accentColor, 0.25);

  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const durationMins = Math.round(
    (endDate.getTime() - startDate.getTime()) / 60000,
  );

  return (
    <div
      className="session-card glass-card"
      onClick={onClick}
      style={
        {
          "--accent": accentCss,
          "--accent-muted": accentMuted,
          "--accent-border": accentBorder,
        } as React.CSSProperties
      }
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* Album art grid */}
      <div className="card-images">
        {session.previewImages.slice(0, 4).map((img, i) => (
          <img
            key={i}
            src={img}
            alt=""
            className="card-album-img"
            loading="lazy"
          />
        ))}
        {session.previewImages.length === 0 && (
          <div className="card-no-art">🎵</div>
        )}
        {/* Saved name badge */}
        {savedName && (
          <div className="card-saved-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {savedName}
          </div>
        )}
      </div>

      {/* Card meta */}
      <div className="card-body">
        <div className="card-date" style={{ color: accentCss }}>
          {formatDate(startDate)}
        </div>
        <h3 className="card-title">
          {formatTime(startDate)} – {formatTime(endDate)}
        </h3>
        <div className="card-stats">
          <span
            className="stat-pill"
            style={{ background: accentMuted, borderColor: accentBorder }}
          >
            {session.trackCount} tracks
          </span>
          <span
            className="stat-pill"
            style={{ background: accentMuted, borderColor: accentBorder }}
          >
            ~{durationMins} min
          </span>
        </div>
        {session.tags?.length > 0 && (
          <div className="card-tags">
            {session.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag-chip" style={{ color: accentCss }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card-arrow">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>

      <style>{cardStyles}</style>
    </div>
  );
}

const cardStyles = `
.session-card {
  cursor: pointer;
  position: relative;
  overflow: hidden;
  padding: 0;
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
}
.session-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  border-color: var(--accent-border, rgba(255,255,255,0.16));
}

.card-saved-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(8px);
  color: #fff;
  max-width: calc(100% - 20px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}

.card-images {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 160px;
  overflow: hidden;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
.card-images:has(.card-album-img:only-child) { grid-template-columns: 1fr; }
.card-album-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-no-art {
  grid-column: span 2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  background: var(--bg-card);
}

.card-body {
  padding: 16px 20px 20px;
}
.card-date {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.card-title {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}
.card-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.stat-pill {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid;
  color: var(--text-secondary);
}

.card-arrow {
  position: absolute;
  bottom: 20px;
  right: 20px;
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: all var(--transition);
}
.session-card:hover .card-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--text-primary);
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.tag-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  white-space: nowrap;
}
`;
