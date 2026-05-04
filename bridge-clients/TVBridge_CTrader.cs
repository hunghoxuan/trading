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

        private string BuildVersion = "v2026.05.04 14:46 - 8d1d33a";
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

        private static readonly HttpClient _httpClient = new HttpClient();

        protected override void OnStart()
        {
            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls13;

                if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
                {
                    _httpClient.DefaultRequestHeaders.Add("User-Agent", "cTrader-TVBridge");
                }

                _httpClient.Timeout = TimeSpan.FromSeconds(10);

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
            _ = PollSignalsAsync();
            RefreshDebugPanel();
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
                        ProcessResponse(json);
                    }
                    else
                    {
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
            if (string.IsNullOrEmpty(json) || !json.Contains("\"signals\"")) return;

            var signalsMatch = Regex.Match(json, "\"signals\"\\s*:\\s*\\[(.*?)\\]", RegexOptions.Singleline);
            if (!signalsMatch.Success) return;

            var signalsContent = signalsMatch.Groups[1].Value;
            var objects = Regex.Matches(signalsContent, "\\{(.*?)\\}", RegexOptions.Singleline);

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

                var result = ExecuteMarketOrder(type.Value, symbol.Name, volumeUnits, id, sl, tp);
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
                if (position.SymbolName == symbolCode)
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
            var text = string.Format(
                "--- TVBridge cTrader Pro ---\n" +
                "Build: {0}\n" +
                "Status: {1}\n" +
                "Polls: {2} (OK: {3} / ERR: {4})\n" +
                "Last Poll: {5}\n" +
                "------------------------\n" +
                "Last ID: {6}\n" +
                "Action: {7} {8}\n" +
                "Error: {9}\n" +
                "------------------------\n" +
                "Balance: {10} {11}\n" +
                "Equity: {12} {11}",
                BuildVersion, _lastStatus,
                _pollCount, _successCount, _failCount,
                _lastPollTime == DateTime.MinValue ? "Never" : _lastPollTime.ToString("HH:mm:ss"),
                _lastSignalId, _lastAction, _lastSymbol,
                string.IsNullOrEmpty(_lastError) ? "None" : _lastError,
                Account.Balance.ToString("N2"), Account.Asset.Name,
                Account.Equity.ToString("N2")
            );

            Chart.DrawStaticText("DebugPanel", text, VerticalAlignment.Top, HorizontalAlignment.Left, Color.Aqua);
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
