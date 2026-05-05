import { useEffect, useState, useRef } from "react";

/**
 * Light gray scrolling text marquee under the DayClock bar.
 * Reads from window.__tickerEvents pushed by NotificationWatcher.
 */
export default function TickerBar() {
  const [messages, setMessages] = useState([]);
  const lastCount = useRef(0);

  useEffect(() => {
    const handler = () => {
      const ticker = window.__tickerEvents || [];
      if (ticker.length !== lastCount.current) {
        lastCount.current = ticker.length;
        // Show last 10 messages, newest first
        setMessages([...ticker].slice(-10).reverse());
      }
    };
    window.addEventListener("ticker-update", handler);
    // Initial load
    handler();
    return () => window.removeEventListener("ticker-update", handler);
  }, []);

  if (!messages.length) return null;

  const text = messages
    .map((m) => `[${m.event.replace(/_/g, " ").toUpperCase()}] ${m.message}`)
    .join("  •  ");

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        padding: "3px 0",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          display: "inline-block",
          paddingLeft: "100%",
          animation: "ticker-scroll 40s linear infinite",
          fontSize: 11,
          color: "#6b7280",
          fontFamily: "monospace",
        }}
      >
        {text}
        <span style={{ margin: "0 60px" }}>•</span>
        {text}
      </div>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
