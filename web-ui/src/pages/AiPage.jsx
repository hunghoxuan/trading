import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const PROVIDER_MODELS = {
  gemini: ["gemini-2.0-flash", "gemini-2.0-pro-exp-02-05"],
  openai: ["gpt-4o-mini", "gpt-4.1-mini"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  claude: ["claude-sonnet-4-0", "claude-3-7-sonnet-latest"],
};

function inferProviderByModel(modelRaw = "") {
  const model = String(modelRaw || "").toLowerCase();
  if (model.includes("deepseek")) return "deepseek";
  if (model.includes("gpt-")) return "openai";
  if (model.includes("claude")) return "claude";
  return "gemini";
}

function normalizeModelForProvider(providerRaw = "gemini", modelRaw = "") {
  const provider = String(providerRaw || "gemini").toLowerCase();
  const options = PROVIDER_MODELS[provider] || PROVIDER_MODELS.gemini;
  const model = String(modelRaw || "");
  return options.includes(model) ? model : options[0];
}

function asDisplayText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function normalizeNoteForStorage(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function AiPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState({
    name: "",
    prompt_text: "",
    default_symbol: "",
    default_tf: "",
    default_model: "deepseek-chat",
  });

  const [aiConfig, setAiConfig] = useState({});
  const [showConfig, setShowConfig] = useState(false);
  
  const [aiResponse, setAiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [suggestedSignals, setSuggestedSignals] = useState([]);
  const [selectedSignalIndices, setSelectedSignalIndices] = useState(new Set());

  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-2.0-flash");
  const runSeqRef = useRef(0);

  // Load basic data
  useEffect(() => {
    loadTemplates();
    loadConfig();
  }, []);

  async function loadTemplates() {
    try {
      const res = await api.aiListTemplates();
      setTemplates(res.templates || []);
    } catch (e) { setError("Failed to load templates: " + e.message); }
  }

  async function loadConfig() {
    try {
      const res = await api.aiGetConfig();
      setAiConfig(res.config?.settings || {});
    } catch (e) { setError("Failed to load AI config: " + e.message); }
  }

  const handleSelectTemplate = (t) => {
    setSelectedTemplateId(t.template_id);
    setActiveTemplate(t);
    const p = inferProviderByModel(t?.default_model || "");
    setProvider(p);
    setModel(normalizeModelForProvider(p, t?.default_model || ""));
  };

  const DEFAULT_PROMPT = `Act as a Senior Algo-Trader. Task: Analyze {SYMBOL} on {TIMEFRAME: default 15m} using {STRATEGY: default Price Action}.
Execution Logic:

Context First: Establish Weekly, Daily, and 4H Bias. If HTF (Higher Timeframe) alignment is absent, prioritize the dominant trend (Trendfolge).
Constraint Check: Execute entry ONLY if a high-probability confluence (Zusammenfluss) exists.
Risk Management: Min RR must be {RR}. If no valid setup meets the criteria, return null for trade levels.
Volatility Selection: If {SYMBOL} is unspecified, analyze the top 3 high-volume pairs with the highest winning probability (Gewinnwahrscheinlichkeit). Output: Return ONLY a raw JSON object (no prose, no markdown).`;

  const handleCreateNew = () => {
    setSelectedTemplateId(null);
    setProvider("gemini");
    setModel("gemini-2.0-flash");
    setActiveTemplate({
      name: "New AI Strategy",
      prompt_text: DEFAULT_PROMPT,
      default_symbol: "BTCUSDT",
      default_tf: "1h",
      default_model: "gemini-2.0-flash",
    });
  };

  const handleSaveTemplate = async () => {
    setLoading(true);
    try {
      const res = await api.aiUpsertTemplate({ 
        ...activeTemplate, 
        template_id: selectedTemplateId,
        default_model: model
      });
      await loadTemplates();
      setSelectedTemplateId(res.template.template_id);
      setActiveTemplate(res.template);
    } catch (e) { setError("Save failed: " + e.message); }
    finally { setLoading(false); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await api.aiDeleteTemplate(id);
      if (selectedTemplateId === id) handleCreateNew();
      await loadTemplates();
    } catch (e) { setError("Delete failed: " + e.message); }
  };

  const handleSaveConfig = async (key, value) => {
    try {
      await api.aiUpsertConfig(key, value);
      await loadConfig();
    } catch (e) { setError("Config save failed: " + e.message); }
  };

  const handleRunAI = async () => {
    const runSeq = ++runSeqRef.current;
    const requestProvider = provider;
    const requestModel = normalizeModelForProvider(requestProvider, model);

    setLoading(true);
    setAiResponse(null);
    setSuggestedSignals([]);
    setSelectedSignalIndices(new Set());
    setError("");
    try {
      const res = await api.aiGenerate({
        provider: requestProvider,
        model: requestModel,
        templateId: selectedTemplateId,
        customPrompt: activeTemplate.prompt_text,
        symbol: activeTemplate.default_symbol,
        timeframe: activeTemplate.default_tf,
        context: `Symbol: ${activeTemplate.default_symbol || "ALL"}, Timeframe: ${activeTemplate.default_tf || "1h"}`
      });
      if (runSeq !== runSeqRef.current) return;
      setAiResponse(res.raw_response);
      setSuggestedSignals(res.signals || []);
      // Auto-select all by default
      if (res.signals?.length > 0) {
        setSelectedSignalIndices(new Set(res.signals.map((_, i) => i)));
      }
    } catch (e) {
      if (runSeq !== runSeqRef.current) return;
      setError(`AI generation failed (${requestProvider}/${requestModel}): ` + e.message);
    } finally {
      if (runSeq === runSeqRef.current) setLoading(false);
    }
  };

  const toggleSignalSelection = (idx) => {
    const next = new Set(selectedSignalIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedSignalIndices(next);
  };

  const handleImportSelected = async () => {
    const toImport = suggestedSignals.filter((_, i) => selectedSignalIndices.has(i));
    if (toImport.length === 0) return;
    
    setLoading(true);
    try {
      let count = 0;
      for (const sig of toImport) {
        const aiProviderTag = `ai_${String(provider || "agent").toLowerCase()}`;
        const payload = {
          symbol: sig.symbol,
          action: String(sig.side || sig.direction || "BUY").toUpperCase().includes("BUY") ? "BUY" : "SELL",
          entry: Number(sig.entry),
          sl: Number(sig.sl),
          tp: Number(sig.tp),
          tf: sig.timeframe || activeTemplate.default_tf,
          model: aiProviderTag,
          entry_model: aiProviderTag,
          note: normalizeNoteForStorage(sig.note),
          source: "ai",
          strategy: "ai"
        };
        await api.createTrade(payload);
        count++;
      }
      alert(`Successfully imported ${count} signals to system.`);
    } catch (e) { setError("Import failed: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <section className="stack-layout fadeIn" style={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="page-title" style={{ margin: 0 }}>AI Agent Hub</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="secondary-button" onClick={() => setShowConfig(!showConfig)}>
            {showConfig ? "Hide API Keys" : "🔒 Manage API Keys"}
          </button>
        </div>
      </header>

      {error && <div className="error" style={{ marginBottom: 16 }}>{error} <button onClick={() => setError("")} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>x</button></div>}

      {showConfig && (
        <div className="panel fadeIn" style={{ marginBottom: 16, background: "var(--bg-accent)" }}>
          <h3 className="panel-label">Provider API Keys</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className="minor-text">OpenAI API Key</label>
              <input 
                type="password" 
                autoComplete="off"
                value={aiConfig.OPENAI_API_KEY || ""} 
                onChange={(e) => setAiConfig(prev => ({ ...prev, OPENAI_API_KEY: e.target.value }))}
                onBlur={(e) => handleSaveConfig("OPENAI_API_KEY", e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="minor-text">DeepSeek API Key</label>
              <input 
                type="password" 
                autoComplete="off"
                value={aiConfig.DEEPSEEK_API_KEY || ""} 
                onChange={(e) => setAiConfig(prev => ({ ...prev, DEEPSEEK_API_KEY: e.target.value }))}
                onBlur={(e) => handleSaveConfig("DEEPSEEK_API_KEY", e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="minor-text">Gemini API Key</label>
              <input 
                type="password" 
                autoComplete="off"
                value={aiConfig.GEMINI_API_KEY || ""} 
                onChange={(e) => setAiConfig(prev => ({ ...prev, GEMINI_API_KEY: e.target.value }))}
                onBlur={(e) => handleSaveConfig("GEMINI_API_KEY", e.target.value)}
                placeholder="AI..."
              />
            </div>
            <div>
              <label className="minor-text">Claude API Key</label>
              <input 
                type="password" 
                autoComplete="off"
                value={aiConfig.CLAUDE_API_KEY || ""} 
                onChange={(e) => setAiConfig(prev => ({ ...prev, CLAUDE_API_KEY: e.target.value }))}
                onBlur={(e) => handleSaveConfig("CLAUDE_API_KEY", e.target.value)}
                placeholder="sk-ant-..."
              />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 20, flex: 1, minHeight: 0 }}>
        {/* Sidebar: Templates */}
        <aside className="panel" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span className="panel-label">Templates</span>
            <button className="secondary-button" onClick={handleCreateNew} style={{ padding: "2px 8px" }}>+</button>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {templates.map(t => (
              <div 
                key={t.template_id} 
                className={`mini-table-row ${selectedTemplateId === t.template_id ? 'active' : ''}`}
                style={{ padding: 10, cursor: "pointer", borderRadius: 4, marginBottom: 4, border: selectedTemplateId === t.template_id ? "1px solid var(--accent)" : "1px solid transparent" }}
                onClick={() => handleSelectTemplate(t)}
              >
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                <div className="minor-text" style={{ fontSize: 10 }}>{t.default_model} | {t.default_tf}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Editor & Results Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
          
          <div className="panel">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 100px", gap: 16, marginBottom: 16 }}>
              <div>
                <label className="minor-text">Template Name</label>
                <input type="text" value={activeTemplate.name} onChange={e => setActiveTemplate({...activeTemplate, name: e.target.value})} />
              </div>
              <div>
                <label className="minor-text">Default Symbol</label>
                <input type="text" value={activeTemplate.default_symbol} onChange={e => setActiveTemplate({...activeTemplate, default_symbol: e.target.value})} placeholder="BTCUSDT" />
              </div>
              <div>
                <label className="minor-text">TF</label>
                <input type="text" value={activeTemplate.default_tf} onChange={e => setActiveTemplate({...activeTemplate, default_tf: e.target.value})} placeholder="1h" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label className="minor-text">AI Provider</label>
                <select
                  value={provider}
                  onChange={(e) => {
                    const p = e.target.value;
                    setProvider(p);
                    setModel(normalizeModelForProvider(p, ""));
                  }}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="claude">Claude</option>
                </select>
              </div>
              <div>
                <label className="minor-text">Model</label>
                <select value={model} onChange={e => setModel(e.target.value)}>
                  {provider === "gemini" ? (
                    <>
                      <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                      <option value="gemini-2.0-pro-exp-02-05">gemini-2.0-pro-exp</option>
                    </>
                  ) : provider === "openai" ? (
                    <>
                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                      <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                    </>
                  ) : provider === "claude" ? (
                    <>
                      <option value="claude-sonnet-4-0">claude-sonnet-4-0</option>
                      <option value="claude-3-7-sonnet-latest">claude-3-7-sonnet-latest</option>
                    </>
                  ) : (
                    <>
                      <option value="deepseek-chat">deepseek-chat</option>
                      <option value="deepseek-reasoner">deepseek-reasoner</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            
            <label className="minor-text">AI Prompt Template</label>
            <textarea 
              rows={10} 
              style={{ width: "100%", fontFamily: "monospace", fontSize: 12, lineHeight: "1.5" }}
              value={activeTemplate.prompt_text}
              onChange={e => setActiveTemplate({...activeTemplate, prompt_text: e.target.value})}
            />
            
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <div>
                <button className="primary-button" onClick={handleRunAI} disabled={loading}>
                  {loading ? "⌛ Analyzing..." : "🚀 Run AI Analysis"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="secondary-button" onClick={() => handleDeleteTemplate(selectedTemplateId)} disabled={!selectedTemplateId}>Delete</button>
                <button className="primary-button" onClick={handleSaveTemplate}>Save Template</button>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          {suggestedSignals.length > 0 && (
            <div className="panel fadeIn" style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 className="panel-label" style={{ margin: 0 }}>AI SUGGESTED SIGNALS ({suggestedSignals.length})</h3>
                <button className="primary-button" onClick={handleImportSelected} disabled={selectedSignalIndices.size === 0}>
                   📥 Sync to System ({selectedSignalIndices.size})
                </button>
              </div>
              <table className="mini-table" style={{ width: "100%" }}>
                <thead>
                  <tr className="mini-table-head">
                    <th style={{ width: 30 }}></th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Entry</th>
                    <th>SL/TP</th>
                    <th>Model</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestedSignals.map((s, i) => (
                    <tr key={i} className="mini-table-row" style={{ opacity: selectedSignalIndices.has(i) ? 1 : 0.5 }}>
                      <td>
                        <input type="checkbox" checked={selectedSignalIndices.has(i)} onChange={() => toggleSignalSelection(i)} />
                      </td>
                      <td style={{ fontWeight: 800 }}>{asDisplayText(s.symbol)} <span className="minor-text">{asDisplayText(s.timeframe)}</span></td>
                      <td style={{ color: String(s.side || "").toUpperCase().includes("BUY") ? "var(--success)" : "var(--neg)" }}>{asDisplayText(s.side)}</td>
                      <td>{asDisplayText(s.entry)}</td>
                      <td style={{ fontSize: 10 }}>
                        <div className="money-neg">{asDisplayText(s.sl)}</div>
                        <div className="money-pos">{asDisplayText(s.tp)}</div>
                      </td>
                      <td>{asDisplayText(s.entry_model)}</td>
                      <td className="minor-text" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asDisplayText(s.note)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {aiResponse && (
            <div className="panel">
              <h3 className="panel-label">Raw AI Response</h3>
              <pre style={{ fontSize: 11, background: "rgba(0,0,0,0.1)", padding: 10, borderRadius: 4, whiteSpace: "pre-wrap", maxHeight: 400, overflowY: 'auto' }}>
                {asDisplayText(aiResponse)}
              </pre>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
