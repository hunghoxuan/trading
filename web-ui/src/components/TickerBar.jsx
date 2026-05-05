import { useEffect, useState, useRef } from "react";
import "./TickerBar.css";

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
    <div className="ticker-bar">
      <div className="ticker-bar-scroll">
        {text}
        <span style={{ margin: "0 60px" }}>•</span>
        {text}
      </div>
    </div>
  );
}
