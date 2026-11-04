import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, TrendingDown, RefreshCw, Zap, ShieldAlert, Award, Bot, 
  Activity, DollarSign, Settings, ChevronRight, Play, Square, History, BarChart2
} from 'lucide-react';

export default function App() {
  const [balance, setBalance] = useState(1000.00);
  const [stake, setStake] = useState(10);
  const [market, setMarket] = useState('1HZ10V'); // Volatility 10 (1s) Index symbol
  const [contractType, setContractType] = useState('Even/Odd');
  const [prediction, setPrediction] = useState('Even');
  const [duration, setDuration] = useState(2);
  const [autoTrading, setAutoTrading] = useState(false);
  
  const [digits, setDigits] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [lastDigit, setLastDigit] = useState(0);
  const [currentPrice, setCurrentPrice] = useState('0.00');
  const [stats, setStats] = useState({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
  const [trades, setTrades] = useState([]);
  const [sessionPL, setSessionPL] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);

  // Connect to Deriv Public WebSocket Feed
  useEffect(() => {
    // Deriv App ID 1089 is public demo app id
    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Subscribe to Volatility 10 (1s) Index ticks
      ws.send(JSON.stringify({
        ticks: market,
        subscribe: 1
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.tick) {
        const quoteStr = data.tick.quote.toFixed(data.tick.pip_size || 2);
        const lastChar = quoteStr.slice(-1);
        const nextDigit = parseInt(lastChar, 10);

        setCurrentPrice(quoteStr);
        setLastDigit(nextDigit);
        setDigits(prev => [...prev.slice(1), nextDigit]);
        setStats(prev => ({ ...prev, [nextDigit]: (prev[nextDigit] || 0) + 1 }));
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
        ws.close();
      }
    };
  }, [market]);

  // Execute Trade Contract
  const executeTrade = (typeOverride) => {
    const activeType = typeOverride || prediction;
    const isWin = lastDigit % 2 === 0 ? activeType === 'Even' : activeType === 'Odd';
    const payout = isWin ? stake * 0.95 : -stake;
    
    setBalance(prev => prev + payout);
    setSessionPL(prev => prev + payout);
    
    const newTrade = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      type: contractType,
      prediction: activeType,
      stake: stake,
      payout: payout,
      status: isWin ? 'WIN' : 'LOSS'
    };
    
    setTrades(prev => [newTrade, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0c1017] text-gray-100 font-sans flex flex-col">
      {/* Top Navigation */}
      <header className="bg-[#121824] border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-red-900/40 text-white">
            V
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider flex items-center gap-1.5">
              VERTEX <span className="text-red-500 font-black text-xs uppercase tracking-widest px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 rounded">pro</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">High Frequency Options</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="bg-[#0c1017] border border-gray-800 rounded-lg px-4 py-1.5 flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium">Balance:</span>
            <span className="text-lg font-bold font-mono text-emerald-400">${balance.toFixed(2)}</span>
          </div>
          <button className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-md shadow-red-900/30">
            Deposit
          </button>
        </div>
      </header>

      {/* Contract Selector Bar */}
      <div className="bg-[#161d2b] border-b border-gray-800 px-6 py-2 flex items-center gap-4">
        {['Matches/Differs', 'Even/Odd', 'Over/Under'].map((type) => (
          <button
            key={type}
            onClick={() => setContractType(type)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              contractType === type 
                ? 'bg-red-600/20 text-red-400 border border-red-500/40' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Main Trading Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4">
        
        {/* Left Column: Charts & Digits (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Main Display Box */}
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-5 flex flex-col gap-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Deriv Live Feed</span>
                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                  Volatility 10 (1s) Index 
                  <span className="text-sm font-mono text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50">
                    {currentPrice}
                  </span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className={`text-xs font-mono ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isConnected ? 'LIVE FEED ACTIVE' : 'CONNECTING...'}
                </span>
              </div>
            </div>

            {/* Live Digit Display Monitor */}
            <div className="flex items-center justify-center gap-3 py-8 bg-[#0c1017]/60 rounded-xl border border-gray-800/80">
              {digits.map((digit, idx) => (
                <div 
                  key={idx}
                  className={`w-12 h-16 rounded-lg flex items-center justify-center font-mono text-2xl font-bold transition-all duration-300 ${
                    idx === digits.length - 1 
                      ? 'bg-red-600 text-white scale-110 shadow-lg shadow-red-600/40 ring-2 ring-red-400' 
                      : 'bg-[#182030] text-gray-400 border border-gray-800'
                  }`}
                >
                  {digit}
                </div>
              ))}
            </div>

            {/* Last Digit Distribution Stats */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span className="font-medium">Digit Frequency Distribution</span>
                <span>Live Stream</span>
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {Object.entries(stats).map(([digit, count]) => (
                  <div key={digit} className="flex flex-col items-center gap-1">
                    <div className="w-full bg-[#0c1017] rounded h-16 flex flex-col justify-end p-1 border border-gray-800">
                      <div 
                        className={`w-full rounded-sm transition-all duration-300 ${
                          Number(digit) === lastDigit ? 'bg-red-500' : 'bg-emerald-500/40'
                        }`}
                        style={{ height: `${Math.min(count * 4, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono text-gray-400">{digit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trade Execution History */}
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-4 flex-1 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-red-500" /> Recent Positions
            </h3>
            <div className="overflow-y-auto max-h-48 flex-1">
              {trades.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-8">No executed contracts yet.</div>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Prediction</th>
                      <th className="pb-2">Stake</th>
                      <th className="pb-2 text-right">Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40">
                    {trades.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-800/30">
                        <td className="py-2 text-gray-400">{t.time}</td>
                        <td className="py-2">{t.type}</td>
                        <td className="py-2 font-bold text-gray-200">{t.prediction}</td>
                        <td className="py-2">${t.stake}</td>
                        <td className={`py-2 text-right font-bold ${t.payout >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.payout >= 0 ? `+$${t.payout.toFixed(2)}` : `-$${Math.abs(t.payout).toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Order Control Panel (1 col) */}
        <div className="bg-[#121824] border border-gray-800 rounded-xl p-5 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-red-500" /> Contract Config
              </span>
            </div>

            {/* Stake Input */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Stake Amount ($)</label>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
                className="w-full bg-[#0c1017] border border-gray-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Duration Selector */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Ticks Duration</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((t) => (
                  <button
                    key={t}
                    onClick={() => setDuration(t)}
                    className={`py-1.5 text-xs font-mono rounded border ${
                      duration === t 
                        ? 'bg-red-600 text-white border-red-500' 
                        : 'bg-[#0c1017] text-gray-400 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {t}t
                  </button>
                ))}
              </div>
            </div>

            {/* Session Stats */}
            <div className="bg-[#0c1017] p-3 rounded-lg border border-gray-800 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Session P/L:</span>
                <span className={sessionPL >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {sessionPL >= 0 ? `+$${sessionPL.toFixed(2)}` : `-$${Math.abs(sessionPL).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Execution Action Buttons */}
          <div className="space-y-3">
            {contractType === 'Even/Odd' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => executeTrade('Even')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/30 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  Even
                </button>
                <button
                  onClick={() => executeTrade('Odd')}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-900/30 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  Odd
                </button>
              </div>
            )}

            {contractType !== 'Even/Odd' && (
              <button
                onClick={() => executeTrade(prediction)}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-900/40 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> Purchase Contract
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
