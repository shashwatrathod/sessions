import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { createPlaylist } from "../lib/api";
import type { SessionDetail } from "../types";
import { colorToCss } from "../lib/colors";

interface Props {
  session: SessionDetail;
  accentColor: [number, number, number];
  onClose: () => void;
}

type Step = "form" | "loading" | "success" | "error";

export default function SavePlaylistModal({
  session,
  accentColor,
  onClose,
}: Props) {
  const startDate = new Date(session.startTime);
  const defaultName = `Session — ${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  const [name, setName] = useState(defaultName);
  const [isPublic, setIsPublic] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const accentCss = colorToCss(accentColor);

  const mutation = useMutation({
    mutationFn: () =>
      createPlaylist({
        name,
        trackUris: session.tracks.map((t) => t.trackUri),
        isPublic,
        sessionStartTime: session.startTime,
        sessionEndTime: session.endTime,
      }),
    onMutate: () => setStep("loading"),
    onSuccess: (result) => {
      setPlaylistUrl(result.spotifyPlaylistUrl);
      setStep("success");
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      setStep("error");
    },
  });

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="modal-box"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          {step === "form" && (
            <>
              <div className="modal-header">
                <h2 className="modal-title">Save as Playlist</h2>
                <button className="modal-close" onClick={onClose}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="modal-sub text-secondary text-sm mb-4">
                {session.trackCount} tracks ·{" "}
                {new Date(session.startTime).toLocaleDateString()}
              </p>

              <div className="form-group mb-4">
                <label className="form-label">Playlist Name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Give your session a name..."
                  maxLength={100}
                  id="playlist-name-input"
                />
              </div>

              <div className="toggle-row mb-6">
                <div>
                  <p className="font-medium" style={{ fontSize: 14 }}>
                    Public Playlist
                  </p>
                  <p className="text-muted text-sm">
                    Anyone on Spotify can find this
                  </p>
                </div>
                <label className="toggle" htmlFor="public-toggle">
                  <input
                    type="checkbox"
                    id="public-toggle"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ background: accentCss, color: "#000" }}
                  onClick={() => mutation.mutate()}
                  disabled={!name.trim()}
                  id="confirm-save-btn"
                >
                  Create Playlist
                </button>
              </div>
            </>
          )}

          {step === "loading" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div className="spinner" style={{ margin: "0 auto 20px" }} />
              <p className="text-secondary">Creating playlist on Spotify…</p>
            </div>
          )}

          {step === "success" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <motion.div
                className="success-icon"
                style={{ background: colorToCss(accentColor, 0.15) }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={accentCss}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </motion.div>
              <h3 style={{ marginBottom: 8 }}>Playlist Created!</h3>
              <p
                className="text-secondary text-sm mb-6"
                style={{ lineHeight: 1.6 }}
              >
                "{name}" has been added to your Spotify library.
              </p>
              <div className="flex gap-3" style={{ justifyContent: "center" }}>
                <button className="btn btn-ghost" onClick={onClose}>
                  Done
                </button>
                <a
                  href={playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ background: accentCss, color: "#000" }}
                  id="open-spotify-btn"
                >
                  Open in Spotify
                </a>
              </div>
            </div>
          )}

          {step === "error" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                className="success-icon"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  margin: "0 auto 20px",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f87171"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
              <h3 style={{ marginBottom: 8 }}>Something went wrong</h3>
              <p className="text-secondary text-sm mb-6">
                {errorMsg || "Failed to create playlist."}
              </p>
              <div className="flex gap-3" style={{ justifyContent: "center" }}>
                <button className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setStep("form")}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Scoped styles
const _style = document.createElement("style");
_style.textContent = `
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.modal-title { font-size: 20px; }
.modal-sub { margin-bottom: 20px; display: block; }
.modal-close {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--bg-glass);
  color: var(--text-muted);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--transition);
}
.modal-close:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
`;
if (!document.head.contains(_style)) document.head.appendChild(_style);
