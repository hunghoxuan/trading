import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

function csvToArray(v) {
  const raw = String(v || "").trim();
  if (!raw) return null;
  const out = raw
    .split(",")
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  return out.length ? out : null;
}

function arrayToCsv(arr) {
  if (!Array.isArray(arr) || !arr.length) return "";
  return arr.map((x) => String(x || "").trim()).filter(Boolean).join(", ");
}

export default function SubscriptionsPage() {
  const EMPTY_MSG = { type: "", text: "" };
  const [accounts, setAccounts] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(EMPTY_MSG);
  const [rotatedKey, setRotatedKey] = useState("");

  const selectedAccount = useMemo(
    () => accounts.find((a) => String(a.account_id) === String(selectedAccountId)) || null,
    [accounts, selectedAccountId],
  );

  async function loadBase() {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([api.v2Accounts(), api.v2Sources()]);
      const accItems = Array.isArray(a?.items) ? a.items : [];
      const srcItems = Array.isArray(s?.items) ? s.items : [];
      setAccounts(accItems);
      setSources(srcItems);
      if (!selectedAccountId && accItems.length > 0) {
        setSelectedAccountId(String(accItems[0].account_id || ""));
      }
      setMsg(EMPTY_MSG);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to load accounts/sources" });
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscriptions(accountId) {
    if (!accountId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const [subOut, srcOut] = await Promise.all([
        api.v2GetSubscriptions(accountId),
        api.v2Sources(),
      ]);
      const subItems = Array.isArray(subOut?.items) ? subOut.items : [];
      const srcItems = Array.isArray(srcOut?.items) ? srcOut.items : [];
      const bySource = new Map(subItems.map((x) => [String(x.source_id), x]));
      const merged = srcItems.map((s) => {
        const sourceId = String(s.source_id || "");
        const hit = bySource.get(sourceId);
        return {
          source_id: sourceId,
          source_name: String(s.name || sourceId),
          source_kind: String(s.kind || ""),
          is_active: Boolean(hit ? hit.is_active : false),
          symbol_csv: arrayToCsv(hit?.symbol_allowlist),
          strategy_csv: arrayToCsv(hit?.strategy_allowlist),
        };
      });
      setRows(merged);
      setSources(srcItems);
      setRotatedKey("");
      setMsg(EMPTY_MSG);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to load subscriptions" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (selectedAccountId) loadSubscriptions(selectedAccountId);
    else setRows([]);
  }, [selectedAccountId]);

  async function saveSubscriptions() {
    if (!selectedAccountId) return;
    setSaving(true);
    try {
      const items = rows.map((r) => ({
        source_id: String(r.source_id || ""),
        is_active: Boolean(r.is_active),
        symbol_allowlist: csvToArray(r.symbol_csv),
        strategy_allowlist: csvToArray(r.strategy_csv),
      }));
      await api.v2PutSubscriptions(selectedAccountId, items);
      setMsg({ type: "success", text: "Subscriptions saved." });
      await loadSubscriptions(selectedAccountId);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to save subscriptions" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2500);
    }
  }

  async function rotateApiKey() {
    if (!selectedAccountId) return;
    if (!window.confirm("Rotate API key for this account? Previous key will stop working.")) return;
    setSaving(true);
    try {
      const out = await api.v2RotateAccountApiKey(selectedAccountId);
      setRotatedKey(String(out?.api_key_plaintext || ""));
      setMsg({ type: "warning", text: "API key rotated. Save this new key now." });
      await loadBase();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to rotate account API key" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack-layout fadeIn">
      <h2 className="page-title">Account Subscriptions</h2>

      <section className="panel">
        <div className="panel-label">ACCOUNT</div>
        <div className="stack-layout" style={{ gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="minor-text">Select Account</div>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              style={{ maxWidth: 520 }}
            >
              {accounts.map((a) => {
                const label = `${a.account_id} | ${a.name || "(no-name)"} | ${a.status || ""}`;
                return <option key={a.account_id} value={a.account_id}>{label}</option>;
              })}
            </select>
          </label>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="secondary-button" onClick={rotateApiKey} disabled={saving || !selectedAccountId}>
              {saving ? "ROTATING..." : "ROTATE ACCOUNT API KEY"}
            </button>
            {selectedAccount?.api_key_last4 ? <span className="minor-text">Last4: ****{selectedAccount.api_key_last4}</span> : null}
          </div>

          {rotatedKey ? (
            <div className="form-message msg-warning" style={{ maxWidth: 900 }}>
              New API key (shown once): <code>{rotatedKey}</code>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-label">SOURCE SUBSCRIPTIONS</div>
        {msg?.text ? <div className={`form-message msg-${msg.type || "error"}`}>{msg.text}</div> : null}
        {loading ? <div className="minor-text">Loading...</div> : null}

        {!loading ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Enabled</th>
                  <th>Source</th>
                  <th>Kind</th>
                  <th>Symbol Allowlist (CSV)</th>
                  <th>Strategy Allowlist (CSV)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.source_id || idx}>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(r.is_active)}
                        onChange={(e) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], is_active: e.target.checked };
                          setRows(next);
                        }}
                      />
                    </td>
                    <td>{r.source_name || r.source_id}</td>
                    <td>{r.source_kind || "-"}</td>
                    <td>
                      <input
                        value={r.symbol_csv || ""}
                        onChange={(e) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], symbol_csv: e.target.value };
                          setRows(next);
                        }}
                        placeholder="EURUSD, GBPJPY"
                      />
                    </td>
                    <td>
                      <input
                        value={r.strategy_csv || ""}
                        onChange={(e) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], strategy_csv: e.target.value };
                          setRows(next);
                        }}
                        placeholder="RJ, MSS, SMC"
                      />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">No sources found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="primary-button" onClick={saveSubscriptions} disabled={saving || loading || !selectedAccountId}>
            {saving ? "SAVING..." : "SAVE SUBSCRIPTIONS"}
          </button>
        </div>
      </section>
    </div>
  );
}
