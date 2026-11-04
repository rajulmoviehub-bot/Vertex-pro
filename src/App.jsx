import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, TrendingDown, RefreshCw, Zap, ShieldAlert, Award, Bot, 
  Activity, DollarSign, Settings, ChevronRight, Play, Square, History, BarChart2, MessageSquare, Clock
} from 'lucide-react';

export default function App() {
  const [balance, setBalance] = useState(0.00);
  const [stake, setStake] = useState(10);
  const [market, setMarket] = useState('Volatility 10 (1s) Index');
  const [contractType, setContractType] = useState('Even/Odd');
  const [tradeMode, setTradeMode] = useState('AUTO'); // 'AUTO' or 'MANUAL'
  const [prediction, setPrediction] = useState('Even');
  const [duration, setDuration] = useState(2);
  const [target, setTarget] = useState(200);
  const [stopLoss, setStopLoss] = useState(999);
  const [multiplier, setMultiplier] = useState(2);
  
  const [digits, setDigits] = useState([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const [lastDigit, setLastDigit] = useState(5);
  const [currentPrice, setCurrentPrice] = useState('9449.845');
  const [stats, setStats] = useState({ 0: 10.3, 1: 8.8, 2: 9.0, 3: 9.0, 4: 10.6, 5: 10.6, 6: 11.8, 7: 11.5, 8: 9.2, 9: 9.2 });
  const [trades, setTrades] = useState([]);
  const [sessionPL, setSessionPL] = useState(0.00);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);

  // Connect to Deriv Public WebSocket Feed
  useEffect(() => {
    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        ticks: '1HZ10V',
        subscribe: 1
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.tick) {
        const quoteStr = data.tick.quote.toFixed(3);
        const lastChar = quoteStr.slice(-1);
        const nextDigit = parseInt(lastChar, 10);

        setCurrentPrice(quoteStr);
        setLastDigit(nextDigit);
        setDigits(prev => [...prev.slice(1), nextDigit]);
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
  }, []);

  // Execute Trade Contract
  const executeTrade = (type) => {
    const isWin = lastDigit % 2 === 0 ? type === 'Even' : type === 'Odd';
    const payout = isWin ? stake * 0.95 : -stake;
    
    setBalance(prev => prev + payout);
    setSessionPL(prev => prev + payout);
    
    const newTrade = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      type: contractType,
      prediction: type,
      stake: stake,
      payout: payout,
    };
    
    setTrades(prev => [newTrade, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#0c1017] text-gray-100 font-sans flex flex-col pb-16">
      {/* Top Header Bar */}
      <header className="bg-[#121824] border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button className="text-gray-300">
            <Activity className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold tracking-wide flex items-center gap-1">
            VELTEX<span className="text-red-500 font-black">pro</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#161d2b] border border-gray-800 rounded-full px-3 py-1 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center">R</span>
            <span className="text-sm font-mono font-bold text-gray-200">${balance.toFixed(2)}</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          <button className="text-gray-300">
            <span className="sr-only">Sound</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
          </button>
          <button className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-md transition-all shadow-md shadow-red-900/30">
            Deposit
          </button>
        </div>
      </header>

      {/* Contract Sub-Nav */}
      <div className="bg-[#161d2b] border-b border-gray-800 px-4 py-2 flex items-center justify-between">
        {['Matches/Differs', 'Even/Odd', 'Over/Under'].map((type) => (
          <button
            key={type}
            onClick={() => setContractType(type)}
            className={`text-xs font-semibold px-3 py-1.5 rounded transition-all ${
              contractType === type 
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="px-4 py-1 text-[11px] text-gray-400 flex items-center justify-between">
        <span>How to trade Even/Odd?</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </div>

      {/* Chart Section */}
      <div className="bg-[#121824] border-y border-gray-800 p-4 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-[#1c2436] text-red-400 text-xs font-mono font-bold px-2 py-1 rounded border border-gray-700">1T</span>
            <div className="bg-[#1c2436] border border-gray-700 px-3 py-1 rounded flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-white">Volatility 10 (1s) Index</span>
              <span className="text-xs font-mono text-red-400">{currentPrice}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 rotate-90" />
            </div>
          </div>
          <button className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">View</button>
        </div>

        {/* Simulated SVG Wave Chart matching screenshot */}
        <div className="h-44 w-full relative flex items-end justify-between overflow-hidden border-b border-gray-800 pb-2">
          <div className="absolute right-4 top-1/3 bg-white text-black font-mono font-bold text-xs px-2 py-1 rounded shadow-lg flex items-center gap-1">
            {currentPrice} <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
          </div>
          <svg className="absolute inset-0 w-full h-full text-red-500 overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 150">
            <path d="M 0,120 Q 30,100 60,130 T 120,80 T 180,40 T 240,90 T 300,50 T 360,30 L 400,65" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="360" cy="30" r="4" fill="#ffffff" stroke="#ef4444" strokeWidth="3" />
          </svg>
        </div>

        {/* Digit Distribution Bar Row */}
        <div className="grid grid-cols-10 gap-1 mt-4 pt-2">
          {Object.entries(stats).map(([digit, val]) => (
            <div key={digit} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-400 font-mono">{val}%</span>
              <div className={`w-full h-10 rounded flex flex-col justify-end p-0.5 border ${Number(digit) === lastDigit ? 'bg-red-950/40 border-red-500' : 'bg-[#0c1017] border-gray-800'}`}>
                <div className={`w-full rounded-sm ${Number(digit) === lastDigit ? 'bg-red-600' : 'bg-gray-700'}`} style={{ height: `${val * 2.5}%` }}></div>
              </div>
              <span className={`text-xs font-mono font-bold ${Number(digit) === lastDigit ? 'text-red-500' : 'text-gray-300'}`}>{digit}</span>
              {Number(digit) === lastDigit && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 -mt-1"></span>}
            </div>
          ))}
        </div>
      </div>

      {/* Auto / Manual Mode Switch */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 bg-[#121824] p-1 rounded-xl border border-gray-800">
          <button 
            onClick={() => setTradeMode('AUTO')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${tradeMode === 'AUTO' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'}`}
          >
            AUTO
          </button>
          <button 
            onClick={() => setTradeMode('MANUAL')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${tradeMode === 'MANUAL' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'}`}
          >
            MANUAL
          </button>
        </div>

        {/* Duration */}
        <div className="bg-[#121824] border border-gray-800 rounded-xl p-3">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>DURATION</span>
            <span className="font-bold text-white font-mono">{duration} ticks</span>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`py-1.5 text-xs font-mono rounded font-bold border ${duration === d ? 'bg-red-600 text-white border-red-500' : 'bg-[#0c1017] text-gray-400 border-gray-800'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Stake & Session P/L */}
        <div className="grid grid-cols-2 gap-3 bg-[#121824] border border-gray-800 rounded-xl p-3 items-center">
          <div>
            <span className="text-[10px] text-gray-400 block uppercase">Stake</span>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setStake(Math.max(1, stake - 1))} className="w-7 h-7 bg-gray-800 rounded flex items-center justify-center text-lg font-bold">-</button>
              <span className="font-mono font-bold text-base text-red-500">${stake}</span>
              <button onClick={() => setStake(stake + 1)} className="w-7 h-7 bg-gray-800 rounded flex items-center justify-center text-lg font-bold">+</button>
            </div>
          </div>
          <div className="border-l border-gray-800 pl-3">
            <span className="text-[10px] text-gray-400 block uppercase">Session P/L</span>
            <span className={`font-mono font-bold text-base mt-1 block ${sessionPL >= 0 ? 'text-gray-200' : 'text-red-400'}`}>
              {sessionPL >= 0 ? `+$${sessionPL.toFixed(2)}` : `-$${Math.abs(sessionPL).toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Target, Stop Loss, Multiplier */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-2.5 text-center">
            <span className="text-[9px] text-gray-400 block">🎯 TARGET</span>
            <span className="font-mono font-bold text-sm text-white">${target}</span>
          </div>
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-2.5 text-center">
            <span className="text-[9px] text-gray-400 block">🛑 STOP LOSS</span>
            <span className="font-mono font-bold text-sm text-white">${stopLoss}</span>
          </div>
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-2.5 text-center">
            <span className="text-[9px] text-gray-400 block">⚡ MULT</span>
            <span className="font-mono font-bold text-sm text-white">x {multiplier}</span>
          </div>
        </div>

        {/* Prediction Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button 
            onClick={() => executeTrade('Even')}
            className="bg-[#121824] hover:bg-[#1c2436] border border-gray-800 rounded-xl p-3 text-left transition-all relative overflow-hidden group"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-white text-sm">Even</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">$19.52</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">95.20% payout</span>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
          </button>

          <button 
            onClick={() => executeTrade('Odd')}
            className="bg-[#121824] hover:bg-[#1c2436] border border-red-500/50 rounded-xl p-3 text-left transition-all relative overflow-hidden group shadow-lg shadow-red-950/40"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-red-500 text-sm">Odd</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">$19.52</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">95.20% payout</span>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"></div>
          </button>
        </div>
      </div>

      {/* Bottom Mobile Navigation Bar matching screenshot */}
      <nav className="bg-[#121824] border-t border-gray-800 fixed bottom-0 left-0 right-0 py-2.5 px-6 flex items-center justify-around z-50">
        <button className="flex flex-col items-center text-gray-400 hover:text-white">
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] mt-1">Live Chat</span>
        </button>
        <button className="flex flex-col items-center text-red-500">
          <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50 -mt-3 border-2 border-[#121824]">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 font-bold">AI</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 hover:text-white">
          <Clock className="w-5 h-5" />
          <span className="text-[10px] mt-1">Positions</span>
        </button>
      </nav>
    </div>
  );
}
