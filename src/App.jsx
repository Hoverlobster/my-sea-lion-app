import { useState, useEffect, useRef, useCallback } from "react";

const TOTAL_SEALIONS = 24;
const AUDIO_FILES = ["BAA.mp3", "URURUR.mp3"];
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

// Returns array of n unique image indices (1-based) shuffled — no duplicates
function uniqueImageIndices(total, count) {
  const pool = Array.from({ length: total }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // If count > total, cycle through shuffled pool
  const result = [];
  while (result.length < count) result.push(...pool);
  return result.slice(0, count);
}

function createSealions(count) {
  const images = uniqueImageIndices(TOTAL_SEALIONS, count);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: randomBetween(8, 92),
    y: randomBetween(8, 92),
    size: randomBetween(80, 155),
    vx: (randomBetween(-0.014, 0.014) || 0.007),
    vy: (randomBetween(-0.014, 0.014) || 0.007),
    rotation: randomBetween(0, 360),
    rotationSpeed: randomBetween(-0.12, 0.12),
    imageIndex: images[i],
    bouncing: false,
    bounceScale: 1,
  }));
}

// ── Screens ───────────────────────────────────────────────────────────────────

function EntryScreen({ onEnter }) {
  const [name, setName] = useState("");
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h1 style={styles.title}>Autistic Seal</h1>
        <p style={styles.subtitle}>click the seals. hear the noises.</p>
        <input
          style={styles.input}
          placeholder="enter your name"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onEnter(name.trim())}
          autoFocus
        />
        <button
          style={{ ...styles.btn, opacity: name.trim() ? 1 : 0.4 }}
          disabled={!name.trim()}
          onClick={() => onEnter(name.trim())}
        >
          enter
        </button>
      </div>
    </div>
  );
}

function Leaderboard({ scores, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.card, minWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ ...styles.title, fontSize: 26, marginBottom: 6 }}>all-time barks</h2>
        <p style={{ ...styles.subtitle, marginBottom: 20 }}>top 10</p>
        {scores.length === 0 && <p style={styles.subtitle}>no scores yet</p>}
        {scores.map((s, i) => (
          <div key={i} style={styles.scoreRow}>
            <span style={styles.scoreRank}>{i + 1}</span>
            <span style={styles.scoreName}>{s.username}</span>
            <span style={styles.scoreVal}>{s.score}</span>
          </div>
        ))}
        <button style={{ ...styles.btn, marginTop: 20 }} onClick={onClose}>close</button>
      </div>
    </div>
  );
}

function SuggestionBoard({ username, onClose }) {
  const [suggestions, setSuggestions] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/suggestions`)
      .then((r) => r.json())
      .then(setSuggestions)
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, message: text.trim() }),
      });
      if (res.ok) {
        const updated = await fetch(`${API_URL}/api/suggestions`).then((r) => r.json());
        setSuggestions(updated);
        setText("");
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 2500);
      }
    } catch {}
    setSending(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{ ...styles.card, minWidth: 340, maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ ...styles.title, fontSize: 26, marginBottom: 6 }}>suggestion board</h2>
        <p style={{ ...styles.subtitle, marginBottom: 16 }}>say something</p>
        <textarea
          style={styles.textarea}
          placeholder="your suggestion..."
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
        />
        {submitted && (
          <p style={{ ...styles.subtitle, color: "#1a8a4a" }}>sent.</p>
        )}
        <button
          style={{ ...styles.btn, opacity: text.trim() && !sending ? 1 : 0.4 }}
          disabled={!text.trim() || sending}
          onClick={submit}
        >
          {sending ? "sending..." : "submit"}
        </button>
        <div style={{ marginTop: 20, width: "100%" }}>
          {suggestions.map((s, i) => (
            <div key={i} style={styles.suggestionRow}>
              <span style={styles.suggName}>{s.username || "anonymous"}</span>
              <p style={styles.suggMsg}>{s.message}</p>
            </div>
          ))}
        </div>
        <button style={{ ...styles.btn, marginTop: 12 }} onClick={onClose}>close</button>
      </div>
    </div>
  );
}

// ── Main Game ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("entry");
  const [username, setUsername] = useState("");
  const [barkCount, setBarkCount] = useState(0);
  const barkCountRef = useRef(0); // always current value for save-on-unload
  const [soundOn, setSoundOn] = useState(true);
  const [sealions, setSealions] = useState([]);
  const [ripples, setRipples] = useState([]);
  const [scores, setScores] = useState([]);
  const animRef = useRef(null);
  const usernameRef = useRef("");
  const scoreSavedRef = useRef(false);

  const stars = useRef(
    Array.from({ length: 55 }, (_, i) => ({
      id: i,
      left: randomBetween(0, 100),
      top: randomBetween(0, 100),
      size: randomBetween(2, 5),
      dur: randomBetween(1.5, 4),
      delay: randomBetween(0, 3),
    }))
  );

  // Keep refs in sync
  useEffect(() => { barkCountRef.current = barkCount; }, [barkCount]);
  useEffect(() => { usernameRef.current = username; }, [username]);

  // Save score exactly once — on session end (leaderboard open or tab close)
  const saveScore = useCallback(async (nameOverride, scoreOverride) => {
    const name = nameOverride || usernameRef.current;
    const score = scoreOverride ?? barkCountRef.current;
    if (scoreSavedRef.current || !name || score === 0) return;
    scoreSavedRef.current = true;
    try {
      await fetch(`${API_URL}/api/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, score }),
      });
    } catch {}
  }, []);

  // Save on tab close / refresh
  useEffect(() => {
    const handle = () => saveScore();
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [saveScore]);

  const enterGame = (name) => {
    setUsername(name);
    usernameRef.current = name;
    scoreSavedRef.current = false;
    setSealions(createSealions(18));
    setScreen("game");
    setBarkCount(0);
    barkCountRef.current = 0;
  };

  const fetchScores = async () => {
    try {
      const data = await fetch(`${API_URL}/api/scores`).then((r) => r.json());
      setScores(Array.isArray(data) ? data : []);
    } catch {}
  };

  const openLeaderboard = async () => {
    await saveScore(); // save current session score before showing board
    await fetchScores();
    setScreen("leaderboard");
  };

  const openSuggestions = () => setScreen("suggestions");

  const playBark = useCallback(() => {
    if (!soundOn) return;
    const file = AUDIO_FILES[Math.floor(Math.random() * AUDIO_FILES.length)];
    const audio = new Audio(file);
    audio.volume = 0.8;
    audio.play().catch(() => {});
  }, [soundOn]);

  const handleClick = useCallback(
    (id, e) => {
      e.stopPropagation();
      playBark();
      setBarkCount((c) => {
        const next = c + 1;
        barkCountRef.current = next;
        return next;
      });

      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rippleId = Date.now() + Math.random();
      setRipples((r) => [...r, { id: rippleId, x: cx, y: cy }]);
      setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== rippleId)), 700);

      setSealions((prev) =>
        prev.map((sl) =>
          sl.id === id
            ? {
                ...sl,
                bouncing: true,
                bounceScale: 1.3,
                vx: randomBetween(-0.025, 0.025) || 0.01,
                vy: randomBetween(-0.025, 0.025) || 0.01,
              }
            : sl
        )
      );
      setTimeout(() => {
        setSealions((prev) =>
          prev.map((sl) => (sl.id === id ? { ...sl, bouncing: false, bounceScale: 1 } : sl))
        );
      }, 350);
    },
    [playBark]
  );

  // Animation loop
  useEffect(() => {
    if (screen !== "game") return;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(now - last, 50);
      last = now;
      setSealions((prev) =>
        prev.map((sl) => {
          let { x, y, vx, vy, rotation, rotationSpeed } = sl;
          x += vx * dt;
          y += vy * dt;
          rotation += rotationSpeed * dt * 0.1;
          const pad = (sl.size / window.innerWidth) * 100 * 0.5;
          if (x < pad) { x = pad; vx = Math.abs(vx); }
          if (x > 100 - pad) { x = 100 - pad; vx = -Math.abs(vx); }
          if (y < pad) { y = pad; vy = Math.abs(vy); }
          if (y > 100 - pad) { y = 100 - pad; vy = -Math.abs(vy); }
          return { ...sl, x, y, vx, vy, rotation };
        })
      );
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [screen]);

  return (
    <>
      <style>{globalStyles}</style>

      {screen === "entry" && <EntryScreen onEnter={enterGame} />}

      {screen === "leaderboard" && (
        <Leaderboard scores={scores} onClose={() => setScreen("game")} />
      )}

      {screen === "suggestions" && (
        <SuggestionBoard username={username} onClose={() => setScreen("game")} />
      )}

      {/* Game canvas — always mounted once game starts so animation keeps running */}
      {screen !== "entry" && (
        <div style={styles.game}>
          {stars.current.map((s) => (
            <div
              key={s.id}
              className="star"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                "--dur": `${s.dur}s`,
                animationDelay: `${s.delay}s`,
              }}
            />
          ))}

          {screen === "game" &&
            sealions.map((sl) => (
              <img
                key={sl.id}
                className="sealion"
                src={`sealion${sl.imageIndex}.png`}
                alt="sea lion"
                draggable={false}
                onClick={(e) => handleClick(sl.id, e)}
                style={{
                  left: `${sl.x}%`,
                  top: `${sl.y}%`,
                  width: sl.size,
                  height: sl.size,
                  transform: `translate(-50%, -50%) rotate(${sl.rotation}deg) scale(${sl.bounceScale})`,
                  transition: sl.bouncing
                    ? "transform 0.15s cubic-bezier(0.34,1.56,0.64,1)"
                    : "transform 0.05s linear",
                }}
              />
            ))}

          {ripples.map((rp) => (
            <div key={rp.id} className="ripple" style={{ left: rp.x, top: rp.y }} />
          ))}

          <div style={styles.hud}>
            <span style={styles.hudName}>{username}</span>
            <span style={styles.hudScore}>
              {barkCount} {barkCount === 1 ? "bark" : "barks"}
            </span>
          </div>

          <div style={styles.controls}>
            <button style={styles.controlBtn} onClick={() => setSoundOn((s) => !s)}>
              {soundOn ? "sound on" : "sound off"}
            </button>
            <button style={styles.controlBtn} onClick={openLeaderboard}>
              leaderboard
            </button>
            <button style={styles.controlBtn} onClick={openSuggestions}>
              suggestions
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body, #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #7ec8e3;
  }

  .star {
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,0.6);
    animation: twinkle var(--dur) ease-in-out infinite alternate;
    pointer-events: none;
  }

  @keyframes twinkle {
    from { opacity: 0.15; transform: scale(0.8); }
    to   { opacity: 0.9;  transform: scale(1.2); }
  }

  .sealion {
    position: absolute;
    cursor: pointer;
    user-select: none;
    -webkit-user-drag: none;
    object-fit: contain;
    transform-origin: center center;
    filter: drop-shadow(0 6px 18px rgba(20,80,110,0.18));
    will-change: transform;
  }

  .sealion:hover {
    filter: drop-shadow(0 10px 28px rgba(20,80,110,0.32)) brightness(1.06);
  }

  .ripple {
    position: fixed;
    border-radius: 50%;
    pointer-events: none;
    border: 2px solid rgba(255,255,255,0.75);
    animation: ripple-out 0.7s ease-out forwards;
    z-index: 999;
    transform: translate(-50%, -50%);
  }

  @keyframes ripple-out {
    0%   { width: 0;     height: 0;     opacity: 0.9; }
    100% { width: 110px; height: 110px; opacity: 0;   }
  }

  input, textarea, button { font-family: 'DM Sans', sans-serif; }
`;

const styles = {
  game: {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    background: "linear-gradient(140deg, #a8d8f0 0%, #7ec8e3 50%, #b2e0f5 100%)",
    overflow: "hidden",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(100,190,220,0.45)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 16,
  },
  card: {
    background: "rgba(255,255,255,0.35)",
    backdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: "36px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: 380,
  },
  title: {
    fontFamily: "'Fraunces', serif",
    fontStyle: "italic",
    fontWeight: 300,
    fontSize: 34,
    color: "#1a5a7a",
    textAlign: "center",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 300,
    fontSize: 14,
    color: "#2d7a9a",
    textAlign: "center",
    letterSpacing: "0.04em",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.7)",
    background: "rgba(255,255,255,0.5)",
    fontSize: 15,
    color: "#1a5a7a",
    outline: "none",
    textAlign: "center",
    letterSpacing: "0.03em",
  },
  textarea: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.7)",
    background: "rgba(255,255,255,0.5)",
    fontSize: 14,
    color: "#1a5a7a",
    outline: "none",
    resize: "none",
    height: 90,
    letterSpacing: "0.02em",
  },
  btn: {
    padding: "11px 28px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.7)",
    background: "rgba(255,255,255,0.4)",
    color: "#1a5a7a",
    fontSize: 14,
    letterSpacing: "0.06em",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 400,
    transition: "background 0.2s",
  },
  hud: {
    position: "fixed",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 18,
    alignItems: "center",
    background: "rgba(255,255,255,0.28)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.55)",
    borderRadius: 999,
    padding: "8px 24px",
    zIndex: 100,
    pointerEvents: "none",
  },
  hudName: {
    fontFamily: "'Fraunces', serif",
    fontStyle: "italic",
    fontWeight: 300,
    fontSize: 15,
    color: "#1a5a7a",
    letterSpacing: "0.02em",
  },
  hudScore: {
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 400,
    fontSize: 14,
    color: "#2d7a9a",
    letterSpacing: "0.05em",
  },
  controls: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 10,
    zIndex: 100,
    flexWrap: "wrap",
    justifyContent: "center",
    padding: "0 16px",
  },
  controlBtn: {
    padding: "9px 20px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.6)",
    background: "rgba(255,255,255,0.28)",
    backdropFilter: "blur(10px)",
    color: "#1a5a7a",
    fontSize: 13,
    letterSpacing: "0.05em",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
  },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "7px 0",
    borderBottom: "1px solid rgba(255,255,255,0.35)",
  },
  scoreRank: {
    fontFamily: "'Fraunces', serif",
    fontStyle: "italic",
    fontSize: 18,
    color: "#2d7a9a",
    width: 22,
    textAlign: "center",
  },
  scoreName: {
    flex: 1,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: "#1a5a7a",
    fontWeight: 400,
  },
  scoreVal: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: "#2d7a9a",
    fontWeight: 500,
  },
  suggestionRow: {
    width: "100%",
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.35)",
  },
  suggName: {
    fontFamily: "'Fraunces', serif",
    fontStyle: "italic",
    fontSize: 13,
    color: "#2d7a9a",
  },
  suggMsg: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: "#1a5a7a",
    marginTop: 3,
    lineHeight: 1.5,
  },
};
