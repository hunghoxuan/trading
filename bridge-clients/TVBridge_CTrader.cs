using System;
using System.Linq;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using cAlgo.API;
using cAlgo.API.Internals;
using cAlgo.API.Indicators;
using cAlgo.Indicators;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text;

namespace cAlgo.Robots
{
    [Robot(TimeZone = TimeZones.UTC, AccessRights = AccessRights.FullAccess)]
    public class TVBridgeCBot : Robot
    {
        [Parameter("Server Base URL", DefaultValue = "https://trade.mozasolution.com/webhook")]
        public string ServerBaseUrl { get; set; }

        [Parameter("EA API Key", DefaultValue = "acc_fab38ed32ecde9b28b3dd33d8be10a77da6a")]
        public string EaApiKey { get; set; }

        [Parameter("Polling Frequency (sec)", DefaultValue = 2, MinValue = 1)]
        public int PollSeconds { get; set; }

        [Parameter("Magic Number", DefaultValue = 20260411)]
        public int MagicNumber { get; set; }

        [Parameter("Use Risk % Sizing", DefaultValue = true)]
        public bool UseRiskPercentSizing { get; set; }

        [Parameter("Max Risk %", DefaultValue = 1.0, MinValue = 0.1, MaxValue = 10.0)]
        public double MaxRiskPct { get; set; }

        private string BuildVersion = "v2026.05.04 18:22 - 12503ef";
        private string _lastStatus = "INITIALIZING";
        private string _lastSignalId = "None";
        private string _lastAction = "None";
        private string _lastSymbol = "None";
        private DateTime _lastPollTime = DateTime.MinValue;
        private int _pollCount = 0;
        private int _successCount = 0;
        private int _failCount = 0;
        private string _lastError = "";
        private bool _isPolling = false;

        private static readonly HttpClient _httpClient;

        static TVBridgeCBot()
        {
            _httpClient = new HttpClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(10);
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "cTrader-TVBridge");
        }

        private DateTime _lastSyncTime = DateTime.MinValue;
        private string _lastSyncSummary = "INIT";
        private string _lastStateHash = "";

        protected override void OnStart()
        {
            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls13;

                Print("[Init] TVBridgeCBot Started. Magic: {0}", MagicNumber);
                _lastStatus = "LIVE_READY";
                RefreshDebugPanel();
                Timer.Start(PollSeconds);
            }
            catch (Exception ex)
            {
                Print("[Critical Error] Initialization failed: {0}", ex.Message);
                _lastStatus = "INIT_FAILED";
                _lastError = ex.Message;
                RefreshDebugPanel();
            }
        }

        protected override void OnTimer()
        {
            if (_isPolling) return;
            
            // Alternating between Poll and Sync
            if (DateTime.Now - _lastSyncTime > TimeSpan.FromMinutes(1))
            {
                _ = SyncWithVpsAsync();
            }
            else
            {
                _ = PollSignalsAsync();
            }
            
            RefreshDebugPanel();
        }

        private async Task SyncWithVpsAsync()
        {
            _isPolling = true;
            
            // Collect positions on main thread
            var posList = new List<string>();
            var accountId = "";
            double balance = 0, equity = 0, margin = 0, freeMargin = 0;

            var tcs = new TaskCompletionSource<bool>();
            BeginInvokeOnMainThread(() => {
                try {
                    accountId = Account.Number.ToString();
                    balance = Account.Balance;
                    equity = Account.Equity;
                    margin = Account.Margin;
                    freeMargin = Account.FreeMargin;

                    foreach (var pos in Positions) {
                        if (pos.Label == MagicNumber.ToString()) {
                            string sid = string.IsNullOrEmpty(pos.Comment) ? pos.Label : pos.Comment;
                            posList.Add(string.Format(System.Globalization.CultureInfo.InvariantCulture,
                                "{{\"signal_id\":\"{0}\",\"status\":\"START\",\"ticket\":\"{1}\",\"symbol\":\"{2}\",\"pnl\":{3:F2},\"opened_at\":\"{4}\"}}",
                                sid, pos.Id, pos.SymbolName, pos.GrossProfit, pos.EntryTime.ToString("yyyy-MM-ddTHH:mm:ssZ")));
                        }
                    }
                } finally { tcs.SetResult(true); }
            });
            await tcs.Task;

            try
            {
                var stateHash = string.Join(",", posList);
                if (stateHash == _lastStateHash && DateTime.Now - _lastSyncTime < TimeSpan.FromMinutes(5))
                {
                    _lastSyncSummary = "STABLE";
                    _isPolling = false;
                    return;
                }
                _lastStateHash = stateHash;

                var body = string.Format(System.Globalization.CultureInfo.InvariantCulture,
                    "{{\"account_id\":\"{0}\",\"balance\":{1:F2},\"equity\":{2:F2},\"margin\":{3:F2},\"free_margin\":{4:F2},\"positions\":[{5}],\"orders\":[],\"closed\":[]}}",
                    accountId, balance, equity, margin, freeMargin, string.Join(",", posList));

                Print("[Sync] Sending: {0}", body);

                var url = ServerBaseUrl.TrimEnd('/') + "/mt5/ea/sync-v2";
                var content = new StringContent(body, Encoding.UTF8, "application/json");
                content.Headers.Add("x-api-key", EaApiKey);

                var response = await _httpClient.PostAsync(url, content);
                if (response.IsSuccessStatusCode)
                {
                    _lastSyncTime = DateTime.Now;
                    _lastSyncSummary = "OK " + posList.Count + " pos";
                }
                else
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    Print("[Sync] Server Error: {0}", errorBody);
                    // Extract error message from json {"ok":false,"error":"..."}
                    var errorMsg = GetJsonValue(errorBody, "error");
                    if (string.IsNullOrEmpty(errorMsg)) errorMsg = response.StatusCode.ToString();
                    _lastSyncSummary = "FAIL " + errorMsg;
                }
            }
            catch (Exception ex)
            {
                _lastSyncSummary = "ERR " + ex.Message;
            }
            finally
            {
                _isPolling = false;
            }
        }

        private async Task PollSignalsAsync()
        {
            _isPolling = true;
            _pollCount++;
            try
            {
                var url = ServerBaseUrl.TrimEnd('/') + "/v2/broker/pull";

                using (var request = new HttpRequestMessage(System.Net.Http.HttpMethod.Get, url))
                {
                    request.Headers.Add("x-api-key", EaApiKey);
                    var response = await _httpClient.SendAsync(request);

                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync();
                        _lastPollTime = DateTime.Now;
                        _lastStatus = "POLL_OK";
                        BeginInvokeOnMainThread(() => {
                            ProcessResponse(json);
                        });
                    }
                    else
                    {
                        _failCount++;
                        _lastStatus = "HTTP_ERR";
                        _lastError = response.StatusCode.ToString();
                    }
                }
            }
            catch (Exception ex)
            {
                _failCount++;
                _lastStatus = "CONN_ERROR";
                _lastError = ex.Message;
                Print("Poll Error: {0}", ex.Message);
            }
            finally
            {
                _isPolling = false;
            }
        }

        private void ProcessResponse(string json)
        {
            if (string.IsNullOrEmpty(json) || !json.Contains("\"items\"")) return;

            var itemsMatch = Regex.Match(json, "\"items\"\\s*:\\s*\\[(.*?)\\]", RegexOptions.Singleline);
            if (!itemsMatch.Success) return;

            var itemsContent = itemsMatch.Groups[1].Value;
            var objects = Regex.Matches(itemsContent, "\\{(.*?)\\}", RegexOptions.Singleline);

            foreach (Match objMatch in objects)
            {
                var signalJson = "{" + objMatch.Groups[1].Value + "}";
                ExecuteSignal(signalJson);
            }
        }

        private void ExecuteSignal(string json)
        {
            var id = GetJsonValue(json, "signal_id");
            var action = GetJsonValue(json, "action").ToUpper();
            var symbolCode = GetJsonValue(json, "symbol");
            var volume = ParseDouble(GetJsonValue(json, "volume"));
            var sl = ParseDouble(GetJsonValue(json, "sl"));
            var tp = ParseDouble(GetJsonValue(json, "tp"));

            if (string.IsNullOrEmpty(id) || id == _lastSignalId) return;

            _lastSignalId = id;
            _lastAction = action;
            _lastSymbol = symbolCode;
            _lastStatus = "EXECUTING";

            var symbol = Symbols.GetSymbol(symbolCode);
            if (symbol == null)
            {
                _lastStatus = "SYM_ERR";
                _lastError = symbolCode;
                _ = AckAsync(id, "ERROR", "", "Symbol not found: " + symbolCode);
                return;
            }

            if (action == "CLOSE")
            {
                ClosePositions(symbolCode);
                _ = AckAsync(id, "CLOSED", "", "Symbol Closed");
                _successCount++;
                return;
            }

            TradeType? type = null;
            if (action == "BUY") type = TradeType.Buy;
            else if (action == "SELL") type = TradeType.Sell;

            if (type.HasValue)
            {
                var volumeUnits = symbol.QuantityToVolumeInUnits(volume);

                if (UseRiskPercentSizing && sl > 0)
                {
                    double entryPrice = type == TradeType.Buy ? symbol.Ask : symbol.Bid;
                    double riskPerUnit = Math.Abs(entryPrice - sl);
                    if (riskPerUnit > 0)
                    {
                        double balance = Account.Balance;
                        double riskAmount = balance * (MaxRiskPct / 100.0);
                        double rawVolume = riskAmount / (riskPerUnit * symbol.PipValue * 10);
                        volumeUnits = symbol.NormalizeVolumeInUnits(rawVolume, RoundingMode.Down);
                    }
                }

                // Label = MagicNumber (for isolation)
                // Comment = id (signal_id for tracking)
                var result = ExecuteMarketOrder(type.Value, symbol.Name, volumeUnits, MagicNumber.ToString(), sl, tp, id);
                if (result.IsSuccessful)
                {
                    _successCount++;
                    _lastStatus = "EXEC_OK";
                    _ = AckAsync(id, "OPENED", result.Position.Id.ToString(), "Success");
                }
                else
                {
                    _failCount++;
                    _lastStatus = "EXEC_ERR";
                    _lastError = result.Error.ToString();
                    _ = AckAsync(id, "ERROR", "", result.Error.ToString());
                }
            }
        }

        private void ClosePositions(string symbolCode)
        {
            foreach (var position in Positions)
            {
                if (position.SymbolName == symbolCode && position.Label == MagicNumber.ToString())
                {
                    ClosePosition(position);
                }
            }
        }

        private async Task AckAsync(string signalId, string status, string ticket, string error)
        {
            try
            {
                var url = ServerBaseUrl.TrimEnd('/') + "/v2/broker/sync";
                var payload = string.Format("{{\"signal_id\":\"{0}\", \"status\":\"{1}\", \"ticket\":\"{2}\", \"error\":\"{3}\"}}",
                    signalId, status, ticket, error);

                var content = new StringContent(payload, Encoding.UTF8, "application/json");
                content.Headers.Add("x-api-key", EaApiKey);

                await _httpClient.PostAsync(url, content);
            }
            catch (Exception ex)
            {
                Print("Ack Error: {0}", ex.Message);
            }
        }

        private void RefreshDebugPanel()
        {
            BeginInvokeOnMainThread(() =>
            {
                var statusColor = _lastStatus.Contains("ERR") || _lastStatus.Contains("FAIL") ? Color.Red : Color.Aqua;

                var activeTrades = new List<string>();
                try
                {
                    foreach (var pos in Positions)
                    {
                        if (pos.Label == MagicNumber.ToString())
                        {
                            string side = pos.TradeType == TradeType.Buy ? "B" : "S";
                            string sid = string.IsNullOrEmpty(pos.Comment) ? "Manual" : pos.Comment;
                            if (sid.Length > 8) sid = sid.Substring(0, 8);
                            activeTrades.Add(string.Format("{0} {1} {2}", sid, pos.SymbolName, side));
                        }
                    }
                }
                catch { }

                var text = string.Format(
                    "--- TVBridge cTrader Pro ---\n" +
                    "Build: {0}\n" +
                    "Status: {1}\n" +
                    "Sync: {2} [{3}]\n" +
                    "Polls: {4} (OK: {5} / ERR: {6})\n" +
                    "Last Poll: {7}\n" +
                    "------------------------\n" +
                    "VPS Trades ({8}):\n{9}\n" +
                    "------------------------\n" +
                    "Last ID: {10}\n" +
                    "Action: {11} {12}\n" +
                    "Error: {13}",
                    BuildVersion, _lastStatus,
                    _lastSyncSummary, _lastSyncTime == DateTime.MinValue ? "Never" : _lastSyncTime.ToString("HH:mm:ss"),
                    _pollCount, _successCount, _failCount,
                    _lastPollTime == DateTime.MinValue ? "Never" : _lastPollTime.ToString("HH:mm:ss"),
                    activeTrades.Count,
                    activeTrades.Count > 0 ? string.Join("\n", activeTrades.Take(5)) : "None",
                    _lastSignalId, _lastAction, _lastSymbol,
                    string.IsNullOrEmpty(_lastError) ? "None" : _lastError
                );

                Chart.DrawStaticText("DebugPanel", text, VerticalAlignment.Top, HorizontalAlignment.Left, statusColor);
            });
        }

        private string GetJsonValue(string json, string key)
        {
            var match = Regex.Match(json, string.Format("\"{0}\"\\s*:\\s*\"?(.*?)\"?[,}}]", key));
            return match.Success ? match.Groups[1].Value.Trim('\"') : "";
        }

        private double ParseDouble(string val)
        {
            double res;
            return double.TryParse(val, out res) ? res : 0;
        }
    }
}
