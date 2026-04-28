import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

const API_MODEL_OPTIONS = [
  { value: "gemini", label: "Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "claude", label: "Claude" },
];

const TIMEFRAME_OPTIONS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

function getSettingKey(setting) {
  return `${String(setting?.type || "")}::${String(setting?.name || "")}`;
}

function settingStatusClass(status) {
  return String(status || "").trim().toLowerCase() || "inactive";
}

function parseTextList(value, uppercase = false) {
  return [...new Set(String(value || "")
    .split(/[\n,]/)
    .map((s) => {
      const trimmed = s.trim();
      return uppercase ? trimmed.toUpperCase() : trimmed;
    })
    .filter(Boolean))];
}

function emptyCronForm() {
  return {
    symbols: "",
    timeframes: [],
    cadence_minutes: 60,
    provider: "twelvedata",
    timezone: "America/New_York",
    batch_size: 8,
    model: "claude",
    profile: "",
    entry_models: "",
    directions: ["BUY", "SELL"],
    order_types: ["market", "limit", "stop"],
    prompt: "",
  };
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [activeTab, setActiveTab] = useState("market_data_cron::default");
  const [cronForm, setCronForm] = useState(emptyCronForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const cronSettings = useMemo(
    () => settings.filter((s) => ["market_data_cron", "ai_analysis_cron"].includes(String(s?.type || ""))),
    [settings],
  );

  const selectedSetting = useMemo(
    () => cronSettings.find((s) => getSettingKey(s) === activeTab) || cronSettings[0] || null,
    [cronSettings, activeTab],
  );

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.getSettings();
      const list = Array.isArray(res?.settings) ? res.settings : [];
      setSettings(list);
      const hasActive = list.some((s) => getSettingKey(s) === activeTab);
      if (!hasActive) {
        const firstCron = list.find((s) => ["market_data_cron", "ai_analysis_cron"].includes(String(s?.type || "")));
        if (firstCron) setActiveTab(getSettingKey(firstCron));
      }
      setMsg("");
    } catch (err) {
      setMsg(err?.message || "Failed to load system settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedSetting) {
      setCronForm(emptyCronForm());
      return;
    }
    const data = selectedSetting?.data || {};
    setCronForm({
      symbols: Array.isArray(data.symbols) ? data.symbols.join(", ") : "",
      timeframes: Array.isArray(data.timeframes) ? data.timeframes : [],
      cadence_minutes: Number(data.cadence_minutes || 60),
      provider: String(data.provider || "twelvedata"),
      timezone: String(data.timezone || "America/New_York"),
      batch_size: Number(data.batch_size || 8),
      model: String(data.model || "claude"),
      profile: String(data.profile || ""),
      entry_models: Array.isArray(data.entry_models) ? data.entry_models.join(", ") : "",
      directions: Array.isArray(data.directions) ? data.directions : ["BUY", "SELL"],
      order_types: Array.isArray(data.order_types) ? data.order_types : ["market", "limit", "stop"],
      prompt: String(data.prompt || ""),
    });
  }, [selectedSetting?.type, selectedSetting?.name, selectedSetting?.data]);

  function updateSelectedStatus(status) {
    if (!selectedSetting) return;
    setSettings((prev) => prev.map((s) => (
      getSettingKey(s) === getSettingKey(selectedSetting) ? { ...s, status } : s
    )));
  }

  async function saveSelected() {
    if (!selectedSetting) return;
    const nextStatus = String(selectedSetting.status || "INACTIVE").toUpperCase();
    const nextData = {
      ...(selectedSetting.data || {}),
      enabled: nextStatus === "ACTIVE",
      provider: cronForm.provider,
      timezone: cronForm.timezone,
      batch_size: cronForm.batch_size,
      symbols: parseTextList(cronForm.symbols, true),
      timeframes: cronForm.timeframes,
      cadence_minutes: cronForm.cadence_minutes,
      model: cronForm.model,
      profile: cronForm.profile,
      entry_models: parseTextList(cronForm.entry_models),
      directions: cronForm.directions,
      order_types: cronForm.order_types,
      prompt: cronForm.prompt,
    };
    setLoading(true);
    setMsg("");
    try {
      await api.upsertSetting({
        type: selectedSetting.type,
        name: selectedSetting.name,
        data: nextData,
        status: nextStatus,
      });
      setMsg(`${selectedSetting.name} saved.`);
      await loadData();
    } catch (err) {
      setMsg(err?.message || "Failed to save system setting.");
    } finally {
      setLoading(false);
      window.setTimeout(() => setMsg(""), 3000);
    }
  }

  return (
    <div className="stack-layout fadeIn" style={{ paddingBottom: 40 }}>
      <h2 className="page-title">System Settings</h2>

      <div className="settings-layout-v2" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, marginTop: 12 }}>
        <section className="panel" style={{ margin: 0 }}>
          <div className="panel-label">SYSTEM</div>
          <div className="stack-layout" style={{ gap: 2 }}>
            {cronSettings.map((setting) => {
              const key = getSettingKey(setting);
              const title = setting.type === "market_data_cron" ? "Market Data Cron" : "AI Analysis Cron";
              const subtitle = setting.type === "market_data_cron" ? "Bars DB + cache sync" : "Auto analysis pipeline";
              return (
                <button
                  key={key}
                  className={`sidebar-item-v2 ${activeTab === key ? "active" : ""}`}
                  onClick={() => setActiveTab(key)}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>{title}</span>
                    <span className="minor-text" style={{ fontSize: 9 }}>{subtitle}</span>
                  </div>
                  <span className={`status-badge ${settingStatusClass(setting.status)}`}>{setting.status || "missing"}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel" style={{ margin: 0, minHeight: 600 }}>
          {!selectedSetting && (
            <div className="empty-state">{loading ? "Loading system settings..." : "No cron settings found."}</div>
          )}

          {selectedSetting && (
            <div className="fadeIn">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h3 style={{ margin: 0, textTransform: "uppercase" }}>
                    {selectedSetting.type === "market_data_cron" ? "Market Data Cron" : "AI Analysis Cron"}
                  </h3>
                  <div className="minor-text" style={{ marginTop: 4 }}>Type: {selectedSetting.type}</div>
                </div>
                <button className="primary-button" onClick={saveSelected} disabled={loading}>SAVE</button>
              </div>

              <div className="stack-layout fadeIn" style={{ gap: 20, maxWidth: 680 }}>
                <div className="stack-layout" style={{ gap: 8 }}>
                  <span className="panel-label" style={{ fontSize: 10, marginBottom: 0 }}>STATUS</span>
                  <select
                    style={{ width: "100%" }}
                    value={String(selectedSetting.status || "INACTIVE").toUpperCase()}
                    onChange={(e) => updateSelectedStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                {selectedSetting.type === "market_data_cron" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <label className="stack-layout" style={{ gap: 6 }}>
                      <span className="minor-text">Provider</span>
                      <select value={cronForm.provider} onChange={(e) => setCronForm((p) => ({ ...p, provider: e.target.value }))}>
                        <option value="twelvedata">Twelve Data</option>
                      </select>
                    </label>
                    <label className="stack-layout" style={{ gap: 6 }}>
                      <span className="minor-text">Display Timezone</span>
                      <input value={cronForm.timezone} onChange={(e) => setCronForm((p) => ({ ...p, timezone: e.target.value }))} />
                    </label>
                    <label className="stack-layout" style={{ gap: 6 }}>
                      <span className="minor-text">Batch Size</span>
                      <input type="number" min="1" max="50" value={cronForm.batch_size} onChange={(e) => setCronForm((p) => ({ ...p, batch_size: Number(e.target.value) }))} />
                    </label>
                  </div>
                )}

                <label className="stack-layout" style={{ gap: 8 }}>
                  <span className="panel-label" style={{ fontSize: 10, marginBottom: 0 }}>SYMBOLS</span>
                  <textarea
                    rows={3}
                    value={cronForm.symbols}
                    onChange={(e) => setCronForm((p) => ({ ...p, symbols: e.target.value }))}
                    placeholder="XAUUSD, EURUSD, BTCUSD"
                  />
                </label>

                <div className="stack-layout" style={{ gap: 8 }}>
                  <span className="panel-label" style={{ fontSize: 10, marginBottom: 0 }}>TIMEFRAMES</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {TIMEFRAME_OPTIONS.map((tf) => (
                      <label key={tf} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={cronForm.timeframes.includes(tf)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...cronForm.timeframes, tf]
                              : cronForm.timeframes.filter((x) => x !== tf);
                            setCronForm((p) => ({ ...p, timeframes: next }));
                          }}
                        />
                        <span style={{ fontSize: 13 }}>{tf}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedSetting.type === "ai_analysis_cron" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div className="stack-layout" style={{ gap: 8 }}>
                        <span className="panel-label" style={{ fontSize: 10, marginBottom: 0 }}>DIRECTIONS</span>
                        <div style={{ display: "flex", gap: 12 }}>
                          {["BUY", "SELL"].map((direction) => (
                            <label key={direction} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <input
                                type="checkbox"
                                checked={cronForm.directions.includes(direction)}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...cronForm.directions, direction]
                                    : cronForm.directions.filter((x) => x !== direction);
                                  setCronForm((p) => ({ ...p, directions: next }));
                                }}
                              />
                              <span style={{ fontSize: 13 }}>{direction}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="stack-layout" style={{ gap: 8 }}>
                        <span className="panel-label" style={{ fontSize: 10, marginBottom: 0 }}>ORDER TYPES</span>
                        <div style={{ display: "flex", gap: 12 }}>
                          {["market", "limit", "stop"].map((orderType) => (
                            <label key={orderType} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <input
                                type="checkbox"
                                checked={cronForm.order_types.includes(orderType)}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...cronForm.order_types, orderType]
                                    : cronForm.order_types.filter((x) => x !== orderType);
                                  setCronForm((p) => ({ ...p, order_types: next }));
                                }}
                              />
                              <span style={{ fontSize: 13 }}>{orderType}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <label className="stack-layout" style={{ gap: 8 }}>
                      <span className="panel-label" style={{ fontSize: 10, marginBottom: 0 }}>CADENCE (MINUTES)</span>
                      <input
                        type="number"
                        min="1"
                        value={cronForm.cadence_minutes}
                        onChange={(e) => setCronForm((p) => ({ ...p, cadence_minutes: Number(e.target.value) }))}
                      />
                    </label>

                    <label className="stack-layout" style={{ gap: 8 }}>
                      <span className="panel-label" style={{ fontSize: 10, marginBottom: 0 }}>MODEL</span>
                      <select value={cronForm.model} onChange={(e) => setCronForm((p) => ({ ...p, model: e.target.value }))}>
                        {API_MODEL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </label>

                    <label className="stack-layout" style={{ gap: 8 }}>
                      <span className="panel-label" style={{ fontSize: 10, marginBottom: 0 }}>PROFILE</span>
                      <input
                        value={cronForm.profile}
                        onChange={(e) => setCronForm((p) => ({ ...p, profile: e.target.value }))}
                        placeholder="Optional AI/profile name"
                      />
                    </label>

                    <label className="stack-layout" style={{ gap: 8 }}>
                      <span className="panel-label" style={{ fontSize: 10, marginBottom: 0 }}>ENTRY MODELS</span>
                      <textarea
                        rows={3}
                        value={cronForm.entry_models}
                        onChange={(e) => setCronForm((p) => ({ ...p, entry_models: e.target.value }))}
                        placeholder="Order Block, FVG, ICT"
                      />
                    </label>

                    <label className="stack-layout" style={{ gap: 8 }}>
                      <span className="panel-label" style={{ fontSize: 10, marginBottom: 0 }}>PROMPT</span>
                      <textarea
                        rows={6}
                        value={cronForm.prompt}
                        onChange={(e) => setCronForm((p) => ({ ...p, prompt: e.target.value }))}
                      />
                    </label>
                  </>
                )}

                <div style={{ marginTop: 12, padding: 12, background: "var(--surface-deep)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div className="panel-label" style={{ fontSize: 9 }}>RAW DATA PREVIEW</div>
                  <pre style={{ fontSize: 11, margin: 0 }}>{JSON.stringify({
                    enabled: String(selectedSetting.status || "").toUpperCase() === "ACTIVE",
                    provider: cronForm.provider,
                    timezone: cronForm.timezone,
                    batch_size: cronForm.batch_size,
                    symbols: parseTextList(cronForm.symbols, true),
                    timeframes: cronForm.timeframes,
                    cadence_minutes: cronForm.cadence_minutes,
                    model: cronForm.model,
                    profile: cronForm.profile,
                    entry_models: parseTextList(cronForm.entry_models),
                    directions: cronForm.directions,
                    order_types: cronForm.order_types,
                    prompt: cronForm.prompt,
                  }, null, 2)}</pre>
                </div>

                {selectedSetting?.data?.last_sync && (
                  <div style={{ padding: 12, background: "var(--surface-deep)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div className="panel-label" style={{ fontSize: 9 }}>LAST SYNC</div>
                    <pre style={{ fontSize: 11, margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(selectedSetting.data.last_sync, null, 2)}</pre>
                  </div>
                )}

                {msg && <div className="minor-text" style={{ color: msg.includes("Failed") ? "var(--danger)" : "var(--success)" }}>{msg}</div>}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
