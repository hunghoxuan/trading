#property strict
#property description "TradingView -> MT5 pull bridge EA"

#include <Trade/Trade.mqh>

input string InpServerBaseUrl = "http://signal.mozasolution.com";
input string InpEaApiKey      = "cfa824ed707c39609234b98ed2366a988f7ba2a111d9ccb38123b50485f15a87";
input int    InpPollSeconds   = 2;
input string InpSymbolSuffix  = "";   // Example: ".m" or "-pro"
input long   InpMagic         = 20260411;
input int    InpDeviationPts  = 20;
input bool   InpStrictSymbolResolve = true;   // Ignore signal if symbol cannot be resolved.
input bool   InpEnableDuplicateGate = true;   // Ignore duplicated signal_id.
input int    InpDedupKeepSeconds    = 86400;  // Keep processed signal_id cache for this many seconds.
input int    InpMaxSignalAgeSeconds = 600;    // 0 = disable. Ignore signal if too old.
input bool   InpBacktestMode        = false;  // Replay signals from file in Strategy Tester.
input string InpBacktestFileCommon  = "tvbridge_signals.csv"; // Common/Files CSV.
input bool   InpBacktestHasHeader   = true;
input bool   InpShowDebugPanel      = true;   // Show EA state on chart via Comment().

// Bump this on every code update so running build is obvious on chart/logs.
string EA_BUILD_VERSION = "2026-04-12.01";

CTrade trade;

string   g_seenIds[];
datetime g_seenAt[];

datetime g_btTime[];
string   g_btSignalId[];
string   g_btAction[];
string   g_btSymbol[];
string   g_btNote[];
double   g_btVolume[];
double   g_btSl[];
double   g_btTp[];
int      g_btCursor = 0;
bool     g_btLoaded = false;

string   g_dbgLastSignalId = "";
string   g_dbgLastAction   = "";
string   g_dbgLastSymbol   = "";
string   g_dbgLastStatus   = "INIT";
string   g_dbgLastError    = "";
datetime g_dbgLastTime     = 0;
string   g_dbgLastPollSummary = "No polls yet";
int      g_dbgPollCount = 0;
int      g_dbgPollPullFail = 0;
int      g_dbgPollNoSignal = 0;
int      g_dbgPollExecOk = 0;
int      g_dbgPollExecFail = 0;

string JsonGetString(const string json, const string key)
{
   string token = "\"" + key + "\"";
   int p = StringFind(json, token);
   if(p < 0) return "";
   int c = StringFind(json, ":", p + StringLen(token));
   if(c < 0) return "";
   int q1 = StringFind(json, "\"", c + 1);
   if(q1 < 0) return "";
   int q2 = StringFind(json, "\"", q1 + 1);
   if(q2 < 0) return "";
   return StringSubstr(json, q1 + 1, q2 - q1 - 1);
}

double JsonGetNumber(const string json, const string key, const double fallback=0.0)
{
   string token = "\"" + key + "\"";
   int p = StringFind(json, token);
   if(p < 0) return fallback;
   int c = StringFind(json, ":", p + StringLen(token));
   if(c < 0) return fallback;
   int s = c + 1;
   while(s < StringLen(json) && (StringGetCharacter(json, s) == ' ' || StringGetCharacter(json, s) == '"')) s++;
   int e = s;
   while(e < StringLen(json))
   {
      int ch = StringGetCharacter(json, e);
      if((ch >= '0' && ch <= '9') || ch == '.' || ch == '-') e++;
      else break;
   }
   if(e <= s) return fallback;
   return StringToDouble(StringSubstr(json, s, e - s));
}

bool HttpGet(const string url, string &response)
{
   char post[];
   ArrayResize(post, 0);
   char result[];
   string headers;
   ResetLastError();
   int code = WebRequest("GET", url, "", 5000, post, result, headers);
   if(code == -1)
   {
      Print("WebRequest GET failed: ", GetLastError(), " url=", url);
      return false;
   }
   response = CharArrayToString(result);
   if(code < 200 || code >= 300)
   {
      Print("GET non-2xx code=", code, " body=", response);
      return false;
   }
   return true;
}

bool HttpPostJson(const string url, const string body)
{
   char data[];
   // Send exact JSON bytes only (exclude terminating '\0' to avoid server JSON parse errors).
   StringToCharArray(body, data, 0, StringLen(body), CP_UTF8);
   char result[];
   string headers = "Content-Type: application/json\r\n";
   ResetLastError();
   int code = WebRequest("POST", url, headers, 5000, data, result, headers);
   if(code == -1)
   {
      Print("WebRequest POST failed: ", GetLastError(), " url=", url);
      return false;
   }
   string resp = CharArrayToString(result);
   if(code < 200 || code >= 300)
   {
      Print("POST non-2xx code=", code, " body=", resp);
      return false;
   }
   return true;
}

string JsonEscape(const string s)
{
   string out = "";
   int n = StringLen(s);
   for(int i = 0; i < n; ++i)
   {
      int ch = StringGetCharacter(s, i);
      if(ch == '\\')
         out += "\\\\";
      else if(ch == '\"')
         out += "\\\"";
      else if(ch == '\n')
         out += "\\n";
      else if(ch == '\r')
         out += "\\r";
      else if(ch == '\t')
         out += "\\t";
      else if(ch >= 0 && ch < 32)
         out += " ";
      else
         out += StringSubstr(s, i, 1);
   }
   return out;
}

datetime ParseSignalTime(const string raw)
{
   string s = raw;
   StringTrimLeft(s);
   StringTrimRight(s);
   if(StringLen(s) == 0)
      return 0;

   bool allDigits = true;
   for(int i = 0; i < StringLen(s); ++i)
   {
      int ch = StringGetCharacter(s, i);
      if(ch < '0' || ch > '9')
      {
         allDigits = false;
         break;
      }
   }
   if(allDigits)
      return (datetime)StringToInteger(s);

   return StringToTime(s);
}

void PruneSeenSignals()
{
   if(InpDedupKeepSeconds <= 0)
      return;

   datetime cutoff = TimeCurrent() - InpDedupKeepSeconds;
   int n = ArraySize(g_seenIds);
   int w = 0;
   for(int i = 0; i < n; ++i)
   {
      if(g_seenAt[i] >= cutoff)
      {
         if(w != i)
         {
            g_seenIds[w] = g_seenIds[i];
            g_seenAt[w] = g_seenAt[i];
         }
         ++w;
      }
   }
   ArrayResize(g_seenIds, w);
   ArrayResize(g_seenAt, w);
}

void RefreshDebugPanel()
{
   if(!InpShowDebugPanel)
      return;

   int btTotal = ArraySize(g_btTime);
   string mode = InpBacktestMode ? "BACKTEST" : "LIVE";
   string lastTime = g_dbgLastTime > 0 ? TimeToString(g_dbgLastTime, TIME_DATE | TIME_SECONDS) : "-";
   string text =
      "TVBridgeEA Debug\n" +
      "Build: " + EA_BUILD_VERSION + "\n" +
      "Mode: " + mode + "\n" +
      "Chart: " + _Symbol + " " + EnumToString((ENUM_TIMEFRAMES)_Period) + "\n" +
      "Positions: " + IntegerToString(PositionsTotal()) + "\n" +
      "PollSummary: " + g_dbgLastPollSummary + "\n" +
      "PollStats: total=" + IntegerToString(g_dbgPollCount) +
      " pull_fail=" + IntegerToString(g_dbgPollPullFail) +
      " no_signal=" + IntegerToString(g_dbgPollNoSignal) +
      " ok=" + IntegerToString(g_dbgPollExecOk) +
      " fail=" + IntegerToString(g_dbgPollExecFail) + "\n" +
      "LastSignalId: " + g_dbgLastSignalId + "\n" +
      "LastAction: " + g_dbgLastAction + "\n" +
      "LastSymbol: " + g_dbgLastSymbol + "\n" +
      "LastStatus: " + g_dbgLastStatus + "\n" +
      "LastError: " + g_dbgLastError + "\n" +
      "LastTime: " + lastTime + "\n" +
      "DedupCache: " + IntegerToString(ArraySize(g_seenIds)) + "\n" +
      "BacktestQueue: " + IntegerToString(g_btCursor) + "/" + IntegerToString(btTotal);
   Comment(text);
}

bool IsDuplicateSignal(const string signalId)
{
   if(!InpEnableDuplicateGate || StringLen(signalId) == 0)
      return false;

   PruneSeenSignals();
   for(int i = ArraySize(g_seenIds) - 1; i >= 0; --i)
   {
      if(g_seenIds[i] == signalId)
         return true;
   }
   return false;
}

void RememberSignal(const string signalId)
{
   if(!InpEnableDuplicateGate || StringLen(signalId) == 0)
      return;

   int n = ArraySize(g_seenIds);
   ArrayResize(g_seenIds, n + 1);
   ArrayResize(g_seenAt, n + 1);
   g_seenIds[n] = signalId;
   g_seenAt[n] = TimeCurrent();
   PruneSeenSignals();
}

bool IsExpiredSignal(const datetime signalTs)
{
   if(InpMaxSignalAgeSeconds <= 0 || signalTs <= 0)
      return false;
   return (TimeCurrent() - signalTs) > InpMaxSignalAgeSeconds;
}

bool ResolveSymbol(const string raw, string &resolved)
{
   string s = raw;
   StringTrimLeft(s);
   StringTrimRight(s);
   if(StringLen(s) > 0 && (SymbolInfoInteger(s, SYMBOL_SELECT) || SymbolSelect(s, true)))
   {
      resolved = s;
      return true;
   }

   if(StringLen(InpSymbolSuffix) > 0)
   {
      string t = s + InpSymbolSuffix;
      if(SymbolInfoInteger(t, SYMBOL_SELECT) || SymbolSelect(t, true))
      {
         resolved = t;
         return true;
      }
   }

   resolved = "";
   return false;
}

void Ack(const string signalId, const string status, const string ticket, const string err)
{
   string url = InpServerBaseUrl + "/mt5/ea/ack";
   string body = "{";
   body += "\"api_key\":\"" + JsonEscape(InpEaApiKey) + "\",";
   body += "\"signal_id\":\"" + JsonEscape(signalId) + "\",";
   body += "\"status\":\"" + JsonEscape(status) + "\",";
   body += "\"ticket\":\"" + JsonEscape(ticket) + "\",";
   body += "\"error\":\"" + JsonEscape(err) + "\"";
   body += "}";
   HttpPostJson(url, body);
}

void CloseBySymbol(const string symbol)
{
   for(int i = PositionsTotal() - 1; i >= 0; --i)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      string ps = PositionGetString(POSITION_SYMBOL);
      if(ps != symbol) continue;
      trade.PositionClose(ticket);
   }
}

void NormalizeStopsForMarket(const string action,
                             const string symbol,
                             double &sl,
                             double &tp,
                             string &adjustNote)
{
   adjustNote = "";
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   if(point <= 0.0)
      point = 0.00001;

   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   if(bid <= 0.0 || ask <= 0.0)
   {
      MqlTick tick;
      if(SymbolInfoTick(symbol, tick))
      {
         bid = tick.bid;
         ask = tick.ask;
      }
   }
   if(bid <= 0.0 || ask <= 0.0)
      return;

   int stopsLevelPts = (int)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minDist = MathMax(0, stopsLevelPts) * point;

   if(action == "BUY")
   {
      // BUY: SL must be below bid by at least min distance, TP above ask by at least min distance.
      if(sl > 0.0 && sl >= (bid - minDist))
      {
         sl = 0.0;
         adjustNote += "[SL dropped]";
      }
      if(tp > 0.0 && tp <= (ask + minDist))
      {
         tp = 0.0;
         adjustNote += "[TP dropped]";
      }
   }
   else if(action == "SELL")
   {
      // SELL: SL must be above ask by at least min distance, TP below bid by at least min distance.
      if(sl > 0.0 && sl <= (ask + minDist))
      {
         sl = 0.0;
         adjustNote += "[SL dropped]";
      }
      if(tp > 0.0 && tp >= (bid - minDist))
      {
         tp = 0.0;
         adjustNote += "[TP dropped]";
      }
   }

   if(sl > 0.0)
      sl = NormalizeDouble(sl, digits);
   if(tp > 0.0)
      tp = NormalizeDouble(tp, digits);
}

bool ApplyStopsAfterOpen(const string action,
                         const string symbol,
                         const double slIn,
                         const double tpIn,
                         string &infoOut)
{
   infoOut = "";
   if(slIn <= 0.0 && tpIn <= 0.0)
   {
      infoOut = "no stops requested";
      return true;
   }

   double sl = slIn;
   double tp = tpIn;
   string adjustNote = "";
   NormalizeStopsForMarket(action, symbol, sl, tp, adjustNote);
   if(sl <= 0.0 && tp <= 0.0)
   {
      infoOut = "stops skipped after normalize";
      return false;
   }

   // Position can appear with a tiny delay in tester/live; retry briefly.
   bool found = false;
   for(int i = 0; i < 10; ++i)
   {
      if(PositionSelect(symbol))
      {
         found = true;
         break;
      }
      Sleep(100);
   }
   if(!found)
   {
      infoOut = "position not found for modify";
      return false;
   }

   bool ok = trade.PositionModify(symbol, sl > 0.0 ? sl : 0.0, tp > 0.0 ? tp : 0.0);
   if(!ok)
   {
      infoOut = "PositionModify retcode=" + IntegerToString((int)trade.ResultRetcode()) + " msg=" + trade.ResultRetcodeDescription();
      return false;
   }

   infoOut = "stops set" + (StringLen(adjustNote) > 0 ? (" " + adjustNote) : "");
   return true;
}

bool ExecuteSignal(const string signalId,
                   const string actionRaw,
                   const string symbolRaw,
                   const string comment,
                   const double volume,
                   const double sl,
                   const double tp,
                   const datetime signalTs,
                   string &ticketOut,
                   string &errOut)
{
   ticketOut = "";
   errOut = "";
   g_dbgLastSignalId = signalId;
   g_dbgLastSymbol = symbolRaw;
   g_dbgLastError = "";
   g_dbgLastTime = TimeCurrent();

   string action = actionRaw;
   StringToUpper(action);
   g_dbgLastAction = action;

   if(StringLen(signalId) == 0 || StringLen(action) == 0)
   {
      errOut = "Missing signal_id/action";
      g_dbgLastStatus = "INVALID";
      g_dbgLastError = errOut;
      RefreshDebugPanel();
      return false;
   }

   if(IsDuplicateSignal(signalId))
   {
      errOut = "Duplicate signal_id ignored: " + signalId;
      Print(errOut);
      g_dbgLastStatus = "DUPLICATE_IGNORED";
      g_dbgLastError = errOut;
      RefreshDebugPanel();
      return false;
   }

   if(IsExpiredSignal(signalTs))
   {
      errOut = "Expired signal ignored: " + signalId;
      Print(errOut);
      RememberSignal(signalId);
      g_dbgLastStatus = "EXPIRED_IGNORED";
      g_dbgLastError = errOut;
      RefreshDebugPanel();
      return false;
   }

   string symbol = "";
   bool symbolOk = ResolveSymbol(symbolRaw, symbol);
   if(!symbolOk)
   {
      if(InpStrictSymbolResolve)
      {
         errOut = "Symbol not found, ignored: " + symbolRaw;
         Print(errOut);
         RememberSignal(signalId);
         g_dbgLastStatus = "SYMBOL_IGNORED";
         g_dbgLastError = errOut;
         RefreshDebugPanel();
         return false;
      }
      symbol = _Symbol;
      Print("Symbol not found, fallback to chart symbol: ", symbolRaw, " -> ", symbol);
   }
   g_dbgLastSymbol = symbol;

   trade.SetExpertMagicNumber(InpMagic);
   trade.SetDeviationInPoints(InpDeviationPts);

   bool ok = false;
   double slUse = sl;
   double tpUse = tp;
   string stopAdjustNote = "";
   NormalizeStopsForMarket(action, symbol, slUse, tpUse, stopAdjustNote);
   if(StringLen(stopAdjustNote) > 0)
   {
      Print("Stops adjusted for ", signalId, " ", symbol, " ", action, " ", stopAdjustNote,
            " (input sl=", DoubleToString(sl, 8), ", tp=", DoubleToString(tp, 8),
            " => used sl=", DoubleToString(slUse, 8), ", tp=", DoubleToString(tpUse, 8), ")");
   }
   if(action == "BUY")
      ok = trade.Buy(volume, symbol, 0.0, 0.0, 0.0, comment);
   else if(action == "SELL")
      ok = trade.Sell(volume, symbol, 0.0, 0.0, 0.0, comment);
   else if(action == "CLOSE")
   {
      CloseBySymbol(symbol);
      ok = true;
   }
   else
   {
      errOut = "Unsupported action: " + action;
      RememberSignal(signalId);
      g_dbgLastStatus = "UNSUPPORTED_ACTION";
      g_dbgLastError = errOut;
      RefreshDebugPanel();
      return false;
   }

   if(!ok)
   {
      uint rc = trade.ResultRetcode();
      // Broker rejected stops (10016). Retry market order without SL/TP.
      if((action == "BUY" || action == "SELL") && rc == TRADE_RETCODE_INVALID_STOPS)
      {
         Print("Invalid stops for ", signalId, " -> retry without SL/TP");
         if(action == "BUY")
            ok = trade.Buy(volume, symbol, 0.0, 0.0, 0.0, comment);
         else
            ok = trade.Sell(volume, symbol, 0.0, 0.0, 0.0, comment);
      }

      if(!ok)
      {
         errOut = "retcode=" + IntegerToString((int)trade.ResultRetcode()) + " msg=" + trade.ResultRetcodeDescription();
         g_dbgLastStatus = "ORDER_FAILED";
         g_dbgLastError = errOut;
         RefreshDebugPanel();
         return false;
      }
   }

   if(action == "BUY" || action == "SELL")
   {
      string stopInfo = "";
      bool stopOk = ApplyStopsAfterOpen(action, symbol, slUse, tpUse, stopInfo);
      if(!stopOk)
      {
         Print("Post-open stops skipped/failed for ", signalId, " ", symbol, " ", action, ": ", stopInfo);
         if(StringLen(g_dbgLastError) == 0)
            g_dbgLastError = stopInfo;
      }
      else if(StringLen(stopInfo) > 0)
      {
         Print("Post-open stops for ", signalId, ": ", stopInfo);
      }
   }

   ticketOut = IntegerToString((int)trade.ResultOrder());
   RememberSignal(signalId);
    g_dbgLastStatus = "EXECUTED_OK";
    g_dbgLastError = "";
    RefreshDebugPanel();
   return true;
}

bool LoadBacktestSignals()
{
   ArrayResize(g_btTime, 0);
   ArrayResize(g_btSignalId, 0);
   ArrayResize(g_btAction, 0);
   ArrayResize(g_btSymbol, 0);
   ArrayResize(g_btNote, 0);
   ArrayResize(g_btVolume, 0);
   ArrayResize(g_btSl, 0);
   ArrayResize(g_btTp, 0);
   g_btCursor = 0;

   int h = FileOpen(InpBacktestFileCommon, FILE_READ | FILE_CSV | FILE_COMMON | FILE_ANSI, ';');
   if(h == INVALID_HANDLE)
   {
      Print("Backtest file open failed: ", InpBacktestFileCommon, " err=", GetLastError());
      return false;
   }

   if(InpBacktestHasHeader)
   {
      for(int i = 0; i < 8 && !FileIsEnding(h); ++i)
         FileReadString(h);
   }

   while(!FileIsEnding(h))
   {
      string tsRaw = FileReadString(h);
      if(FileIsEnding(h) && StringLen(tsRaw) == 0)
         break;
      string signalId = FileReadString(h);
      string action = FileReadString(h);
      string symbol = FileReadString(h);
      string volumeRaw = FileReadString(h);
      string slRaw = FileReadString(h);
      string tpRaw = FileReadString(h);
      string note = FileReadString(h);

      datetime ts = ParseSignalTime(tsRaw);
      if(ts <= 0 || StringLen(signalId) == 0 || StringLen(action) == 0)
         continue;

      int n = ArraySize(g_btTime);
      ArrayResize(g_btTime, n + 1);
      ArrayResize(g_btSignalId, n + 1);
      ArrayResize(g_btAction, n + 1);
      ArrayResize(g_btSymbol, n + 1);
      ArrayResize(g_btNote, n + 1);
      ArrayResize(g_btVolume, n + 1);
      ArrayResize(g_btSl, n + 1);
      ArrayResize(g_btTp, n + 1);

      g_btTime[n] = ts;
      g_btSignalId[n] = signalId;
      g_btAction[n] = action;
      g_btSymbol[n] = symbol;
      g_btNote[n] = note;
      g_btVolume[n] = StringToDouble(volumeRaw);
      g_btSl[n] = StringToDouble(slRaw);
      g_btTp[n] = StringToDouble(tpRaw);
   }

   FileClose(h);
   Print("Backtest signals loaded: ", ArraySize(g_btTime), " from Common/Files/", InpBacktestFileCommon);
   return ArraySize(g_btTime) > 0;
}

void ProcessBacktestQueue()
{
   if(!g_btLoaded)
   {
      g_dbgLastStatus = "BT_NOT_LOADED";
      RefreshDebugPanel();
      return;
   }

   datetime nowTs = TimeCurrent();
   while(g_btCursor < ArraySize(g_btTime) && g_btTime[g_btCursor] <= nowTs)
   {
      string ticket;
      string err;
      bool ok = ExecuteSignal(g_btSignalId[g_btCursor],
                              g_btAction[g_btCursor],
                              g_btSymbol[g_btCursor],
                              g_btNote[g_btCursor],
                              g_btVolume[g_btCursor],
                              g_btSl[g_btCursor],
                              g_btTp[g_btCursor],
                              g_btTime[g_btCursor],
                              ticket,
                              err);
      if(!ok)
         Print("Backtest signal failed id=", g_btSignalId[g_btCursor], " err=", err);
      ++g_btCursor;
   }
   RefreshDebugPanel();
}

void OnTimer()
{
   if(InpBacktestMode)
      return;

   g_dbgPollCount++;
   string url = InpServerBaseUrl + "/mt5/ea/pull?api_key=" + InpEaApiKey + "&account=" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
   string resp;
   if(!HttpGet(url, resp))
   {
      g_dbgPollPullFail++;
      g_dbgLastStatus = "HTTP_PULL_FAILED";
      g_dbgLastError = "WebRequest pull failed";
      g_dbgLastTime = TimeCurrent();
      g_dbgLastPollSummary = "poll#" + IntegerToString(g_dbgPollCount) + " PULL_FAIL";
      Print("TVBridgeEA poll summary: ", g_dbgLastPollSummary);
      RefreshDebugPanel();
      return;
   }

   if(StringFind(resp, "\"signal\":null") >= 0)
   {
      g_dbgPollNoSignal++;
      g_dbgLastStatus = "NO_SIGNAL";
      g_dbgLastError = "";
      g_dbgLastTime = TimeCurrent();
      g_dbgLastPollSummary = "poll#" + IntegerToString(g_dbgPollCount) + " NO_SIGNAL";
      Print("TVBridgeEA poll summary: ", g_dbgLastPollSummary);
      RefreshDebugPanel();
      return;
   }

   string signalId = JsonGetString(resp, "signal_id");
   string action   = JsonGetString(resp, "action");
   string symbolIn = JsonGetString(resp, "symbol");
   string comment  = JsonGetString(resp, "note");
   double volume   = JsonGetNumber(resp, "volume", 0.01);
   double sl       = JsonGetNumber(resp, "sl", 0.0);
   double tp       = JsonGetNumber(resp, "tp", 0.0);
   datetime signalTs = (datetime)JsonGetNumber(resp, "timestamp", 0.0);
   if(signalTs <= 0)
      signalTs = (datetime)JsonGetNumber(resp, "created_at_ts", 0.0);

   string ticket;
   string err;
   bool ok = ExecuteSignal(signalId, action, symbolIn, comment, volume, sl, tp, signalTs, ticket, err);
   if(ok)
   {
      g_dbgPollExecOk++;
      g_dbgLastPollSummary = "poll#" + IntegerToString(g_dbgPollCount) + " EXEC_OK id=" + signalId + " action=" + action + " ticket=" + ticket;
      Ack(signalId, "OK", ticket, "");
   }
   else
   {
      g_dbgPollExecFail++;
      g_dbgLastPollSummary = "poll#" + IntegerToString(g_dbgPollCount) + " EXEC_FAIL id=" + signalId + " action=" + action + " err=" + err;
      string ackStatus = "FAIL";
      if(StringFind(err, "Expired signal ignored:") == 0)
         ackStatus = "EXPIRED";
      Ack(signalId, ackStatus, "", err);
   }
   Print("TVBridgeEA poll summary: ", g_dbgLastPollSummary);
   RefreshDebugPanel();
}

void OnTick()
{
   if(InpBacktestMode)
      ProcessBacktestQueue();
}

int OnInit()
{
   if(InpBacktestMode)
   {
      g_btLoaded = LoadBacktestSignals();
      if(!g_btLoaded)
      {
         Print("Backtest mode enabled but no valid signals loaded.");
         return(INIT_FAILED);
      }
      Print("TVBridgeEA backtest mode initialized.");
      Print("TVBridgeEA build: ", EA_BUILD_VERSION);
      g_dbgLastStatus = "BT_READY";
      g_dbgLastTime = TimeCurrent();
      RefreshDebugPanel();
      return(INIT_SUCCEEDED);
   }

   EventSetTimer(MathMax(InpPollSeconds, 1));
   Print("TVBridgeEA initialized. Add URL to MT5 WebRequest allow-list: ", InpServerBaseUrl);
   Print("TVBridgeEA build: ", EA_BUILD_VERSION);
   g_dbgLastStatus = "LIVE_READY";
   g_dbgLastTime = TimeCurrent();
   RefreshDebugPanel();
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   if(InpShowDebugPanel)
      Comment("");
}
