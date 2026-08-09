import { useRef, useState } from "react";
import { GameShell, GameTopbar, GameOverScreen } from "@freegamestore/games";
import { Game } from "./components/Game";
import { useHighScore } from "./hooks/useHighScore";
import { ROUND_SECONDS } from "./lib/logic";
import type { GamePhase } from "./types";

export default function App() {
  const [phase, setPhase]     = useState<GamePhase>("menu");
  const [score, setScore]     = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [round, setRound]     = useState(0);
  const [highScore, setHighScore] = useHighScore("shopping-spree-highscore");

  const scoreRef = useRef(0);
  const handleScore = (s: number) => { scoreRef.current = s; setScore(s); };

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    setRound((r) => r + 1);
    setPhase("playing");
  };

  const end = () => {
    setHighScore(scoreRef.current);
    setPhase("over");
  };

  // Timer colour: green → yellow → red as time runs out
  const timeColor =
    timeLeft > 20 ? "#22c55e" :
    timeLeft > 10 ? "#f59e0b" : "#ef4444";

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="🛒 My Shopping Spree"
          stats={[
            { label: "Score", value: score,       accent: true },
            { label: "Time",  value: `${timeLeft}s` },
            { label: "Best",  value: highScore },
          ]}
        />
      }
    >
      <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 400 }}>

        {/* ── Game canvas ── */}
        {phase !== "menu" && (
          <Game
            key={round}
            onScore={handleScore}
            onTime={(s) => { setTimeLeft(s); }}
            onGameOver={end}
          />
        )}

        {/* ── Menu ── */}
        {phase === "menu" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "1.25rem", padding: "1.5rem",
            background: "linear-gradient(160deg, #bae6fd 0%, #fef3c7 60%, #d1fae5 100%)",
          }}>
            {/* Title */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>🛒</div>
              <h1 style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
                fontWeight: 900,
                color: "#0c4a6e",
                margin: "0.25rem 0 0",
                textShadow: "0 2px 0 rgba(255,255,255,0.7)",
              }}>
                My Shopping Spree!
              </h1>
              <p style={{ color: "#0369a1", fontWeight: 600, margin: "0.4rem 0 0", fontSize: "1.05rem" }}>
                Grab as many groceries as you can! ⏱️ 45 seconds
              </p>
            </div>

            {/* Item legend */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: "0.5rem",
              justifyContent: "center", maxWidth: 360,
            }}>
              {[
                { e: "🍎", l: "Apple",    p: 1 },
                { e: "🍌", l: "Banana",   p: 1 },
                { e: "🥛", l: "Milk",     p: 2 },
                { e: "🍪", l: "Cookie",   p: 2 },
                { e: "🍦", l: "Ice Cream",p: 3 },
                { e: "⭐", l: "Star",     p: 5 },
              ].map(({ e, l, p }) => (
                <div key={l} style={{
                  background: "rgba(255,255,255,0.65)",
                  borderRadius: "0.75rem",
                  padding: "0.3rem 0.7rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#1e3a5f",
                  display: "flex", alignItems: "center", gap: "0.3rem",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                }}>
                  <span style={{ fontSize: "1.1rem" }}>{e}</span>
                  {l}
                  <span style={{
                    background: "#fde68a", borderRadius: "0.4rem",
                    padding: "0 0.35rem", fontSize: "0.78rem", color: "#92400e",
                  }}>+{p}</span>
                </div>
              ))}
            </div>

            {/* Controls hint */}
            <p style={{
              fontSize: "0.85rem", color: "#0369a1",
              background: "rgba(255,255,255,0.5)",
              borderRadius: "0.75rem", padding: "0.4rem 1rem",
              fontWeight: 600,
            }}>
              🎮 WASD / Arrow keys &nbsp;|&nbsp; 📱 D-pad on mobile
            </p>

            {/* Play button */}
            <button
              onClick={start}
              style={{
                minHeight: 56, padding: "0 2.5rem",
                background: "linear-gradient(135deg, #22d3ee, #0ea5e9)",
                color: "#fff", border: "none", borderRadius: "1.2rem",
                fontSize: "1.3rem", fontWeight: 800, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(14,165,233,0.45)",
                letterSpacing: "0.02em",
                transform: "scale(1)",
                transition: "transform 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              🛒 Start Shopping!
            </button>

            {highScore > 0 && (
              <p style={{ color: "#0369a1", fontWeight: 700, fontSize: "0.95rem" }}>
                🏆 Best: {highScore} pts
              </p>
            )}
          </div>
        )}

        {/* ── Game Over ── */}
        {phase === "over" && (
          <GameOverScreen score={score} highScore={highScore} onPlayAgain={start} />
        )}

        {/* ── In-game timer bar ── */}
        {phase === "playing" && (
          <div style={{
            position: "absolute", top: 8, left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.85)",
            borderRadius: "1rem", padding: "0.25rem 1rem",
            display: "flex", alignItems: "center", gap: "0.5rem",
            fontWeight: 800, fontSize: "1.1rem",
            color: timeColor,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 20,
            transition: "color 0.3s",
            pointerEvents: "none",
          }}>
            ⏱️ {timeLeft}s
          </div>
        )}
      </div>
    </GameShell>
  );
}
