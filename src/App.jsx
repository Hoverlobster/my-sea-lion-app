import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

const TOTAL_SEALIONS = 24;
const AUDIO_FILES = ["/BAA.mp3", "/URURUR.mp3"];
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function createSealion(id) {
  return {
    id,
    x: randomBetween(8, 92),
    y: randomBetween(8, 92),
    size: randomBetween(80, 155),
    vx: randomBetween(-0.014, 0.014) || 0.007,
    vy: randomBetween(-0.014, 0.014) || 0.007,
    rotation: randomBetween(0, 360),
    rotationSpeed: randomBetween(-0.12, 0.12),
    imageIndex: Math.floor(Math.random() * TOTAL_SEALIONS) + 1,
    bouncing: false,
    bounceScale: 1,
  };
}

// ── Screens ────────────────────────────────────────────────────────────────

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
          onKeyDown={(e) =>
            e.key === "Enter" && name.trim() && onEnter(name.trim())
          }
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
      <div
        style={{ ...styles.card, minWidth: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ ...styles.title, fontSize: 26, marginBottom: 6 }}>
          all-time barks
        </h2>
        <p style={{ ...styles.subtitle, marginBottom: 20 }}>top 10</p>
        {scores.length === 0 && <p style={styles.subtitle}>no scores yet</p>}
        {scores.map((s, i) => (
          <div key={s.id || i} style={styles.scoreRow}>
            <span style={styles.scoreRank}>{i + 1}</span>
            <span style={styles.scoreName}>{s.username}</span>
            <span style={styles.scoreVal}>{s.score}</span>
          </div>
        ))}
        <button style={{ ...styles.btn, marginTop: 20 }} onClick={onClose}>
          close
        </button>
      </div>
    </div>
  );
}

function SuggestionBoard({ username, onClose }) {
  const [suggestions, setSuggestions] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/suggestions`)
      .then((r) => r.json())
      .then(setSuggestions)
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await fetch(`${API_URL}/api/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, message: text.trim() }),
      });
      const updated = await fetch(`${API_URL}/api/suggestions`).then((r) =>
        r.json()
      );
      setSuggestions(updated);
      setText("");
    } catch (err) {
      console.error("Failed to submit suggestion:", err);
    }
    setSending(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={{ ...styles.card, minWidth: 340, maxHeight: "80vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ ...styles.title, fontSize: 26, marginBottom: 6 }}>
          suggestion board
        </h2>
        <p style={{ ...styles.subtitle, marginBottom: 16 }}>say something</p>
        <textarea
          style={styles.textarea}
          placeholder="your suggestion..."
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          style={{ ...styles.btn, opacity: text.trim() && !sending ? 1 : 0.4 }}
          disabled={!text.trim() || sending}
          onClick={submit}
        >
          {sending ? "sending..." : "submit"}
        </button>
        <div style={{ marginTop: 20, width: "100%" }}>
          {suggestions.map((s, i) => (
            <div key={s.id || i} style={styles.suggestionRow}>
              <span style={styles.suggName}>{s.username}</span>
              <p style={styles.suggMsg}>{s.message}</p>
            </div>
          ))}
        </div>
        <button style={{ ...styles.btn, marginTop: 12 }} onClick={onClose}>
          close
        </button>
      </div>
    </div>
  );
}

// ── Main Game ──────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("entry");
  const [username, setUsername] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [barkCount, setBarkCount] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [sealions, setSealions] = useState([]);
  const [ripples, setRipples] = useState([]);
  const [scores, setScores] = useState([]);
  const animRef = useRef(null);

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

  const enterGame = (name) => {
    setUsername(name);
    setSessionId(uuidv4());
    setSealions(Array.from({ length: TOTAL_SEALIONS }, (_, i) => createSealion(i)));
    setScreen("game");
    setBarkCount(0);
  };

  const fetchScores = async () => {
    try {
      const data = await fetch(`${API_URL}/api/scores`).then((r) => r.json());
      setScores(data);
    } catch (err) {
      console.error("Failed to fetch scores:", err);
    }
  };

  const saveScore = useCallback(async (newScore) => {
    try {
      await fetch(`${API_URL}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, score: newScore })
      });
    } catch (err) {
      console.error("Failed to save score:", err);
    }
  }, [username]);

  const playBark = useCallback(() => {
    if (!soundOn) return;
    const file = AUDIO_FILES[Math.floor(Math.random() * AUDIO_FILES.length)];
    const audio = new Audio(file);
    audio.volume = 0.8;
    audio.play().catch(() => console.log("Audio play failed"));
  }, [soundOn]);

  const handleClick = useCallback((id, e) => {
    e.stopPropagation();
    playBark();
    
    setBarkCount((c) => {
      const next = c + 1;
      saveScore(next);
      return next;
    });

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rippleId = Date.now() + Math.random();
    setRipples((r) => [...r, { id: rippleId, x: cx, y: cy }]);
    
    setTimeout(() => {
      setRipples((r) => r.filter((rp) => rp.id !== rippleId));
    }, 700);

    setSealions((prev) =>
      prev.map((sl) =>
        sl.id === id
          ? { ...sl, bouncing: true, bounceScale: 1.3, vx: randomBetween(-0.025, 0.025), vy: randomBetween(-0.025, 0.025) }
          : sl
      )
    );
    
    setTimeout(() => {
      setSealions((prev) =>
        prev.map((sl) => (sl.id === id ? { ...sl, bouncing: false, bounceScale: 1 } : sl))
      );
    }, 350);
  }, [playBark, saveScore]);

  const openLeaderboard = async () => {
    await fetchScores();
    setScreen("leaderboard");
  };

  const openSuggestions = () => {
    setScreen("suggestions");
  };

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
      {(screen === "game" || screen === "leaderboard" || screen === "suggestions") && (
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
          {screen === "game" && sealions.map((sl) => (
            <img
              key={sl.id}
              className="sealion"
              src={`/sealion${sl.imageIndex}.png`}
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

// ── Styles ──────────────────────────────────────────────────────────────────
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; }
  body { overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
  .star {
    position: absolute;
    background: white;
    border-radius: 50%;
    opacity: 0.7;
    animation: twinkle var(--dur) infinite alternate;
    pointer-events: none;
  }
  @keyframes twinkle {
    0% { opacity: 0.2; transform: scale(1); }
    100% { opacity: 1; transform: scale(1.2); }
  }
  .sealion {
    position: absolute;
    cursor: pointer;
    will-change: transform;
    filter: drop-shadow(0 8px 12px rgba(0,0,0,0.2));
    transition: filter 0.1s ease;
  }
  .sealion:active { filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
  .ripple {
    position: fixed;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
    transform: translate(-50%, -50%) scale(0);
    animation: rippleAnim 0.7s ease-out forwards;
    pointer-events: none;
  }
  @keyframes rippleAnim {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
    100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
  }
`;

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #0a0f2a 0%, #0a1a3a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    background: 'rgba(15, 25, 45, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: 32,
    padding: '32px 40px',
    textAlign: 'center',
    border: '1px solid rgba(255,215,0,0.3)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#FFD966',
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    borderRadius: 40,
    border: '1px solid #FFD966',
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    marginBottom: 16,
    outline: 'none',
  },
  btn: {
    background: '#FFD966',
    color: '#1a2a3a',
    border: 'none',
    padding: '10px 24px',
    borderRadius: 40,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  game: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, #0a1030 0%, #0a2040 100%)',
    overflow: 'hidden',
    cursor: 'crosshair',
  },
  hud: {
    position: 'fixed',
    top: 20,
    left: 20,
    right: 20,
    display: 'flex',
    justifyContent: 'space-between',
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    padding: '12px 24px',
    borderRadius: 60,
    color: 'white',
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 'bold',
    zIndex: 100,
    pointerEvents: 'none',
  },
  hudName: { color: '#FFD966' },
  hudScore: { color: '#66FFD9' },
  controls: {
    position: 'fixed',
    bottom: 20,
    left: 20,
    right: 20,
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    zIndex: 100,
  },
  controlBtn: {
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #FFD966',
    color: '#FFD966',
    padding: '8px 20px',
    borderRadius: 40,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
  },
  scoreRank: { fontWeight: 'bold', color: '#FFD966', width: 40 },
  scoreName: { flex: 1, textAlign: 'left' },
  scoreVal: { fontWeight: 'bold', color: '#66FFD9' },
  textarea: {
    width: '100%',
    padding: 12,
    borderRadius: 16,
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid #FFD966',
    color: 'white',
    fontSize: 14,
    marginBottom: 12,
    resize: 'vertical',
  },
  suggestionRow: {
    padding: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'left',
  },
  suggName: { color: '#FFD966', fontSize: 12, fontWeight: 'bold' },
  suggMsg: { color: '#ddd', fontSize: 13, marginTop: 4 },
};
