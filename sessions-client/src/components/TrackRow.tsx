import type { TrackInfo } from "../types";

interface Props {
  track: TrackInfo;
  index: number;
  accentColor: string;
}

export default function TrackRow({ track, index, accentColor }: Props) {
  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  return (
    <div
      className="track-row"
      style={{ "--track-accent": accentColor } as React.CSSProperties}
    >
      <span className="track-index">{index + 1}</span>

      <img
        src={track.albumArt}
        alt={track.albumName}
        className="track-art"
        loading="lazy"
      />

      <div className="track-info">
        <p className="track-name">{track.trackName}</p>
        <p className="track-artist text-muted text-sm">
          {track.artistNames.join(", ")} · {track.albumName}
        </p>
      </div>

      <span className="track-played text-muted text-sm">
        {formatTime(track.playedAt)}
      </span>
      <span className="track-duration text-muted text-sm">
        {formatDuration(track.durationMs)}
      </span>

      <style>{rowStyles}</style>
    </div>
  );
}

const rowStyles = `
.track-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
  cursor: default;
}
.track-row:hover { background: var(--track-accent, var(--bg-card)); }

.track-index {
  width: 28px;
  text-align: right;
  font-size: 13px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.track-art {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}
.track-info { flex: 1; min-width: 0; }
.track-name {
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-artist {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
.track-played { flex-shrink: 0; width: 70px; text-align: right; }
.track-duration { flex-shrink: 0; width: 42px; text-align: right; }

@media (max-width: 600px) {
  .track-played { display: none; }
}
`;
