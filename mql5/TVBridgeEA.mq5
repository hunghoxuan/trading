#property strict
#property description "TradingView -> MT5 pull bridge EA"

#include <Trade/Trade.mqh>

input string InpServerBaseUrl = "https://trade.mozasolution.com/webhook";
input string InpEaApiKey      = "";
input int    InpPollSeconds   = 2;
input string InpSymbolSuffix  = "";   // Example: ".m" or "-pro"
input long   InpMagic         = 20260411;
input int    InpDeviationPts  = 20;
input int    InpStopBufferPts = 50;   // Extra safety distance (points) on top of broker min stop distance.
input bool   InpUseMarginPercentSizing = false; // Set false to prioritize Risk USD / Stop Loss gap distance over strict arbitrary broker Margin caps.
input double InpMarginPercentOfBalance = 100.0; // Margin budget as % of ACCOUNT_BALANCE.
input double InpMarginSafetyPercent    = 98.0; // Also cap by this % of current free margin to avoid broker margin-outs.
input bool   InpUseRiskPercentSizing = true; // true: lots = risk% of balance / SL distance.
input double InpRiskPercentOfBalance = 1.0; // 1.0 = risk 1% of ACCOUNT_BALANCE per trade.
input double InpFallbackFixedLot = 0.01; // Used when risk sizing cannot be calculated.
input bool   InpHardFailOnMarginPrecheck = false; // true: stop immediately on margin precheck fail; false: still try broker with min lot once.
input int    InpStopRetrySeconds = 5; // Retry interval for attaching SL/TP after order open.
input int    InpStopRetryMaxAttempts = 24; // Max retry attempts (24 * 5s = 2 minutes by default).
input bool   InpEnableVirtualGuard = true; // Track and close positions by virtual SL/TP rules.
input int    InpVirtualFallbackSLPts = 300; // If SL missing, use this fallback distance in points.
input double InpVirtualFallbackRR = 1.5; // If TP missing, TP = entry +/- risk * RR.
input double InpVirtualMinRR = 1.0; // Enforce minimum RR by extending TP if needed.
input double InpVirtualBreakEvenR = 1.0; // Move virtual SL to entry at this R multiple.
input double InpVirtualTrailStartR = 1.5; // Start trailing after this R multiple.
input double InpVirtualTrailGivebackR = 0.7; // Keep this much R as giveback while trailing.
input int    InpVirtualMaxHoldMinutes = 0; // 0=disable time stop, else close after minutes.
input bool   InpStrictSymbolResolve = true;   // Ignore signal if symbol cannot be resolved.
input bool   InpEnableDuplicateGate = true;   // Ignore duplicated signal_id.
input int    InpDedupKeepSeconds    = 86400;  // Keep processed signal_id cache for this many seconds.
input int    InpMaxSignalAgeSeconds = 7200;   // 0 = disable. Ignore signal if too old.
input bool   InpBacktestMode        = false;  // Replay signals from file in Strategy Tester.
input string InpBacktestFileCommon  = "tvbridge_signals.csv"; // Common/Files CSV.
input bool   InpBacktestHasHeader   = true;
input bool   InpShowDebugPanel      = true;   // Show EA state on chart via Comment().
input bool   InpEnableTradeEventAck = true; // Send START/TP/SL updates from trade transactions.

// Bump this on every code update so running build is obvious on chart/logs.
string EA_BUILD_VERSION = "2026-04-19.1157";

input string InpMappingFile = "TVBridge_Mappings.csv";

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

// Ack debug context for current signal execution.
string   g_ackAction = "";
string   g_ackSymbol = "";
string   g_ackVolumeNote = "";
string   g_ackStopNote = "";
double   g_ackReqVolume = 0.0;
double   g_ackUsedVolume = 0.0;
double   g_ackReqSl = 0.0;
double   g_ackReqTp = 0.0;
double   g_ackUsedSl = 0.0;
double   g_ackUsedTp = 0.0;
double   g_ackEntryExec = 0.0;
double   g_ackMarginReq = 0.0;
double   g_ackMarginBudget = 0.0;
double   g_ackFreeMargin = 0.0;
double   g_ackBalance = 0.0;
double   g_ackEquity = 0.0;
double   g_ackPnlRealized = 0.0;
bool     g_ackHasPnlRealized = false;
datetime g_ackSignalTs = 0;
datetime g_ackExecTs = 0;
int      g_ackRetcode = 0;
string   g_ackRetmsg = "";
// Broker execution telemetry (pips/lots/usd)
double   g_ackPipsPerPoint = 0.0;   // pip multiplier vs point (10 for 5-digit, 1 for 3-digit JPY)
double   g_ackPipValuePerLot = 0.0; // USD value of 1 pip on 1 standard lot for this symbol
double   g_ackSlPips = 0.0;         // SL distance in pips
double   g_ackTpPips = 0.0;         // TP distance in pips
double   g_ackRiskMoneyActual = 0.0;    // lots * pip_value * sl_pips (actual risk $)
double   g_ackRewardMoneyPlanned = 0.0; // lots * pip_value * tp_pips (planned reward $)

string   g_stopRetrySignalId[];
ulong    g_stopRetryTicket[];
string   g_stopRetryAction[];
string   g_stopRetrySymbol[];
double   g_stopRetrySl[];
double   g_stopRetryTp[];
int      g_stopRetryAttempts[];
datetime g_stopRetryLastTry[];
datetime g_stopRetryFirstSeen[];

ulong    g_vgTicket[];
string   g_vgSignalId[];
string   g_vgSymbol[];
int      g_vgSide[];         // +1 BUY, -1 SELL
double   g_vgEntry[];
double   g_vgSl[];
double   g_vgTp[];
double   g_vgRisk[];
datetime g_vgOpenedAt[];

ulong    g_posMapTicket[];
string   g_posMapSignalId[];
bool     g_posMapOpenedAckSent[];

ulong    g_ordMapTicket[];
string   g_ordMapSignalId[];
datetime g_syncLastTime = 0;

string   g_lastPullPayload = "None";
string   g_lastSyncPayload = "None";
datetime g_lastPullUpdate = 0;
datetime g_lastSyncUpdate = 0;
string   g_lastPullSummary = "INIT";
string   g_lastSyncSummary = "INIT";
int      g_lastPullCode = 0;
int      g_lastSyncCode = 0;
int      g_lastHttpCode = 0;
string   g_lastHttpError = "";
string   g_lastHttpUrl = "";
string   g_lastHttpMethod = "";

string   g_leaseTokenMapSignalId[];
string   g_leaseTokenMapValue[];
string   g_tradeIdMapSignalId[];
string   g_tradeIdMapValue[];

// Reliable Ack Queue
string   g_ackQSignalId[];
string   g_ackQStatus[];
string   g_ackQTicket[];
string   g_ackQError[];
string   g_ackQBody[];
int      g_ackQRetryCount[];

struct SVpsSyncSignal
{
   string signal_id;
   string status;
   string symbol;
   string action;
   string ticket;
   double volume;
   double sl;
   double tp;
   double pnl;
};

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

string JsonExtractFirstArrayObject(const string json, const string key)
{
   string needle = "\"" + key + "\":[";
   int arrStart = StringFind(json, needle);
   if(arrStart < 0) return "";
   int i = arrStart + StringLen(needle);
   int n = StringLen(json);

   while(i < n)
   {
      int ch = StringGetCharacter(json, i);
      if(ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n')
      {
         i++;
         continue;
      }
      break;
   }
   if(i >= n) return "";
   if(StringGetCharacter(json, i) != '{') return "";

   int objStart = i;
   int depth = 0;
   bool inString = false;
   bool escaped = false;
   for(; i < n; i++)
   {
      int ch = StringGetCharacter(json, i);
      if(inString)
      {
         if(escaped) escaped = false;
         else if(ch == '\\') escaped = true;
         else if(ch == '"') inString = false;
         continue;
      }
      if(ch == '"')
      {
         inString = true;
         continue;
      }
      if(ch == '{')
      {
         depth++;
         continue;
      }
      if(ch == '}')
      {
         depth--;
         if(depth == 0)
            return StringSubstr(json, objStart, i - objStart + 1);
      }
   }
   return "";
}

string BuildApiUrl(const string path)
{
   string base = InpServerBaseUrl;
   while(StringLen(base) > 0 && StringGetCharacter(base, StringLen(base) - 1) == '/')
      base = StringSubstr(base, 0, StringLen(base) - 1);

   string rel = path;
   if(StringLen(rel) == 0)
      rel = "/";
   if(StringGetCharacter(rel, 0) != '/')
      rel = "/" + rel;

   return base + rel;
}

string SanitizeOneLine(const string raw, const int maxLen = 140)
{
   string out = "";
   int n = StringLen(raw);
   for(int i = 0; i < n; ++i)
   {
      int ch = StringGetCharacter(raw, i);
      if(ch == '\r' || ch == '\n' || ch == '\t')
         out += " ";
      else
         out += StringSubstr(raw, i, 1);
      if(StringLen(out) >= maxLen)
         break;
   }
   StringTrimLeft(out);
   StringTrimRight(out);
   if(StringLen(raw) > StringLen(out))
      out += "...";
   return out;
}

string ExtractApiError(const string body)
{
   string msg = JsonGetString(body, "error");
   if(msg != "")
      return msg;
   msg = JsonGetString(body, "message");
   if(msg != "")
      return msg;
   return SanitizeOneLine(body, 120);
}

string ApiKeyMask()
{
   string k = InpEaApiKey;
   StringTrimLeft(k);
   StringTrimRight(k);
   int n = StringLen(k);
   if(n <= 0) return "(empty)";
   string prefix = n >= 4 ? StringSubstr(k, 0, 4) : k;
   string last4 = n >= 4 ? StringSubstr(k, n - 4, 4) : k;
   return prefix + "***" + last4;
}

string ApiKeyHint()
{
   string k = InpEaApiKey;
   StringTrimLeft(k);
   StringTrimRight(k);
   if(StringLen(k) == 0)
      return "MISSING";
   if(StringFind(k, "acc_") != 0)
      return "INVALID_PREFIX";
   return "OK";
}

int CountOccurrences(const string haystack, const string needle)
{
   int cnt = 0;
   int at = 0;
   int step = StringLen(needle);
   if(step <= 0) return 0;
   while(true)
   {
      int p = StringFind(haystack, needle, at);
      if(p < 0) break;
      cnt++;
      at = p + step;
   }
   return cnt;
}

bool HttpGet(const string url, string &response)
{
   char post[];
   ArrayResize(post, 0);
   char result[];
   string headers = "";
   if(StringLen(InpEaApiKey) > 0)
      headers = "x-api-key: " + InpEaApiKey + "\r\n";
   g_lastHttpMethod = "GET";
   g_lastHttpUrl = url;
   g_lastHttpCode = 0;
   g_lastHttpError = "";
   ResetLastError();
   int code = WebRequest("GET", url, headers, 5000, post, result, headers);
   if(code == -1)
   {
      int err = GetLastError();
      g_lastHttpCode = -1;
      g_lastHttpError = "webrequest_error=" + IntegerToString(err);
      Print("WebRequest GET failed: ", err, " url=", url);
      return false;
   }
   g_lastHttpCode = code;
   response = CharArrayToString(result);
   if(code < 200 || code >= 300)
   {
      g_lastHttpError = ExtractApiError(response);
      Print("GET non-2xx code=", code, " err=", g_lastHttpError, " url=", url);
      return false;
   }
   return true;
}

bool HttpPostJson(const string url, const string body)
{
   string dummy;
   return HttpPostJsonWithResponse(url, body, dummy);
}

bool HttpPostJsonWithResponse(const string url, const string body, string &response)
{
   char data[];
   StringToCharArray(body, data, 0, StringLen(body), CP_UTF8);
   char result[];
   string headers = "Content-Type: application/json\r\n";
   if(StringLen(InpEaApiKey) > 0)
      headers += "x-api-key: " + InpEaApiKey + "\r\n";
   g_lastHttpMethod = "POST";
   g_lastHttpUrl = url;
   g_lastHttpCode = 0;
   g_lastHttpError = "";
   ResetLastError();
   int code = WebRequest("POST", url, headers, 5000, data, result, headers);
   if(code == -1)
   {
      int err = GetLastError();
      g_lastHttpCode = -1;
      g_lastHttpError = "webrequest_error=" + IntegerToString(err);
      response = "Error=" + IntegerToString(err);
      return false;
   }
   g_lastHttpCode = code;
   response = CharArrayToString(result);
   if(code < 200 || code >= 300)
      g_lastHttpError = ExtractApiError(response);
   return (code >= 200 && code < 300);
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

void RemoveStopRetryAt(const int idx)
{
   int n = ArraySize(g_stopRetrySignalId);
   if(idx < 0 || idx >= n)
      return;
   for(int i = idx; i < n - 1; ++i)
   {
      g_stopRetrySignalId[i] = g_stopRetrySignalId[i + 1];
      g_stopRetryTicket[i] = g_stopRetryTicket[i + 1];
      g_stopRetryAction[i] = g_stopRetryAction[i + 1];
      g_stopRetrySymbol[i] = g_stopRetrySymbol[i + 1];
      g_stopRetrySl[i] = g_stopRetrySl[i + 1];
      g_stopRetryTp[i] = g_stopRetryTp[i + 1];
      g_stopRetryAttempts[i] = g_stopRetryAttempts[i + 1];
      g_stopRetryLastTry[i] = g_stopRetryLastTry[i + 1];
      g_stopRetryFirstSeen[i] = g_stopRetryFirstSeen[i + 1];
   }
   ArrayResize(g_stopRetrySignalId, n - 1);
   ArrayResize(g_stopRetryTicket, n - 1);
   ArrayResize(g_stopRetryAction, n - 1);
   ArrayResize(g_stopRetrySymbol, n - 1);
   ArrayResize(g_stopRetrySl, n - 1);
   ArrayResize(g_stopRetryTp, n - 1);
   ArrayResize(g_stopRetryAttempts, n - 1);
   ArrayResize(g_stopRetryLastTry, n - 1);
   ArrayResize(g_stopRetryFirstSeen, n - 1);
}

void EnqueueStopRetry(const string signalId,
                      const ulong ticket,
                      const string action,
                      const string symbol,
                      const double sl,
                      const double tp)
{
   if((sl <= 0.0 && tp <= 0.0) || StringLen(symbol) == 0)
      return;

   int n = ArraySize(g_stopRetrySignalId);
   for(int i = 0; i < n; ++i)
   {
      if(g_stopRetrySignalId[i] == signalId)
      {
         g_stopRetryTicket[i] = ticket;
         g_stopRetryAction[i] = action;
         g_stopRetrySymbol[i] = symbol;
         g_stopRetrySl[i] = sl;
         g_stopRetryTp[i] = tp;
         return;
      }
   }

   ArrayResize(g_stopRetrySignalId, n + 1);
   ArrayResize(g_stopRetryTicket, n + 1);
   ArrayResize(g_stopRetryAction, n + 1);
   ArrayResize(g_stopRetrySymbol, n + 1);
   ArrayResize(g_stopRetrySl, n + 1);
   ArrayResize(g_stopRetryTp, n + 1);
   ArrayResize(g_stopRetryAttempts, n + 1);
   ArrayResize(g_stopRetryLastTry, n + 1);
   ArrayResize(g_stopRetryFirstSeen, n + 1);

   g_stopRetrySignalId[n] = signalId;
   g_stopRetryTicket[n] = ticket;
   g_stopRetryAction[n] = action;
   g_stopRetrySymbol[n] = symbol;
   g_stopRetrySl[n] = sl;
   g_stopRetryTp[n] = tp;
   g_stopRetryAttempts[n] = 0;
   g_stopRetryLastTry[n] = 0;
   g_stopRetryFirstSeen[n] = TimeCurrent();
}

void ProcessStopRetryQueue()
{
   int n = ArraySize(g_stopRetrySignalId);
   if(n <= 0)
      return;

   datetime nowTs = TimeCurrent();
   int retryEvery = MathMax(1, InpStopRetrySeconds);
   int maxAttempts = MathMax(1, InpStopRetryMaxAttempts);

   for(int i = n - 1; i >= 0; --i)
   {
      if(g_stopRetryAttempts[i] >= maxAttempts)
      {
         Print("Stop retry max attempts reached id=", g_stopRetrySignalId[i],
               " symbol=", g_stopRetrySymbol[i],
               " attempts=", g_stopRetryAttempts[i]);
         RemoveStopRetryAt(i);
         continue;
      }

      if(g_stopRetryLastTry[i] > 0 && (nowTs - g_stopRetryLastTry[i]) < retryEvery)
         continue;

      string info = "";
      bool ok = ApplyStopsAfterOpen(g_stopRetryTicket[i],
                                    g_stopRetryAction[i],
                                    g_stopRetrySymbol[i],
                                    g_stopRetrySl[i],
                                    g_stopRetryTp[i],
                                    info);
      g_stopRetryAttempts[i]++;
      g_stopRetryLastTry[i] = nowTs;

      if(ok)
      {
         Print("Stop retry success id=", g_stopRetrySignalId[i],
               " symbol=", g_stopRetrySymbol[i],
               " attempts=", g_stopRetryAttempts[i],
               " info=", info);
         RemoveStopRetryAt(i);
         continue;
      }

      Print("Stop retry pending id=", g_stopRetrySignalId[i],
            " ticket=", IntegerToString((int)g_stopRetryTicket[i]),
            " symbol=", g_stopRetrySymbol[i],
            " attempt=", g_stopRetryAttempts[i], "/", maxAttempts,
            " info=", info);
   }
}

bool FindLatestPositionTicket(const string symbol, const long magic, ulong &ticketOut)
{
   ticketOut = 0;
   datetime bestTime = 0;
   for(int i = PositionsTotal() - 1; i >= 0; --i)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != symbol)
         continue;
      if(PositionGetInteger(POSITION_MAGIC) != magic)
         continue;
      datetime t = (datetime)PositionGetInteger(POSITION_TIME);
      if(ticketOut == 0 || t >= bestTime)
      {
         ticketOut = ticket;
         bestTime = t;
      }
   }
   return ticketOut != 0;
}

string PositionSideText(const ENUM_POSITION_TYPE pt)
{
   if(pt == POSITION_TYPE_BUY)  return "BUY";
   if(pt == POSITION_TYPE_SELL) return "SELL";
   return "?";
}

string PositionTimeText(const datetime t)
{
   if(t <= 0) return "-";
   return TimeToString(t, TIME_DATE | TIME_MINUTES);
}

double PositionRR(const double entry, const double sl, const double tp)
{
   if(sl <= 0.0 || tp <= 0.0 || entry <= 0.0)
      return 0.0;
   double risk = MathAbs(entry - sl);
   if(risk <= 0.0)
      return 0.0;
   double reward = MathAbs(tp - entry);
  return reward / risk;
}

int FindVirtualGuardIndexByTicket(const ulong ticket)
{
   for(int i = 0; i < ArraySize(g_vgTicket); ++i)
   {
      if(g_vgTicket[i] == ticket)
         return i;
   }
   return -1;
}

void RemoveVirtualGuardAt(const int idx)
{
   int n = ArraySize(g_vgTicket);
   if(idx < 0 || idx >= n)
      return;
   for(int i = idx; i < n - 1; ++i)
   {
      g_vgTicket[i] = g_vgTicket[i + 1];
      g_vgSignalId[i] = g_vgSignalId[i + 1];
      g_vgSymbol[i] = g_vgSymbol[i + 1];
      g_vgSide[i] = g_vgSide[i + 1];
      g_vgEntry[i] = g_vgEntry[i + 1];
      g_vgSl[i] = g_vgSl[i + 1];
      g_vgTp[i] = g_vgTp[i + 1];
      g_vgRisk[i] = g_vgRisk[i + 1];
      g_vgOpenedAt[i] = g_vgOpenedAt[i + 1];
   }
   ArrayResize(g_vgTicket, n - 1);
   ArrayResize(g_vgSignalId, n - 1);
   ArrayResize(g_vgSymbol, n - 1);
   ArrayResize(g_vgSide, n - 1);
   ArrayResize(g_vgEntry, n - 1);
   ArrayResize(g_vgSl, n - 1);
   ArrayResize(g_vgTp, n - 1);
   ArrayResize(g_vgRisk, n - 1);
   ArrayResize(g_vgOpenedAt, n - 1);
}

bool BuildVirtualLevels(const string action,
                        const string symbol,
                        const double entry,
                        double slIn,
                        double tpIn,
                        double &slOut,
                        double &tpOut,
                        double &riskOut)
{
   slOut = slIn;
   tpOut = tpIn;
   riskOut = 0.0;

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   if(digits < 0) digits = 5;
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   if(point <= 0.0) point = 0.00001;

   int fallbackPts = MathMax(10, InpVirtualFallbackSLPts);
   double minRR = MathMax(0.1, InpVirtualMinRR);
   double fallbackRR = MathMax(0.2, InpVirtualFallbackRR);

   if(action == "BUY")
   {
      if(slOut <= 0.0 || slOut >= entry)
         slOut = entry - fallbackPts * point;
      riskOut = entry - slOut;
      if(riskOut <= 0.0)
         return false;
      if(tpOut <= 0.0 || tpOut <= entry)
         tpOut = entry + riskOut * fallbackRR;
      double rrNow = (tpOut - entry) / riskOut;
      if(rrNow < minRR)
         tpOut = entry + riskOut * minRR;
   }
   else if(action == "SELL")
   {
      if(slOut <= 0.0 || slOut <= entry)
         slOut = entry + fallbackPts * point;
      riskOut = slOut - entry;
      if(riskOut <= 0.0)
         return false;
      if(tpOut <= 0.0 || tpOut >= entry)
         tpOut = entry - riskOut * fallbackRR;
      double rrNow = (entry - tpOut) / riskOut;
      if(rrNow < minRR)
         tpOut = entry - riskOut * minRR;
   }
   else
   {
      return false;
   }

   slOut = NormalizeDouble(slOut, digits);
   tpOut = NormalizeDouble(tpOut, digits);
   return true;
}

void RegisterVirtualGuard(const string signalId,
                          const ulong ticket,
                          const string action,
                          const string symbol,
                          const double slCandidate,
                          const double tpCandidate)
{
   if(!InpEnableVirtualGuard || ticket == 0 || StringLen(symbol) == 0)
      return;
   if(!PositionSelectByTicket(ticket))
      return;

   double entry = PositionGetDouble(POSITION_PRICE_OPEN);
   datetime openedAt = (datetime)PositionGetInteger(POSITION_TIME);
   int side = action == "BUY" ? 1 : (action == "SELL" ? -1 : 0);
   if(side == 0)
      return;

   double vSl = 0.0, vTp = 0.0, risk = 0.0;
   if(!BuildVirtualLevels(action, symbol, entry, slCandidate, tpCandidate, vSl, vTp, risk))
      return;

   int idx = FindVirtualGuardIndexByTicket(ticket);
   if(idx < 0)
   {
      int n = ArraySize(g_vgTicket);
      ArrayResize(g_vgTicket, n + 1);
      ArrayResize(g_vgSignalId, n + 1);
      ArrayResize(g_vgSymbol, n + 1);
      ArrayResize(g_vgSide, n + 1);
      ArrayResize(g_vgEntry, n + 1);
      ArrayResize(g_vgSl, n + 1);
      ArrayResize(g_vgTp, n + 1);
      ArrayResize(g_vgRisk, n + 1);
      ArrayResize(g_vgOpenedAt, n + 1);
      idx = n;
   }

   g_vgTicket[idx] = ticket;
   g_vgSignalId[idx] = signalId;
   g_vgSymbol[idx] = symbol;
   g_vgSide[idx] = side;
   g_vgEntry[idx] = entry;
   g_vgSl[idx] = vSl;
   g_vgTp[idx] = vTp;
   g_vgRisk[idx] = risk;
   g_vgOpenedAt[idx] = openedAt;
}

void ProcessVirtualGuards()
{
   if(!InpEnableVirtualGuard || ArraySize(g_vgTicket) == 0)
      return;

   double beR = MathMax(0.2, InpVirtualBreakEvenR);
   double trailStartR = MathMax(beR, InpVirtualTrailStartR);
   double givebackR = MathMax(0.0, InpVirtualTrailGivebackR);
   int maxHoldMin = MathMax(0, InpVirtualMaxHoldMinutes);
   datetime nowTs = TimeCurrent();

   for(int i = ArraySize(g_vgTicket) - 1; i >= 0; --i)
   {
      ulong ticket = g_vgTicket[i];
      if(!PositionSelectByTicket(ticket))
      {
         RemoveVirtualGuardAt(i);
         continue;
      }

      string symbol = g_vgSymbol[i];
      int side = g_vgSide[i];
      double entry = g_vgEntry[i];
      double risk = g_vgRisk[i];
      if(risk <= 0.0 || side == 0)
      {
         RemoveVirtualGuardAt(i);
         continue;
      }

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
         continue;

      double px = side > 0 ? bid : ask;
      double profitR = side > 0 ? (px - entry) / risk : (entry - px) / risk;

      // Break-even
      if(profitR >= beR)
      {
         if(side > 0 && g_vgSl[i] < entry)
            g_vgSl[i] = entry;
         if(side < 0 && g_vgSl[i] > entry)
            g_vgSl[i] = entry;
      }

      // Trailing by R giveback.
      if(profitR >= trailStartR)
      {
         double lockR = MathMax(0.0, profitR - givebackR);
         if(side > 0)
         {
            double nextSl = entry + lockR * risk;
            if(nextSl > g_vgSl[i])
               g_vgSl[i] = nextSl;
         }
         else
         {
            double nextSl = entry - lockR * risk;
            if(nextSl < g_vgSl[i])
               g_vgSl[i] = nextSl;
         }
      }

      bool hitSl = (side > 0) ? (px <= g_vgSl[i]) : (px >= g_vgSl[i]);
      bool hitTp = false;
      if(g_vgTp[i] > 0.0)
         hitTp = (side > 0) ? (px >= g_vgTp[i]) : (px <= g_vgTp[i]);

      bool timeUp = false;
      if(maxHoldMin > 0 && g_vgOpenedAt[i] > 0)
         timeUp = ((nowTs - g_vgOpenedAt[i]) >= (maxHoldMin * 60));

      if(!(hitSl || hitTp || timeUp))
         continue;

      string reason = hitSl ? "virtual_sl" : (hitTp ? "virtual_tp" : "virtual_timeout");
      bool closed = trade.PositionClose(ticket);
      if(closed)
      {
         Print("Virtual guard close success id=", g_vgSignalId[i],
               " ticket=", IntegerToString((int)ticket),
               " symbol=", symbol,
               " reason=", reason,
               " px=", DoubleToString(px, (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS)));
         string vgStatus = hitSl ? "SL" : (hitTp ? "TP" : "CANCEL");
         g_ackSymbol = symbol;
         g_ackAction = side > 0 ? "BUY" : "SELL";
         g_ackHasPnlRealized = false;
         g_ackPnlRealized = 0.0;
         Ack(g_vgSignalId[i], vgStatus, IntegerToString((int)ticket), reason);
         int pIdx = FindPositionMapIndex(ticket);
         if(pIdx >= 0)
            RemovePositionMapAt(pIdx);
         RemoveVirtualGuardAt(i);
      }
      else
      {
         Print("Virtual guard close failed id=", g_vgSignalId[i],
               " ticket=", IntegerToString((int)ticket),
               " symbol=", symbol,
               " reason=", reason,
               " retcode=", IntegerToString((int)trade.ResultRetcode()),
               " msg=", trade.ResultRetcodeDescription());
      }
   }
}

int FindPositionMapIndex(const ulong ticket)
{
   for(int i = 0; i < ArraySize(g_posMapTicket); ++i)
      if(g_posMapTicket[i] == ticket)
         return i;
   return -1;
}

void MapPositionSignal(const ulong ticket, const string signalId)
{
   if(ticket == 0 || StringLen(signalId) == 0)
      return;
   int idx = FindPositionMapIndex(ticket);
   if(idx < 0)
   {
      int n = ArraySize(g_posMapTicket);
      ArrayResize(g_posMapTicket, n + 1);
      ArrayResize(g_posMapSignalId, n + 1);
      ArrayResize(g_posMapOpenedAckSent, n + 1);
      idx = n;
   }
   g_posMapTicket[idx] = ticket;
   g_posMapSignalId[idx] = signalId;
   SaveMappings();
}

void SaveMappings()
{
   int h = FileOpen(InpMappingFile, FILE_WRITE|FILE_CSV|FILE_ANSI);
   if(h == INVALID_HANDLE) return;
   
   FileWrite(h, "TYPE", "TICKET", "SIGNAL_ID", "ACK_SENT");
   
   for(int i=0; i<ArraySize(g_posMapTicket); i++)
      FileWrite(h, "POS", IntegerToString(g_posMapTicket[i]), g_posMapSignalId[i], (g_posMapOpenedAckSent[i]?"1":"0"));
      
   for(int i=0; i<ArraySize(g_ordMapTicket); i++)
      FileWrite(h, "ORD", IntegerToString(g_ordMapTicket[i]), g_ordMapSignalId[i], "0");
      
   FileClose(h);
}

void LoadMappings()
{
   int h = FileOpen(InpMappingFile, FILE_READ|FILE_CSV|FILE_ANSI);
   if(h == INVALID_HANDLE) return;
   
   if(!FileIsEnding(h)) FileReadString(h); // Header
   if(!FileIsEnding(h)) FileReadString(h);
   if(!FileIsEnding(h)) FileReadString(h);
   if(!FileIsEnding(h)) FileReadString(h);
   
   ArrayResize(g_posMapTicket, 0);
   ArrayResize(g_posMapSignalId, 0);
   ArrayResize(g_posMapOpenedAckSent, 0);
   ArrayResize(g_ordMapTicket, 0);
   ArrayResize(g_ordMapSignalId, 0);
   
   while(!FileIsEnding(h))
   {
      string type = FileReadString(h);
      if(StringLen(type) == 0) break;
      string ticketStr = FileReadString(h);
      string signalId = FileReadString(h);
      string ackSentStr = FileReadString(h);
      
      if(type == "POS")
      {
         int n = ArraySize(g_posMapTicket);
         ArrayResize(g_posMapTicket, n+1);
         ArrayResize(g_posMapSignalId, n+1);
         ArrayResize(g_posMapOpenedAckSent, n+1);
         g_posMapTicket[n] = (ulong)StringToInteger(ticketStr);
         g_posMapSignalId[n] = signalId;
         g_posMapOpenedAckSent[n] = (ackSentStr == "1");
      }
      else if(type == "ORD")
      {
         int n = ArraySize(g_ordMapTicket);
         ArrayResize(g_ordMapTicket, n+1);
         ArrayResize(g_ordMapSignalId, n+1);
         g_ordMapTicket[n] = (ulong)StringToInteger(ticketStr);
         g_ordMapSignalId[n] = signalId;
      }
   }
   FileClose(h);
   Print("Loaded mappings: Positions=", ArraySize(g_posMapTicket), " Orders=", ArraySize(g_ordMapTicket));
}

bool GetSignalIdByPositionTicket(const ulong ticket, string &signalIdOut, int &idxOut)
{
   signalIdOut = "";
   idxOut = -1;
   if(ticket == 0)
      return false;
   int idx = FindPositionMapIndex(ticket);
   if(idx < 0)
      return false;
   signalIdOut = g_posMapSignalId[idx];
   idxOut = idx;
   return StringLen(signalIdOut) > 0;
}

void RemovePositionMapAt(const int idx)
{
   int n = ArraySize(g_posMapTicket);
   if(idx < 0 || idx >= n)
      return;
   for(int i = idx; i < n - 1; ++i)
   {
      g_posMapTicket[i] = g_posMapTicket[i + 1];
      g_posMapSignalId[i] = g_posMapSignalId[i + 1];
      g_posMapOpenedAckSent[i] = g_posMapOpenedAckSent[i + 1];
   }
   ArrayResize(g_posMapTicket, n - 1);
   ArrayResize(g_posMapSignalId, n - 1);
   ArrayResize(g_posMapOpenedAckSent, n - 1);
   SaveMappings();
}

int FindOrderMapIndex(const ulong ticket)
{
   for(int i = 0; i < ArraySize(g_ordMapTicket); ++i)
      if(g_ordMapTicket[i] == ticket)
         return i;
   return -1;
}

void MapOrderSignal(const ulong ticket, const string signalId)
{
   if(ticket == 0 || StringLen(signalId) == 0)
      return;
   int idx = FindOrderMapIndex(ticket);
   if(idx < 0)
   {
      int n = ArraySize(g_ordMapTicket);
      ArrayResize(g_ordMapTicket, n + 1);
      ArrayResize(g_ordMapSignalId, n + 1);
      idx = n;
   }
   g_ordMapTicket[idx] = ticket;
   g_ordMapSignalId[idx] = signalId;
   SaveMappings();
}

bool GetSignalIdByOrderTicket(const ulong ticket, string &signalIdOut, int &idxOut)
{
   signalIdOut = "";
   idxOut = -1;
   if(ticket == 0)
      return false;
   int idx = FindOrderMapIndex(ticket);
   if(idx < 0)
      return false;
   signalIdOut = g_ordMapSignalId[idx];
   idxOut = idx;
   return StringLen(signalIdOut) > 0;
}

void RemoveOrderMapAt(const int idx)
{
   int n = ArraySize(g_ordMapTicket);
   if(idx < 0 || idx >= n)
      return;
   for(int i = idx; i < n - 1; ++i)
   {
      g_ordMapTicket[i] = g_ordMapTicket[i + 1];
      g_ordMapSignalId[i] = g_ordMapSignalId[i + 1];
   }
   ArrayResize(g_ordMapTicket, n - 1);
   ArrayResize(g_ordMapSignalId, n - 1);
   SaveMappings();
}

string NormalizeOrderType(const string orderTypeRaw)
{
   string t = orderTypeRaw;
   StringToLower(t);
   if(t == "market" || t == "limit" || t == "stop")
      return t;
   return "limit";
}

string ResolvePendingKind(const string action, const string orderType, const double entry, const double ask, const double bid)
{
   double eps = MathMax(0.00000001, MathAbs(entry) * 0.0000001);

   // Normalize pending kind by side + entry/current relation to avoid broker "invalid price".
   // BUY: entry below ask => LIMIT, otherwise STOP.
   // SELL: entry above bid => LIMIT, otherwise STOP.
   if(action == "BUY")
      return (entry <= (ask - eps) ? "limit" : "stop");
   if(action == "SELL")
      return (entry >= (bid + eps) ? "limit" : "stop");
   return "limit";
}

void CleanupVirtualGuardByTicket(const ulong ticket)
{
   int idx = FindVirtualGuardIndexByTicket(ticket);
   if(idx >= 0)
      RemoveVirtualGuardAt(idx);
}

string BuildPositionsTable(const int maxRows = 8)
{
   int total = PositionsTotal();
   string out = "Open Positions\n";
   out += "Sym      Side  Entry      TP         SL         RR   Time\n";

   int shown = 0;
   int matched = 0;
   for(int i = total - 1; i >= 0; --i)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      long magic = PositionGetInteger(POSITION_MAGIC);
      if(magic != InpMagic)
         continue;
      matched++;

      string sym = PositionGetString(POSITION_SYMBOL);
      ENUM_POSITION_TYPE ptype = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      string side = PositionSideText(ptype);

      double entry = PositionGetDouble(POSITION_PRICE_OPEN);
      double tp = PositionGetDouble(POSITION_TP);
      double sl = PositionGetDouble(POSITION_SL);
      datetime ptm = (datetime)PositionGetInteger(POSITION_TIME);
      int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
      if(digits < 0) digits = 5;

      string entryTxt = entry > 0.0 ? DoubleToString(entry, digits) : "-";
      string tpTxt = tp > 0.0 ? DoubleToString(tp, digits) : "-";
      string slTxt = sl > 0.0 ? DoubleToString(sl, digits) : "-";
      double rr = PositionRR(entry, sl, tp);
      string rrTxt = rr > 0.0 ? DoubleToString(rr, 2) : "-";
      string timeTxt = PositionTimeText(ptm);

      out += StringFormat("%-8s %-5s %-10s %-10s %-10s %-4s %s\n",
                          sym, side, entryTxt, tpTxt, slTxt, rrTxt, timeTxt);
      shown++;
      if(shown >= maxRows)
         break;
   }

   if(shown == 0)
      out += "- (no positions for this EA magic)\n";
   else if(matched > shown)
      out += StringFormat("... showing %d rows\n", shown);

   return out;
}

void RefreshDebugPanel()
{
   if(!InpShowDebugPanel)
      return;

   string mode = InpBacktestMode ? "BACKTEST" : "LIVE";
   string stPull = g_lastPullUpdate > 0 ? (" [" + TimeToString(g_lastPullUpdate, TIME_SECONDS) + "]") : "";
   string stSync = g_lastSyncUpdate > 0 ? (" [" + TimeToString(g_lastSyncUpdate, TIME_SECONDS) + "]") : "";
   string authHint = ApiKeyHint();
   int ackQ = ArraySize(g_ackQSignalId);
   int stopQ = ArraySize(g_stopRetrySignalId);
   int posCnt = PositionsTotal();
   int ordCnt = OrdersTotal();
   string text =
      "TVBridgeEA | Build " + EA_BUILD_VERSION + " (" + mode + ")\n" +
      "--------------------------------------------------\n" +
      "Account=" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + "  Poll=" + IntegerToString(InpPollSeconds) + "s\n" +
      "API Key=" + ApiKeyMask() + "  AuthHint=" + authHint + "\n" +
      "PULL" + stPull + " code=" + IntegerToString(g_lastPullCode) + " :: " + g_lastPullSummary + "\n" +
      "SYNC" + stSync + " code=" + IntegerToString(g_lastSyncCode) + " :: " + g_lastSyncSummary + "\n" +
      "LAST SIGNAL: " + g_dbgLastStatus + " | " + g_dbgLastAction + " " + g_dbgLastSymbol + " | id=" + g_dbgLastSignalId + "\n" +
      "Queues: ack=" + IntegerToString(ackQ) + " stopRetry=" + IntegerToString(stopQ) + " | Terminal: pos=" + IntegerToString(posCnt) + " ord=" + IntegerToString(ordCnt);
   if(authHint != "OK")
      text += "\nHint: rotate account API key in UI, then paste latest acc_... into InpEaApiKey.";
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
   // Server timestamps are unix/UTC based; compare against UTC clock to avoid broker-server TZ offset.
   return (TimeGMT() - signalTs) > InpMaxSignalAgeSeconds;
}

bool IsPlausibleEpochTs(const datetime ts)
{
   if(ts <= 0)
      return false;
   // Guard against parser artifacts (e.g., year-only parse) and absurd future timestamps.
   datetime minTs = D'2000.01.01 00:00:00';
   datetime maxTs = TimeGMT() + 86400 * 365; // 1 year in future is still acceptable.
   return ts >= minTs && ts <= maxTs;
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

int VolumeDigits(const double step)
{
   if(step <= 0.0)
      return 2;
   for(int d = 0; d <= 8; ++d)
   {
      double scaled = step * MathPow(10.0, d);
      if(MathAbs(scaled - MathRound(scaled)) < 1e-8)
         return d;
   }
   return 2;
}

bool NormalizeVolumeForSymbol(const string symbol,
                              const double volumeIn,
                              double &volumeOut,
                              string &noteOut)
{
   noteOut = "";
   double vMin = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double vMax = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double vStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   if(vMin <= 0.0) vMin = 0.01;
   if(vMax <= 0.0) vMax = 100.0;
   if(vStep <= 0.0) vStep = 0.01;

   double v = volumeIn;
   if(v <= 0.0)
      v = vMin;

   if(v < vMin)
   {
      v = vMin;
      noteOut += "[vol->min]";
   }
   if(v > vMax)
   {
      v = vMax;
      noteOut += "[vol->max]";
   }

   double steps = MathFloor((v - vMin) / vStep + 1e-9);
   double vAligned = vMin + steps * vStep;
   if(vAligned < vMin)
      vAligned = vMin;
   if(vAligned > vMax)
      vAligned = vMax;

   int vd = VolumeDigits(vStep);
   vAligned = NormalizeDouble(vAligned, vd);
   volumeOut = vAligned;

   // Final safety check: alignment and range.
   if(volumeOut < vMin - 1e-10 || volumeOut > vMax + 1e-10)
      return false;
   double k = (volumeOut - vMin) / vStep;
   if(MathAbs(k - MathRound(k)) > 1e-6)
      return false;

   return true;
}

bool ComputeRiskBasedVolume(const string action,
                            const string symbol,
                            const double slPrice,
                            double &volumeOut,
                            string &noteOut)
{
   noteOut = "";
   volumeOut = 0.0;
   if(!InpUseRiskPercentSizing)
   {
      noteOut = "[risk_mode_off]";
      return false;
   }
   if(InpRiskPercentOfBalance <= 0.0)
   {
      noteOut = "[risk_pct<=0]";
      return false;
   }
   if(slPrice <= 0.0)
   {
      noteOut = "[missing_sl]";
      return false;
   }

   MqlTick tick;
   if(!SymbolInfoTick(symbol, tick))
   {
      noteOut = "[tick_unavailable]";
      return false;
   }
   double entryPrice = 0.0;
   ENUM_ORDER_TYPE orderType = ORDER_TYPE_BUY;
   if(action == "BUY")
   {
      entryPrice = tick.ask;
      orderType = ORDER_TYPE_BUY;
      if(slPrice >= entryPrice)
      {
         noteOut = "[sl_not_below_entry]";
         return false;
      }
   }
   else if(action == "SELL")
   {
      entryPrice = tick.bid;
      orderType = ORDER_TYPE_SELL;
      if(slPrice <= entryPrice)
      {
         noteOut = "[sl_not_above_entry]";
         return false;
      }
   }
   else
   {
      noteOut = "[unsupported_action_for_risk]";
      return false;
   }
   if(entryPrice <= 0.0)
   {
      noteOut = "[entry_price_invalid]";
      return false;
   }

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance <= 0.0)
   {
      noteOut = "[balance_invalid]";
      return false;
   }
   double riskMoney = balance * (InpRiskPercentOfBalance / 100.0);
   if(riskMoney <= 0.0)
   {
      noteOut = "[risk_money_invalid]";
      return false;
   }

   double lossForOneLot = 0.0;
   if(!OrderCalcProfit(orderType, symbol, 1.0, entryPrice, slPrice, lossForOneLot))
   {
      noteOut = "[OrderCalcProfit_failed]";
      return false;
   }
   double lossAbs = MathAbs(lossForOneLot);
   if(lossAbs <= 0.0)
   {
      noteOut = "[loss_per_lot_invalid]";
      return false;
   }

   volumeOut = riskMoney / lossAbs;
   noteOut = "[risk_sized balance=" + DoubleToString(balance, 2)
             + " risk$=" + DoubleToString(riskMoney, 2)
             + " loss1lot$=" + DoubleToString(lossAbs, 2) + "]";
   return true;
}

bool FitVolumeToFreeMargin(const string action,
                           const string symbol,
                           const double volumeIn,
                           double &volumeOut,
                           string &noteOut)
{
   noteOut = "";
   volumeOut = volumeIn;
   if(!(action == "BUY" || action == "SELL"))
      return true;

   MqlTick tick;
   if(!SymbolInfoTick(symbol, tick))
   {
      noteOut = "[tick_unavailable_for_margin]";
      return false;
   }
   double price = (action == "BUY" ? tick.ask : tick.bid);
   if(price <= 0.0)
   {
      noteOut = "[price_invalid_for_margin]";
      return false;
   }
   ENUM_ORDER_TYPE orderType = (action == "BUY" ? ORDER_TYPE_BUY : ORDER_TYPE_SELL);
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   if(freeMargin <= 0.0)
   {
      noteOut = "[free_margin<=0]";
      return false;
   }
   double safetyPct = InpMarginSafetyPercent;
   if(safetyPct <= 0.0 || safetyPct > 100.0)
      safetyPct = 98.0;
   double freeMarginBudget = freeMargin * (safetyPct / 100.0); // keep a safety buffer for spread changes.
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double balanceBudget = DBL_MAX;
   if(InpMarginPercentOfBalance > 0.0 && balance > 0.0)
      balanceBudget = balance * (InpMarginPercentOfBalance / 100.0);
   double marginBudget = MathMin(freeMarginBudget, balanceBudget);
   if(!MathIsValidNumber(marginBudget) || marginBudget <= 0.0)
      marginBudget = freeMarginBudget;
   g_ackMarginBudget = marginBudget;

   double vMin = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double vStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   if(vMin <= 0.0) vMin = 0.01;
   if(vStep <= 0.0) vStep = 0.01;

   double v = volumeIn;
   string normNote = "";
   if(!NormalizeVolumeForSymbol(symbol, v, v, normNote))
   {
      noteOut = "[margin_norm_failed]";
      return false;
   }

   double marginReq = 0.0;
   if(OrderCalcMargin(orderType, symbol, v, price, marginReq) && marginReq > 0.0 && marginReq <= marginBudget)
   {
      volumeOut = v;
      return true;
   }

   int maxIters = (int)MathCeil((v - vMin) / vStep) + 5;
   if(maxIters < 1) maxIters = 1;
   for(int i = 0; i < maxIters; ++i)
   {
      v -= vStep;
      if(v < vMin - 1e-10)
         break;
      string n2 = "";
      if(!NormalizeVolumeForSymbol(symbol, v, v, n2))
         continue;
      if(OrderCalcMargin(orderType, symbol, v, price, marginReq) && marginReq > 0.0 && marginReq <= marginBudget)
      {
         volumeOut = v;
         noteOut = "[margin_fit budget=" + DoubleToString(marginBudget, 2)
                   + " free=" + DoubleToString(freeMargin, 2)
                   + " req=" + DoubleToString(marginReq, 2) + "]";
         return true;
      }
   }

   double minReq = 0.0;
   OrderCalcMargin(orderType, symbol, vMin, price, minReq);
   noteOut = "[no_affordable_volume budget=" + DoubleToString(marginBudget, 2)
             + " free=" + DoubleToString(freeMargin, 2)
             + " req@min=" + DoubleToString(minReq, 2) + "]";
   return false;
}

bool ComputeMarginPercentVolume(const string action,
                                const string symbol,
                                const double marginPct,
                                double &volumeOut,
                                string &noteOut)
{
   noteOut = "";
   volumeOut = 0.0;
   if(!(action == "BUY" || action == "SELL"))
   {
      noteOut = "[unsupported_action_for_margin_sizing]";
      return false;
   }
   if(marginPct <= 0.0)
   {
      noteOut = "[margin_pct<=0]";
      return false;
   }

   MqlTick tick;
   if(!SymbolInfoTick(symbol, tick))
   {
      noteOut = "[tick_unavailable]";
      return false;
   }
   double price = (action == "BUY" ? tick.ask : tick.bid);
   if(price <= 0.0)
   {
      noteOut = "[price_invalid]";
      return false;
   }

   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(freeMargin <= 0.0 || balance <= 0.0)
   {
      noteOut = "[account_margin_or_balance_invalid]";
      return false;
   }

   double safetyPct = InpMarginSafetyPercent;
   if(safetyPct <= 0.0 || safetyPct > 100.0)
      safetyPct = 98.0;
   double freeBudget = freeMargin * (safetyPct / 100.0);
   double balanceBudget = balance * (marginPct / 100.0);
   double budget = MathMin(freeBudget, balanceBudget);
   if(!MathIsValidNumber(budget) || budget <= 0.0)
   {
      noteOut = "[budget_invalid]";
      return false;
   }
   g_ackMarginBudget = budget;

   double vMin = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double vMax = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double vStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   if(vMin <= 0.0) vMin = 0.01;
   if(vMax <= 0.0) vMax = 100.0;
   if(vStep <= 0.0) vStep = 0.01;

   ENUM_ORDER_TYPE orderType = (action == "BUY" ? ORDER_TYPE_BUY : ORDER_TYPE_SELL);
   double minReq = 0.0;
   if(!OrderCalcMargin(orderType, symbol, vMin, price, minReq) || minReq <= 0.0)
   {
      noteOut = "[min_margin_calc_failed]";
      return false;
   }
   if(minReq > budget)
   {
      noteOut = "[budget_below_minlot budget=" + DoubleToString(budget, 2)
                + " req@min=" + DoubleToString(minReq, 2) + "]";
      return false;
   }

   double est = vMin * (budget / minReq);
   if(est < vMin) est = vMin;
   if(est > vMax) est = vMax;
   string n0 = "";
   if(!NormalizeVolumeForSymbol(symbol, est, est, n0))
   {
      noteOut = "[est_norm_failed]";
      return false;
   }

   double v = est;
   double req = 0.0;
   int maxIters = (int)MathCeil((v - vMin) / vStep) + 5;
   if(maxIters < 1) maxIters = 1;
   for(int i = 0; i < maxIters; ++i)
   {
      if(OrderCalcMargin(orderType, symbol, v, price, req) && req > 0.0 && req <= budget)
      {
         volumeOut = v;
         noteOut = "[margin_pct_sized pct=" + DoubleToString(marginPct, 2)
                   + "% budget=" + DoubleToString(budget, 2)
                   + " req=" + DoubleToString(req, 2) + "]";
         return true;
      }
      v -= vStep;
      if(v < vMin - 1e-10)
         break;
      string n2 = "";
      if(!NormalizeVolumeForSymbol(symbol, v, v, n2))
         continue;
   }

   noteOut = "[margin_pct_fit_failed budget=" + DoubleToString(budget, 2)
             + " req@min=" + DoubleToString(minReq, 2) + "]";
   return false;
}

void Ack(const string signalId, const string status, const string ticket, const string err)
{
   string ackNote = "action=" + g_ackAction
                    + " symbol=" + g_ackSymbol
                    + " reqVol=" + DoubleToString(g_ackReqVolume, 4)
                    + " usedVol=" + DoubleToString(g_ackUsedVolume, 4)
                    + " reqSL=" + DoubleToString(g_ackReqSl, 8)
                    + " reqTP=" + DoubleToString(g_ackReqTp, 8)
                    + " usedSL=" + DoubleToString(g_ackUsedSl, 8)
                    + " usedTP=" + DoubleToString(g_ackUsedTp, 8)
                    + " marginReq=" + DoubleToString(g_ackMarginReq, 2)
                    + " marginBudget=" + DoubleToString(g_ackMarginBudget, 2)
                    + " freeMargin=" + DoubleToString(g_ackFreeMargin, 2)
                    + " bal=" + DoubleToString(g_ackBalance, 2)
                    + " eq=" + DoubleToString(g_ackEquity, 2);
   if(StringLen(g_ackVolumeNote) > 0) ackNote += " volNote=" + g_ackVolumeNote;
   if(StringLen(g_ackStopNote) > 0) ackNote += " stopNote=" + g_ackStopNote;
   string body = "{";
   body += "\"account_id\":\"" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
   body += "\"signal_id\":\"" + JsonEscape(signalId) + "\",";
   body += "\"status\":\"" + JsonEscape(status) + "\",";
   body += "\"execution_status\":\"" + JsonEscape(status) + "\",";
   body += "\"ticket\":\"" + JsonEscape(ticket) + "\",";
   body += "\"broker_trade_id\":\"" + JsonEscape(ticket) + "\",";
   body += "\"error\":\"" + JsonEscape(err) + "\",";
   body += "\"result\":\"" + JsonEscape(IntegerToString(g_ackRetcode)) + "\",";
   body += "\"message\":\"" + JsonEscape(g_ackRetmsg) + "\",";
   body += "\"note\":\"" + JsonEscape(ackNote) + "\",";
   body += "\"action\":\"" + JsonEscape(g_ackAction) + "\",";
   body += "\"symbol\":\"" + JsonEscape(g_ackSymbol) + "\",";
   body += "\"requested_volume\":" + DoubleToString(g_ackReqVolume, 4) + ",";
   body += "\"used_volume\":" + DoubleToString(g_ackUsedVolume, 4) + ",";
   body += "\"requested_sl\":" + DoubleToString(g_ackReqSl, 8) + ",";
   body += "\"requested_tp\":" + DoubleToString(g_ackReqTp, 8) + ",";
   body += "\"used_sl\":" + DoubleToString(g_ackUsedSl, 8) + ",";
   body += "\"used_tp\":" + DoubleToString(g_ackUsedTp, 8) + ",";
   body += "\"entry_price_exec\":" + DoubleToString(g_ackEntryExec, 8) + ",";
   body += "\"margin_req\":" + DoubleToString(g_ackMarginReq, 2) + ",";
   body += "\"margin_budget\":" + DoubleToString(g_ackMarginBudget, 2) + ",";
   body += "\"free_margin\":" + DoubleToString(g_ackFreeMargin, 2) + ",";
   body += "\"balance\":" + DoubleToString(g_ackBalance, 2) + ",";
   body += "\"equity\":" + DoubleToString(g_ackEquity, 2) + ",";
   body += "\"pip_value_per_lot\":" + DoubleToString(g_ackPipValuePerLot, 4) + ",";
   body += "\"sl_pips\":" + DoubleToString(g_ackSlPips, 2) + ",";
   body += "\"tp_pips\":" + DoubleToString(g_ackTpPips, 2) + ",";
   body += "\"risk_money_actual\":" + DoubleToString(g_ackRiskMoneyActual, 2) + ",";
   body += "\"reward_money_planned\":" + DoubleToString(g_ackRewardMoneyPlanned, 4) + ",";
   if(g_ackHasPnlRealized)
      body += "\"pnl_money_realized\":" + DoubleToString(g_ackPnlRealized, 2) + ",";
   else
      body += "\"pnl_money_realized\":null,";
   body += "\"signal_ts\":" + IntegerToString((int)g_ackSignalTs) + ",";
   body += "\"exec_ts\":" + IntegerToString((int)g_ackExecTs);
   body += "}";

   int n = ArraySize(g_ackQSignalId);
   ArrayResize(g_ackQSignalId, n + 1);
   ArrayResize(g_ackQStatus, n+1);
   ArrayResize(g_ackQTicket, n+1);
   ArrayResize(g_ackQError, n+1);
   ArrayResize(g_ackQBody, n+1);
   ArrayResize(g_ackQRetryCount, n+1);
   
   g_ackQSignalId[n] = signalId;
   g_ackQStatus[n] = status;
   g_ackQTicket[n] = ticket;
   g_ackQError[n] = err;
   g_ackQBody[n] = body;
   g_ackQRetryCount[n] = 0;
   
   Print("Queued Ack status=", status, " id=", signalId, " ticket=", ticket);
}

void ProcessAckQueue()
{
   int n = ArraySize(g_ackQSignalId);
   if(n == 0) return;
   
   int w = 0;
   for(int i=0; i<n; i++)
   {
      string signalId = g_ackQSignalId[i];
      string tradeId = "";
      string leaseToken = "";
      
      // Try to find V2 context for this signal
      for(int j=0; j<ArraySize(g_tradeIdMapSignalId); j++) {
         if(g_tradeIdMapSignalId[j] == signalId) {
            tradeId = g_tradeIdMapValue[j];
            break;
         }
      }
      for(int j=0; j<ArraySize(g_leaseTokenMapSignalId); j++) {
         if(g_leaseTokenMapSignalId[j] == signalId) {
            leaseToken = g_leaseTokenMapValue[j];
            break;
         }
      }

      string url = BuildApiUrl("/v2/broker/ack");

      string body = g_ackQBody[i];
      // For v2 ack, trade_id + lease_token are required.
      if(tradeId != "" && StringFind(body, "\"trade_id\"") < 0) {
         body = StringSubstr(body, 0, StringLen(body)-1) + ",\"trade_id\":\"" + JsonEscape(tradeId) + "\"}";
      }
      if(leaseToken != "" && StringFind(body, "\"lease_token\"") < 0) {
         body = StringSubstr(body, 0, StringLen(body)-1) + ",\"lease_token\":\"" + JsonEscape(leaseToken) + "\"}";
      }
      if(StringFind(body, "\"trade_id\"") < 0 || StringFind(body, "\"lease_token\"") < 0) {
         Print("Reliable Ack SKIP (missing v2 context): id=", signalId, " trade_id=", tradeId, " lease_token=", leaseToken);
         g_ackQRetryCount[i]++;
         if(g_ackQRetryCount[i] >= 100)
         {
            Print("Reliable Ack GAVE UP (missing v2 context): id=", signalId);
            continue;
         }
         if(w != i)
         {
            g_ackQSignalId[w] = g_ackQSignalId[i];
            g_ackQStatus[w] = g_ackQStatus[i];
            g_ackQTicket[w] = g_ackQTicket[i];
            g_ackQError[w] = g_ackQError[i];
            g_ackQBody[w] = g_ackQBody[i];
            g_ackQRetryCount[w] = g_ackQRetryCount[i];
         }
         w++;
         continue;
      }

      if(HttpPostJson(url, body))
      {
         Print("Reliable Ack SENT OK: status=", g_ackQStatus[i], " id=", signalId, " url=", url);
         continue;
      }
      
      g_ackQRetryCount[i]++;
      if(g_ackQRetryCount[i] < 100) // Keep trying
      {
         if(w != i)
         {
            g_ackQSignalId[w] = g_ackQSignalId[i];
            g_ackQStatus[w] = g_ackQStatus[i];
            g_ackQTicket[w] = g_ackQTicket[i];
            g_ackQError[w] = g_ackQError[i];
            g_ackQBody[w] = g_ackQBody[i];
            g_ackQRetryCount[w] = g_ackQRetryCount[i];
         }
         w++;
      }
      else {
         Print("Reliable Ack GAVE UP: status=", g_ackQStatus[i], " id=", g_ackQSignalId[i]);
      }
   }
   ArrayResize(g_ackQSignalId, w);
   ArrayResize(g_ackQStatus, w);
   ArrayResize(g_ackQTicket, w);
   ArrayResize(g_ackQError, w);
   ArrayResize(g_ackQBody, w);
   ArrayResize(g_ackQRetryCount, w);
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
   int freezeLevelPts = (int)SymbolInfoInteger(symbol, SYMBOL_TRADE_FREEZE_LEVEL);
   int baseMinPts = MathMax(MathMax(0, stopsLevelPts), MathMax(0, freezeLevelPts));
   int extraPts = MathMax(0, InpStopBufferPts);
   double minDist = (baseMinPts + extraPts) * point;

   if(action == "BUY")
   {
      // BUY: SL must be below bid by at least min distance, TP above ask by at least min distance.
      if(sl > 0.0 && sl >= (bid - minDist))
      {
         sl = bid - minDist;
         adjustNote += "[SL adjusted]";
      }
      if(tp > 0.0 && tp <= (ask + minDist))
      {
         tp = ask + minDist;
         adjustNote += "[TP adjusted]";
      }
   }
   else if(action == "SELL")
   {
      // SELL: SL must be above ask by at least min distance, TP below bid by at least min distance.
      if(sl > 0.0 && sl <= (ask + minDist))
      {
         sl = ask + minDist;
         adjustNote += "[SL adjusted]";
      }
      if(tp > 0.0 && tp >= (bid - minDist))
      {
         tp = bid - minDist;
         adjustNote += "[TP adjusted]";
      }
   }

   if(sl > 0.0)
      sl = NormalizeDouble(sl, digits);
   if(tp > 0.0)
      tp = NormalizeDouble(tp, digits);
}

bool ApplyStopsAfterOpen(const ulong posTicket,
                         const string action,
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
   ulong ticketUse = posTicket;
   for(int i = 0; i < 10; ++i)
   {
      if(ticketUse > 0 && PositionSelectByTicket(ticketUse))
      {
         found = true;
         break;
      }
      if(PositionSelect(symbol))
      {
         found = true;
         break;
      }
      if(ticketUse == 0)
         FindLatestPositionTicket(symbol, InpMagic, ticketUse);
      Sleep(100);
   }
   if(!found)
   {
      infoOut = "position not found for modify";
      return false;
   }

   bool ok = false;
   if(ticketUse > 0)
      ok = trade.PositionModify(ticketUse, sl > 0.0 ? sl : 0.0, tp > 0.0 ? tp : 0.0);
   else
      ok = trade.PositionModify(symbol, sl > 0.0 ? sl : 0.0, tp > 0.0 ? tp : 0.0);
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
                   const double entry,
                   const string orderTypeRaw,
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
   g_ackAction = actionRaw;
   g_ackSymbol = symbolRaw;
   g_ackVolumeNote = "";
   g_ackStopNote = "";
   g_ackReqVolume = volume;
   g_ackUsedVolume = volume;
   g_ackReqSl = sl;
   g_ackReqTp = tp;
   g_ackUsedSl = sl;
   g_ackUsedTp = tp;
   g_ackEntryExec = 0.0;
   g_ackMarginReq = 0.0;
   g_ackFreeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   g_ackBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   g_ackMarginBudget = 0.0;
   if(InpMarginPercentOfBalance > 0.0 && g_ackBalance > 0.0)
      g_ackMarginBudget = g_ackBalance * (InpMarginPercentOfBalance / 100.0);
   g_ackEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   g_ackPnlRealized = 0.0;
   g_ackHasPnlRealized = false;
   g_ackSignalTs = signalTs;
   g_ackExecTs = TimeCurrent();
   g_ackRetcode = 0;
   g_ackRetmsg = "";

   // --- INITIAL TELEMETRY CALCULATION (DO THIS FIRST SO WE HAVE DATA EVEN ON ERRORS) ---
   g_ackPipValuePerLot = 0;
   g_ackSlPips = 0;
   g_ackTpPips = 0;
   g_ackRiskMoneyActual = 0;
   g_ackRewardMoneyPlanned = 0;
   
   double pps = SymbolInfoDouble(symbolRaw, SYMBOL_POINT);
   double pV = 0;
   if(pps > 0.0)
   {
      double profitOnePip = 0;
      if(OrderCalcProfit(actionRaw=="BUY"?ORDER_TYPE_BUY:ORDER_TYPE_SELL, symbolRaw, 1.0, 1.0, 1.0 + pps, profitOnePip))
         pV = MathAbs(profitOnePip);
   }
   g_ackPipValuePerLot = pV;
   
   double entryRef = (entry > 0.0) ? entry : ((actionRaw=="BUY") ? SymbolInfoDouble(symbolRaw, SYMBOL_ASK) : SymbolInfoDouble(symbolRaw, SYMBOL_BID));
   if(pps > 0.0)
   {
      double slDist = (sl > 0.0) ? MathAbs(entryRef - sl) : 0.0;
      double tpDist = (tp > 0.0) ? MathAbs(tp - entryRef) : 0.0;
      g_ackSlPips = slDist / pps; 
      g_ackTpPips = tpDist / pps;
   }
   g_ackRiskMoneyActual = volume * g_ackPipValuePerLot * g_ackSlPips;
   g_ackRewardMoneyPlanned = volume * g_ackPipValuePerLot * g_ackTpPips;
   // -----------------------------------------------------------------------------------

   string action = actionRaw;
   StringToUpper(action);
   string orderType = NormalizeOrderType(orderTypeRaw);
   g_dbgLastAction = action;
   g_ackAction = action;

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
      datetime nowUtc = TimeGMT();
      long ageSec = (long)(nowUtc - signalTs);
      errOut = "Expired signal ignored: " + signalId +
               " ageSec=" + IntegerToString((int)ageSec) +
               " maxAgeSec=" + IntegerToString(InpMaxSignalAgeSeconds) +
               " nowUtc=" + TimeToString(nowUtc, TIME_DATE | TIME_SECONDS) +
               " signalTs=" + TimeToString(signalTs, TIME_DATE | TIME_SECONDS);
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
   g_ackSymbol = symbol;

   trade.SetExpertMagicNumber(InpMagic);
   trade.SetDeviationInPoints(InpDeviationPts);

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
   g_ackStopNote = stopAdjustNote;
   g_ackUsedSl = slUse;
   g_ackUsedTp = tpUse;

   bool ok = false;
   double volumeUse = volume;
   string volumeNote = "";
   if(action == "BUY" || action == "SELL")
   {
      if(InpUseMarginPercentSizing)
      {
         double marginPctVol = 0.0;
         string marginPctNote = "";
         if(ComputeMarginPercentVolume(action, symbol, InpMarginPercentOfBalance, marginPctVol, marginPctNote))
         {
            volumeUse = marginPctVol;
            volumeNote = marginPctNote;
         }
         else if(InpUseRiskPercentSizing)
         {
            double riskVol = 0.0;
            string riskNote = "";
            if(ComputeRiskBasedVolume(action, symbol, slUse, riskVol, riskNote))
            {
               volumeUse = riskVol;
               volumeNote = "[margin_pct_fallback_risk] " + marginPctNote + " " + riskNote;
            }
            else
            {
               volumeUse = InpFallbackFixedLot;
               volumeNote = "[margin_pct_fallback_fixed] " + marginPctNote + " " + riskNote;
            }
         }
         else
         {
            volumeUse = InpFallbackFixedLot;
            volumeNote = "[margin_pct_fallback_fixed] " + marginPctNote;
         }
      }
      else if(InpUseRiskPercentSizing)
      {
         double riskVol = 0.0;
         string riskNote = "";
         if(ComputeRiskBasedVolume(action, symbol, slUse, riskVol, riskNote))
         {
            volumeUse = riskVol;
            volumeNote = riskNote;
         }
         else
         {
            volumeUse = InpFallbackFixedLot;
            volumeNote = "[risk_fallback_fixed_lot] " + riskNote;
         }
      }
   }
   string normNote = "";
   if(!NormalizeVolumeForSymbol(symbol, volumeUse, volumeUse, normNote))
   {
      errOut = "Invalid volume for symbol: " + symbol + " input=" + DoubleToString(volumeUse, 4);
      g_dbgLastStatus = "INVALID_VOLUME";
      g_dbgLastError = errOut;
      RefreshDebugPanel();
      return false;
   }
   if(StringLen(normNote) > 0)
   {
      if(StringLen(volumeNote) > 0) volumeNote += " ";
      volumeNote += normNote;
   }
   g_ackVolumeNote = volumeNote;
   if(volumeUse != volume || StringLen(volumeNote) > 0)
   {
      Print("Volume adjusted for ", signalId, " ", symbol,
            " input=", DoubleToString(volume, 4),
            " -> used=", DoubleToString(volumeUse, 4),
            " ", volumeNote);
   }
   if(action == "BUY" || action == "SELL")
   {
      double marginVolume = volumeUse;
      string marginNote = "";
      if(!FitVolumeToFreeMargin(action, symbol, volumeUse, marginVolume, marginNote))
      {
         string precheckNote = "[margin_precheck_fail] " + marginNote;
         if(InpHardFailOnMarginPrecheck)
         {
            errOut = "retcode=10019 msg=not enough money " + marginNote;
            g_dbgLastStatus = "NO_MONEY_PRECHECK";
            g_dbgLastError = errOut;
            RefreshDebugPanel();
            return false;
         }

         double tryMinVol = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
         if(tryMinVol <= 0.0) tryMinVol = 0.01;
         string minNormNote = "";
         if(!NormalizeVolumeForSymbol(symbol, tryMinVol, tryMinVol, minNormNote))
         {
            errOut = "retcode=10019 msg=not enough money " + marginNote + " [min_lot_norm_failed]";
            g_dbgLastStatus = "NO_MONEY_PRECHECK";
            g_dbgLastError = errOut;
            RefreshDebugPanel();
            return false;
         }

         Print("Margin precheck failed for ", signalId, " ", symbol,
               " -> still trying broker once with min lot ",
               DoubleToString(tryMinVol, 4), " ", precheckNote);
         volumeUse = tryMinVol;
         if(StringLen(volumeNote) > 0) volumeNote += " ";
         volumeNote += precheckNote;
         if(StringLen(minNormNote) > 0) volumeNote += " " + minNormNote;
      }
      else if(marginVolume != volumeUse || StringLen(marginNote) > 0)
      {
         Print("Margin-fit volume for ", signalId, " ", symbol,
               " used=", DoubleToString(volumeUse, 4),
               " -> fit=", DoubleToString(marginVolume, 4), " ", marginNote);
         if(StringLen(marginNote) > 0)
         {
            if(StringLen(volumeNote) > 0) volumeNote += " ";
            volumeNote += marginNote;
         }
         // 3. New task: Periodic state reconciliation
      if(TimeCurrent() - g_syncLastTime >= 300)
      {
         SyncWithVps();
         g_syncLastTime = TimeCurrent();
      }
   }
}
   g_ackVolumeNote = volumeNote;
   g_ackUsedVolume = volumeUse;
   if(action == "BUY" || action == "SELL")
   {
      MqlTick t;
      if(SymbolInfoTick(symbol, t))
      {
         double px = (action == "BUY" ? t.ask : t.bid);
         double mr = 0.0;
         if(OrderCalcMargin((action == "BUY" ? ORDER_TYPE_BUY : ORDER_TYPE_SELL), symbol, volumeUse, px, mr))
            g_ackMarginReq = mr;
      }
   }

   // Telemetry already populated at top of function.
   bool usedMarketExecution = false;
   string tradeComment = signalId;
   if(StringLen(tradeComment) > 31)
      tradeComment = StringSubstr(tradeComment, StringLen(tradeComment) - 31);

   if(action == "BUY" || action == "SELL")
   {
      bool useMarket = (orderType == "market");
      MqlTick t;
      if(!SymbolInfoTick(symbol, t))
      {
         errOut = "tick_unavailable_for_execution";
         g_dbgLastStatus = "EXEC_TICK_MISSING";
         g_dbgLastError = errOut;
         RefreshDebugPanel();
         return false;
      }

      double ask = t.ask;
      double bid = t.bid;
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      if(digits < 0) digits = 5;
      double entryUse = entry;
      if(entryUse > 0.0)
         entryUse = NormalizeDouble(entryUse, digits);
      if(entryUse <= 0.0 && orderType != "market")
      {
         useMarket = true;
         if(StringLen(volumeNote) > 0) volumeNote += " ";
         volumeNote += "[pending_missing_entry->market]";
      }

      if(useMarket)
      {
         usedMarketExecution = true;
         if(action == "BUY")
            ok = trade.Buy(volumeUse, symbol, 0.0, 0.0, 0.0, tradeComment);
         else
            ok = trade.Sell(volumeUse, symbol, 0.0, 0.0, 0.0, tradeComment);
      }
      else
      {
         string pendingKind = ResolvePendingKind(action, orderType, entryUse, ask, bid);
         if(orderType != pendingKind)
            Print("Order type adjusted id=", signalId, " action=", action, " requested=", orderType, " resolved=", pendingKind);
         if(pendingKind == "limit")
         {
            if(action == "BUY")
               ok = trade.BuyLimit(volumeUse, entryUse, symbol, slUse > 0.0 ? slUse : 0.0, tpUse > 0.0 ? tpUse : 0.0, ORDER_TIME_GTC, 0, tradeComment);
            else
               ok = trade.SellLimit(volumeUse, entryUse, symbol, slUse > 0.0 ? slUse : 0.0, tpUse > 0.0 ? tpUse : 0.0, ORDER_TIME_GTC, 0, tradeComment);
         }
         else
         {
            if(action == "BUY")
               ok = trade.BuyStop(volumeUse, entryUse, symbol, slUse > 0.0 ? slUse : 0.0, tpUse > 0.0 ? tpUse : 0.0, ORDER_TIME_GTC, 0, tradeComment);
            else
               ok = trade.SellStop(volumeUse, entryUse, symbol, slUse > 0.0 ? slUse : 0.0, tpUse > 0.0 ? tpUse : 0.0, ORDER_TIME_GTC, 0, tradeComment);
         }
         if(StringLen(volumeNote) > 0) volumeNote += " ";
         volumeNote += "[exec=" + pendingKind + "]";
      }
      g_ackVolumeNote = volumeNote;
   }
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
      g_ackRetcode = (int)rc;
      g_ackRetmsg = trade.ResultRetcodeDescription();
      // Broker rejected stops (10016). Retry market order without SL/TP.
      if((action == "BUY" || action == "SELL") && usedMarketExecution && rc == TRADE_RETCODE_INVALID_STOPS)
      {
         Print("Invalid stops for ", signalId, " -> retry without SL/TP");
         if(action == "BUY")
            ok = trade.Buy(volumeUse, symbol, 0.0, 0.0, 0.0, tradeComment);
         else
            ok = trade.Sell(volumeUse, symbol, 0.0, 0.0, 0.0, tradeComment);
      }
      // Broker rejected for insufficient margin (10019). Retry with lower affordable volume.
      if((action == "BUY" || action == "SELL") && usedMarketExecution && !ok && rc == TRADE_RETCODE_NO_MONEY)
      {
         double reducedVol = volumeUse;
         string marginRetryNote = "";
         if(FitVolumeToFreeMargin(action, symbol, volumeUse - SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP), reducedVol, marginRetryNote)
            && reducedVol > 0.0 && reducedVol < volumeUse)
         {
            Print("NO_MONEY retry with reduced volume for ", signalId, " ", symbol,
                  " ", DoubleToString(volumeUse, 4), " -> ", DoubleToString(reducedVol, 4),
                  " ", marginRetryNote);
            if(action == "BUY")
               ok = trade.Buy(reducedVol, symbol, 0.0, 0.0, 0.0, tradeComment);
            else
               ok = trade.Sell(reducedVol, symbol, 0.0, 0.0, 0.0, tradeComment);
            if(ok)
               volumeUse = reducedVol;
         }
      }

      if(!ok)
      {
         g_ackRetcode = (int)trade.ResultRetcode();
         g_ackRetmsg = trade.ResultRetcodeDescription();
         errOut = "retcode=" + IntegerToString((int)trade.ResultRetcode()) + " msg=" + trade.ResultRetcodeDescription();
         g_dbgLastStatus = "ORDER_FAILED";
         g_dbgLastError = errOut;
         RefreshDebugPanel();
         return false;
      }
   }

   if(action == "BUY" || action == "SELL")
   {
      if(usedMarketExecution)
      {
         ulong posTicket = 0;
         FindLatestPositionTicket(symbol, InpMagic, posTicket);
         string stopInfo = "";
         bool stopOk = ApplyStopsAfterOpen(posTicket, action, symbol, slUse, tpUse, stopInfo);
         if(!stopOk)
         {
            Print("Post-open stops skipped/failed for ", signalId, " ", symbol, " ", action, ": ", stopInfo);
            if(StringLen(g_dbgLastError) == 0)
               g_dbgLastError = stopInfo;
            EnqueueStopRetry(signalId, posTicket, action, symbol, slUse, tpUse);
         }
         else if(StringLen(stopInfo) > 0)
         {
            Print("Post-open stops for ", signalId, ": ", stopInfo);
         }

         if(posTicket == 0)
         {
            ulong fromOrder = (ulong)trade.ResultOrder();
            if(fromOrder > 0)
               posTicket = fromOrder;
            if(posTicket == 0)
               FindLatestPositionTicket(symbol, InpMagic, posTicket);
         }
         if(posTicket > 0)
            MapPositionSignal(posTicket, signalId);
         RegisterVirtualGuard(signalId, posTicket, action, symbol, slUse, tpUse);
      }
      else
      {
         ulong orderTicket = (ulong)trade.ResultOrder();
         if(orderTicket > 0)
         {
            MapOrderSignal(orderTicket, signalId);
            Print("Pending order placed id=", signalId,
                  " orderTicket=", IntegerToString((int)orderTicket),
                  " symbol=", symbol,
                  " action=", action,
                  " volume=", DoubleToString(volumeUse, 4));
         }
      }
   }

   ticketOut = IntegerToString((int)trade.ResultOrder());
   g_ackRetcode = (int)trade.ResultRetcode();
   g_ackRetmsg = trade.ResultRetcodeDescription();
   g_ackExecTs = TimeCurrent();
   if(action == "BUY" || action == "SELL")
   {
      ulong ptk = 0;
      FindLatestPositionTicket(symbol, InpMagic, ptk);
      if(ptk > 0 && PositionSelectByTicket(ptk))
         g_ackEntryExec = PositionGetDouble(POSITION_PRICE_OPEN);
   }
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
                              0.0,
                              "market",
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

   ProcessAckQueue();
   ProcessStopRetryQueue();
   ProcessVirtualGuards();

   datetime now = TimeCurrent();
   
   // Periodic state reconciliation (PUSH ACTIVE) - every 60s
   if(now - g_syncLastTime >= 60)
   {
      SyncWithVps();
      g_syncLastTime = now;
   }

   string url = BuildApiUrl("/v2/broker/pull?account=" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)));
   string resp;
   if(!HttpGet(url, resp))
   {
      g_lastPullCode = g_lastHttpCode;
      g_lastPullSummary = "FAIL " + g_lastHttpMethod + " " + SanitizeOneLine(g_lastHttpUrl, 64) + " | " + g_lastHttpError;
      g_lastPullPayload = g_lastPullSummary;
      g_lastPullUpdate = TimeCurrent();
      RefreshDebugPanel();
      return;
   }

   g_lastPullCode = g_lastHttpCode;
   g_lastPullPayload = SanitizeOneLine(resp, 220);
   g_lastPullUpdate = TimeCurrent();

   if(StringFind(resp, "\"items\":[]") >= 0 || StringFind(resp, "\"items\":null") >= 0)
   {
      g_lastPullSummary = "OK no queued trades";
      RefreshDebugPanel();
      return;
   }

   string itemPart = JsonExtractFirstArrayObject(resp, "items");
   if(itemPart == "")
   {
      g_lastPullSummary = "OK but cannot parse items payload";
      RefreshDebugPanel();
      return;
   }

   string leaseToken = JsonGetString(itemPart, "lease_token");
   string tradeId = JsonGetString(itemPart, "trade_id");
   string signalId = JsonGetString(itemPart, "signal_id");
   if(signalId == "")
      signalId = tradeId;
   
   // Track V2 context
   if(signalId != "" && leaseToken != "") {
      int nL = ArraySize(g_leaseTokenMapSignalId);
      ArrayResize(g_leaseTokenMapSignalId, nL+1);
      ArrayResize(g_leaseTokenMapValue, nL+1);
      g_leaseTokenMapSignalId[nL] = signalId;
      g_leaseTokenMapValue[nL] = leaseToken;
   }
   if(signalId != "" && tradeId != "") {
      int nT = ArraySize(g_tradeIdMapSignalId);
      ArrayResize(g_tradeIdMapSignalId, nT+1);
      ArrayResize(g_tradeIdMapValue, nT+1);
      g_tradeIdMapSignalId[nT] = signalId;
      g_tradeIdMapValue[nT] = tradeId;
   }

   string action   = JsonGetString(itemPart, "action");
   if(action == "") action = JsonGetString(itemPart, "side"); // V2 mapping
   
   string symbolIn = JsonGetString(itemPart, "symbol");
   string comment  = JsonGetString(itemPart, "note");
   if(comment == "") comment = JsonGetString(itemPart, "intent_note");
   
   double volume   = JsonGetNumber(itemPart, "volume", 0.0);
   if(volume <= 0) volume = JsonGetNumber(itemPart, "intent_volume", 0.0);
   if(volume <= 0) volume = 0.01;
   
   double entry    = JsonGetNumber(itemPart, "entry", 0.0);
   if(entry <= 0) entry = JsonGetNumber(itemPart, "intent_entry", 0.0);
   
   string orderType = JsonGetString(itemPart, "order_type");
   if(StringLen(orderType) == 0) orderType = "market";
   int itemCount = CountOccurrences(resp, "\"trade_id\"");
   g_lastPullSummary = "OK items=" + IntegerToString(itemCount) +
                       " trade=" + tradeId +
                       " " + action + " " + symbolIn +
                       " " + orderType;
   
   double sl       = JsonGetNumber(itemPart, "sl", 0.0);
   if(sl <= 0) sl = JsonGetNumber(itemPart, "intent_sl", 0.0);
   
   double tp       = JsonGetNumber(itemPart, "tp", 0.0);
   if(tp <= 0) tp = JsonGetNumber(itemPart, "intent_tp", 0.0);
   
   datetime signalTs = (datetime)JsonGetNumber(itemPart, "created_at_ts", 0.0);
   if(!IsPlausibleEpochTs(signalTs))
      signalTs = (datetime)JsonGetNumber(itemPart, "timestamp", 0.0);
   if(!IsPlausibleEpochTs(signalTs))
   {
      string tsIso = JsonGetString(itemPart, "timestamp_iso");
      if(StringLen(tsIso) == 0)
         tsIso = JsonGetString(itemPart, "timestamp");
      signalTs = ParseSignalTime(tsIso);
   }
   if(!IsPlausibleEpochTs(signalTs))
      signalTs = 0;

   string ticket;
   string err;
   bool ok = ExecuteSignal(signalId, action, symbolIn, comment, volume, entry, orderType, sl, tp, signalTs, ticket, err);
   if(ok)
    {
       string initialStatus = (orderType == "market") ? "START" : "PLACED";
       Ack(signalId, initialStatus, ticket, "exec_ok_" + orderType);
    }
   else
   {
      string ackStatus = (StringFind(err, "Expired") == 0) ? "EXPIRED" : "FAIL";
      Ack(signalId, ackStatus, "", err);
   }
   RefreshDebugPanel();
}

void OnTick()
{
   if(InpBacktestMode)
      ProcessBacktestQueue();
}

void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   if(!InpEnableTradeEventAck || InpBacktestMode)
      return;

   // Track Pending / Cancelled Orders
   if(trans.type == TRADE_TRANSACTION_ORDER_ADD)
   {
      ulong orderTicket = trans.order;
      if(orderTicket > 0 && OrderSelect(orderTicket))
      {
         long magic = OrderGetInteger(ORDER_MAGIC);
         if(magic == InpMagic)
         {
            string signalId = "";
            int ordIdx = -1;
            GetSignalIdByOrderTicket(orderTicket, signalId, ordIdx);
            if(StringLen(signalId) == 0) signalId = OrderGetString(ORDER_COMMENT);
            
            if(StringLen(signalId) > 0)
            {
               g_ackSymbol = OrderGetString(ORDER_SYMBOL);
               ENUM_ORDER_TYPE ot = (ENUM_ORDER_TYPE)OrderGetInteger(ORDER_TYPE);
               g_ackAction = (ot == ORDER_TYPE_BUY_LIMIT || ot == ORDER_TYPE_BUY_STOP) ? "BUY" : "SELL";
               g_ackExecTs = TimeCurrent();
               g_ackFreeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
               g_ackBalance = AccountInfoDouble(ACCOUNT_BALANCE);
               g_ackEquity = AccountInfoDouble(ACCOUNT_EQUITY);
               g_ackHasPnlRealized = false;
               
               Ack(signalId, "PLACED", IntegerToString((int)orderTicket), "order_placed");
            }
         }
      }
      return;
   }
   else if(trans.type == TRADE_TRANSACTION_ORDER_DELETE)
   {
      ulong orderTicket = trans.order;
      if(orderTicket > 0 && HistoryOrderSelect(orderTicket))
      {
         long magic = HistoryOrderGetInteger(orderTicket, ORDER_MAGIC);
         if(magic == InpMagic)
         {
            string signalId = "";
            int ordIdx = -1;
            GetSignalIdByOrderTicket(orderTicket, signalId, ordIdx);
            if(StringLen(signalId) == 0) signalId = HistoryOrderGetString(orderTicket, ORDER_COMMENT);
            
            if(StringLen(signalId) > 0)
            {
               g_ackSymbol = HistoryOrderGetString(orderTicket, ORDER_SYMBOL);
               ENUM_ORDER_TYPE ot = (ENUM_ORDER_TYPE)HistoryOrderGetInteger(orderTicket, ORDER_TYPE);
               g_ackAction = (ot == ORDER_TYPE_BUY_LIMIT || ot == ORDER_TYPE_BUY_STOP || ot == ORDER_TYPE_BUY) ? "BUY" : "SELL";
               g_ackExecTs = TimeCurrent();
               g_ackFreeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
               g_ackBalance = AccountInfoDouble(ACCOUNT_BALANCE);
               g_ackEquity = AccountInfoDouble(ACCOUNT_EQUITY);
               g_ackHasPnlRealized = false;
               
               ENUM_ORDER_STATE state = (ENUM_ORDER_STATE)HistoryOrderGetInteger(orderTicket, ORDER_STATE);
               if(state == ORDER_STATE_CANCELED || state == ORDER_STATE_EXPIRED || state == ORDER_STATE_REJECTED)
               {
                  Ack(signalId, state == ORDER_STATE_EXPIRED ? "EXPIRED" : "CANCEL", IntegerToString((int)orderTicket), "order_removed");
                  if(ordIdx >= 0) RemoveOrderMapAt(ordIdx);
               }
            }
         }
      }
      return;
   }

   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;
   if(trans.deal == 0 || !HistoryDealSelect(trans.deal))
      return;

   long magic = HistoryDealGetInteger(trans.deal, DEAL_MAGIC);
   if(magic != InpMagic)
      return;

   ENUM_DEAL_ENTRY entryType = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
   ENUM_DEAL_REASON reason = (ENUM_DEAL_REASON)HistoryDealGetInteger(trans.deal, DEAL_REASON);
   ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(trans.deal, DEAL_TYPE);
   ulong positionTicket = (ulong)HistoryDealGetInteger(trans.deal, DEAL_POSITION_ID);
   ulong orderTicket = (ulong)HistoryDealGetInteger(trans.deal, DEAL_ORDER);
   string symbol = HistoryDealGetString(trans.deal, DEAL_SYMBOL);
   string dealComment = HistoryDealGetString(trans.deal, DEAL_COMMENT);

   string signalId = "";
   int posIdx = -1;
   int ordIdx = -1;
   GetSignalIdByPositionTicket(positionTicket, signalId, posIdx);
   if(StringLen(signalId) == 0)
      GetSignalIdByOrderTicket(orderTicket, signalId, ordIdx);
   if(StringLen(signalId) == 0 && orderTicket > 0 && HistoryOrderSelect(orderTicket))
      signalId = HistoryOrderGetString(orderTicket, ORDER_COMMENT);
   if(StringLen(signalId) == 0)
      signalId = dealComment;
   if(StringLen(signalId) == 0)
      return;

   g_ackSymbol = symbol;
   g_ackAction = (dealType == DEAL_TYPE_BUY) ? "BUY" : "SELL";
   g_ackRetcode = 0;
   g_ackRetmsg = "";
   g_ackExecTs = TimeCurrent();
   g_ackFreeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   g_ackBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   g_ackEquity = AccountInfoDouble(ACCOUNT_EQUITY);

   if(entryType == DEAL_ENTRY_IN)
   {
      if(positionTicket > 0)
         MapPositionSignal(positionTicket, signalId);
      int p2 = -1;
      string tmp = "";
      if(GetSignalIdByPositionTicket(positionTicket, tmp, p2))
      {
         if(g_posMapOpenedAckSent[p2])
            return;
         g_posMapOpenedAckSent[p2] = true;
      }
      if(ordIdx >= 0)
         RemoveOrderMapAt(ordIdx);
      g_ackHasPnlRealized = false;
      g_ackPnlRealized = 0.0;
      Ack(signalId, "START", IntegerToString((int)positionTicket), "entry_filled");
      return;
   }

   if(!(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_OUT_BY))
      return;

   // Ignore partial closes: wait until position is fully gone.
   if(positionTicket > 0 && PositionSelectByTicket(positionTicket))
      return;

   string status = "FAIL";
   if(reason == DEAL_REASON_TP)
      status = "TP";
   else if(reason == DEAL_REASON_SL || reason == DEAL_REASON_SO)
      status = "SL";
   else if(reason == DEAL_REASON_CLIENT || reason == DEAL_REASON_EXPERT || reason == DEAL_REASON_MOBILE)
      status = "CANCEL";

   double pnl = HistoryDealGetDouble(trans.deal, DEAL_PROFIT)
                + HistoryDealGetDouble(trans.deal, DEAL_SWAP)
                + HistoryDealGetDouble(trans.deal, DEAL_COMMISSION);
   g_ackPnlRealized = pnl;
   g_ackHasPnlRealized = true;

   string reasonMsg = "close_reason=" + IntegerToString((int)reason)
                      + " deal=" + IntegerToString((int)trans.deal)
                      + " order=" + IntegerToString((int)orderTicket);
   Ack(signalId, status, IntegerToString((int)positionTicket), reasonMsg);

   if(posIdx >= 0)
      RemovePositionMapAt(posIdx);
   if(ordIdx >= 0)
      RemoveOrderMapAt(ordIdx);
   CleanupVirtualGuardByTicket(positionTicket);
}

string g_lastStateHash = "";

void SyncWithVps()
{
   string posUpdates = "";
   string ordUpdates = "";
   int posCount = 0;
   int ordCount = 0;

   // 1. Positions
   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionSelectByTicket(ticket))
      {
         long magic = PositionGetInteger(POSITION_MAGIC);
         if(magic == InpMagic)
         {
            string sid = "";
            int idx = -1;
            GetSignalIdByPositionTicket(ticket, sid, idx);
            if(sid == "") sid = PositionGetString(POSITION_COMMENT);
            if(sid != "")
            {
               if(posCount > 0) posUpdates += ",";
               posUpdates += "{\"signal_id\":\"" + sid + "\",\"status\":\"START\",\"ticket\":\"" + IntegerToString((int)ticket) + "\",\"pnl\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + "}";
               posCount++;
            }
         }
      }
   }

   // 2. Orders
   for(int i = 0; i < OrdersTotal(); i++)
   {
      ulong ticket = OrderGetTicket(i);
      if(ticket > 0 && OrderSelect(ticket))
      {
         long magic = OrderGetInteger(ORDER_MAGIC);
         if(magic == InpMagic)
         {
            string sid = "";
            int idx = -1;
            GetSignalIdByOrderTicket(ticket, sid, idx);
            if(sid == "") sid = OrderGetString(ORDER_COMMENT);
            if(sid != "")
            {
               if(ordCount > 0) ordUpdates += ",";
               ordUpdates += "{\"signal_id\":\"" + sid + "\",\"status\":\"PLACED\",\"ticket\":\"" + IntegerToString((int)ticket) + "\",\"pnl\":0}";
               ordCount++;
            }
         }
      }
   }

   string stateHash = posUpdates + "|" + ordUpdates;

   // [STATE DETECTION] If total state hasn't changed, skip webhook
   if(stateHash == g_lastStateHash) {
      g_lastSyncPayload = "STABLE (No changes)";
      g_lastSyncCode = 0;
      g_lastSyncSummary = "SKIP stable (no changes)";
      g_lastSyncUpdate = TimeCurrent();
      RefreshDebugPanel();
      return;
   }
   g_lastStateHash = stateHash;

   string body = "{";
   body += "\"account_id\":\"" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
   body += "\"positions\":[" + posUpdates + "],";
   body += "\"orders\":[" + ordUpdates + "]";
   body += "}";
   
   string url = BuildApiUrl("/v2/broker/sync");
   string resp = "";
   if(HttpPostJsonWithResponse(url, body, resp))
   {
      g_lastSyncCode = g_lastHttpCode;
      int synced = (int)JsonGetNumber(resp, "synced", -1);
      int matched = (int)JsonGetNumber(resp, "matched", -1);
      int received = (int)JsonGetNumber(resp, "received", -1);
      g_lastSyncSummary = "OK pushed pos=" + IntegerToString(posCount) + " ord=" + IntegerToString(ordCount);
      if(synced >= 0 || matched >= 0 || received >= 0)
      {
         g_lastSyncSummary += " | synced=" + IntegerToString(synced) +
                              " matched=" + IntegerToString(matched) +
                              " recv=" + IntegerToString(received);
      }
      g_lastSyncPayload = "V2 OK: " + SanitizeOneLine(resp, 150);
   }
   else
   {
      g_lastSyncCode = g_lastHttpCode;
      g_lastSyncSummary = "FAIL " + g_lastHttpMethod + " " + SanitizeOneLine(g_lastHttpUrl, 64) + " | " + g_lastHttpError;
      g_lastSyncPayload = "V2 FAIL: " + SanitizeOneLine(resp, 150);
      g_lastStateHash = ""; 
   }
   g_lastSyncUpdate = TimeCurrent();
   RefreshDebugPanel();
}

int OnInit()
{
   LoadMappings();
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
   Print("TVBridgeEA auth: key=", ApiKeyMask(), " hint=", ApiKeyHint());
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
