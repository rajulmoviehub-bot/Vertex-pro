// VELTEX production deployment trigger: 2026-11-05
import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';
import { 
  TrendingUp, TrendingDown, RefreshCw, Zap, ShieldAlert, Award, Bot, 
  Activity, DollarSign, Settings, ChevronRight, Play, Square, History, BarChart2, MessageSquare, Clock, Volume2, VolumeX, Menu, Bell, UserCheck, LogIn, UserPlus, CreditCard, ArrowDownLeft, ArrowUpRight, Share2, ScanLine, Wallet, LogOut
} from 'lucide-react';

export default function App() {
  const [mainWallet, setMainWallet] = useState(0); // loaded from the authenticated VELTEX wallet
  const [demoWallet, setDemoWallet] = useState(10000.00);
  const [accountMode, setAccountMode] = useState('DEMO');
  const activeWallet = accountMode === 'DEMO' ? demoWallet : mainWallet;
  const updateActiveWallet = (delta) => {
    if (accountMode === 'DEMO') setDemoWallet(prev => Math.max(0, prev + delta));
    else setMainWallet(prev => Math.max(0, prev + delta));
  };
  const [user, setUser] = useState({ loggedIn: false, email: '', fullName: '', refCode: 'VELTEX-7892' });
  const [authModal, setAuthModal] = useState(null);
  const [authInput, setAuthInput] = useState({ fullName: '', email: '', password: '', ref: '' });

  const [initialStake, setInitialStake] = useState(0.75);
  const [stake, setStake] = useState(0.75);
  const [market, setMarket] = useState('VELTEX Synthetic Index');
  const [contractType, setContractType] = useState('Even/Odd');
  const [tradeMode, setTradeMode] = useState('AUTO'); 
  const [duration, setDuration] = useState(5); 
  const [target, setTarget] = useState(200);
  const [stopLoss, setStopLoss] = useState(999);
  const [multiplier, setMultiplier] = useState(2);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loginWelcome, setLoginWelcome] = useState(false);
  const [startAfterScan, setStartAfterScan] = useState(false);
  const [showTargetAchieved, setShowTargetAchieved] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [showDeepScanModal, setShowDeepScanModal] = useState(false);
  const [scanCategory, setScanCategory] = useState('Even / Odd');
  const [accurateScanning, setAccurateScanning] = useState(false);
  const [accurateScan, setAccurateScan] = useState(null);
  const [scannedSignal, setScannedSignal] = useState(null);
  const [botActive, setBotActive] = useState(false);
  const [botStatusText, setBotStatusText] = useState('Idle: Click Deep Scan Market');
  const [activeTrade, setActiveTrade] = useState(null);

  const [priceHistory, setPriceHistory] = useState([]);
  const [lastDigit, setLastDigit] = useState(0);
  const signalDigitVisible = Boolean(scannedSignal && Number(scannedSignal.bestDigit) === Number(lastDigit));
  const [currentPrice, setCurrentPrice] = useState('Waiting for verified feed');
  const [feedStatus, setFeedStatus] = useState('CONNECTING');
  const [lastTickAt, setLastTickAt] = useState(null);
  const [stats, setStats] = useState({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
  const [digitCounts, setDigitCounts] = useState({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
  const [totalTicks, setTotalTicks] = useState(0);
  const [sessionPL, setSessionPL] = useState(0.00);

  const [trades, setTrades] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('TRADE');
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminSection, setAdminSection] = useState('OVERVIEW');
  const [shareCustomerNumber, setShareCustomerNumber] = useState('');
  const [capitalEmail, setCapitalEmail] = useState('');
  const [capitalAmount, setCapitalAmount] = useState('5');
  const [capitalBusy, setCapitalBusy] = useState(false);
  // Use the account username (email prefix) consistently across sessions and welcome messages.
  const displayUserName = user.loggedIn ? (user.email?.split('@')[0] || 'Customer') : 'Guest';
  const isOwner = user.loggedIn && user.email?.trim().toLowerCase() === 'rajulmoviehub@gmail.com';
  const [depositMethod, setDepositMethod] = useState('M-PESA');
  const [depositAmount, setDepositAmount] = useState(5);
  const [withdrawAmount, setWithdrawAmount] = useState(5);
  const [derivCheck, setDerivCheck] = useState({ loading: false, result: null, error: '' });

  useEffect(() => {
    if (!loginWelcome) return undefined;
    const timer = setTimeout(() => setLoginWelcome(false), 3000);
    return () => clearTimeout(timer);
  }, [loginWelcome]);

  // Re-show the welcome popup when a signed-in customer returns, reloads, or reconnects.
  useEffect(() => {
    if (!user.loggedIn) return undefined;
    let wasAway = false;
    const showWelcome = () => {
      if (document.visibilityState === 'visible') setLoginWelcome(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasAway = true;
      } else if (wasAway) {
        wasAway = false;
        showWelcome();
      }
    };
    const handleReturn = () => {
      wasAway = false;
      showWelcome();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handleReturn);
    window.addEventListener('focus', handleReturn);
    window.addEventListener('online', handleReturn);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handleReturn);
      window.removeEventListener('focus', handleReturn);
      window.removeEventListener('online', handleReturn);
    };
  }, [user.loggedIn]);

  const wsRef = useRef(null);
  const lastTickAtRef = useRef(null);
  const marketSequenceRef = useRef(0);
  const previousActiveTradeRef = useRef(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let mounted = true;

    const syncSession = async (session) => {
      if (!mounted) return;
      if (!session?.user) {
        setUser({ loggedIn: false, email: '', fullName: '', refCode: 'VELTEX-7892' });
        setMainWallet(0);
        return;
      }
      setUser({ loggedIn: true, email: session.user.email || '', fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '', refCode: 'VELTEX-7892' });
      setLoginWelcome(true);
      const { data, error } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!mounted) return;
      if (error) {
        console.error('VELTEX wallet could not be loaded:', error.message);
        setMainWallet(0);
        return;
      }
      setMainWallet(Number(data?.available_balance || 0));
    };

    supabase.auth.getSession().then(({ data }) => syncSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      Promise.resolve().then(() => syncSession(session));
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const unlockAdmin = async () => {
    if (!supabase) {
      alert('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.');
      return false;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      alert('Please sign in with your admin account first.');
      setAuthModal('login');
      return false;
    }
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || 'This account does not have admin access.');
        return false;
      }
      setAdminUnlocked(true);
      return true;
    } catch {
      alert('Could not verify admin access. Please try again.');
      return false;
    }
  };

  const runDeepScan = () => {
    if (isScanning || feedStatus !== 'LIVE') return;
    if (priceHistory.length < 20) {
      setScannedSignal(null);
      setBotStatusText('Waiting for 20 observed ticks before scanning.');
      return;
    }
    setIsScanning(true);
    setScannedSignal(null);
    setBotStatusText('Analyzing the latest 20 observed demo ticks…');
    window.setTimeout(() => {
      const recentDigits = priceHistory.slice(-20).map(value => Number.parseInt(Number(value).toFixed(3).slice(-1), 10)).filter(Number.isInteger);
      if (!recentDigits.length) {
        setIsScanning(false);
        setBotStatusText('No valid tick data. Please scan again.');
        return;
      }
      const counts = recentDigits.reduce((acc, digit) => {
        acc[digit] = (acc[digit] || 0) + 1;
        return acc;
      }, {});
      const maxCount = Math.max(...Object.values(counts));
      const bestDigit = [...recentDigits].reverse().find(digit => counts[digit] === maxCount);
      const prediction = bestDigit % 2 === 0 ? 'EVEN' : 'ODD';
      setScannedSignal({
        bestDigit,
        prediction,
        digitFrequency: Number(((maxCount / recentDigits.length) * 100).toFixed(1)),
        sampleSize: recentDigits.length
      });
      setBotStatusText(`Selected ${bestDigit} – ${prediction}. Wait for this digit on a tick.`);
      setIsScanning(false);
    }, 650);
  };

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
    if (!Number.isFinite(quoteNum)) return;
    const quoteStr = quoteNum.toFixed(3);
    const receivedAt = Date.now();
    lastTickAtRef.current = receivedAt;
    setLastTickAt(receivedAt);
    setFeedStatus('LIVE');
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

  // Poll VELTEX's server-side deterministic synthetic demo market.
  // The API discloses that these are simulated prices, not real-world quotes.
  useEffect(() => {
    let disposed = false;
    let busy = false;
    let staleTimer;
    let lastSequence = marketSequenceRef.current;
    const feedStartedAt = Date.now();
    setFeedStatus('CONNECTING');

    const pollMarket = async () => {
      if (disposed || busy) return;
      busy = true;
      try {
        const response = await fetch('/api/market/tick?limit=30', {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        });          </button>
        ))}
      </div>

      {/* Referral Banner */}
      <div className="px-4 py-1.5 text-xs text-gray-300 flex items-center justify-between bg-[#0c1017] border-b border-gray-800">
        <div className="flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-red-500" />
          <span>Referral rewards not active yet</span>
        </div>
        <span className="text-gray-500 text-[11px]">Referral tracking pending</span>
      </div>

      {activeTab === 'TRADE' && (
        <>

          {/* Deriv-Style Dynamic Chart */}
          <div className="bg-[#121824] border-y border-gray-800 p-3.5 relative mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-[#1a2233] text-red-400 text-xs font-mono font-bold px-2 py-1 rounded border border-gray-700">1T</span>
                <div className="bg-[#1a2233] border border-gray-700 px-2.5 py-1 rounded flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${feedStatus === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <span className="text-xs font-bold text-white">{market}</span>
                  <ChevronRight className="w-3 h-3 text-gray-400 rotate-90" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold ${feedStatus === 'LIVE' ? 'text-emerald-400' : 'text-amber-300'}`} role="status">{feedStatus === 'LIVE' ? 'VELTEX SIMULATED MARKET' : `FEED ${feedStatus}`}</span>
                <span className="bg-[#1a2233] border border-gray-700 text-gray-300 font-mono text-xs px-2 py-1 rounded font-bold">50%</span>
                <button className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1 rounded shadow">View</button>
              </div>
            </div>

            <p className="text-[10px] text-amber-300 mb-2">VELTEX server-generated synthetic demo prices · not real-world asset prices. Last tick: {lastTickAt ? new Date(lastTickAt).toLocaleTimeString() : 'Waiting for first tick'}.</p>
            <div className="h-48 w-full relative flex items-end justify-between overflow-hidden border-b border-gray-800/80 pb-2 bg-[#0c1017]/40">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d_1px,transparent_1px),linear-gradient(to_bottom,#1f293d_1px,transparent_1px)] bg-[size:40px_35px] opacity-30"></div>

              <div className="absolute right-4 top-1/3 bg-white text-black font-mono font-bold text-xs px-2.5 py-1 rounded shadow-2xl flex items-center gap-1.5 z-10">
                {currentPrice} {feedStatus === 'LIVE' && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>}
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


          <div className="p-3.5 space-y-3">

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
                  <button onClick={() => { setInitialStake(Math.max(0.75, Number((initialStake - 0.25).toFixed(2)))); setStake(Math.max(0.75, Number((stake - 0.25).toFixed(2)))); }} className="w-7 h-7 bg-gray-800 rounded flex items-center justify-center font-bold">-</button>
                  <input type="number" min="0.75" step="0.25" value={stake} onChange={(e) => { const amount = Math.max(0.75, Number(e.target.value) || 0.75); setStake(amount); setInitialStake(amount); }} className="w-16 bg-[#090d14] text-center font-mono font-bold text-base text-red-500 border border-gray-700 rounded py-0.5" />
                  <button onClick={() => { setInitialStake(Number((initialStake + 0.25).toFixed(2))); setStake(Number((stake + 0.25).toFixed(2))); }} className="w-7 h-7 bg-gray-800 rounded flex items-center justify-center font-bold">+</button>
                </div>
              </div>
              <div className="border-l border-gray-800 pl-3">
                <span className="text-[10px] text-gray-400 block uppercase font-medium">TOTAL PROFIT / LOSS</span>
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




      {/* Login Modal */}
      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-gray-800 bg-[#121824] p-5">
            <h3 className="text-base font-bold text-white">
              {authModal === 'login' ? 'Login' : 'Sign Up'}
            </h3>

            <input
              type="email"
              placeholder="Email"
              value={authInput.email}
              onChange={e => setAuthInput({ ...authInput, email: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-[#090d14] p-2.5 text-xs text-white"
            />

            <input
              type="password"
              placeholder="Password"
              value={authInput.password}
              onChange={e => setAuthInput({ ...authInput, password: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-[#090d14] p-2.5 text-xs text-white"
            />

            {authModal === 'signup' && (
              <input
                type="text"
                placeholder="Full name"
                value={authInput.fullName}
                onChange={e => setAuthInput({ ...authInput, fullName: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-[#090d14] p-2.5 text-xs text-white"
              />
            )}

            <div className="flex gap-2">
              <button onClick={() => setAuthModal(null)} className="w-1/2 rounded-lg bg-gray-800 py-2 text-xs font-bold text-gray-300">
                Cancel
              </button>
              <button onClick={handleAuth} className="w-1/2 rounded-lg bg-red-600 py-2 text-xs font-bold text-white">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mb-16 border-t border-gray-800 px-4 py-4 text-center text-[10px] text-gray-500">
        VELTEX PRIME V6 AUTO BOT · Demo feed · Trading involves risk.
        <button onClick={() => setActiveTab('INFO')} className="mx-auto mt-1 block text-red-400 underline">
          Terms and Conditions
        </button>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-gray-800 bg-[#121824] px-3 py-2">
        <button onClick={() => setActiveTab('TRADE')} className="flex flex-col items-center text-gray-400">
          <BarChart2 className="h-5 w-5" />
          <span className="mt-1 text-[10px]">Trade</span>
        </button>

 className="flex flex-col items-center text-gray-400">
          <Clock className="h-5 w-5" />
          <span className="mt-1 text-[10px]">History</span>
        </button>
      </nav>
    </div>
          );
      }
