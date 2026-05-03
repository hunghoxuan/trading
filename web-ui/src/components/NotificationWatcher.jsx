import { useEffect, useRef } from "react";
import { api } from "../api";
import { playSound, SoundEvents } from "../utils/SoundManager";

/**
 * Global component that watches for events and plays sounds.
 */
export default function NotificationWatcher() {
  const lastState = useRef({
    signalIds: new Set(),
    tradeStatuses: {}, // sid -> status
    announcedNews: new Set(),
    activeKillZone: null,
  });

  const lastPulse = useRef({ global: 0, user: {} });

  const checkPulse = async () => {
    try {
      const res = await api.notificationPulse();
      if (!res.ok) return;

      const hasGlobalChange = res.global > lastPulse.current.global;
      const hasUserChange = Object.keys(res.user || {}).some(
        k => (res.user[k] || 0) > (lastPulse.current.user[k] || 0)
      );

      if (hasGlobalChange || hasUserChange) {
        lastPulse.current = { global: res.global, user: res.user };
        await checkEvents();
      }
    } catch (err) {
      console.warn("[NotificationWatcher] Pulse error:", err);
    }
  };

  const checkEvents = async () => {
    try {
      // 1. Check Signals & Trades
      const data = await api.trades({ page: 1, pageSize: 20 });
      const currentTrades = data.trades || [];
      
      let hasNewSignal = false;
      let hasFilled = false;
      let hasClosed = false;

      currentTrades.forEach(t => {
        const sid = t.sid || t.signal_id;
        if (!sid) return;

        // Detect New Signal
        if (!lastState.current.signalIds.has(sid)) {
          lastState.current.signalIds.add(sid);
          hasNewSignal = true;
        }

        // Detect Status Change
        const prevStatus = lastState.current.tradeStatuses[sid];
        const curStatus = String(t.status || "").toUpperCase();
        
        if (prevStatus && prevStatus !== curStatus) {
          if (curStatus === "START" || curStatus === "PLACED") hasFilled = true;
          if (["TP", "SL", "CLOSED", "CANCEL"].includes(curStatus)) hasClosed = true;
        }
        lastState.current.tradeStatuses[sid] = curStatus;
      });

      if (hasNewSignal) playSound(SoundEvents.NEW_SIGNAL);
      else if (hasFilled) playSound(SoundEvents.TRADE_FILLED);
      else if (hasClosed) playSound(SoundEvents.TRADE_CLOSED);

      // 2. Check News Alerts (10m before)
      const newsRes = await fetch("/v2/calendar/today").then(r => r.json());
      if (newsRes.ok && newsRes.events) {
        const now = new Date();
        newsRes.events.forEach(ev => {
          if (ev.impact !== "High") return;
          
          // Parse "10:00am" EST to Date
          const match = ev.time.match(/(\d+):(\d+)(am|pm)/i);
          if (!match) return;
          let h = parseInt(match[1]);
          const m = parseInt(match[2]);
          const isPm = match[3].toLowerCase() === 'pm';
          if (isPm && h < 12) h += 12;
          if (!isPm && h === 12) h = 0;
          
          const evDate = new Date();
          evDate.setUTCHours(h + 5, m, 0, 0); // Convert EST to UTC approx

          const diffMins = (evDate - now) / 60000;
          if (diffMins > 0 && diffMins <= 10.5 && !lastState.current.announcedNews.has(ev.title)) {
            playSound(SoundEvents.NEWS_ALERT);
            lastState.current.announcedNews.add(ev.title);
          }
        });
      }
    } catch (err) {
      console.error("[NotificationWatcher] Error:", err);
    }
  };

  useEffect(() => {
    // Initial load
    api.trades({ page: 1, pageSize: 50 }).then(data => {
      data.trades?.forEach(t => {
        lastState.current.signalIds.add(t.sid || t.signal_id);
        lastState.current.tradeStatuses[t.sid || t.signal_id] = String(t.status || "").toUpperCase();
      });
    });

    // Check News once on load
    fetch("/v2/calendar/today").then(r => r.json()).catch(() => null);

    const timer = setInterval(checkPulse, 10000); // Check pulse every 10s (lightweight)
    return () => clearInterval(timer);
  }, []);

  return null; // Transparent background helper
}
