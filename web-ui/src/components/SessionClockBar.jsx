import React, { useEffect, useState, useMemo } from 'react';
import './SessionClockBar.css';

/**
 * Sessions and Kill Zones defined in UTC hours (0-24)
 */
const SESSIONS = [
  { id: 'asia', label: 'Asian Session', start: 0, end: 9, color: 'rgba(52, 152, 219, 0.25)', borderColor: '#3498db' },
  { id: 'london', label: 'London Session', start: 8, end: 17, color: 'rgba(46, 204, 113, 0.25)', borderColor: '#2ecc71' },
  { id: 'ny', label: 'NY Session', start: 13, end: 22, color: 'rgba(230, 126, 34, 0.25)', borderColor: '#e67e22' },
];

const KILL_ZONES = [
  { id: 'asia_kz', label: 'Asia Kill Zone', start: 0, end: 4, color: 'rgba(52, 152, 219, 0.4)' },
  { id: 'london_kz', label: 'London Kill Zone', start: 7, end: 10, color: 'rgba(46, 204, 113, 0.4)' },
  { id: 'ny_kz', label: 'NY Kill Zone', start: 12, end: 15, color: 'rgba(230, 126, 34, 0.4)' },
  { id: 'london_close', label: 'London Close', start: 15, end: 17, color: 'rgba(231, 76, 60, 0.4)' },
];

export default function SessionClockBar() {
  const [now, setNow] = useState(new Date());
  const [tz, setTz] = useState(() => localStorage.getItem("ui_display_timezone") || "UTC");

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      // Sync timezone if it changed in localStorage
      const currentTz = localStorage.getItem("ui_display_timezone") || "UTC";
      if (currentTz !== tz) setTz(currentTz);
    }, 1000);
    return () => clearInterval(timer);
  }, [tz]);

  const { timeStr, progressPct, currentHour } = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = fmt.formatToParts(now);
      const h = parseInt(parts.find(p => p.type === 'hour').value);
      const m = parseInt(parts.find(p => p.type === 'minute').value);
      const s = parseInt(parts.find(p => p.type === 'second').value);
      
      const totalSeconds = h * 3600 + m * 60 + s;
      const pct = (totalSeconds / (24 * 3600)) * 100;
      
      return {
        timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
        progressPct: pct,
        currentHour: h + m / 60 + s / 3600
      };
    } catch (e) {
      return { timeStr: '--:--:--', progressPct: 0, currentHour: 0 };
    }
  }, [now, tz]);

  /**
   * Helper to convert a UTC hour to the target timezone's hour-of-day (0-24)
   */
  const getTzHour = (utcHour) => {
    const date = new Date();
    date.setUTCHours(utcHour, 0, 0, 0);
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = fmt.formatToParts(date);
    const h = parseInt(parts.find(p => p.type === 'hour').value);
    const m = parseInt(parts.find(p => p.type === 'minute').value);
    return h + m / 60;
  };

  const renderRuler = () => {
    const ticks = [];
    // Top: 4 hour split
    for (let i = 0; i <= 24; i += 4) {
      ticks.push(
        <div key={`top-${i}`} className="ruler-tick major" style={{ left: `${(i / 24) * 100}%` }}>
          <span className="tick-label">{String(i).padStart(2, '0')}:00</span>
        </div>
      );
    }
    // Bottom: 15 minute split
    for (let i = 0; i <= 24 * 4; i++) {
      const hours = i / 4;
      if (hours % 4 === 0) continue; // Skip if already a major tick
      ticks.push(
        <div key={`bot-${i}`} className="ruler-tick minor" style={{ left: `${(hours / 24) * 100}%` }} />
      );
    }
    return ticks;
  };

  const renderRegions = (data, isKillZone = false) => {
    return data.map((item) => {
      let startTz = getTzHour(item.start);
      let endTz = getTzHour(item.end);
      
      // Handle wrap around
      const regions = [];
      if (endTz < startTz) {
        // Wraps around midnight
        regions.push({ s: startTz, e: 24 });
        regions.push({ s: 0, e: endTz });
      } else {
        regions.push({ s: startTz, e: endTz });
      }

      return regions.map((r, idx) => (
        <div 
          key={`${item.id}-${idx}`}
          className={`session-region ${isKillZone ? 'killzone' : ''}`}
          style={{
            left: `${(r.s / 24) * 100}%`,
            width: `${((r.e - r.s) / 24) * 100}%`,
            backgroundColor: item.color,
            borderLeft: item.borderColor ? `2px solid ${item.borderColor}` : 'none',
            borderRight: item.borderColor ? `2px solid ${item.borderColor}` : 'none',
          }}
          title={`${item.label}: ${item.start}:00 - ${item.end}:00 UTC`}
        >
          {!isKillZone && <span className="session-label">{item.label}</span>}
          <div className="tooltip">{item.label} ({item.start}:00 - {item.end}:00 UTC)</div>
        </div>
      ));
    });
  };

  return (
    <div className="session-clock-bar-container">
      <div className="session-clock-bar">
        {/* Background Ruler */}
        <div className="ruler-layer">
          {renderRuler()}
        </div>

        {/* Sessions & Kill Zones */}
        <div className="regions-layer">
          {renderRegions(SESSIONS)}
          {renderRegions(KILL_ZONES, true)}
        </div>

        {/* Progress Fill */}
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />

        {/* Current Time Marker */}
        <div className="current-time-marker" style={{ left: `${progressPct}%` }}>
          <div className="marker-line" />
          <div className="marker-dot" />
        </div>

        {/* Digital Clock */}
        <div className="digital-clock">
          <span className="tz-name">{tz.replace('_', ' ')}</span>
          <span className="time-value">{timeStr}</span>
        </div>
      </div>
    </div>
  );
}
