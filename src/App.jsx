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
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok || !Array.isArray(payload.ticks) || !payload.tick) {
          throw new Error(payload.error || 'VELTEX market feed returned an invalid response');
        }
        const newTicks = payload.ticks.filter(tick =>
          Number.isSafeInteger(tick.sequence) &&
          tick.sequence > lastSequence &&
          Number.isFinite(Number(tick.quote))
        );
        if (lastSequence && newTicks.length && newTicks[0].sequence > lastSequence + 1) {
          setFeedStatus('GAP');
          throw new Error('Market tick gap detected; waiting for a continuous feed');
        }
        for (const tick of newTicks) {
          processNewTick(Number(tick.quote));
          lastSequence = tick.sequence;
          marketSequenceRef.current = tick.sequence;
        }
        if (newTicks.length) setFeedStatus('LIVE');
        else if (!lastSequence) setFeedStatus('CONNECTING');
      } catch (error) {
        if (!disposed) {
          setFeedStatus('ERROR');
          console.error('VELTEX synthetic market feed error:', error);
        }
      } finally {
        busy = false;
      }
    };

    pollMarket();
    const pollInterval = setInterval(pollMarket, 1000);
    staleTimer = setInterval(() => {
      const mostRecentTick = lastTickAtRef.current || feedStartedAt;
      if (Date.now() - mostRecentTick > 10000) setFeedStatus('STALE');
    }, 2000);

    return () => {
      disposed = true;
      clearInterval(pollInterval);
      if (staleTimer) clearInterval(staleTimer);
    };
  }, [duration, initialStake, multiplier, contractType, accountMode]);

  const executeTrade = (type) => {
    if (feedStatus !== 'LIVE' || !lastTickAt || Date.now() - lastTickAt > 10000) { alert('Market feed is unavailable or stale. No trade was opened.'); setBotActive(false); return; }
    if (accountMode === 'REAL') { alert('Real-money trading is disabled until a verified broker API and secure server execution are connected. Use DEMO to practise.'); setBotActive(false); return; }
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

  // Stop the demo bot as soon as the configured session target is reached.
  useEffect(() => {
    if (accountMode !== 'DEMO' || !botActive || sessionPL < Number(target)) return undefined;
    setBotActive(false);
    setStartAfterScan(false);
    setShowTargetAchieved(true);
    playSound('win');
    const timer = setTimeout(() => setShowTargetAchieved(false), 500);
    return () => clearTimeout(timer);
  }, [accountMode, botActive, sessionPL, target]);

  // VELTEX PRO BINARY automatic demo logic
  useEffect(() => {
    if (!botActive || accountMode !== 'DEMO' || sessionPL >= Number(target) || !scannedSignal || activeTrade) return;

    const targetPred = scannedSignal.prediction;
    const digitMatchesSignal = targetPred === 'EVEN' ? lastDigit % 2 === 0 : lastDigit % 2 === 1;

    if (digitMatchesSignal) {
      setBotStatusText(`Signal matched digit ${lastDigit} (${targetPred}). Executing demo trade (${duration} ticks)...`);
      executeTrade(targetPred === 'EVEN' ? 'Even' : 'Odd');
    } else {
      setBotStatusText(`Scanning all digits 0–9 | Waiting for ${targetPred.toLowerCase()} digit | Current: ${lastDigit}`);
    }
  }, [lastDigit, botActive, scannedSignal, activeTrade, duration, accountMode, sessionPL, target]);

  const runDeepScan = () => {
    setIsScanning(true);
    setScannedSignal(null);
    setBotStatusText('Analyzing live tick patterns...');
    setTimeout(() => {
      // Estimate a short-term demo bias from the latest observed synthetic-feed digits.
      // This frequency scan is descriptive, not a validated prediction of the next tick.
      const recentDigits = priceHistory.slice(-20).map(value => Number(value).toFixed(3).slice(-1)).map(Number).filter(Number.isInteger);
      const evenCount = recentDigits.filter(digit => digit % 2 === 0).length;
      const oddCount = recentDigits.length - evenCount;
      const predictedType = evenCount > oddCount ? 'EVEN' : 'ODD';
      const sampleSize = recentDigits.length;
      // Decorative demo-only score. It is deliberately not used as a probability,
      // prediction, trade trigger, or claim of a winning outcome.
      const simulatedScore = Math.floor(Math.random() * 26) + 75;
      const scanStrength = simulatedScore >= 85
        ? 'HIGH SIMULATED SCORE · NOT A WIN'
        : 'MODERATE SIMULATED SCORE · NOT A WIN';
      const triggerDigits = predictedType === 'EVEN' ? [0, 2, 4, 6, 8] : [1, 3, 5, 7, 9];

      setScannedSignal({
        prediction: predictedType,
        confidence: String(simulatedScore),
        scanStrength,
        sampleSize,
        triggerDigits
      });
      setIsScanning(false);
      if (startAfterScan) {
        setStartAfterScan(false);
        setBotActive(true);
        setBotStatusText('Demo bot ON — waiting for trip digit.');
      }
      setBotStatusText(`Demo scan completed: ${predictedType}. Check the matching digits.`);
    }, 1000);
  };

  // Independent analysis panel: historical frequency only, not a guaranteed prediction.
  const runAccurateScan = () => {
    setAccurateScanning(true);
    setAccurateScan(null);
    setTimeout(() => {
      const digits = priceHistory.slice(-20).map(value => Number(value).toFixed(3).slice(-1)).map(Number).filter(Number.isInteger);
      const rows = Array.from({ length: 10 }, (_, digit) => {
        const count = digits.filter(value => value === digit).length;
        return { digit, side: digit % 2 === 0 ? 'EVEN' : 'ODD', percentage: digits.length ? Math.round(count / digits.length * 100) : 0, count };
      });
      setAccurateScan({ rows, sampleSize: digits.length });
      setAccurateScanning(false);
    }, 900);
  };
  const toggleDemoBot = () => {
    if (accountMode !== 'DEMO') {
      setBotActive(false);
      alert('LIVE broker trading is disabled. Switch to DEMO to use the free demo bot.');
      return;
    }
    if (botActive || startAfterScan) {
      setBotActive(false);
      setStartAfterScan(false);
      setBotStatusText('Demo bot stopped by user.');
      return;
    }
    if (!scannedSignal) {
      setStartAfterScan(true);
      runDeepScan();
      setBotStatusText('Preparing demo scan, then the bot will start.');
      return;
    }
    setBotActive(true);
    setBotStatusText('Demo bot ON — waiting for trip digit.');
  };

  const handleDeposit = () => {
    alert('M-Pesa and other payment gateways are not connected yet. No payment was taken and no balance was credited.');
  };

  const handleAdminCapital = async () => {
    const email = capitalEmail.trim().toLowerCase();
    const amount = Number(capitalAmount);
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      alert('Enter a valid customer email and an amount greater than $0 (maximum $100,000).');
      return;
    }
    if (!supabase || !adminUnlocked || !isOwner) {
      alert('Only the verified VELTEX owner can add customer capital.');
      return;
    }
    setCapitalBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Your admin session expired. Sign in again.');
      const response = await fetch('/api/admin/add-capital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ email, amount })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Capital could not be added.');
      alert(`$ ${amount.toFixed(2)} capital added to ${email}. New wallet balance: ${Number(result.balance).toFixed(2)}.`);
      setCapitalEmail('');
      if (user.email?.trim().toLowerCase() === email) setMainWallet(Number(result.balance));
    } catch (error) {
      alert(error.message || 'Could not add customer capital.');
    } finally {
      setCapitalBusy(false);
    }
  };


  const handleAuth = async () => {
    if (!supabase) {
      alert('Secure login is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.');
      return;
    }
    const email = authInput.email.trim();
    const password = authInput.password;
    if (!email || !password || (authModal === 'signup' && !authInput.fullName.trim())) {
      alert(authModal === 'signup' ? 'Enter your full name, email and password.' : 'Enter your email and password.');
      return;
    }
    try {
      if (authModal === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'https://vertexpromax.vercel.app',
            data: { full_name: authInput.fullName.trim(), name: authInput.fullName.trim(), referral_code: authInput.ref.trim() || null }
          }
        });
        if (error) throw error;
        if (data.session) {
          setUser({ loggedIn: true, email: data.user?.email || email, fullName: data.user?.user_metadata?.full_name || authInput.fullName.trim(), refCode: 'VELTEX-7892' });
        setLoginWelcome(true);
          alert('Your account was created. Your wallet will show once the database migration is applied.');
        } else {
          alert('Registration submitted. Check your email and verify your address before logging in.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUser({ loggedIn: true, email: data.user?.email || email, fullName: data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || '', refCode: 'VELTEX-7892' });
        setLoginWelcome(true);
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('available_balance')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (walletError) {
          alert('Signed in, but the VELTEX wallet could not load. Confirm that the database migration is applied.');
          setMainWallet(0);
        } else {
          setMainWallet(Number(wallet?.available_balance || 0));
        }
      }
      setAuthModal(null);
      setAuthInput({ fullName: '', email: '', password: '', ref: '' });
    } catch (error) {
      alert(error?.message || 'Authentication failed. Please try again.');
    }
  };

  const checkDerivAccount = async () => {
    setDerivCheck({ loading: true, result: null, error: '' });
    try {
      const response = await fetch('/api/deriv/account', { method: 'GET', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Deriv account verification failed');
      setDerivCheck({ loading: false, result: data.account, error: '' });
    } catch (error) {
      setDerivCheck({ loading: false, result: null, error: error.message || 'Could not verify Deriv account' });
    }
  };

  const minPrice = priceHistory.length ? Math.min(...priceHistory) : 0;
  const maxPrice = priceHistory.length ? Math.max(...priceHistory) : 1;
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
          <button aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="text-gray-300 p-1"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center text-base font-bold tracking-tight">
            <span className="text-white">VELTEX</span><span className="text-red-500 font-black"> pro</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div aria-label="Current practice balance" className="bg-[#182232] border border-gray-700/80 rounded-full px-3 py-1 flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-sm font-mono font-bold text-white">${activeWallet.toFixed(2)}</span>
          </div>

          <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-gray-400 hover:text-white p-1">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>

          <button onClick={() => setActiveTab('DEPOSIT')} className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-md shadow-md">Deposit</button>
          <button onClick={() => setActiveTab('WITHDRAW')} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-md shadow-md">Withdraw</button>

          {user.loggedIn ? (
            <span className="bg-red-950/60 border border-red-500/40 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> {displayUserName}
            </span>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => setAuthModal('login')} className="bg-gray-800 text-xs text-white px-2 py-1 rounded">Login</button>
              <button onClick={() => setAuthModal('signup')} className="bg-red-600 text-xs text-white px-2 py-1 rounded font-bold">Sign Up</button>
            </div>
          )}
        </div>
      </header>

      <section aria-label="Permanent bot sale notice" className="bg-amber-950/50 border-b border-amber-700 px-3 py-1.5 animate-pulse">
        <p className="text-[11px] font-black text-amber-200">VELTEX PRIME V6 AUTO BOT · SALE</p>
        <p className="text-[11px] font-bold text-gray-300 line-through">Cash price: $493</p>
        <p className="text-base font-black text-white">Offer price: $385</p>
        <p className="text-[10px] text-amber-100">Limited offer · All bot prices and wallet balances are displayed in USD ($).</p>
        <div className="mt-2">
          <button onClick={() => setActiveTab('INFO')} className="rounded bg-amber-500 text-black text-[11px] font-bold px-3 py-1.5">BOT SALE DETAILS</button>
        </div>
      </section>

      <section className="bg-[#0d131f] border-b border-gray-800 px-3 py-2" aria-label="Account mode">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button onClick={() => { setAccountMode('DEMO'); setBotActive(false); setActiveTrade(null); }} aria-pressed={accountMode === 'DEMO'} className={`rounded-md px-4 py-2 text-xs font-black border ${accountMode === 'DEMO' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#121824] text-gray-300 border-gray-700'}`}>DEMO · $10,000 START</button>
            <button onClick={() => { setAccountMode('REAL'); setBotActive(false); setActiveTrade(null); }} aria-pressed={accountMode === 'REAL'} className={`rounded-md px-4 py-2 text-xs font-black border ${accountMode === 'REAL' ? 'bg-red-600 text-white border-red-500' : 'bg-[#121824] text-gray-300 border-gray-700'}`}>LIVE</button>
          </div>
          {accountMode === 'DEMO' && <button onClick={() => { setDemoWallet(10000); setStake(initialStake); setSessionPL(0); setTrades([]); setBotActive(false); setActiveTrade(null); }} className="text-xs font-bold text-yellow-300 underline">Reset Demo $10,000</button>}
        </div>
        <p className="mt-1 text-[10px] text-gray-400" role="status">{accountMode === 'DEMO' ? 'Practice mode: demo funds only. No real deposits or withdrawals.' : 'Separate local wallet view. Live broker trading and real-money execution are not connected.'}</p>
      </section>

      {/* Tabs */}
      <div className="bg-[#121824] grid grid-cols-4 border-b border-gray-800 text-center">
        {['TRADE', 'DEPOSIT', 'HISTORY', 'INFO'].map((tab) => (
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

          {/* DeepScan launcher; scanner opens in the requested full-screen modal */}
          <section className="mx-3 mt-3 rounded-xl border border-cyan-700/70 bg-[#101c2a] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-cyan-300">VELTEX DEEPSCAN</h3>
                <p className="text-[10px] text-gray-400">Open the market scanner</p>
              </div>
              <button onClick={() => setShowDeepScanModal(true)} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-red-900/30">
                OPEN DEEPSCAN
              </button>
            </div>
            {scannedSignal && <p className="text-xs text-gray-300">Last scan: <strong className="text-cyan-300">{scannedSignal.prediction}</strong></p>}
          </section>

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

      {/* WITHDRAWAL VIEW */}
      {activeTab === 'WITHDRAW' && (
        <div className="p-4 space-y-4 max-w-md mx-auto w-full">
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><ArrowUpRight className="w-5 h-5 text-emerald-400" /> Withdraw Funds</h2>
            <p className="text-xs text-gray-400">Minimum withdrawal: $5.00</p>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 25, 50, 100, 250].map(amount => (
                <button key={amount} onClick={() => setWithdrawAmount(amount)} aria-pressed={withdrawAmount === amount} className={`rounded-lg border px-3 py-3 text-sm font-black ${withdrawAmount === amount ? 'border-emerald-400 bg-emerald-900/40 text-emerald-300' : 'border-gray-700 bg-[#090d14] text-white'}`}>${amount}</button>
              ))}
            </div>
            <label className="block text-xs text-gray-400 font-bold">Withdrawal amount (USD)</label>
            <input type="number" min="5" step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(Math.max(5, Number(e.target.value) || 5))} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-3 font-mono font-bold" />
            <button disabled className="w-full bg-gray-700 text-gray-300 font-bold text-sm py-3 rounded-lg opacity-70 cursor-not-allowed">Withdrawal requests not enabled yet</button>
            <p className="text-[11px] text-amber-200">This screen is a preview only. Secure wallet withdrawal processing and payment-provider verification are not connected, so no money can be requested or sent yet.</p>
          </section>
        </div>
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
                <input type="number" min="5" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(Math.max(5, Number(e.target.value) || 5))} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-sm font-mono font-bold" />
              </div>
              <button onClick={() => depositAmount < 5 ? alert('Minimum deposit is $5.00.') : handleDeposit()} className="w-full bg-emerald-700 text-white font-bold text-sm py-3 rounded-lg shadow-lg">Check payment setup</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ACCURATE' && (
        <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto w-full">
          <div className="rounded-xl border border-cyan-700/60 bg-[#121824] p-4 space-y-2">
            <div className="flex items-center gap-2"><ScanLine className="w-5 h-5 text-cyan-300" /><h2 className="text-base font-black text-white">VELTEX ACCURATE BOT</h2></div>
            <p className="text-xs text-gray-300">Independent analysis panel. Scans the latest observed digits separately from DeepScan and Auto Bot.</p>
            <p className="text-[11px] text-amber-300">Historical frequency is not a prediction or guaranteed win probability. Current feed is simulated demo data.</p>
            <button onClick={runAccurateScan} disabled={accurateScanning || priceHistory.length === 0} className="w-full rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 py-3 text-sm font-black text-white">
              {accurateScanning ? 'SCANNING DIGITS…' : 'RUN ACCURATE SCAN'}
            </button>
          </div>
          {accurateScan && (
            <div className="rounded-xl border border-gray-700 bg-[#121824] p-4 space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-white">Digit frequency · 0–9</h3><span className="text-[10px] text-gray-400">Sample: {accurateScan.sampleSize}</span></div>
              <div className="grid grid-cols-2 gap-2">
                {accurateScan.rows.map(row => (
                  <div key={row.digit} className="rounded-lg bg-[#0c1017] border border-gray-800 p-2 flex items-center justify-between">
                    <div><span className="text-lg font-black text-white">{row.digit}</span><span className={'ml-2 text-[10px] font-bold ' + (row.side === 'EVEN' ? 'text-emerald-300' : 'text-red-300')}>{row.side}</span></div>
                    <div className="text-right"><span className="text-sm font-black text-cyan-200">{row.percentage}%</span><p className="text-[9px] text-gray-500">{row.count}/{accurateScan.sampleSize}</p></div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">Percentages describe only this scanned sample. This panel does not send automatic live orders.</p>
            </div>
          )}
          <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-3 space-y-1">
            <h3 className="text-xs font-black text-amber-200">LIVE ACCESS · PAID LICENCE</h3>
            <p className="text-[11px] text-gray-300">DEMO remains free. Paid LIVE activation requires verified payment and a securely connected broker account. Payment verification and automatic broker activation are not connected in this version, so LIVE trading remains disabled.</p>
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

      {activeTab === 'ADMIN' && adminUnlocked && (
        <main className="p-4 max-w-lg mx-auto w-full space-y-3">
          <section className="bg-[#121824] border border-slate-600 rounded-xl p-4 space-y-3">
            <h2 className="text-lg font-black text-white">AAA- 3 Admin Panel</h2>
            <p className="text-xs text-amber-200">Owner dashboard preview. Customer registration, deposits, withdrawal requests, central wallet and licence sharing are not connected to a secure server yet. No money movement or approvals can be performed here.</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-[#090d14] p-3"><p className="text-xs text-gray-400">Demo balance</p><p className="text-lg font-black text-white">${demoWallet.toFixed(2)}</p></div>
              <div className="rounded-lg bg-[#090d14] p-3"><p className="text-xs text-gray-400">Session P/L</p><p className="text-lg font-black text-white">${sessionPL.toFixed(2)}</p></div>
            </div>
            <p className="text-sm text-gray-300">Demo trades recorded in this browser: {trades.length}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['OVERVIEW','Dashboard overview'],
                ['DEPOSITS','Customer deposits'],
                ['REGISTRATIONS','Registered customers'],
                ['CAPITAL','Add customer capital'],
                ['WITHDRAWALS','Withdrawal approvals'],
                ['ACCOUNTS','Account management'],
                ['CENTRAL','Central wallet withdrawal'],
                ['SHARING','Bot sharing / licence transfer']
              ].map(([key,label]) => <button key={key} onClick={() => setAdminSection(key)} aria-pressed={adminSection === key} className={`rounded-lg border px-3 py-3 text-left text-xs font-bold ${adminSection === key ? 'bg-cyan-800 border-cyan-500 text-white' : 'bg-[#090d14] border-gray-700 text-gray-200'}`}>{label}</button>)}
            </div>
            {adminSection === 'OVERVIEW' && <div className="rounded-lg bg-[#090d14] p-3 space-y-2"><h3 className="font-bold text-white">System status</h3><p className="text-xs text-gray-300">Customer deposits: Not connected</p><p className="text-xs text-gray-300">Verified registrations: Not connected</p><p className="text-xs text-gray-300">Withdrawal requests: Not connected</p><p className="text-xs text-gray-300">Central wallet: Not connected</p><p className="text-xs text-gray-300">Bot licence transfer: Not connected</p></div>}
            {adminSection === 'DEPOSITS' && <div className="rounded-lg bg-[#090d14] p-3 space-y-2"><h3 className="font-bold text-white">Customer deposits</h3><p className="text-xs text-amber-200">No customer deposit feed is connected. The records below, if any, are only local browser entries and are not proof of payment.</p>{transactions.filter(tx => tx.type === 'DEPOSIT').length === 0 ? <p className="text-sm text-gray-400">No local deposit entries.</p> : transactions.filter(tx => tx.type === 'DEPOSIT').map(tx => <p key={tx.id} className="text-xs text-gray-300">{tx.time} · ${tx.amount.toFixed(2)} · {tx.status}</p>)}</div>}
            {adminSection === 'REGISTRATIONS' && <div className="rounded-lg bg-[#090d14] p-3 space-y-2"><h3 className="font-bold text-white">Registered customers</h3><p className="text-2xl font-black text-white">Unavailable</p><p className="text-xs text-gray-400">Email registration and verification are not connected to a customer database, so a real registration count and customer list cannot be shown yet.</p></div>}
            {adminSection === 'CAPITAL' && <div className="rounded-lg border border-emerald-800 bg-[#090d14] p-4 space-y-3">
              <h3 className="font-bold text-white">Add customer capital · USD</h3>
              <p className="text-xs text-gray-300">Enter the customer's registered email. The credit is recorded against that customer's VELTEX wallet and in the wallet ledger.</p>
              <label className="block text-xs font-bold text-gray-300">Customer account email</label>
              <input type="email" value={capitalEmail} onChange={e => setCapitalEmail(e.target.value)} placeholder="customer@example.com" className="w-full rounded-lg border border-gray-700 bg-[#121824] p-3 text-sm text-white" />
              <label className="block text-xs font-bold text-gray-300">Capital amount (USD)</label>
              <input type="number" min="0.01" max="100000" step="0.01" value={capitalAmount} onChange={e => setCapitalAmount(e.target.value)} placeholder="50.00" className="w-full rounded-lg border border-gray-700 bg-[#121824] p-3 text-sm text-white" />
              <button onClick={handleAdminCapital} disabled={capitalBusy || !capitalEmail.trim() || !capitalAmount} className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-black text-white disabled:opacity-50">{capitalBusy ? 'ADDING CAPITAL…' : 'ADD CAPITAL'}</button>
              <p className="text-[11px] leading-relaxed text-amber-200">Admin credit only. It increases the selected customer's recorded wallet balance; it does not represent a customer deposit or external funds received. Every credit is ledger-recorded.</p>
            </div>}
            {adminSection === 'WITHDRAWALS' && <div className="rounded-lg bg-[#090d14] p-3 space-y-2"><h3 className="font-bold text-white">Withdrawal request approvals</h3><p className="text-xs text-gray-300">No withdrawal request system or server-side approval queue is connected. No pending requests are available to review.</p><button disabled className="w-full rounded-lg bg-gray-700 text-gray-400 font-bold text-sm py-3 opacity-60">Approve request · unavailable</button><p className="text-[11px] text-amber-200">Approval controls will only be enabled after verified customer identity, request records and secure payout integration are implemented.</p></div>}
            {adminSection === 'ACCOUNTS' && <div className="rounded-lg bg-[#090d14] p-3 space-y-3"><h3 className="font-bold text-white">Account management</h3><p className="text-xs text-gray-300">Verify the Deriv connection for the broker account authorized by the owner. This check is read-only.</p><button onClick={checkDerivAccount} disabled={derivCheck.loading} className="w-full rounded-lg bg-cyan-700 text-white font-bold text-sm py-3 disabled:opacity-60">{derivCheck.loading ? 'Checking Deriv connection…' : 'Verify Deriv account connection'}</button>{derivCheck.result && <div role="status" className="rounded-lg border border-emerald-700 bg-emerald-950/40 p-3 text-xs text-emerald-200 space-y-1"><p className="font-bold">Deriv account verified · Read-only check</p><p>Account: {derivCheck.result.loginid}</p><p>Type: {derivCheck.result.account_type === 'demo' ? 'Demo' : 'Real'}</p><p>Currency: {derivCheck.result.currency || 'Not provided'}</p><p className="text-amber-200">This check does not place trades or enable live execution.</p></div>}{derivCheck.error && <p role="alert" className="text-xs text-red-300">Deriv connection check failed: {derivCheck.error}</p>}<p className="text-[11px] text-amber-200">No customer account records are currently available. Broker trading and customer account linking are not enabled.</p><button onClick={() => setActiveTab('ACCOUNT')} className="w-full rounded-lg bg-gray-700 text-white font-bold text-sm py-3">Open personal account details</button></div>}
            {adminSection === 'CENTRAL' && <div className="rounded-lg bg-[#090d14] p-3 space-y-2"><h3 className="font-bold text-white">Central wallet withdrawal</h3><p className="text-xs text-gray-300">Central wallet balance: Not connected. No business wallet or payout provider is linked.</p><button disabled className="w-full rounded-lg bg-gray-700 text-gray-400 font-bold text-sm py-3 opacity-60">Request central withdrawal · unavailable</button><p className="text-[11px] text-amber-200">This panel cannot access or move customer or company funds.</p></div>}
            {adminSection === 'SHARING' && <div className="rounded-lg bg-[#090d14] p-3 space-y-2"><h3 className="font-bold text-white">Bot sharing / licence transfer</h3><label className="block text-xs text-gray-300" htmlFor="share-customer-number">Customer phone number</label><input id="share-customer-number" value={shareCustomerNumber} onChange={e => setShareCustomerNumber(e.target.value)} placeholder="e.g. 07XXXXXXXX" className="w-full rounded-lg bg-[#121824] border border-gray-700 p-3 text-sm text-white" /><button disabled={!shareCustomerNumber.trim()} onClick={() => alert('Licence transfer is not connected. No customer was activated and no previous licence was revoked.')} className="w-full rounded-lg bg-gray-700 text-gray-400 font-bold text-sm py-3 disabled:opacity-50">Transfer bot licence · unavailable</button><p className="text-[11px] text-amber-200">No bot is shared by this form. A secure server must verify payment, activate the buyer and revoke the previous activation atomically.</p></div>}
            {adminSection === 'OVERVIEW' && <button onClick={() => { setDemoWallet(10000); setStake(initialStake); setSessionPL(0); setTrades([]); setBotActive(false); setActiveTrade(null); }} className="w-full rounded-lg bg-amber-600 text-black font-bold text-sm py-3">Reset demo account to $10,000</button>}
            <button onClick={() => { setAdminUnlocked(false); setAdminSection('OVERVIEW'); setActiveTab('TRADE'); }} className="w-full rounded-lg bg-gray-700 text-white font-bold text-sm py-3">Lock Admin Panel</button>
          </section>
        </main>
      )}

      {activeTab === 'ACCOUNT' && (
        <main className="p-4 max-w-lg mx-auto w-full space-y-3">
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-2">
            <h2 className="text-lg font-black text-white">Account management</h2>
            <p className="text-sm text-gray-300">Manage the account identifier linked to your AUTO VELTEX PRIME BOT licence.</p>
            <p className="text-xs text-amber-200">⚠️ Account sharing/linking is not connected yet. A buyer should authorize their own broker account through the broker's official secure connection. No broker password or OTP is needed or should be collected here.</p>
            <p className="text-xs text-gray-400">The bot owner controls the bot password. Do not put that password in a public message or share it with buyers. Account ID entry alone will not connect a broker in this version.</p>
            <button onClick={checkDerivAccount} disabled={derivCheck.loading} className="w-full rounded-lg bg-cyan-700 text-white font-bold text-sm py-3 disabled:opacity-60">{derivCheck.loading ? 'Checking Deriv connection…' : 'Verify Deriv account connection'}</button>
            {derivCheck.result && <div role="status" className="rounded-lg border border-emerald-700 bg-emerald-950/40 p-3 text-xs text-emerald-200 space-y-1"><p className="font-bold">Deriv account verified · Read-only check</p><p>Account: {derivCheck.result.loginid}</p><p>Type: {derivCheck.result.account_type === 'demo' ? 'Demo' : 'Real'}</p><p>Currency: {derivCheck.result.currency || 'Not provided'}</p><p className="text-amber-200">This check does not place trades or enable live execution.</p></div>}
            {derivCheck.error && <p role="alert" className="text-xs text-red-300">Deriv connection check failed: {derivCheck.error}</p>}
          </section>
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-2">
            <h3 className="text-base font-black text-white">50/50 profit-sharing rules</h3>
            <p className="text-sm text-gray-300">If both parties separately agree in writing, net realized profits are split 50% to the account owner and 50% to the bot owner.</p>
            <p className="text-xs text-gray-400">Net profit means the amount remaining after agreed trading fees and charges. The split applies to profits only; it does not guarantee returns or reimburse losses. The account owner keeps ownership and authorizes all withdrawals. These terms are a proposal until both parties accept them.</p>
          </section>
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-black text-white">Account trade history</h3>
              <button onClick={() => setActiveTab('HISTORY')} className="rounded bg-cyan-700 px-3 py-2 text-xs font-bold text-white">OPEN FULL HISTORY</button>
            </div>
            <p className="text-xs text-amber-200">This list shows trades recorded in this browser's current demo session only. It is not a broker statement and is not shared with another account.</p>
            {trades.length === 0 ? (
              <p className="rounded-lg bg-[#090d14] p-4 text-sm text-gray-400">No demo trades recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto" aria-label="Recent demo trades">
                {trades.slice(0, 10).map(t => (
                  <div key={t.id} className="rounded-lg border border-gray-800 bg-[#090d14] p-3 text-xs">
                    <p className="font-bold text-white">{t.status} · {t.prediction} · {t.duration} ticks</p>
                    <p className="mt-1 text-gray-400">{t.time} · Entry {t.entryDigit} to exit {t.exitDigit}</p>
                    <p className={`mt-1 font-mono font-bold ${t.payout >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Stake: ${t.stake.toFixed(2)} · Result: ${t.payout >= 0 ? '+' : '-'}${Math.abs(t.payout).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* PRODUCT, LIVE EDUCATION AND LEGAL INFORMATION */}
      {activeTab === 'INFO' && (
        <main className="p-4 space-y-4 max-w-2xl mx-auto w-full text-sm">
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-2">
            <h2 className="text-lg font-black text-white">AUTO VELTEX PRIME BOT</h2>
            <p className="text-gray-300">Trading education and a demo practice interface. The current build does not execute live broker trades or predict guaranteed outcomes.</p>
            <p className="text-amber-300 font-bold">Never deposit money you cannot afford to lose. There are no guaranteed profits.</p>
            <p className="text-gray-300">VELTEX PRIME V6 AUTO BOT cash price: $493 (KSh 64,000). Offer price: $385. USD amounts are approximate. For purchase enquiries, contact the seller directly and confirm the buyer licence and verified payment details before paying. Payments are not accepted inside this app yet.</p>
          </section>
          <section className="bg-emerald-950/40 border border-emerald-600 rounded-xl p-4 space-y-3">
            <h3 className="text-base font-black text-emerald-300">BUY VELTEX PRIME V6 AUTO BOT</h3>
            <p className="text-xs font-bold text-gray-400 line-through">Cash price: $493</p>
            <p className="text-2xl font-black text-white">Offer price: $385</p>
            <p className="text-xs text-gray-300">Educational trading tool with demo practice and English-only TikTok LIVE education sessions. It does not guarantee profit. The current version is demo-only and does not place live broker trades.</p>
            <p className="text-xs text-amber-200">Interested customers should contact the seller directly to confirm availability, licence terms and verified payment details. No payment is processed by this website yet.</p>
          </section>
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-white">TikTok LIVE learning schedule</h3>
            <p className="text-gray-300">Planned sessions: daily, 8:00 PM–10:00 PM East Africa Time (EAT), subject to the host going live.</p>
            <p className="text-gray-400">Host plan: welcome viewers by their displayed TikTok names when the authorized LIVE connection provides them; explain risk, demo mode, digit statistics, deposits and withdrawals; answer common questions. TikTok account access and automated viewer-name/Q&A integration are not connected in this build.</p>
          </section>
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-white">Common questions</h3>
            <p><strong className="text-white">How do I practise?</strong> Select DEMO. It starts at $10,000 and can be reset. Demo results are simulated and are not cash.</p>
            <p><strong className="text-white">Can I deposit with Safaricom M-Pesa?</strong> M-Pesa STK Push and confirmation pop-ups are planned, but Daraja is not connected. Do not send money based on this screen.</p>
            <p><strong className="text-white">Can I withdraw?</strong> The withdrawal feature has been removed from this version. No withdrawals can be requested through this app.</p>
            <p><strong className="text-white">Does it copy another trader?</strong> No copy-trading feature is offered.</p>
            <p><strong className="text-white">Does the scanner guarantee a win?</strong> No. Digit statistics and the current scanner are informational/simulated only and do not establish a reliable prediction.</p>
          </section>
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-white">Licence and owner controls</h3>
            <p className="text-gray-300">BCLB licence status has not been verified. No licence number or certificate was provided, so this product must not be advertised as BCLB-licensed.</p>
            <p className="text-gray-300">AA-43 owner management, buyer-number licence transfer, permanent old-device revocation and single-buyer account binding require authenticated server-side controls. They are not active in this frontend. Do not share passwords, OTPs or broker credentials.</p>
          </section>
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-white">Terms and conditions</h3>
            <ol className="list-decimal pl-5 space-y-1 text-gray-300">
              <li>Use the DEMO account to practise; its $10,000 balance is virtual and has no cash value.</li>
              <li>The main-wallet withdrawal option has been removed. No live broker execution, custody, deposits or withdrawals are enabled.</li>
              <li>Trading involves substantial risk and you may lose all money committed. Past or simulated results do not predict future results.</li>
              <li>No profit, income, accuracy, recovery or return is promised or guaranteed.</li>
              <li>Do not share your account, passwords, verification codes, device access or broker credentials. No copy trading is provided.</li>
              <li>Payment must only be made through a verified, officially enabled payment channel. This build does not currently accept payments.</li>
              <li>Any buyer licence transfer must be processed through a secure, verified owner service. A transfer must revoke the previous activation before the new buyer is activated; this enforcement is not yet live.</li>
              <li>Users are responsible for complying with applicable laws and the rules of their broker and payment providers.</li>
              <li>Regulatory licensing is not claimed. BCLB status is unverified until valid documentation is supplied and checked.</li>
            </ol>
          </section>
        </main>
      )}


      {menuOpen && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/70 w-full h-full" />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[#121824] border-r border-gray-700 p-4 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div><p className="text-white font-black">AUTO VELTEX PRIME BOT</p><p className="text-xs text-gray-400">Navigation · {displayUserName}</p></div>
              <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="text-gray-300 text-2xl px-2">×</button>
            </div>
            <div className="space-y-2">
              {[
                ['TRADE','Trade'],['DEPOSIT','Deposit'],['HISTORY','History'],['INFO','Info & Terms']
              ].map(([tab,label]) => <button key={tab} onClick={() => { setActiveTab(tab); setMenuOpen(false); }} className="w-full text-left rounded-lg bg-[#0c1017] border border-gray-700 px-4 py-3 text-sm font-bold text-white">{label}</button>)}
              {isOwner && (
              <div className="rounded-lg border border-slate-500 bg-slate-900/70 p-3 space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-amber-300">VELTEX OWNER · ADMIN</p>
                <p className="text-[11px] text-gray-400">Admin sections are grouped here in the left navigation.</p>
                {[
                  ['OVERVIEW','Dashboard Overview'],
                  ['DEPOSITS','Customer Deposits'],
                  ['CUSTOMERS','Registered Customers'],
                  ['CAPITAL','Add Customer Capital'],
                  ['WITHDRAWALS','Withdrawal Approvals'],
                  ['ACCOUNTS','Account Management'],
                  ['CENTRAL','Central Wallet Withdrawal'],
                  ['SHARING','Bot Sharing / Licence Transfer']
                ].map(([section,label]) => (
                  <button key={section} onClick={async () => {
                    if (!adminUnlocked && !(await unlockAdmin())) return;
                    setAdminSection(section);
                    setActiveTab('ADMIN');
                    setMenuOpen(false);
                  }} className="w-full text-left rounded-lg bg-[#0c1017] border border-gray-700 px-3 py-3 text-sm font-bold text-white hover:bg-slate-800">{label}</button>
                ))}
              </div>
              )}
              {isOwner && <button onClick={async () => {
                if (!adminUnlocked && !(await unlockAdmin())) return;
                setAccountMode('REAL');
                setBotActive(false);
                setActiveTrade(null);
                setActiveTab('TRADE');
                setMenuOpen(false);
                alert('ADMIN BOT · LIVE ONLY selected. Live broker order execution is not connected in this build, so no real trade can be placed.');
              }} className="w-full text-left rounded-lg bg-red-950/60 border border-red-700 px-4 py-3 text-sm font-bold text-red-200">ADMIN BOT · LIVE ONLY</button>}
              <button onClick={() => { setAccountMode('DEMO'); setBotActive(false); setActiveTrade(null); setMenuOpen(false); }} className="w-full text-left rounded-lg bg-emerald-900/40 border border-emerald-700 px-4 py-3 text-sm font-bold text-emerald-300">DEMO account · $10,000 start</button>
              <button onClick={() => { setActiveTab('ACCOUNT'); setMenuOpen(false); }} className="w-full text-left rounded-lg bg-cyan-950/60 border border-cyan-700 px-4 py-3 text-sm font-bold text-cyan-200">Account management</button>
              <button onClick={() => { setDemoWallet(10000); setStake(initialStake); setSessionPL(0); setTrades([]); setBotActive(false); setActiveTrade(null); setAccountMode('DEMO'); setMenuOpen(false); }} className="w-full text-left rounded-lg bg-[#0c1017] border border-gray-700 px-4 py-3 text-sm font-bold text-yellow-300">Reset demo balance</button>
              <button onClick={() => {
                setMenuOpen(false);
                setActiveTab('TRADE');
                toggleDemoBot();
              }} className="w-full text-left rounded-lg bg-[#0c1017] border border-gray-700 px-4 py-3 text-sm font-bold text-emerald-300">{botActive || startAfterScan ? 'Stop demo bot' : 'FREE DEMO BOT'}</button>
              {!user.loggedIn ? <><button onClick={() => { setMenuOpen(false); setAuthModal('login'); }} className="w-full text-left rounded-lg bg-[#0c1017] border border-gray-700 px-4 py-3 text-sm font-bold text-white">Login</button><button onClick={() => { setMenuOpen(false); setAuthModal('signup'); }} className="w-full text-left rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white">Sign up</button></> : <button onClick={async () => { try { const { error } = await supabase.auth.signOut(); if (error) throw error; setUser({ loggedIn: false, email: '', refCode: 'VELTEX-7892' }); setMainWallet(0); setAdminUnlocked(false); setBotActive(false); setActiveTrade(null); setAccountMode('DEMO'); setMenuOpen(false); setActiveTab('TRADE'); } catch (error) { alert(error?.message || 'Could not sign out. Please try again.'); } }} className="w-full flex items-center gap-2 text-left rounded-lg bg-red-950/60 border border-red-700 px-4 py-3 text-sm font-bold text-red-200"><LogOut className="w-4 h-4" /> Log out</button>}
            </div>
            <p className="text-[11px] text-gray-500 mt-5">Trading and payment integrations are not connected. Demo only.</p>
          </aside>
        </div>
      )}

      {showDeepScanModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Entry Scanner">
          <div className="w-full max-w-xl overflow-hidden rounded-[22px] border border-slate-700 bg-[#0c1824] shadow-2xl shadow-black/60">
            <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-900/40"><ScanLine className="h-6 w-6" /></div>
              <h2 className="flex-1 text-lg font-black text-slate-100">Entry Scanner</h2>
              <button onClick={() => setShowDeepScanModal(false)} aria-label="Close Entry Scanner" className="px-2 text-2xl text-slate-400">×</button>
            </div>
            <div className="space-y-5 p-5">
              <p className="rounded-xl bg-[#132331] p-4 text-sm leading-relaxed text-slate-300">Pick the market category you want to scan. The deep scanner reviews recent observed demo-feed digits and displays the historical frequency for that category.</p>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-200" htmlFor="veltex-scan-category">Market</label>
                <select id="veltex-scan-category" value={scanCategory} onChange={e => setScanCategory(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-[#08121c] px-4 py-4 text-sm font-semibold text-slate-100 outline-none">
                  <option>Even / Odd</option>
                  <option>Digits 0–9</option>
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-300"><span>{isScanning ? 'Scanning observed digits…' : 'Ready to scan'}</span><span className="font-mono font-bold">{scannedSignal?.sampleSize || 0}/20</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-red-500 transition-all" style={{width: isScanning ? '55%' : scannedSignal ? '100%' : '0%'}} /></div>
              </div>
              <button onClick={() => { runDeepScan(); }} disabled={isScanning || feedStatus !== 'LIVE'} className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-500 px-4 py-4 text-sm font-black text-white shadow-lg shadow-red-900/40 disabled:opacity-50">
                <ScanLine className="h-5 w-5" />{isScanning ? 'SCANNING…' : 'Deep Scan for Best Market'}
              </button>
              {scannedSignal && <div className="rounded-xl border border-slate-700 bg-[#08121c] p-3 text-center"><p className="text-xl font-black text-cyan-300">{scannedSignal.prediction}</p><p className="mt-1 text-xs text-slate-300">Matching digits: {scannedSignal.triggerDigits.join(' · ')}</p></div>}
              <button onClick={() => { setShowDeepScanModal(false); toggleDemoBot(); }} className="w-full rounded-xl border border-slate-700 bg-[#101e2a] px-4 py-4 text-sm font-bold text-red-300 hover:bg-[#172938]">{botActive || startAfterScan ? 'Stop Deep Scanner Bot' : 'Load Deep Scanner Bot'}</button>
              <p className="text-[10px] leading-relaxed text-amber-300">This build uses simulated demo-feed data. Historical frequency is not a prediction, guaranteed accuracy or financial advice. The bot only operates in DEMO; live broker execution is not connected.</p>
            </div>
          </div>
        </div>
      )}

      {showTargetAchieved && (
        <div role="alert" aria-live="assertive" className="pointer-events-none fixed inset-x-4 top-20 z-[110] mx-auto max-w-md bg-transparent px-2 py-2 text-center text-xl font-black text-lime-300 [text-shadow:0_0_8px_rgba(163,230,53,0.95),0_0_22px_rgba(132,204,22,0.8)]">
          Mashallah 🕌💫 TARGET ACHIEVED!
        </div>
      )}
      {loginWelcome && (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#090d14]/95 px-5 text-center">
          <div className="w-full max-w-md animate-[fadeIn_0.35s_ease-out] rounded-2xl border border-red-500/60 bg-[#121824] p-6 shadow-[0_0_35px_rgba(239,68,68,0.18)]">
            <p className="text-lg font-black text-red-400">السلام عليكم ورحمة الله وبركاته</p>
            <p className="mt-2 text-2xl font-black tracking-wide text-white">WELCOME BACK, {displayUserName.toUpperCase()}!</p>
            <div className="my-6 flex h-28 items-end justify-center gap-2" aria-label="Animated candlestick welcome">
              {[38,68,48,88,58,76,44,96,62,82,52,72].map((height,index) => <span key={index} className="relative w-3 rounded-sm bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.35)] animate-pulse" style={{height:height+'%',animationDelay:(index*70)+'ms'}}><i className="absolute left-1/2 top-[-9px] h-3 w-px -translate-x-1/2 bg-red-200"/><i className="absolute bottom-[-8px] left-1/2 h-3 w-px -translate-x-1/2 bg-red-200"/></span>)}
            </div>
            <p className="text-sm font-bold text-gray-100">Alhamdulillah — welcome to VELTEX PRO BINARY.</p>
            <p className="mt-2 text-xs text-gray-300">Bismillah. Trade with patience, wisdom and discipline. InshaAllah.</p>
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
                <label className="text-xs text-gray-400 block mb-1">Full name</label>
                <input type="text" autoComplete="name" placeholder="Enter your full name" value={authInput.fullName} onChange={(e) => setAuthInput({ ...authInput, fullName: e.target.value })} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs" />
              </div>
            )}
            {authModal === 'signup' && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Referral Code</label>
                <input type="text" placeholder="VELTEX-XXXX" value={authInput.ref} onChange={(e) => setAuthInput({ ...authInput, ref: e.target.value })} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs font-mono" />
              </div>
            )}
            <p className="text-[11px] text-amber-300">Registration and login use secure Supabase authentication. New customers must verify their email before signing in.</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setAuthModal(null)} className="w-1/2 bg-gray-800 text-gray-300 text-xs font-bold py-2 rounded-lg">Cancel</button>
              <button onClick={handleAuth} className="w-1/2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 rounded-lg shadow">Continue</button>
            </div>
          </div>
        </div>
      )}

      <footer className="px-4 py-4 mb-16 text-center text-[10px] text-gray-500 border-t border-gray-800">
        AUTO VELTEX PRIME BOT · Demo only · Trading involves risk · BCLB licence status unverified
        <button onClick={() => setActiveTab('INFO')} className="block mx-auto mt-1 text-red-400 underline">Terms and Conditions</button>
      </footer>

      {/* Fixed bottom navigation: AI scan and Bot controls are side by side */}
      <nav aria-label="Main navigation" className="bg-[#121824] border-t border-gray-800 fixed bottom-0 left-0 right-0 py-2 px-3 flex items-center justify-around z-50">
        <button aria-label="Trade tab" onClick={() => setActiveTab('TRADE')} className={`flex flex-col items-center ${activeTab === 'TRADE' ? 'text-red-500' : 'text-gray-400'}`}>
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-bold">Trade</span>
        </button>
        <button aria-label="AUTO VELTEX PRIME BOT" onClick={() => {
          setActiveTab('TRADE');
          toggleDemoBot();
        }} className="flex flex-col items-center text-emerald-400">
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center -mt-3 border-2 border-[#121824]">
            <Bot className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 font-bold">Auto Bot</span>
        </button>
        <button aria-label="Accurate Bot analysis" onClick={() => setActiveTab('ACCURATE')} className={`flex flex-col items-center ${activeTab === 'ACCURATE' ? 'text-cyan-300' : 'text-gray-400'}`}>
          <ScanLine className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-bold">Accurate</span>
        </button>
        <button aria-label="Trading history" onClick={() => setActiveTab('HISTORY')} className={`flex flex-col items-center ${activeTab === 'HISTORY' ? 'text-red-500' : 'text-gray-400'}`}>
          <Clock className="w-5 h-5" />
          <span className="text-[10px] mt-1">History</span>
        </button>
      </nav>

    </div>
  );
}
