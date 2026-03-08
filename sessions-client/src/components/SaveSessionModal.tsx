import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveSession } from "../lib/api";
import type { SessionDetail } from "../types";
import { colorToCss } from "../lib/colors";

interface Props {
  session: SessionDetail;
  accentColor: [number, number, number];
  onClose: () => void;
}

type Step = "form" | "loading" | "success" | "error";

export default function SaveSessionModal({
  session,
  accentColor,
  onClose,
}: Props) {
  const qc = useQueryClient();
  const startDate = new Date(session.startTime);
  const defaultName = `Session — ${startDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;

  const [name, setName] = useState(defaultName);
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");

  const accentCss = colorToCss(accentColor);
  const accentMuted = colorToCss(accentColor, 0.15);

  const mutation = useMutation({
    mutationFn: () =>
      saveSession({
        name,
        trackUris: session.tracks.map((t) => t.trackUri),
        sessionStartTime: session.startTime,
        sessionEndTime: session.endTime,
      }),
    onMutate: () => setStep("loading"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savedSessions"] });
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
                <div>
                  <h2 className="modal-title">Save Session</h2>
                  <p
                    className="text-secondary text-sm"
                    style={{ marginTop: 4 }}
                  >
                    Saves to your library — no Spotify playlist created
                  </p>
                </div>
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

              <p
                className="text-secondary text-sm"
                style={{ marginBottom: 20, display: "block" }}
              >
                {session.trackCount} tracks · {startDate.toLocaleDateString()}
              </p>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Session Name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Give this session a name…"
                  maxLength={100}
                  id="save-session-name-input"
                  autoFocus
                />
              </div>

              {/* Tag preview */}
              {session.tags?.length > 0 && (
                <div
                  className="flex gap-2 flex-wrap"
                  style={{ marginBottom: 24 }}
                >
                  {session.tags.map((tag) => (
                    <span
                      key={tag}
                      className="tag-chip"
                      style={{ background: accentMuted, color: accentCss }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ background: accentCss, color: "#000" }}
                  onClick={() => mutation.mutate()}
                  disabled={!name.trim()}
                  id="confirm-save-session-btn"
                >
                  <BookmarkIcon />
                  Save Session
                </button>
              </div>
            </>
          )}

          {step === "loading" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div className="spinner" style={{ margin: "0 auto 20px" }} />
              <p className="text-secondary">Saving session…</p>
            </div>
          )}

          {step === "success" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <motion.div
                className="success-icon"
                style={{ background: accentMuted }}
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
              <h3 style={{ marginBottom: 8 }}>Session Saved!</h3>
              <p
                className="text-secondary text-sm"
                style={{ marginBottom: 24, lineHeight: 1.6 }}
              >
                "{name}" has been added to your saved sessions.
              </p>
              <div className="flex gap-3" style={{ justifyContent: "center" }}>
                <button className="btn btn-ghost" onClick={onClose}>
                  Done
                </button>
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
              <p
                className="text-secondary text-sm"
                style={{ marginBottom: 24 }}
              >
                {errorMsg || "Failed to save session."}
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
