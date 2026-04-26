import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { SignalDetailCard } from "../components/SignalDetailCard";
import { buildDetailHeader } from "../components/SignalDetailHeaderBuilder";
import { asNum, buildHeaderMeta, renderHistoryItem } from "../utils/signalDetailUtils";
import { showDateTime } from "../utils/format";

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (["ACTIVE", "OPEN", "PLACED", "START", "TRUE"].includes(s)) return { cls: "ACTIVE", label: s === "TRUE" ? "ACTIVE" : s };
  if (["INACTIVE", "FALSE", "DISABLE", "DISABLED", "CANCELLED", "CANCEL"].includes(s)) return { cls: "INACTIVE", label: s === "FALSE" ? "INACTIVE" : s };
  if (s === "LOCKED") return { cls: "LOCKED", label: "LOCKED" };
  if (s === "TP") return { cls: "TP", label: "TP" };
  if (s === "SL") return { cls: "SL", label: "SL" };
  return { cls: "OTHER", label: s || "UNKNOWN" };
}

function formatTimeframe(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return String(value || "-");
  if (n % 1440 === 0) return `${n / 1440}D`;
  if (n % 60 === 0) return `${n / 60}H`;
  return `${n}m`;
}

function fDateTime(v) {
  return showDateTime(v);
}

export default function SignalDetailPage() {
  const { signalId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [detailTfTab, setDetailTfTab] = useState("ENTRY");

  useEffect(() => {
    let live = true;
    api.trade(signalId)
      .then((res) => {
        if (!live) return;
        setData(res);
      })
      .catch((e) => {
        if (!live) return;
        setError(e?.message || "Load failed");
      });
    return () => {
      live = false;
    };
  }, [signalId]);

  const t = data?.trade || null;
  const events = Array.isArray(data?.events) ? data.events : [];

  const header = useMemo(() => {
    if (!t) return null;
    const rr = asNum(t.rr_planned);
    const vol = asNum(t.volume);
    const risk = asNum(t.risk_money_actual ?? t.risk_money_planned ?? t?.raw_json?.risk_money ?? t?.raw_json?.risk);
    const raw = t?.raw_json && typeof t.raw_json === "object" ? t.raw_json : {};
    const riskPct = asNum(raw.riskPct ?? raw.risk_pct ?? raw.volumePct ?? raw.volume_pct);
    const reward = (risk != null && rr != null) ? (Math.abs(risk) * rr) : null;
    const headerMeta = buildHeaderMeta({
      statusRaw: t.status,
      pnlRaw: t.pnl_money_realized,
      rrRaw: rr,
      volumeRaw: vol,
      plannedVolRaw: asNum(raw.volume) ?? vol,
      riskSizeRaw: risk,
      riskPctRaw: riskPct,
      rewardSizeRaw: reward,
      updatedAtRaw: t.updated_at || t.closed_at || t.opened_at || t.created_at,
      statusUi,
    });
    const side = String(t.action || t.side || "-").toUpperCase();
    return buildDetailHeader({
      side,
      symbol: t.symbol || "-",
      sideClass: side === "BUY" ? "side-buy" : "side-sell",
      positionText: `${t.entry_price || t.entry || "-"} → ${t.tp || "-"} / ${t.sl || "-"}`,
      ...headerMeta,
    });
  }, [t]);

  if (error) return <div className="error">{error}</div>;
  if (!t) return <div className="loading">Loading signal...</div>;

  return (
    <section className="stack-layout" style={{ gap: 14 }}>
      <p style={{ marginBottom: 0 }}><Link to="/signals" className="minor-text">← BACK TO SIGNALS</Link></p>
      <div className="panel">
        <SignalDetailCard
          mode="signal"
          header={header}
          chart={{
            enabled: true,
            detailTfTab,
            onDetailTfTabChange: setDetailTfTab,
            iframeTitle: `signal-detail-tv-${detailTfTab}`,
            symbol: t.symbol,
            interval: t.signal_tf || t.chart_tf || "1h",
            live: true,
            entryPrice: asNum(t.entry_price || t.raw_json?.entry || t.entry),
            slPrice: asNum(t.sl_price || t.raw_json?.sl || t.sl),
            tpPrice: asNum(t.tp_price || t.raw_json?.tp || t.tp),
            analysisSnapshot: t?.raw_json?.analysis_snapshot || null,
          }}
          metaItems={[
            { label: "Signal SID", value: t.sid || t.signal_id || "-" },
            { label: "Status", value: statusUi(t.status).label },
            { label: "Order Type", value: String(t?.raw_json?.order_type || t?.raw_json?.orderType || "limit").toUpperCase() },
            { label: "Signal TF", value: formatTimeframe(t.signal_tf || "-") },
            { label: "Volume", value: `${t.volume ?? "-"} lots` },
            { label: "Created", value: fDateTime(t.created_at) },
            { label: "Note", value: t.note || "-", fullWidth: true },
            { label: "Raw JSON", value: JSON.stringify(t.raw_json || {}, null, 2), fullWidth: true, valueStyle: { whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" } },
          ]}
          history={{
            enabled: true,
            items: [...events].sort((a, b) => new Date(b.event_time || 0).getTime() - new Date(a.event_time || 0).getTime()),
            renderItem: (ev, idx) => renderHistoryItem(ev, idx, { formatDateTime: fDateTime, includeTicket: true }),
          }}
        />
      </div>
    </section>
  );
}
