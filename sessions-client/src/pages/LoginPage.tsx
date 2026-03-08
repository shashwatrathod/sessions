import { motion } from "framer-motion";
import { loginUrl } from "../lib/api";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../lib/api";

export default function LoginPage() {
  const navigate = useNavigate();

  // Check URL for error param
  const urlError = new URLSearchParams(window.location.search).get("error");

  // If already logged in, redirect to sessions
  useEffect(() => {
    getMe()
      .then(() => navigate("/sessions"))
      .catch(() => {});
  }, [navigate]);

  return (
    <div className="login-page">
      {/* Animated gradient background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <motion.div
        className="login-content"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo mark */}
        <motion.div
          className="logo-mark"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <img
            src="/logo.svg"
            alt="Sessions Logo"
            width="40"
            height="40"
            style={{ borderRadius: "8px" }}
          />
          <span className="logo-text">Sessions</span>
        </motion.div>

        <motion.h1
          className="login-headline"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Your music history,
          <br />
          <span className="headline-accent">beautifully organized.</span>
        </motion.h1>

        <motion.p
          className="login-subtext"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Rediscover songs from your Spotify listening sessions.
          <br />
          Find that track you heard during your evening run — and turn it into a
          playlist.
        </motion.p>

        {urlError && (
          <motion.div
            className="error-banner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {urlError === "access_denied"
              ? "Authorization was cancelled. Please try again."
              : "Something went wrong. Please try again."}
          </motion.div>
        )}

        <motion.a
          href={loginUrl}
          className="btn btn-primary btn-lg spotify-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <SpotifyIcon />
          Connect with Spotify
        </motion.a>

        <motion.div
          className="login-features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[
            "Browse listening sessions",
            "See every song you played",
            "Save sessions as playlists",
          ].map((f) => (
            <div key={f} className="feature-pill">
              <span className="feature-check">✓</span> {f}
            </div>
          ))}
        </motion.div>
      </motion.div>

      <style>{loginStyles}</style>
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

const loginStyles = `
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  overflow: hidden;
  position: relative;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  animation: float 8s ease-in-out infinite;
}
.orb-1 { width: 500px; height: 500px; background: #1db954; top: -150px; right: -100px; animation-delay: 0s; }
.orb-2 { width: 400px; height: 400px; background: #7b2ff7; bottom: -100px; left: -100px; animation-delay: -3s; }
.orb-3 { width: 300px; height: 300px; background: #0ea5e9; top: 50%; left: 40%; animation-delay: -1.5s; }

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(20px, -20px) scale(1.05); }
  66% { transform: translate(-15px, 15px) scale(0.95); }
}

.login-content {
  position: relative;
  z-index: 10;
  text-align: center;
  max-width: 560px;
  padding: 40px 20px;
}

.logo-mark {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 40px;
}
.logo-text {
  font-family: 'Outfit', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.login-headline {
  font-size: clamp(36px, 6vw, 54px);
  line-height: 1.15;
  margin-bottom: 20px;
  color: var(--text-primary);
}
.headline-accent {
  background: linear-gradient(135deg, #1db954, #0ea5e9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-subtext {
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.7;
  margin-bottom: 36px;
}

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  padding: 12px 20px;
  color: #f87171;
  font-size: 14px;
  margin-bottom: 24px;
}

.spotify-btn {
  font-size: 16px;
  padding: 16px 36px;
  box-shadow: 0 4px 32px rgba(29, 185, 84, 0.3);
}

.login-features {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 32px;
}
.feature-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-glass);
}
.feature-check {
  color: var(--accent);
  font-weight: 700;
}
`;
