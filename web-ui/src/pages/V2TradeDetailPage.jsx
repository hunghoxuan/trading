import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { SignalDetailCard } from "../components/SignalDetailCard";
import { buildDetailHeader } from "../components/SignalDetailHeaderBuilder";
import { asNum, buildHeaderMeta, renderHistoryItem } from "../utils/signalDetailUtils";
import { showDateTime } from "../utils/format";

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "FILLED" || s === "OPEN") return { cls: "ACTIVE", label: "FILLED" };
  if (s === "CLOSED" || s === "CANCELLED") return { cls: "INACTIVE", label: s };
  if (s === "ERROR" || s === "FAIL") return { cls: "FAIL", label: s };
  if (s === "PENDING" || s === "NEW") return { cls: "OTHER", label: "PENDING" };
  return { cls: "OTHER", label: s || "PENDING" };
}

function brokerTicketOf(t) {
  return String(t?.broker_trade_id || t?.ticket || "").trim() || "-";
}

function formatTimeframe(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return String(value || "-");
  if (n < 60) return `${n}m`;
  if (n < 1440) return `${n / 60}h`;
  if (n < 10080) return `${n / 1440}d`;
  if (n < 43200) return `${n / 10080}W`;
  if (n === 43200) return "1M";
  return `${n / 43200}M`;
}

function fDateTime(v) {
  return showDateTime(v);
}

export default function TradeDetailPage() {
  const { tradeId } = useParams();
  const [trade, setTrade] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailTfTab, setDetailTfTab] = useState("ENTRY");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [evs, data] = await Promise.all([
          api.v2TradeEvents(tradeId),
          api.v2Trades({ q: tradeId }),
        ]);
        setEvents(Array.isArray(evs?.items) ? evs.items : []);
        setTrade(Array.isArray(data?.items) && data.items.length ? data.items[0] : null);
      } catch (e) {
        setError(e?.message || "Load failed");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tradeId]);

  const header = useMemo(() => {
    if (!trade) return null;
    const action = String(trade.action || trade.side || "-").toUpperCase();
    const rr = asNum(trade.rr_planned);
    const pnl = asNum(trade.pnl_realized);
    const meta = trade?.metadata && typeof trade.metadata === "object" ? trade.metadata : {};
    const raw = trade?.raw_json && typeof trade.raw_json === "object" ? trade.raw_json : {};
    const vol = asNum(meta.used_volume) ?? asNum(trade.volume);
    const plannedVol = asNum(meta.requested_volume) ?? asNum(raw.volume) ?? asNum(trade.volume);
    const riskSize = asNum(meta.risk_money_actual ?? trade.risk_money_actual ?? trade.risk_money_planned);
    const riskPct = asNum(meta.riskPct ?? meta.risk_pct ?? raw.riskPct ?? raw.risk_pct);
    const reward = asNum(meta.reward_money_planned);
    const headerMeta = buildHeaderMeta({
      statusRaw: trade.execution_status,
      pnlRaw: pnl,
      rrRaw: rr,
      volumeRaw: vol,
      plannedVolRaw: plannedVol,
      riskSizeRaw: riskSize,
      riskPctRaw: riskPct,
      rewardSizeRaw: reward,
      updatedAtRaw: trade.updated_at || trade.closed_at || trade.opened_at || trade.created_at,
      statusUi,
    });
    return buildDetailHeader({
      side: action,
      symbol: trade.symbol || "-",
      sideClass: action === "BUY" ? "side-buy" : "side-sell",
      positionText: `${trade.entry || "-"} → ${trade.tp || "-"} / ${trade.sl || "-"}`,
      ...headerMeta,
    });
  }, [trade]);

  if (loading) return <div className="loading">Loading trade {tradeId}...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!trade) return <div className="empty-state">Trade not found.</div>;

  return (
    <section className="stack-layout" style={{ gap: 14 }}>
      <p style={{ marginBottom: 0 }}><Link to="/trades" className="minor-text">← BACK TO TRADES</Link></p>
      <div className="panel">
        <SignalDetailCard
          mode="trade"
          header={header}
          chart={{
            enabled: true,
            detailTfTab,
            onDetailTfTabChange: setDetailTfTab,
            iframeTitle: `trade-detail-tv-${detailTfTab}`,
            symbol: trade.symbol,
            interval: trade.signal_tf || trade.chart_tf || "1h",
            live: true,
            entryPrice: asNum(trade.entry),
            slPrice: asNum(trade.sl),
            tpPrice: asNum(trade.tp),
            openedAt: trade.opened_at,
            closedAt: trade.closed_at,
            analysisSnapshot: trade?.metadata?.analysis_snapshot || trade?.raw_json?.analysis_snapshot || null,
          }}
          metaItems={[
            { label: "Trade SID", value: trade.sid || trade.trade_id || "-" },
            { label: "Signal SID", value: trade.signal_id || "-" },
            { label: "Broker Ticket", value: brokerTicketOf(trade) },
            { label: "Account", value: trade.account_id || "-" },
            { label: "Source", value: trade.source_id || "-" },
            { label: "Status", value: statusUi(trade.execution_status).label },
            { label: "Signal TF", value: formatTimeframe(trade.signal_tf || "-") },
            { label: "Chart TF", value: formatTimeframe(trade.chart_tf || "-") },
            { label: "Volume", value: `${trade.volume ?? "-"} lots` },
            { label: "Created", value: fDateTime(trade.created_at) },
            { label: "Note", value: trade.note || "-", fullWidth: true },
            { label: "Raw JSON", value: JSON.stringify(trade.raw_json || {}, null, 2), fullWidth: true, valueStyle: { whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" } },
          ]}
          history={{
            enabled: true,
            items: [...events].sort((a, b) => new Date(b.event_time || b.created_at || 0).getTime() - new Date(a.event_time || a.created_at || 0).getTime()),
            renderItem: (ev, idx) => renderHistoryItem(ev, idx, { formatDateTime: fDateTime, includeTicket: true }),
          }}
        />
      </div>
    </section>
  );
}
