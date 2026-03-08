import { useEffect, useState } from "react";
import type { SessionSummary } from "../types";
import { getDominantColor, colorToCss } from "../lib/colors";

interface Props {
  session: SessionSummary;
  onClick: () => void;
}

export default function SessionCard({ session, onClick }: Props) {
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

.card-images {
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
`;
