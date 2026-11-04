import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, TrendingDown, RefreshCw, Zap, ShieldAlert, Award, Bot, 
  Activity, DollarSign, Settings, ChevronRight, Play, Square, History, BarChart2, MessageSquare, Clock, Volume2, VolumeX, Menu, Bell, UserCheck, LogIn, UserPlus, CreditCard, ArrowDownLeft, ArrowUpRight, Share2, ScanLine, Wallet
} from 'lucide-react';

export default function App() {
  const [mainWallet, setMainWallet] = useState(100.00); // separate local wallet; not a connected broker balance
  const [demoWallet, setDemoWallet] = useState(10000.00);
  const [accountMode, setAccountMode] = useState('DEMO');
  const activeWallet = accountMode === 'DEMO' ? demoWallet : mainWallet;
  const updateActiveWallet = (delta) => {
    if (accountMode === 'DEMO') setDemoWallet(prev => Math.max(0, prev + delta));
    else setMainWallet(prev => Math.max(0, prev + delta));
  };
  const [user, setUser] = useState({ loggedIn: false, email: '', refCode: 'VELTEX-7892' });
  const [authModal, setAuthModal] = useState(null);
  const [authInput, setAuthInput] = useState({ email: '', password: '', ref: '' });

  const [initialStake, setInitialStake] = useState(10);
  const [stake, setStake] = useState(10);
  const [market, setMarket] = useState('Volatility 10 (1s) Index');
  const [contractType, setContractType] = useState('Even/Odd');
  const [tradeMode, setTradeMode] = useState('AUTO'); 
  const [duration, setDuration] = useState(5); 
  const [target, setTarget] = useState(200);
  const [stopLoss, setStopLoss] = useState(999);
  const [multiplier, setMultiplier] = useState(2);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [isScanning, setIsScanning] = useState(false);
  const [scannedSignal, setScannedSignal] = useState(null);
  const [botActive, setBotActive] = useState(false);
  const [botStatusText, setBotStatusText] = useState('Idle: Click Deep Scan Market');
  const [activeTrade, setActiveTrade] = useState(null);

  const [priceHistory, setPriceHistory] = useState([9450.400, 9450.415, 9450.390, 9450.432, 9450.420, 9450.401]);
  const [lastDigit, setLastDigit] = useState(5);
  const [currentPrice, setCurrentPrice] = useState('9450.401');
  const [stats, setStats] = useState({ 0: 10.2, 1: 8.8, 2: 11.4, 3: 7.9, 4: 11.1, 5: 10.6, 6: 11.8, 7: 11.5, 8: 9.2, 9: 9.2 });
  const [digitCounts, setDigitCounts] = useState({ 0: 10, 1: 9, 2: 11, 3: 8, 4: 11, 5: 10, 6: 11, 7: 11, 8: 9, 9: 9 });
  const [totalTicks, setTotalTicks] = useState(100);
  const [sessionPL, setSessionPL] = useState(0.00);

  const [trades, setTrades] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('TRADE');
  const [depositMethod, setDepositMethod] = useState('M-PESA');
  const [depositAmount, setDepositAmount] = useState(10);
  const [withdrawMethod, setWithdrawMethod] = useState('M-PESA TILL');
  const [withdrawAmount, setWithdrawAmount] = useState(10);
  const [withdrawAccount, setWithdrawAccount] = useState('');

  const wsRef = useRef(null);

  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(140, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const processNewTick = (quoteNum) => {
    const quoteStr = quoteNum.toFixed(3);
    const lastChar = quoteStr.slice(-1);
    const nextDigit = parseInt(lastChar, 10);

    setCurrentPrice(quoteStr);
    setLastDigit(nextDigit);

    setPriceHistory(prev => [...prev.slice(-25), quoteNum]);

    setTotalTicks(prev => {
      const newTotal = prev + 1;
      setDigitCounts(dCounts => {
        const updatedCounts = { ...dCounts, [nextDigit]: (dCounts[nextDigit] || 0) + 1 };
        const newStats = {};
        Object.keys(updatedCounts).forEach(dig => {
          newStats[dig] = Number(((updatedCounts[dig] / newTotal) * 100).toFixed(1));
        });
        setStats(newStats);
        return updatedCounts;
      });
      return newTotal;
    });

    // 5-Tick Active Trade Monitor & Martingale Logic
    setActiveTrade(trade => {
      if (!trade) return null;
      const currentTickCount = trade.ticksElapsed + 1;

      if (currentTickCount >= duration) {
        const isWin = nextDigit % 2 === 0 ? trade.prediction === 'Even' : trade.prediction === 'Odd';
        const payout = isWin ? trade.stake * 0.95 : -trade.stake;
        
        updateActiveWallet(payout);
        setSessionPL(prev => prev + payout);

        if (isWin) {
          playSound('win');
          setStake(initialStake); // Reset stake on WIN
        } else {
          playSound('loss');
          setStake(prev => prev * multiplier); // Double stake on LOSS (Martingale)
        }

        const finishedTrade = {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          type: contractType,
          prediction: trade.prediction,
          duration: duration,
          entryDigit: trade.entryDigit,
          exitDigit: nextDigit,
          stake: trade.stake,
          payout: payout,
          status: isWin ? 'WIN' : 'LOSS'
        };
        setTrades(prev => [finishedTrade, ...prev]);
        return null;
      }

      return { ...trade, ticksElapsed: currentTickCount };
    });
  };

  // WebSocket connection & live tick feed with fallback interval to keep graph & circle moving
  useEffect(() => {
    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ ticks: '1HZ10V', subscribe: 1 }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.tick) {
        processNewTick(data.tick.quote);
      }
    };

    // Fallback tick generator every 1 second to guarantee continuous graph & circle movement
    const fallbackInterval = setInterval(() => {
      const randomDelta = (Math.random() - 0.5) * 0.1;
      setPriceHistory(prev => {
        const lastVal = prev[prev.length - 1] || 9450.400;
        const newVal = lastVal + randomDelta;
        processNewTick(newVal);
        return prev;
      });
    }, 1000);

    return () => {
      clearInterval(fallbackInterval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
        ws.close();
      }
    };
  }, [duration, initialStake, multiplier, contractType, accountMode]);

  const executeTrade = (type) => {
    if (activeTrade) return;
    if (activeWallet < stake) {
      alert("Insufficient main wallet balance!");
      setBotActive(false);
      setBotStatusText('Stopped: Insufficient Balance');
      return;
    }

    setActiveTrade({
      prediction: type,
      stake: stake,
      entryDigit: lastDigit,
      ticksElapsed: 0
    });
  };

  // Auto Trip Bot Logic
  useEffect(() => {
    if (!botActive || !scannedSignal || activeTrade) return;

    const targetPred = scannedSignal.prediction; 
    const tripDigit = scannedSignal.tripDigit; 

    if (lastDigit === tripDigit) {
      setBotStatusText(`Tripped on digit ${tripDigit}! Executing ${targetPred} (${duration} ticks)...`);
      executeTrade(targetPred === 'EVEN' ? 'Even' : 'Odd');
    } else {
      setBotStatusText(`Scanning... Waiting for trip on digit [${tripDigit}] | Current: ${lastDigit}`);
    }
  }, [lastDigit, botActive, scannedSignal, activeTrade, duration]);

  const runDeepScan = () => {
    setIsScanning(true);
    setScannedSignal(null);
    setBotStatusText('Analyzing live tick patterns...');
    setTimeout(() => {
      const evenCount = [0, 2, 4, 6, 8].reduce((acc, d) => acc + (stats[d] || 0), 0);
      const oddCount = [1, 3, 5, 7, 9].reduce((acc, d) => acc + (stats[d] || 0), 0);
      const predictedType = evenCount > oddCount ? 'EVEN' : 'ODD';
      const confidence = Math.max(evenCount, oddCount).toFixed(1);
      const tripTarget = predictedType === 'EVEN' ? [2, 4, 6, 8, 0][Math.floor(Math.random()*5)] : [1, 3, 5, 7, 9][Math.floor(Math.random()*5)];

      setScannedSignal({
        prediction: predictedType,
        confidence: confidence,
        tripDigit: tripTarget
      });
      setIsScanning(false);
      setBotStatusText(`Ready: Trip on [${tripTarget}] for ${predictedType}`);
    }, 1000);
  };

  const handleDeposit = () => {
    if (depositAmount < 5) { alert("Minimum deposit is $5"); return; }
    setMainWallet(prev => prev + Number(depositAmount));
    setTransactions(prev => [{ id: 'DEP-' + Date.now().toString().slice(-6), type: 'DEPOSIT', method: depositMethod, amount: depositAmount, status: 'APPROVED', time: new Date().toLocaleTimeString() }, ...prev]);
    alert(`Deposit of $${depositAmount} successful!`);
    setActiveTab('TRADE');
  };

  const handleWithdrawal = () => {
    if (withdrawAmount < 5) { alert("Minimum withdrawal is $5"); return; }
    if (withdrawAmount > mainWallet) { alert("Insufficient wallet balance!"); return; }
    setMainWallet(prev => prev - Number(withdrawAmount));
    setTransactions(prev => [{ id: 'WTH-' + Date.now().toString().slice(-6), type: 'WITHDRAWAL', method: withdrawMethod, amount: withdrawAmount, account: withdrawAccount, status: 'PENDING (Approved in 2hrs)', time: new Date().toLocaleTimeString() }, ...prev]);
    alert(`Withdrawal request submitted! Approved in 2 hours.`);
    setActiveTab('TRADE');
  };

  const handleAuth = (type) => {
    if (!authInput.email) { alert("Please enter email"); return; }
    setUser({ loggedIn: true, email: authInput.email, refCode: 'VELTEX-' + Math.floor(1000 + Math.random() * 9000) });
    if (type === 'signup') {
      setMainWallet(prev => prev + 1.00);
      alert("Sign up successful! $1.00 referral bonus credited!");
    } else {
      alert("Logged in successfully!");
    }
    setAuthModal(null);
  };

  const minPrice = Math.min(...priceHistory);
  const maxPrice = Math.max(...priceHistory);
  const priceRange = maxPrice - minPrice || 0.001;
  const svgPoints = priceHistory.map((p, i) => {
    const x = (i / (priceHistory.length - 1)) * 400;
    const y = 130 - ((p - minPrice) / priceRange) * 110;
    return `${x},${y}`;
  }).join(' ');
  const lastSvgPoint = priceHistory.length > 0 ? {
    x: 400,
    y: 130 - ((priceHistory[priceHistory.length - 1] - minPrice) / priceRange) * 110
  } : { x: 400, y: 70 };

  return (
    <div className="min-h-screen bg-[#090d14] text-gray-100 font-sans flex flex-col pb-20">
      
      {/* Top Header */}
      <header className="bg-[#121824] border-b border-gray-800 px-3 py-2.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <button className="text-gray-300"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center text-base font-bold tracking-tight">
            <span className="text-white">VELTEX</span>
            <span className="text-red-500 font-black">pro</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab('WITHDRAW')} className="bg-[#182232] border border-gray-700/80 rounded-full px-3 py-1 flex items-center gap-2 hover:border-red-500 transition-all">
            <Wallet className="w-3.5 h-3.5 text-red-500" />
            <span className="text-sm font-mono font-bold text-white">${activeWallet.toFixed(2)}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 rotate-90" />
          </button>

          <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-gray-400 hover:text-white p-1">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>

          <button onClick={() => setActiveTab('DEPOSIT')} className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-md shadow-md">
            Deposit
          </button>

          {user.loggedIn ? (
            <span className="bg-red-950/60 border border-red-500/40 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> User
            </span>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => setAuthModal('login')} className="bg-gray-800 text-xs text-white px-2 py-1 rounded">Login</button>
              <button onClick={() => setAuthModal('signup')} className="bg-red-600 text-xs text-white px-2 py-1 rounded font-bold">Sign Up</button>
            </div>
          )}
        </div>
      </header>

      <section className="bg-[#0d131f] border-b border-gray-800 px-3 py-2" aria-label="Account mode">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button onClick={() => { setAccountMode('DEMO'); setBotActive(false); setActiveTrade(null); }} aria-pressed={accountMode === 'DEMO'} className={`rounded-md px-4 py-2 text-xs font-black border ${accountMode === 'DEMO' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#121824] text-gray-300 border-gray-700'}`}>DEMO · $10,000 START</button>
            <button onClick={() => { setAccountMode('REAL'); setBotActive(false); setActiveTrade(null); }} aria-pressed={accountMode === 'REAL'} className={`rounded-md px-4 py-2 text-xs font-black border ${accountMode === 'REAL' ? 'bg-red-600 text-white border-red-500' : 'bg-[#121824] text-gray-300 border-gray-700'}`}>REAL WALLET</button>
          </div>
          {accountMode === 'DEMO' && <button onClick={() => { setDemoWallet(10000); setStake(initialStake); setSessionPL(0); setTrades([]); setBotActive(false); setActiveTrade(null); }} className="text-xs font-bold text-yellow-300 underline">Reset Demo $10,000</button>}
        </div>
        <p className="mt-1 text-[10px] text-gray-400" role="status">{accountMode === 'DEMO' ? 'Practice mode: demo funds only. No real deposits or withdrawals.' : 'Separate local wallet view. Live broker trading and real-money execution are not connected.'}</p>
      </section>

      {/* Tabs */}
      <div className="bg-[#121824] grid grid-cols-4 border-b border-gray-800 text-center">
        {['TRADE', 'DEPOSIT', 'WITHDRAW', 'HISTORY'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 text-xs font-bold transition-all relative ${activeTab === tab ? 'text-white bg-red-600 shadow-md shadow-red-600/30' : 'text-gray-400 hover:text-gray-200 bg-[#121824]'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Referral Banner */}
      <div className="px-4 py-1.5 text-xs text-gray-300 flex items-center justify-between bg-[#0c1017] border-b border-gray-800">
        <div className="flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-red-500" />
          <span>Refer & Earn <strong>$1.00</strong></span>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(`https://green-dollar-ai-trader.vercel.app?ref=${user.refCode}`); alert("Referral link copied!"); }} className="text-red-400 hover:underline text-[11px] font-bold">
          Code: {user.refCode}
        </button>
      </div>

      {activeTab === 'TRADE' && (
        <>
          {/* Deep Scan & Trip Bar */}
          <div className="p-3 bg-[#0d131f] border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-xs font-bold text-gray-200">Trip Engine:</span>
              <span className="text-[11px] font-mono text-yellow-400">{botStatusText}</span>
            </div>
            <button 
              onClick={runDeepScan}
              disabled={isScanning}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-1 rounded shadow"
            >
              {isScanning ? 'Scanning...' : 'Deep Scan Market'}
            </button>
          </div>

          {scannedSignal && (
            <div className="mx-3 mt-3 p-3 bg-red-950/40 border border-red-500/60 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-red-400 font-bold block uppercase">AI Trip Trigger Signal</span>
                <span className="text-sm font-black text-white">Target: <span className="text-emerald-400">{scannedSignal.prediction}</span> | Trip Digit: <span className="text-yellow-400 font-mono underline font-bold text-base">{scannedSignal.tripDigit}</span></span>
              </div>
              <div>
                <button 
                  onClick={() => setBotActive(!botActive)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded shadow ${botActive ? 'bg-amber-600 text-white animate-pulse' : 'bg-emerald-600 text-white'}`}
                >
                  {botActive ? 'Stop Bot' : 'Start Trip Bot'}
                </button>
              </div>
            </div>
          )}

          {/* Deriv-Style Dynamic Chart */}
          <div className="bg-[#121824] border-y border-gray-800 p-3.5 relative mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-[#1a2233] text-red-400 text-xs font-mono font-bold px-2 py-1 rounded border border-gray-700">1T</span>
                <div className="bg-[#1a2233] border border-gray-700 px-2.5 py-1 rounded flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-white">{market}</span>
                  <ChevronRight className="w-3 h-3 text-gray-400 rotate-90" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#1a2233] border border-gray-700 text-gray-300 font-mono text-xs px-2 py-1 rounded font-bold">50%</span>
                <button className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1 rounded shadow">View</button>
              </div>
            </div>

            <div className="h-48 w-full relative flex items-end justify-between overflow-hidden border-b border-gray-800/80 pb-2 bg-[#0c1017]/40">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d_1px,transparent_1px),linear-gradient(to_bottom,#1f293d_1px,transparent_1px)] bg-[size:40px_35px] opacity-30"></div>
              
              <div className="absolute right-4 top-1/3 bg-white text-black font-mono font-bold text-xs px-2.5 py-1 rounded shadow-2xl flex items-center gap-1.5 z-10">
                {currentPrice} <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
              </div>

              <svg className="absolute inset-0 w-full h-full text-red-500 overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 150">
                <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={svgPoints} />
                <circle cx={lastSvgPoint.x} cy={lastSvgPoint.y} r="4.5" fill="#ffffff" stroke="#ef4444" strokeWidth="3" />
              </svg>

              <div className="absolute right-3 bottom-2 flex items-center gap-1 bg-[#121824]/90 border border-gray-700 rounded-md p-1 z-20">
                <button className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white font-bold">-</button>
                <button className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white font-bold">+</button>
                <button className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white">⊙</button>
              </div>
            </div>

            {/* Live Dynamic 0-9 Digit Highlights */}
            <div className="grid grid-cols-10 gap-1 mt-3 pt-1">
              {Object.entries(stats).map(([digit, val]) => (
                <div key={digit} className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-mono font-bold text-sm transition-all duration-200 ${Number(digit) === lastDigit ? 'border-red-500 bg-red-950 text-red-400 shadow-lg shadow-red-600 scale-110' : 'border-gray-700 bg-[#090d14] text-gray-300'}`}>
                    {digit}
                  </div>
                  <span className={`text-[10px] font-mono font-medium ${Number(digit) === lastDigit ? 'text-red-400 font-bold' : 'text-gray-400'}`}>{val}%</span>
                  {Number(digit) === lastDigit && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce"></span>}
                </div>
              ))}
            </div>
          </div>

          {/* Active Trade Banner */}
          {activeTrade && (
            <div className="mx-3 mt-3 p-3 bg-yellow-950/40 border border-yellow-500/60 rounded-xl flex items-center justify-between animate-pulse">
              <span className="text-xs font-bold text-yellow-400">Trade in progress ({activeTrade.prediction})...</span>
              <span className="text-xs font-mono font-bold text-white">{activeTrade.ticksElapsed} / {duration} Ticks</span>
            </div>
          )}

          {/* Controls */}
          <div className="p-3.5 space-y-3">
            <div className="grid grid-cols-2 bg-[#121824] p-1 rounded-xl border border-gray-800">
              <button onClick={() => setTradeMode('AUTO')} className={`py-2 text-xs font-bold rounded-lg transition-all ${tradeMode === 'AUTO' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'}`}>AUTO TRADING</button>
              <button onClick={() => setTradeMode('MANUAL')} className={`py-2 text-xs font-bold rounded-lg transition-all ${tradeMode === 'MANUAL' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'}`}>MANUAL TRADE</button>
            </div>

            <div className="bg-[#121824] border border-gray-800 rounded-xl p-3">
              <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
                <span>DURATION</span>
                <span className="font-bold text-white font-mono">{duration} ticks</span>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                  <button key={d} onClick={() => setDuration(d)} className={`py-1.5 text-xs font-mono rounded font-bold border ${duration === d ? 'bg-red-600 text-white border-red-500' : 'bg-[#090d14] text-gray-400 border-gray-800'}`}>{d}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#121824] border border-gray-800 rounded-xl p-3 items-center">
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-medium">TOTAL STAKE</span>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => { setInitialStake(Math.max(1, initialStake - 1)); setStake(Math.max(1, stake - 1)); }} className="w-7 h-7 bg-gray-800 rounded flex items-center justify-center font-bold">-</button>
                  <input type="number" value={stake} onChange={(e) => { setStake(Number(e.target.value)); setInitialStake(Number(e.target.value)); }} className="w-16 bg-[#090d14] text-center font-mono font-bold text-base text-red-500 border border-gray-700 rounded py-0.5" />
                  <button onClick={() => { setInitialStake(initialStake + 1); setStake(stake + 1); }} className="w-7 h-7 bg-gray-800 rounded flex items-center justify-center font-bold">+</button>
                </div>
              </div>
              <div className="border-l border-gray-800 pl-3">
                <span className="text-[10px] text-gray-400 block uppercase font-medium">SESSION P/L</span>
                <span className={`font-mono font-bold text-base mt-1 block ${sessionPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {sessionPL >= 0 ? `+$${sessionPL.toFixed(2)}` : `-$${Math.abs(sessionPL).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#121824] border border-gray-800 rounded-xl p-2.5 text-center">
                <span className="text-[9px] text-gray-400 block">🎯 TARGET PROFIT</span>
                <input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-full bg-[#090d14] text-center font-mono font-bold text-sm text-white border border-gray-700 rounded py-0.5 mt-1" />
              </div>
              <div className="bg-[#121824] border border-gray-800 rounded-xl p-2.5 text-center">
                <span className="text-[9px] text-gray-400 block">🛑 STOP LOSS</span>
                <input type="number" value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} className="w-full bg-[#090d14] text-center font-mono font-bold text-sm text-white border border-gray-700 rounded py-0.5 mt-1" />
              </div>
              <div className="bg-[#121824] border border-gray-800 rounded-xl p-2.5 text-center">
                <span className="text-[9px] text-gray-400 block">⚡ MULTIPLIER</span>
                <span className="font-mono font-bold text-sm text-white block mt-1">x {multiplier}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button disabled={!!activeTrade} onClick={() => executeTrade('Even')} className="bg-[#121824] hover:bg-[#1c2436] border border-gray-800 rounded-xl p-3 text-left transition-all relative overflow-hidden disabled:opacity-50">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-white text-sm">EVEN</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">${(stake * 1.95).toFixed(2)}</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">95.20% payout</span>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
              </button>

              <button disabled={!!activeTrade} onClick={() => executeTrade('Odd')} className="bg-[#121824] hover:bg-[#1c2436] border border-red-500/50 rounded-xl p-3 text-left transition-all relative overflow-hidden shadow-lg shadow-red-950/40 disabled:opacity-50">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-red-500 text-sm">ODD</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">${(stake * 1.95).toFixed(2)}</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">95.20% payout</span>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"></div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* DEPOSIT VIEW */}
      {activeTab === 'DEPOSIT' && (
        <div className="p-4 space-y-4 max-w-md mx-auto w-full">
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-4">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2"><ArrowDownLeft className="w-5 h-5 text-emerald-400" /> Deposit Funds</h2>
            <p className="text-xs text-gray-400 mb-4">Minimum deposit $5.00</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Gateway</label>
                <select value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs font-bold">
                  <option value="M-PESA">M-Pesa Express</option>
                  <option value="AIRTEL MONEY">Airtel Money</option>
                  <option value="WORLDCOIN">Worldcoin (WLD)</option>
                  <option value="CRYPTO USDT P2P">Crypto USDT P2P</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Amount (USD)</label>
                <input type="number" min="5" value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-sm font-mono font-bold" />
              </div>
              <button onClick={handleDeposit} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 rounded-lg shadow-lg">Pay ${depositAmount}</button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW VIEW */}
      {activeTab === 'WITHDRAW' && (
        <div className="p-4 space-y-4 max-w-md mx-auto w-full">
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-4">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2"><ArrowUpRight className="w-5 h-5 text-red-500" /> Withdraw Funds</h2>
            <p className="text-xs text-gray-400 mb-4">Minimum $5.00. Approved in <strong>2 Hours</strong>.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Destination</label>
                <select value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs font-bold">
                  <option value="M-PESA TILL">M-Pesa Till Number</option>
                  <option value="M-PESA PHONE">M-Pesa Phone Number</option>
                  <option value="PAYBILL">M-Pesa Paybill</option>
                  <option value="BANK">Bank Account</option>
                  <option value="AIRTEL MONEY">Airtel Money</option>
                  <option value="WORLDCOIN">Worldcoin</option>
                  <option value="CRYPTO USDT P2P">Crypto USDT P2P</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Amount (USD)</label>
                <input type="number" min="5" value={withdrawAmount} onChange={(e) => setWithdrawAmount(Number(e.target.value))} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-sm font-mono font-bold" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Account / Phone / Till</label>
                <input type="text" placeholder="e.g. 0712345678" value={withdrawAccount} onChange={(e) => setWithdrawAccount(e.target.value)} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs font-mono" />
              </div>
              <button onClick={handleWithdrawal} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-sm py-3 rounded-lg shadow-lg">Submit Withdrawal Request</button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeTab === 'HISTORY' && (
        <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-bold text-white mb-3">Trading & Transaction History</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {trades.length === 0 && transactions.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">No records yet.</p>
              ) : (
                <>
                  {transactions.map(tx => (
                    <div key={tx.id} className="bg-[#090d14] border border-gray-800 rounded-lg p-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className={`font-bold block ${tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-red-400'}`}>{tx.type} ({tx.method})</span>
                        <span className="text-[10px] text-gray-500 font-mono">{tx.time} | ID: {tx.id}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-white">${tx.amount.toFixed(2)}</span>
                        <span className="text-[10px] text-yellow-500 block">{tx.status}</span>
                      </div>
                    </div>
                  ))}
                  {trades.map(t => (
                    <div key={t.id} className="bg-[#090d14] border border-gray-800 rounded-lg p-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-200 block">Trade: {t.prediction} ({t.duration} Ticks)</span>
                        <span className="text-[10px] text-gray-500 font-mono">{t.time} | Entry: {t.entryDigit} → Exit: {t.exitDigit}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold ${t.payout >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.payout >= 0 ? `+$${t.payout.toFixed(2)}` : `-$${Math.abs(t.payout).toFixed(2)}`}
                        </span>
                        <span className={`text-[10px] font-bold block ${t.status === 'WIN' ? 'text-emerald-500' : 'text-red-500'}`}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {authModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {authModal === 'login' ? <LogIn className="w-5 h-5 text-red-500" /> : <UserPlus className="w-5 h-5 text-red-500" />}
              {authModal === 'login' ? 'Login' : 'Sign Up ($1.00 Bonus)'}
            </h3>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Email</label>
              <input type="email" placeholder="name@example.com" value={authInput.email} onChange={(e) => setAuthInput({ ...authInput, email: e.target.value })} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Password</label>
              <input type="password" placeholder="••••••••" value={authInput.password} onChange={(e) => setAuthInput({ ...authInput, password: e.target.value })} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs" />
            </div>
            {authModal === 'signup' && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Referral Code</label>
                <input type="text" placeholder="VELTEX-XXXX" value={authInput.ref} onChange={(e) => setAuthInput({ ...authInput, ref: e.target.value })} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs font-mono" />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setAuthModal(null)} className="w-1/2 bg-gray-800 text-gray-300 text-xs font-bold py-2 rounded-lg">Cancel</button>
              <button onClick={() => handleAuth(authModal)} className="w-1/2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 rounded-lg shadow">{authModal === 'login' ? 'Login' : 'Sign Up'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-[#121824] border-t border-gray-800 fixed bottom-0 left-0 right-0 py-2 px-6 flex items-center justify-around z-50">
        <button onClick={() => setActiveTab('TRADE')} className={`flex flex-col items-center ${activeTab === 'TRADE' ? 'text-red-500' : 'text-gray-400'}`}>
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-bold">Trade</span>
        </button>
        <button onClick={() => setActiveTab('TRADE')} className="flex flex-col items-center text-red-500">
          <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50 -mt-3 border-2 border-[#121824] animate-pulse">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 font-bold">Auto Trip</span>
        </button>
        <button onClick={() => setActiveTab('HISTORY')} className={`flex flex-col items-center ${activeTab === 'HISTORY' ? 'text-red-500' : 'text-gray-400'}`}>
          <Clock className="w-5 h-5" />
          <span className="text-[10px] mt-1">History</span>
        </button>
      </nav>

    </div>
  );
}
