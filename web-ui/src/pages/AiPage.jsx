import { useEffect, useState } from "react";
import { api } from "../api";

export default function AiPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState({
    name: "",
    prompt_text: "",
    default_symbol: "",
    default_tf: "",
    default_model: "deepseek-coder",
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

  // Load basic data
  useEffect(() => {
    loadTemplates();
    loadConfig();
  }, []);

  useEffect(() => {
    if (activeTemplate?.default_model) {
      setModel(activeTemplate.default_model);
      if (activeTemplate.default_model.includes("deepseek")) setProvider("deepseek");
      else setProvider("gemini");
    }
  }, [activeTemplate]);

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
  };

  const DEFAULT_PROMPT = `Role: You are an expert financial analyst and algorithmic trader specialized in price action and technical analysis.
Task: Analyze the provided live market data for the symbol {SYMBOL} on the {TIMEFRAME} timeframe.
Instructions:
Identify the current market structure (Bias, Trend, Range, or Reversal).

Determine a high-probability trade setup based on {INDICATORS/STRATEGY, e.g., SMC, RSI, MACD}.

Provide precise price levels for Entry, Take Profit (TP), and Stop Loss (SL), direction (Buy|Sell)

Ensure the risk-to-reward ratio is at least {RR}.

Output Format: Return ONLY a valid JSON object. Do not include any conversational text, markdown formatting outside the JSON, or explanations before the code block. Json fields: symbol, entry_model, direction, entry, tp, sl, timeframe, note: bias, trend and market data with detail analysis.`;

  const handleCreateNew = () => {
    setSelectedTemplateId(null);
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
    setLoading(true);
    setAiResponse(null);
    setSuggestedSignals([]);
    setSelectedSignalIndices(new Set());
    setError("");
    try {
      const res = await api.aiGenerate({
        provider: provider,
        model: model,
        templateId: selectedTemplateId,
        customPrompt: activeTemplate.prompt_text,
        symbol: activeTemplate.default_symbol,
        timeframe: activeTemplate.default_tf,
        context: `Symbol: ${activeTemplate.default_symbol || "ALL"}, Timeframe: ${activeTemplate.default_tf || "1h"}`
      });
      setAiResponse(res.raw_response);
      setSuggestedSignals(res.signals || []);
      // Auto-select all by default
      if (res.signals?.length > 0) {
        setSelectedSignalIndices(new Set(res.signals.map((_, i) => i)));
      }
    } catch (e) { setError("AI generation failed: " + e.message); }
    finally { setLoading(false); }
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
        const payload = {
          symbol: sig.symbol,
          action: String(sig.side || sig.direction || "BUY").toUpperCase().includes("BUY") ? "BUY" : "SELL",
          entry: Number(sig.entry),
          sl: Number(sig.sl),
          tp: Number(sig.tp),
          tf: sig.timeframe || activeTemplate.default_tf,
          model: sig.entry_model || activeTemplate.name || "AI_AGENT",
          note: sig.note || "",
          source: "AI_HUB"
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
                <select value={provider} onChange={e => setProvider(e.target.value)}>
                  <option value="gemini">Google Gemini</option>
                  <option value="deepseek">DeepSeek</option>
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
                  ) : (
                    <>
                      <option value="deepseek-coder">deepseek-coder</option>
                      <option value="deepseek-chat">deepseek-chat</option>
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
                      <td style={{ fontWeight: 800 }}>{s.symbol} <span className="minor-text">{s.timeframe}</span></td>
                      <td style={{ color: String(s.side || "").toUpperCase().includes("BUY") ? "var(--success)" : "var(--neg)" }}>{s.side}</td>
                      <td>{s.entry}</td>
                      <td style={{ fontSize: 10 }}>
                        <div className="money-neg">{s.sl}</div>
                        <div className="money-pos">{s.tp}</div>
                      </td>
                      <td>{s.entry_model}</td>
                      <td className="minor-text" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.note}</td>
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
                {aiResponse}
              </pre>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
