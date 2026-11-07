// VERTEX production deployment trigger: 2026-11-05
import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';

import { 
  TrendingUp, TrendingDown, RefreshCw, Zap, ShieldAlert, Award, 
  Activity, DollarSign, Settings, ChevronRight, Play, Square, History, BarChart2, MessageSquare, Clock, Volume2, VolumeX, Menu, Bell, UserCheck, LogIn, UserPlus, CreditCard, ArrowDownLeft, ArrowUpRight, Share2, ScanLine, Wallet, LogOut
} from 'lucide-react';

// Accept common Kenyan M-Pesa formats and normalize them to 254XXXXXXXXX.
const normalizeKenyanMpesaPhone = (value) => {
  const raw = String(value || '').trim().replace(/[\s()-]/g, '');
  const digits = raw.replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `254${digits.slice(1)}` : digits.startsWith('7') || digits.startsWith('1') ? `254${digits}` : digits;
  return /^254[71]\d{8}$/.test(normalized) ? normalized : '';
};

export default function App() {
  const [mainWallet, setMainWallet] = useState(0); // loaded from the authenticated VERTEX wallet
  const [demoWallet, setDemoWallet] = useState(10000.00);
  const [accountMode, setAccountMode] = useState('DEMO');
  const [liveShowcaseMode, setLiveShowcaseMode] = useState(false);
  useEffect(() => {
    if (!liveShowcaseMode) return undefined;
    const expiry = setTimeout(() => setLiveShowcaseMode(false), 3 * 60 * 60 * 1000);
    return () => clearTimeout(expiry);
  }, [liveShowcaseMode]);
  const activeWallet = accountMode === 'DEMO' ? demoWallet : mainWallet;
  const updateActiveWallet = (delta) => {
    if (accountMode === 'DEMO') setDemoWallet(prev => Math.max(0, prev + delta));
    else setMainWallet(prev => Math.max(0, prev + delta));
  };
  const [user, setUser] = useState({ loggedIn: false, email: '', fullName: '', refCode: 'VERTEX-7892' });
  const [authModal, setAuthModal] = useState(null);
  const [authInput, setAuthInput] = useState({ fullName: '', email: '', password: '', mobileNumber: '', ref: '' });
  const [botLicence, setBotLicence] = useState(null);
  const [licenceEmail, setLicenceEmail] = useState('');
  const [licenceMobile, setLicenceMobile] = useState('');
  const [licenceRows, setLicenceRows] = useState([]);
  const [licenceBusy, setLicenceBusy] = useState(false);

  const [initialStake, setInitialStake] = useState(0.75);
  const [stake, setStake] = useState(0.75);
  const [market, setMarket] = useState('VERTEX Synthetic Index');
  const [contractType, setContractType] = useState('Even/Odd');
  const [tradeMode, setTradeMode] = useState('AUTO'); 
  const [duration, setDuration] = useState(5); 
  const [target, setTarget] = useState(200);
  const [stopLoss, setStopLoss] = useState(999);
  const [multiplier, setMultiplier] = useState(2);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loginWelcome, setLoginWelcome] = useState(false);
  const [showTargetAchieved, setShowTargetAchieved] = useState(false);
  const targetAchievedRef = useRef(false);
  const [autoBotRunning, setAutoBotRunning] = useState(false);
  const autoLastEntryTickRef = useRef(-1);

  const [accurateScanning, setAccurateScanning] = useState(false);
  const [accurateScan, setAccurateScan] = useState(null);
  const [deepScan, setDeepScan] = useState(null);
  const [deepScanning, setDeepScanning] = useState(false);
  const [deepScanMarket, setDeepScanMarket] = useState('Even / Odd');
  const [activeTrade, setActiveTrade] = useState(null);
  const tradeRequestRef = useRef(false);
  const settlingTradeRef = useRef(null);
  const [lastTradeResult, setLastTradeResult] = useState(null);

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
  const [mpesaCheckBusy, setMpesaCheckBusy] = useState(false);
  const [mpesaCheckResult, setMpesaCheckResult] = useState(null);
  const [mpesaPreflightBusy, setMpesaPreflightBusy] = useState(false);
  const [mpesaPreflightResult, setMpesaPreflightResult] = useState(null);
  // Use the account username (email prefix) consistently across sessions and welcome messages.
  const displayUserName = user.loggedIn ? (user.fullName?.trim() || user.email?.split('@')[0] || 'Customer') : 'Guest';
  const isOwner = user.loggedIn && user.email?.trim().toLowerCase() === 'rajulmoviehub@gmail.com';
  const [depositMethod, setDepositMethod] = useState('M-PESA');
  const [depositAmount, setDepositAmount] = useState('5');
  const [depositPhone, setDepositPhone] = useState('');
  const [depositBusy, setDepositBusy] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('5');
  const [withdrawMethod, setWithdrawMethod] = useState('M-PESA');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [withdrawalAdminBusy, setWithdrawalAdminBusy] = useState(false);
  const [startupShown, setStartupShown] = useState(false);

  const resetTradingSession = () => {
    if (activeTrade || tradeRequestRef.current || settlingTradeRef.current) {
      alert('Please wait until the active trade is fully settled before resetting the session.');
      return false;
    }
    setAutoBotRunning(false);
    setShowTargetAchieved(false);
    targetAchievedRef.current = false;
    autoLastEntryTickRef.current = -1;
    setSessionPL(0);
    setTrades([]);
    setLastTradeResult(null);
    setStake(initialStake);
    setDeepScan(null);
    setDeepScanning(false);
    setAccurateScan(null);
    setAccurateScanning(false);
    return true;
  };

  useEffect(() => {
    const profitTarget = Number(target);
    if (!(profitTarget > 0) || sessionPL < profitTarget) {
      targetAchievedRef.current = false;
    } else if (!targetAchievedRef.current) {
      targetAchievedRef.current = true;
      if (autoBotRunning) setAutoBotRunning(false);
      setShowTargetAchieved(true);
      const timer = setTimeout(() => setShowTargetAchieved(false), 3000);
      return () => clearTimeout(timer);
    }

    if (!autoBotRunning) return;
    if (Number(stopLoss) > 0 && sessionPL <= -Math.abs(Number(stopLoss))) {
      setAutoBotRunning(false);
      alert('MV6 AUTO BOT stopped: stop-loss limit reached.');
    }
  }, [autoBotRunning, sessionPL, target, stopLoss]);

  useEffect(() => {
    if (!autoBotRunning || accountMode !== 'DEMO' || feedStatus !== 'LIVE' || activeTrade || totalTicks <= 0) return;
    if (autoLastEntryTickRef.current === totalTicks) return;
    if (sessionPL >= Number(target) && Number(target) > 0) return;
    if (Number(stopLoss) > 0 && sessionPL <= -Math.abs(Number(stopLoss))) return;
    if (demoWallet < stake) {
      setAutoBotRunning(false);
      alert('MV6 AUTO BOT stopped: insufficient demo balance for the selected stake.');
      return;
    }
    const evenCount = Object.entries(digitCounts).reduce((sum, [digit, count]) => sum + (Number(digit) % 2 === 0 ? count : 0), 0);
    const oddCount = Object.entries(digitCounts).reduce((sum, [digit, count]) => sum + (Number(digit) % 2 === 1 ? count : 0), 0);
    const prediction = evenCount <= oddCount ? 'Even' : 'Odd';
    autoLastEntryTickRef.current = totalTicks;
    setActiveTrade({ prediction, ticksElapsed: 0, entryDigit: lastDigit, stake });
  }, [autoBotRunning, accountMode, feedStatus, activeTrade, totalTicks, sessionPL, target, stopLoss, demoWallet, stake, digitCounts, lastDigit]);

  useEffect(() => {
    if (!deepScan || !deepScan.loaded || deepScan.tradeStarted || deepScan.expired) return;
    if (totalTicks <= deepScan.scanTick) return;

    const appearances = deepScan.appearances || 0;
    if (lastDigit === deepScan.digit && totalTicks > (deepScan.matchedTick || deepScan.scanTick)) {
      setDeepScan(previous => previous ? {
        ...previous,
        appeared: true,
        appearances: (previous.appearances || 0) + 1,
        matchedTick: totalTicks
      } : previous);
      return;
    }

    // Keep the manual EVEN/ODD opportunity open after the first match.
    // Expire only after the target has appeared twice and a later tick passes.
    if (deepScan.appeared && appearances >= 2 && totalTicks > deepScan.matchedTick) {
      setDeepScan(previous => previous ? { ...previous, expired: true } : previous);
    }
  }, [totalTicks, lastDigit, deepScan]);

  useEffect(() => {
    if (startupShown) return undefined;
    setStartupShown(true);
    setLoginWelcome(true);
    return undefined;
  }, [startupShown]);

  useEffect(() => {
    if (!loginWelcome) return undefined;
    const timer = setTimeout(() => setLoginWelcome(false), 5000);
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
        setUser({ loggedIn: false, email: '', fullName: '', refCode: 'VERTEX-7892' });
        setBotLicence(null);
        setMainWallet(0);
        return;
      }
      setUser({ loggedIn: true, email: session.user.email || '', fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '', refCode: 'VERTEX-7892' });
      fetch('/api/bot-license', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' }).then(r => r.json()).then(result => { if (mounted && result.ok) setBotLicence(result.licence || null); }).catch(() => {});
      setLoginWelcome(true);
      const { data, error } = await supabase
        .from('wallets')
        .select('available_balance')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!mounted) return;
      if (error) {
        console.error('VERTEX wallet could not be loaded:', error.message);
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

  const runMpesaStkPreflight = async () => {
    if (!supabase || !adminUnlocked || !isOwner) {
      alert('Only the verified VERTEX owner can run this check.');
      return;
    }
    setMpesaPreflightBusy(true);
    setMpesaPreflightResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');
      const response = await fetch('/api/admin/mpesa-check?check=preflight', {
        method:'POST',
        headers:{ Authorization:`Bearer ${session.access_token}` },
        cache:'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Preflight failed (HTTP ${response.status}).`);
      setMpesaPreflightResult(result);
    } catch (error) {
      setMpesaPreflightResult({ ok:false, message:error.message || 'STK preflight could not complete.' });
    } finally {
      setMpesaPreflightBusy(false);
    }
  };

  const runMpesaOAuthCheck = async () => {
    if (!supabase || !adminUnlocked || !isOwner) {
      alert('Only the verified VERTEX owner can run this check.');
      return;
    }
    setMpesaCheckBusy(true);
    setMpesaCheckResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');
      const response = await fetch('/api/admin/mpesa-check?check=oauth', {
        method:'POST',
        headers:{ Authorization:`Bearer ${session.access_token}` },
        cache:'no-store'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || `OAuth check failed (HTTP ${response.status}).`);
      setMpesaCheckResult({ ok:true, message:result.message, environment:result.environment });
    } catch (error) {
      setMpesaCheckResult({ ok:false, message:error.message || 'OAuth check could not complete.' });
    } finally {
      setMpesaCheckBusy(false);
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

  const startServerDemoTrade = async (prediction, source = 'MANUAL') => {
    if (Number(target) > 0 && sessionPL >= Number(target)) {
      setAutoBotRunning(false);
      alert('Alhamdulillah 🤲 Target profit already reached. VERTEX has stopped new trades for this session. Reset the session to trade again.');
      return false;
    }
    if (Number(stopLoss) > 0 && sessionPL <= -Math.abs(Number(stopLoss))) {
      setAutoBotRunning(false);
      alert('VERTEX stopped: session stop-loss limit reached. Reset the demo session or review your risk settings before trading again.');
      return false;
    }
    if (tradeRequestRef.current) return;
    if (!supabase || accountMode !== 'DEMO') {
      alert('The VERTEX server engine is currently available in Demo mode only.');
      return;
    }
    const numericStake = Number(stake);
    if (activeTrade || !Number.isFinite(numericStake) || numericStake <= 0 || numericStake > 10000 || demoWallet < numericStake) {
      alert('Check your demo balance and stake, then try again.');
      return;
    }
    tradeRequestRef.current = true;
    setLastTradeResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setAuthModal('login');
        throw new Error('Sign in to use the VERTEX demo engine.');
      }
      const response = await fetch('/api/market/tick', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ action: 'open', contract: prediction.toUpperCase(), stake: numericStake, durationTicks: Number(duration) })
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.trade?.id) throw new Error(result.error || 'Could not open the demo trade.');
      const serverTrade = result.trade;
      setActiveTrade({
        serverTradeId: serverTrade.id,
        prediction,
        ticksElapsed: 0,
        entryDigit: Number(serverTrade.entry_digit),
        stake: Number(serverTrade.stake),
        duration: Number(serverTrade.duration_ticks),
        source
      });
      setActiveTab('TRADE');
      return true;
    } catch (error) {
      alert(error?.message || 'VERTEX could not open this demo trade.');
      return false;
    } finally {
      tradeRequestRef.current = false;
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

      // Server-created demo trades are settled only by the authenticated server API.
      if (trade.serverTradeId) return { ...trade, ticksElapsed: currentTickCount };

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
          setStake(Number(trade.stake) * Number(multiplier || 2)); // Next stake is based on the actual losing stake
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
        setLastTradeResult(finishedTrade);
        return null;
      }

      return { ...trade, ticksElapsed: currentTickCount };
    });
  };

  // Settle server-opened demo trades using the server's authoritative exit tick.
  useEffect(() => {
    if (accountMode !== 'DEMO' || !activeTrade?.serverTradeId || activeTrade.ticksElapsed < Number(activeTrade.duration || duration)) return;
    const tradeId = activeTrade.serverTradeId;
    if (settlingTradeRef.current === tradeId) return;
    settlingTradeRef.current = tradeId;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Your session expired. Sign in again to settle this demo trade.');
        const response = await fetch('/api/market/tick', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ action: 'settle', tradeId })
        });
        const result = await response.json();
        if (response.status === 409) return;
        if (!response.ok || !result.ok || !result.trade) throw new Error(result.error || 'VERTEX could not settle this demo trade.');
        const settled = result.trade;
        const isWin = settled.status === 'won';
        const netPayout = isWin ? Number(settled.stake) * 0.95 : -Number(settled.stake);
        setDemoWallet(prev => Math.max(0, prev + netPayout));
        setSessionPL(prev => prev + netPayout);
        if (isWin) {
          playSound('win');
          setStake(initialStake);
        } else {
          playSound('loss');
          setStake(Number(settled.stake) * Number(multiplier || 2));
        }
        const finishedTrade = {
          id: settled.id,
          time: settled.settled_at ? new Date(settled.settled_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
          type: 'Even/Odd',
          prediction: activeTrade.prediction,
          duration: Number(settled.duration_ticks),
          entryDigit: Number(settled.entry_digit),
          exitDigit: Number(settled.exit_digit),
          stake: Number(settled.stake),
          payout: netPayout,
          status: isWin ? 'WIN' : 'LOSS'
        };
        setTrades(prev => [finishedTrade, ...prev]);
        setLastTradeResult(finishedTrade);
        setActiveTrade(current => current?.serverTradeId === tradeId ? null : current);
      } catch (error) {
        console.error('VERTEX demo settlement pending:', error?.message || error);
      } finally {
        if (settlingTradeRef.current === tradeId) settlingTradeRef.current = null;
      }
    })();
  }, [accountMode, activeTrade?.serverTradeId, activeTrade?.ticksElapsed, activeTrade?.duration, duration, initialStake, multiplier]);

  // Poll VERTEX's server-side deterministic synthetic demo market.
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
          throw new Error(payload.error || 'VERTEX market feed returned an invalid response');
        }
        const newTicks = payload.ticks.filter(tick =>
          Number.isSafeInteger(tick.sequence) &&
          tick.sequence > lastSequence &&
          Number.isFinite(Number(tick.quote))
        );
        // If the browser was backgrounded or offline for longer than the
        // retained 30-tick window, the old sequence can no longer be replayed.
        // Rebase to the oldest available tick instead of throwing on every poll;
        // otherwise the feed remains stuck in ERROR forever.
        if (lastSequence && newTicks.length && newTicks[0].sequence > lastSequence + 1) {
          console.warn('VERTEX market feed recovered after a tick gap; resynchronizing to the latest available ticks.');
          lastSequence = newTicks[0].sequence - 1;
          marketSequenceRef.current = lastSequence;
          setFeedStatus('CONNECTING');
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
          console.error('VERTEX synthetic market feed error:', error);
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
  const runDeepScan = () => {
    setDeepScanning(true);
    setDeepScan(null);
    setTimeout(() => {
      const digits = priceHistory.slice(-12).map(value => Number(value).toFixed(3).slice(-1)).map(Number).filter(Number.isInteger);
            // Demo-only randomized signal. This is not a measured probability or prediction.
      const selectedSide = Math.random() < 0.5 ? 'EVEN' : 'ODD';
      const sideDigits = digits.filter(value => (value % 2 === 0 ? 'EVEN' : 'ODD') === selectedSide);
      const selectedDigit = sideDigits.length ? sideDigits[Math.floor(Math.random() * sideDigits.length)] : Math.floor(Math.random() * 10);
      const selected = { digit: selectedDigit, side: selectedSide, count: 0 };
      const observedFrequency = 75 + Math.floor(Math.random() * 26);

      // Educational strategy readings from the same observed sample; these are not predictions.
      const parityOf = value => value % 2 === 0 ? 'EVEN' : 'ODD';
      const recent = digits.slice(-5);
      const recentEven = recent.filter(value => parityOf(value) === 'EVEN').length;
      const recentOdd = recent.length - recentEven;
      const strategyInsights = [
        {
          name: 'Parity Frequency',
          side: selected.side,
          detail: `${Math.max(recentEven, recentOdd)} of last 5 ticks were ${recentEven >= recentOdd ? 'EVEN' : 'ODD'}`
        },
        {
          name: 'Recent Momentum',
          side: recentEven >= recentOdd ? 'EVEN' : 'ODD',
          detail: `Last 5 ticks: ${recentEven} EVEN / ${recentOdd} ODD`
        },
        {
          name: 'Digit Recurrence',
          side: selected.side,
          detail: `Digit ${selected.digit} appeared ${selected.count} time(s) in last 12 ticks`
        }
      ];
      setDeepScan({ ...selected, side: selectedSide, percentage: observedFrequency, qualifies: true, highSignal: false, sampleSize: digits.length, strategyInsights, scanTick: totalTicks, loaded: false, appeared: false, expired: false, tradeStarted: false });
      setDeepScanning(false);
      setActiveTab('DEEPSCAN');
    }, 700);
  };

  const handleDeposit = async () => {
    const requestedDepositAmount = Number(depositAmount);
    if (!Number.isFinite(requestedDepositAmount) || requestedDepositAmount < 5 || requestedDepositAmount > 10000) {
      alert('Enter a deposit amount between USD 5 and USD 10,000.');
      return;
    }
    if (depositMethod !== 'M-PESA') {
      alert('This payment method is listed but not connected yet. Do not send funds until VERTEX displays verified payment instructions.');
      return;
    }
    if (!user.loggedIn || !supabase) {
      alert('Please sign in to your VERTEX account before depositing.');
      setAuthModal('login');
      return;
    }
    const normalizedDepositPhone = normalizeKenyanMpesaPhone(depositPhone);
    if (!normalizedDepositPhone) {
      alert('Enter a valid Kenyan M-Pesa number: 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX, +2547XXXXXXXX or +2541XXXXXXXX.');
      return;
    }
    setDepositBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Your session expired. Sign in again.');
      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ phone: normalizedDepositPhone, amountUsd: requestedDepositAmount })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error([result.error || 'Could not start M-Pesa payment.', result.diagnostic].filter(Boolean).join(' — '));
      alert(`M-Pesa prompt sent to +${normalizedDepositPhone}. Pay KES ${Number(result.amountKes).toLocaleString()} (about USD ${Number(result.amountUsd).toFixed(2)}). Automatic reference rate: 1 USD = KES ${Number(result.exchangeRate).toFixed(4)}. Your VERTEX wallet is credited only after Safaricom confirms payment.`);
    } catch (error) {
      alert(error.message || 'M-Pesa deposit could not be started.');
    } finally {
      setDepositBusy(false);
    }
  };

  const handleWithdrawalRequest = async () => {
    if (!user.loggedIn || !supabase) {
      alert('Please sign in before requesting a withdrawal.');
      setAuthModal('login');
      return;
    }
    if (withdrawMethod !== 'M-PESA') {
      alert('Only M-Pesa withdrawal requests are enabled. Other methods are not connected.');
      return;
    }
    const normalizedWithdrawalPhone = normalizeKenyanMpesaPhone(withdrawPhone);
    if (!normalizedWithdrawalPhone) {
      alert('Enter a valid Kenyan M-Pesa number: 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX, +2547XXXXXXXX or +2541XXXXXXXX.');
      return;
    }
    if (!Number.isFinite(Number(withdrawAmount)) || Number(withdrawAmount) < 5 || Number(withdrawAmount) > 10000) {
      alert('Withdrawal amount must be between $5 and $10,000.');
      return;
    }
    setWithdrawBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Your session expired. Sign in again.');
      const response = await fetch('/api/withdrawals/request', {
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
        body:JSON.stringify({amountUsd:Number(withdrawAmount),method:withdrawMethod,destination:normalizedWithdrawalPhone})
      });
      const result = await response.json().catch(()=>({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Withdrawal request could not be submitted.');
      if (result.availableBalance !== null && result.availableBalance !== undefined) setMainWallet(Number(result.availableBalance));
      alert(`Withdrawal request submitted. Request ID: ${result.requestId}. Amount: ${Number(result.amountUsd).toFixed(2)}. Funds are reserved for manual review. No payout or refund is automatic.`);
      setWithdrawPhone('');
      setActiveTab('HISTORY');
    } catch (error) {
      alert(error.message || 'Withdrawal request failed.');
    } finally {
      setWithdrawBusy(false);
    }
  };

  const loadAdminLicences = async () => {
    if (!supabase || !adminUnlocked || !isOwner) return;
    setLicenceBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');
      const response = await fetch('/api/bot-license?admin=1', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not load bot licences.');
      setLicenceRows(Array.isArray(result.licences) ? result.licences : []);
    } catch (error) { alert(error.message || 'Could not load bot licences.'); }
    finally { setLicenceBusy(false); }
  };
  const adminBotLicenceAction = async (action) => {
    if (!supabase || !adminUnlocked || !isOwner) return;
    const email = licenceEmail.trim().toLowerCase(); const mobileNumber = licenceMobile.trim();
    if (!email || !mobileNumber) { alert('Enter the buyer email and registered mobile number.'); return; }
    if (!window.confirm(action === 'activate' ? 'Activate MV6 AUTO BOT for this exact VERTEX account only?' : 'Revoke the MV6 AUTO BOT licence for this account?')) return;
    setLicenceBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');
      const response = await fetch('/api/bot-license', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action, email, mobileNumber }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Bot licence action failed.');
      alert(result.message || 'Licence updated.'); await loadAdminLicences();
    } catch (error) { alert(error.message || 'Bot licence action failed.'); }
    finally { setLicenceBusy(false); }
  };

  const loadAdminWithdrawals = async () => {
    if (!supabase || !adminUnlocked || !isOwner) return;
    setWithdrawalAdminBusy(true);
    try {
      const {data:{session}} = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');
      const response = await fetch('/api/admin/withdrawals', {headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
      const result = await response.json().catch(()=>({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not load withdrawal requests.');
      setWithdrawalRequests(Array.isArray(result.requests) ? result.requests : []);
    } catch (error) {
      alert(error.message || 'Could not load withdrawal requests.');
    } finally {
      setWithdrawalAdminBusy(false);
    }
  };

  const adminWithdrawalAction = async (requestId, action) => {
    if (!supabase || !adminUnlocked || !isOwner) return;
    const labels = {approve:'approve this request for manual payout',reject:'reject this request without refunding automatically',refund:'manually refund this rejected request',paid:'mark this request paid after you have sent the money outside VERTEX',reveal:'reveal the saved payout number'};
    if (!window.confirm(`Are you sure you want to ${labels[action]}?`)) return;
    setWithdrawalAdminBusy(true);
    try {
      const {data:{session}} = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Admin session expired. Sign in again.');
      const response = await fetch('/api/admin/withdrawals', {
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
        body:JSON.stringify({requestId,action})
      });
      const result = await response.json().catch(()=>({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Withdrawal action failed.');
      if (action === 'reveal') alert(`Payout destination: ${result.destination}`);
      else alert(result.message || 'Withdrawal request updated.');
      await loadAdminWithdrawals();
    } catch (error) {
      alert(error.message || 'Withdrawal action failed.');
    } finally {
      setWithdrawalAdminBusy(false);
    }
  };

  const handleAdminCapital = async () => {
    const email = capitalEmail.trim().toLowerCase();
    const amount = Number(capitalAmount);
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      alert('Enter a valid customer email and an amount greater than $0 (maximum $100,000).');
      return;
    }
    if (!supabase || !adminUnlocked || !isOwner) {
      alert('Only the verified VERTEX owner can add customer capital.');
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
    if (!email || !password || (authModal === 'signup' && (!authInput.fullName.trim() || !authInput.mobileNumber.trim()))) {
      alert(authModal === 'signup' ? 'Enter your full name, email, mobile number and password.' : 'Enter your email and password.');
      return;
    }
    try {
      if (authModal === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'https://vertexpromax.vercel.app',
            data: { full_name: authInput.fullName.trim(), name: authInput.fullName.trim(), mobile_number: authInput.mobileNumber.trim(), referral_code: authInput.ref.trim() || null }
          }
        });
        if (error) throw error;
        if (data.session) {
          setUser({ loggedIn: true, email: data.user?.email || email, fullName: data.user?.user_metadata?.full_name || authInput.fullName.trim(), refCode: 'VERTEX-7892' });
        setLoginWelcome(true);
          alert('Your account was created. Your wallet will show once the database migration is applied.');
        } else {
          alert('Registration submitted. Check your email and verify your address before logging in.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUser({ loggedIn: true, email: data.user?.email || email, fullName: data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || '', refCode: 'VERTEX-7892' });
        setLoginWelcome(true);
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('available_balance')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (walletError) {
          alert('Signed in, but the VERTEX wallet could not load. Confirm that the database migration is applied.');
          setMainWallet(0);
        } else {
          setMainWallet(Number(wallet?.available_balance || 0));
        }
      }
      setAuthModal(null);
      setAuthInput({ fullName: '', email: '', password: '', mobileNumber: '', ref: '' });
    } catch (error) {
      alert(error?.message || 'Authentication failed. Please try again.');
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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#090d14] text-gray-100 font-sans flex flex-col pb-32">
      
      {/* Top Header */}
      <header className="bg-[#121824] border-b border-gray-800 px-3 py-2.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <button aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="text-gray-300 p-1"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center text-base font-bold tracking-tight">
            <span className="text-white">VERTEX</span><span className="text-red-500 font-black"> pro</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" aria-label={`Wallet balance ${activeWallet.toFixed(2)} dollars. Open deposit.`} onClick={() => setActiveTab('DEPOSIT')} className="rounded-full border border-gray-700 bg-[#182232] px-3 py-1.5 flex items-center gap-2 text-white">
            <Wallet className="w-3.5 h-3.5 text-red-300" />
            <span className="text-xs font-mono font-bold">${activeWallet.toFixed(2)}</span>
          </button>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-gray-400 hover:text-white p-1">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>

          <button onClick={() => setActiveTab('DEPOSIT')} className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-md shadow-md">Deposit</button>
          <button onClick={() => setActiveTab('WITHDRAW')} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-md shadow-md">Withdraw</button>

          {user.loggedIn ? (
            <span aria-label="Signed in" title="Signed in" className="bg-red-950/60 border border-red-500/40 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
            </span>
          ) : null}
        </div>
      </header>

      <section className="bg-[#0d131f] border-b border-gray-800 px-3 py-2" aria-label="Account mode">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setAccountMode('DEMO'); setActiveTrade(null); }} aria-pressed={accountMode === 'DEMO'} className={`rounded-md px-3 py-2 text-xs font-black border ${accountMode === 'DEMO' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#121824] text-gray-300 border-gray-700'}`}>{liveShowcaseMode ? 'LIVE SHOWCASE · $500 VIRTUAL' : 'DEMO · $10,000 START'}</button>
            <button onClick={() => { setAccountMode('REAL'); setActiveTrade(null); }} aria-pressed={accountMode === 'REAL'} className={`rounded-md px-3 py-2 text-xs font-black border ${accountMode === 'REAL' ? 'bg-red-600 text-white border-red-500' : 'bg-[#121824] text-gray-300 border-gray-700'}`}>LIVE · NOT CONNECTED</button>
            <button onClick={() => { setAccountMode('DEMO'); setDemoWallet(500); setActiveTrade(null); setAutoBotRunning(false); setLiveShowcaseMode(true); setActiveTab('TRADE'); }} className="rounded-md px-3 py-2 text-xs font-black border border-cyan-500 bg-cyan-950 text-cyan-200">{liveShowcaseMode ? 'LIVE SHOWCASE · $500' : 'START 3H LIVE SHOWCASE · $500'}</button>
          </div>
          {accountMode === 'DEMO' && <button onClick={resetTradingSession} disabled={!!activeTrade} className="text-xs font-bold text-yellow-300 underline disabled:opacity-50">Reset Trading Session</button>}
        </div>
        <p className="mt-1 text-[10px] text-gray-400" role="status">{accountMode === 'DEMO' ? (liveShowcaseMode ? 'LIVE SHOWCASE · 3-hour session. $500 virtual demo funds. Simulated VERTEX market; no real-money orders or payouts.' : 'Practice mode: demo funds only. No real deposits or withdrawals. DEMO and DeepScan are free.') : 'LIVE display mode only. External broker execution is not connected, so no real trades are being placed. A paid MV6 AUTO BOT licence is optional and applies only to the AUTO BOT feature.'}</p>
      </section>

      {/* Tabs */}
      <div className="bg-[#121824] grid grid-cols-5 border-b border-gray-800 text-center">
        {['WITHDRAW', 'TRADE', 'DEPOSIT', 'HISTORY', 'INFO'].map((tab) => (
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

          {/* VERTEX Dynamic Market Chart */}
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
                <span className={`text-[10px] font-bold ${feedStatus === 'LIVE' ? 'text-emerald-400' : 'text-amber-300'}`} role="status">{feedStatus === 'LIVE' ? 'VERTEX SIMULATED MARKET' : `FEED ${feedStatus}`}</span>
                <span className="bg-[#1a2233] border border-gray-700 text-gray-300 font-mono text-xs px-2 py-1 rounded font-bold">50%</span>
                <button className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1 rounded shadow">View</button>
              </div>
            </div>

            <p className="text-[10px] text-amber-300 mb-2">VERTEX server-generated synthetic demo prices · not real-world asset prices. Last tick: {lastTickAt ? new Date(lastTickAt).toLocaleTimeString() : 'Waiting for first tick'}.</p>
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
            <div className="mt-2 flex items-center gap-2 rounded-md border border-orange-500/40 bg-orange-950/20 px-2 py-1.5" aria-live="polite" aria-label={activeTrade ? `Trade tick progress ${activeTrade.ticksElapsed} of ${duration}` : 'Current market tick indicator'}>
              <span className="shrink-0 text-[10px] font-black uppercase text-orange-300">{activeTrade ? 'TRADE TICKS' : 'LIVE TICK'}</span>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: activeTrade ? `${Math.min(100, (activeTrade.ticksElapsed / duration) * 100)}%` : '100%' }} />
              </div>
              <span className="shrink-0 font-mono text-[10px] font-bold text-orange-300">{activeTrade ? `${activeTrade.ticksElapsed}/${duration}` : lastDigit}</span>
            </div>

            {/* Live Dynamic 0-9 Digit Highlights */}
            <div className="grid grid-cols-10 gap-1 mt-1 pt-1">
              {Object.entries(stats).map(([digit, val]) => (
                <div key={digit} className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-mono font-bold text-sm transition-all duration-200 ${Number(digit) === lastDigit ? 'border-red-500 bg-red-950 text-red-400 shadow-lg shadow-red-600 scale-110' : 'border-gray-700 bg-[#090d14] text-gray-300'}`}>
                    {digit}
                  </div>
                  <span className={`text-[10px] font-mono font-medium ${Number(digit) === lastDigit ? 'text-red-400 font-bold' : 'text-gray-400'}`}>{val}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-3 mt-2 flex items-center gap-2" aria-label="Trade duration in ticks">
            <label htmlFor="veltex-ticks" className="flex h-10 items-center rounded-lg border border-gray-700 bg-[#121824] px-3 text-[10px] font-black uppercase tracking-wide text-gray-300">TICKS</label>
            <select id="veltex-ticks" value={duration} disabled={!!activeTrade} onChange={e => setDuration(Number(e.target.value))} className="h-10 w-20 rounded-lg border border-gray-700 bg-[#121824] px-2 text-center text-sm font-black text-white disabled:opacity-50">
              {Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
            </select>
          </div>

          {/* Deriv-style controls: stake and P/L row, then three compact risk cards. */}
          <section aria-label="Stake and session profit" className="mx-3 mt-2 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-xl border border-gray-800 bg-[#121824] p-3">
              <label htmlFor="veltex-total-stake" className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">CURRENT / NEXT STAKE</label>
              <input id="veltex-total-stake" type="number" min="0.01" max="100000" step="0.01" inputMode="decimal" value={stake} onChange={e => { const value = e.target.value === '' ? '' : Math.min(100000, Math.max(0.01, Number(e.target.value))); setInitialStake(value); setStake(value); }} className="mt-2 w-full min-w-0 rounded-lg border border-gray-700 bg-[#090d14] px-2 py-2 text-center text-base font-bold text-red-400" />
            </div>
            <div className="min-w-0 rounded-lg border border-gray-800 bg-[#121824] px-2 py-1.5 flex flex-col justify-center" aria-live="polite">
              <span className="block text-[8px] font-bold uppercase tracking-wide text-gray-400">SESSION P/L</span>
              <span className={`mt-0.5 text-sm font-black font-mono ${sessionPL > 0 ? 'text-emerald-400' : sessionPL < 0 ? 'text-red-400' : 'text-gray-300'}`}>{sessionPL >= 0 ? '+' : '-'}${Math.abs(sessionPL).toFixed(2)}</span>
            </div>
          </section>
          <section aria-label="Profit target stop loss and multiplier" className="mx-3 mt-2 grid grid-cols-3 gap-2">
            <div className="min-w-0 rounded-xl border border-gray-800 bg-[#121824] p-2">
              <label htmlFor="veltex-profit-target" className="block text-center text-[9px] font-bold uppercase tracking-wide text-gray-400">🎯 TARGET PROFIT</label>
              <input id="veltex-profit-target" type="number" min="1" max="100000" step="0.01" inputMode="decimal" value={target} disabled={!!activeTrade || autoBotRunning} onChange={e => setTarget(e.target.value === '' ? '' : Math.min(100000, Math.max(1, Number(e.target.value))))} className="mt-2 w-full min-w-0 rounded-lg border border-gray-700 bg-[#090d14] px-1 py-2 text-center text-sm font-bold text-white disabled:opacity-50" />
            </div>
            <div className="min-w-0 rounded-xl border border-gray-800 bg-[#121824] p-2">
              <label htmlFor="veltex-stop-loss" className="block text-center text-[9px] font-bold uppercase tracking-wide text-gray-400">🛑 STOP LOSS</label>
              <input id="veltex-stop-loss" type="number" min="1" max="100000" step="0.01" inputMode="decimal" value={stopLoss} disabled={!!activeTrade || autoBotRunning} onChange={e => setStopLoss(e.target.value === '' ? '' : Math.min(100000, Math.max(1, Number(e.target.value))))} className="mt-2 w-full min-w-0 rounded-lg border border-gray-700 bg-[#090d14] px-1 py-2 text-center text-sm font-bold text-white disabled:opacity-50" />
            </div>
            <div className="min-w-0 rounded-xl border border-gray-800 bg-[#121824] p-2">
              <label htmlFor="veltex-multiplier" className="block text-center text-[9px] font-bold uppercase tracking-wide text-gray-400">⚡ MULTIPLIER</label>
              <input id="veltex-multiplier" type="number" min="1" max="10" step="0.1" inputMode="decimal" value={multiplier} disabled={!!activeTrade || autoBotRunning} onChange={e => setMultiplier(e.target.value === '' ? '' : Math.min(10, Math.max(1, Number(e.target.value))))} className="mt-2 w-full min-w-0 rounded-lg border border-gray-700 bg-[#090d14] px-1 py-2 text-center text-sm font-bold text-white disabled:opacity-50" />
            </div>
          </section>

          <section aria-label="Manual trade choices" className="mx-3 mt-3 grid grid-cols-2 gap-2">
            <button type="button" aria-label={`Place EVEN trade. Potential demo payout ${(Number(stake) * 1.95).toFixed(2)} dollars.`} disabled={accountMode !== 'DEMO' || feedStatus !== 'LIVE' || activeTrade !== null || (Number(stopLoss) > 0 && sessionPL <= -Math.abs(Number(stopLoss))) || !Number.isFinite(Number(stake)) || Number(stake) <= 0 || demoWallet < Number(stake)} onClick={() => { if (accountMode !== 'DEMO') { alert('Live trading is not connected. Manual trades are available in Demo only.'); return; } void startServerDemoTrade('Even', 'MANUAL'); }} className="min-h-14 rounded-lg border border-emerald-700 bg-[#121824] p-2 text-left disabled:opacity-60">
              <span className="flex items-center justify-between text-sm font-black text-white">EVEN <span className="text-emerald-400">${(Number(stake) * 1.95).toFixed(2)}</span></span>
              <span className="mt-1 block text-[9px] text-gray-400">95% payout · Demo estimate</span>
            </button>
            <button type="button" aria-label={`Place ODD trade. Potential demo payout ${(Number(stake) * 1.95).toFixed(2)} dollars.`} disabled={accountMode !== 'DEMO' || feedStatus !== 'LIVE' || activeTrade !== null || (Number(stopLoss) > 0 && sessionPL <= -Math.abs(Number(stopLoss))) || !Number.isFinite(Number(stake)) || Number(stake) <= 0 || demoWallet < Number(stake)} onClick={() => { if (accountMode !== 'DEMO') { alert('Live trading is not connected. Manual trades are available in Demo only.'); return; } void startServerDemoTrade('Odd', 'MANUAL'); }} className="min-h-14 rounded-lg border border-red-700 bg-[#121824] p-2 text-left disabled:opacity-60">
              <span className="flex items-center justify-between text-sm font-black text-red-400">ODD <span className="text-emerald-400">${(Number(stake) * 1.95).toFixed(2)}</span></span>
              <span className="mt-2 block text-[10px] text-gray-400">95% payout · Demo estimate</span>
            </button>
          </section>

          {lastTradeResult && !activeTrade && (
            <div role="status" aria-live="assertive" className={`mx-3 mt-3 rounded-xl border p-3 ${lastTradeResult.status === 'WIN' ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300' : 'border-red-500 bg-red-950/60 text-red-300'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black">{lastTradeResult.status === 'WIN' ? 'TRADE WON · WIN' : 'TRADE LOST · LOSS'}</span>
                <span className="font-mono text-sm font-black">{lastTradeResult.payout >= 0 ? '+' : '-'}${Math.abs(lastTradeResult.payout).toFixed(2)}</span>
              </div>
              <p className="mt-1 text-[10px] font-bold">Exit digit: {lastTradeResult.exitDigit} · {lastTradeResult.prediction}</p>
            </div>
          )}

          {/* Active Trade Banner */}
          {activeTrade && (
            <div className="mx-3 mt-3 p-3 bg-yellow-950/40 border border-yellow-500/60 rounded-xl flex items-center justify-between animate-pulse">
              <span className="text-xs font-bold text-yellow-400">Trade in progress ({activeTrade.prediction})...</span>
              <span className="text-xs font-mono font-bold text-white">{activeTrade.ticksElapsed} / {duration} Ticks</span>
            </div>
          )}

          {/* Bot settings panel removed. Keep only the fixed START AUTO BOT and STOP BOT buttons. */}



        </>
      )}

      {/* WITHDRAWAL VIEW */}
      {activeTab === 'WITHDRAW' && (
        <div className="p-4 space-y-4 max-w-md mx-auto w-full">
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><ArrowUpRight className="w-5 h-5 text-emerald-400" /> Withdraw Funds</h2>
            <p className="text-xs text-gray-400">Enter a custom amount or clear the field and type again. Minimum $5; maximum $10,000 per request.</p>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 25, 50, 100, 250].map(amount => (
                <button key={amount} onClick={() => setWithdrawAmount(amount)} aria-pressed={Number(withdrawAmount) === amount} className={`rounded-lg border px-3 py-3 text-sm font-black ${withdrawAmount === amount ? 'border-emerald-400 bg-emerald-900/40 text-emerald-300' : 'border-gray-700 bg-[#090d14] text-white'}`}>${amount}</button>
              ))}
            </div>
            <label className="block text-xs text-gray-400 font-bold">Withdrawal method</label>
            <select value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-3 text-sm font-bold">
              <option value="M-PESA">M-Pesa · available for requests</option>
              <option value="AIRTEL_MONEY" disabled>Airtel Money · not connected</option>
              <option value="CRYPTO" disabled>Crypto · not connected</option>
              <option value="USDT_P2P" disabled>USDT P2P · not connected</option>
              <option value="WORLDCOIN" disabled>Worldcoin (WLD) · not connected</option>
            </select>
            <label className="block text-xs text-gray-400 font-bold">M-Pesa payout phone number</label>
            <input type="tel" inputMode="tel" autoComplete="tel" value={withdrawPhone} onChange={e => setWithdrawPhone(e.target.value)} placeholder="07…, 01…, +2547… or +2541…" className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-3 font-mono font-bold" />
            <label className="block text-xs text-gray-400 font-bold">Withdrawal amount (USD)</label>
            <input type="number" min="5" max="10000" step="0.01" inputMode="decimal" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-3 font-mono font-bold" />
            <button disabled={withdrawBusy || !user.loggedIn || withdrawMethod !== 'M-PESA'} onClick={handleWithdrawalRequest} className="w-full bg-emerald-700 disabled:bg-gray-700 text-white font-bold text-sm py-3 rounded-lg">{withdrawBusy ? 'SUBMITTING REQUEST…' : 'SUBMIT WITHDRAWAL REQUEST'}</button>

          </section>
        </div>
      )}

      {/* DEPOSIT VIEW */}
      {activeTab === 'DEPOSIT' && (
        <div className="p-4 space-y-4 max-w-md mx-auto w-full">
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-4">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2"><ArrowDownLeft className="w-5 h-5 text-emerald-400" /> Deposit Funds</h2>
            <p className="text-xs text-gray-400 mb-4">Minimum deposit: $5.00 USD</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Deposit method</label>
                <select value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs font-bold">
                  <option value="M-PESA">M-Pesa</option>
                  <option value="AIRTEL_MONEY">Airtel Money · setup required</option>
                  <option value="CRYPTO">Crypto · setup required</option>
                  <option value="USDT_P2P">USDT P2P · setup required</option>
                  <option value="WORLDCOIN">Worldcoin (WLD) · setup required</option>
                </select>
              </div>
              {depositMethod === 'M-PESA' && <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">M-Pesa phone number</label>
                <input type="tel" inputMode="tel" autoComplete="tel" value={depositPhone} onChange={(e) => setDepositPhone(e.target.value)} placeholder="07…, 01…, +2547… or +2541…" className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-sm font-mono font-bold" />
              </div>}
              {depositMethod !== 'M-PESA' && <p className="rounded-lg border border-amber-700 bg-amber-950/30 p-3 text-xs text-amber-200">{depositMethod === 'AIRTEL_MONEY' ? 'Airtel Money' : depositMethod === 'CRYPTO' ? 'Crypto' : depositMethod === 'USDT_P2P' ? 'USDT P2P' : 'Worldcoin (WLD)'} is listed for setup, but its verified receiving account/address and payment confirmation integration are not configured yet. Do not send funds to an unverified address.</p>}
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Quick deposit amounts (USD)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 25, 50, 100, 250].map(amount => (
                    <button type="button" key={amount} onClick={() => setDepositAmount(String(amount))} aria-pressed={depositAmount === String(amount)} className={`rounded-lg border px-3 py-3 text-sm font-black ${depositAmount === String(amount) ? 'border-emerald-400 bg-emerald-900/40 text-emerald-300' : 'border-gray-700 bg-[#090d14] text-white'}`}>${amount}</button>
                  ))}
                </div>
                <label className="text-xs text-gray-400 block mb-1 mt-3 font-bold">Custom amount (USD)</label>
                <input type="number" min="5" max="10000" step="0.01" inputMode="decimal" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Enter any amount (USD)" aria-label="Custom deposit amount in US dollars" className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-sm font-mono font-bold" />
                <p className="mt-1 text-[10px] text-gray-500">Enter your own amount. Minimum USD 5; current M-Pesa limit USD 10,000 per request.</p>
              </div>
              {depositMethod === 'M-PESA' && <p className="text-[10px] text-gray-500">M-Pesa payments are processed through Safaricom Daraja. Your wallet is credited only after Safaricom confirms the payment.</p>}
              <button disabled={depositBusy || depositMethod !== 'M-PESA'} onClick={handleDeposit} className="w-full bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-lg shadow-lg">{depositBusy ? 'SENDING PAYMENT PROMPT…' : depositMethod === 'M-PESA' ? 'CONTINUE WITH M-PESA' : 'METHOD SETUP REQUIRED'}</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'DEEPSCAN' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-x-hidden bg-black/75 backdrop-blur-md p-2 pb-20">
          <section className="w-full max-w-[560px] max-h-[78vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-700 bg-[#0c1824] shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-700 px-3 py-2.5">
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white shadow-lg"><ScanLine className="h-4 w-4" /></span><h2 className="text-sm font-black text-white">Entry Scanner</h2></div>
              <button aria-label="Close DeepScan" onClick={() => setActiveTab('TRADE')} className="p-2 text-gray-400 hover:text-white"><span className="text-2xl leading-none">×</span></button>
            </header>
            <div className="space-y-4 p-5">
              <div className="rounded-xl bg-[#132331] p-4 text-sm leading-relaxed text-slate-300">Choose a market category. VERTEX scans the latest 12 observed ticks for EVEN/ODD patterns.</div>
              <div className="space-y-2"><label className="block text-xs font-bold text-slate-300">Market</label><select value={deepScanMarket} onChange={e => setDeepScanMarket(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-[#08131d] p-4 text-sm font-bold text-white"><option>Even / Odd</option></select></div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-300"><span>{deepScanning ? 'Scanning market ticks' : 'Ready to scan'}</span><span className="font-mono font-bold text-white">{Math.min(priceHistory.length, 12)}/12</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: (Math.min(priceHistory.length / 12, 1) * 100) + '%' }} /></div>
                
              </div>
              <button onClick={runDeepScan} disabled={deepScanning || !!activeTrade} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-4 text-sm font-black text-white shadow-lg shadow-rose-900/40 disabled:cursor-not-allowed disabled:opacity-40"><ScanLine className="h-5 w-5" />{deepScanning ? 'SCANNING…' : 'Deep Scan for Best Market'}</button>
              <button type="button" disabled aria-disabled="true" className="w-full rounded-xl border border-slate-700 bg-[#101d29] py-3 text-sm font-bold text-slate-600 opacity-70">Load Deep Scanner Bot</button>
              {deepScan && (
                <div className="rounded-xl border border-rose-900/70 bg-[#171b27] p-4 space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-wide text-rose-400">{deepScan.qualifies ? 'RANDOM DEMO SIGNAL' : 'NO STRONG ENTRY'}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Target tick number</p>
                      <p className="text-3xl font-black text-cyan-300">DIGIT {deepScan.digit}</p>
                      <p className="text-sm text-slate-300">Trade side: <span className={deepScan.side === 'EVEN' ? 'font-bold text-emerald-300' : 'font-bold text-rose-300'}>{deepScan.side === 'EVEN' ? 'EVEN' : 'ODD'}</span></p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-rose-950/70 px-3 py-2 text-base font-black text-rose-300">{deepScan.percentage}%</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500">{deepScan.qualifies ? 'Random demo score generated for display.' : 'Random demo score generated for display.'} Randomly generated 75–100 demo score; not a real probability or prediction.</p>
                  {deepScan.qualifies && !deepScan.loaded && <button type="button" onClick={() => setDeepScan(previous => previous ? { ...previous, loaded: true, scanTick: totalTicks } : previous)} className="w-full rounded-lg bg-cyan-700 py-3 text-xs font-black text-white">LOAD MARKET</button>}
                  {deepScan.loaded && (
                    <div className="rounded-xl border border-cyan-800 bg-[#09131d] p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black tracking-wide text-cyan-200">LIVE MARKET GRAPH</span><span className={`text-[10px] font-bold ${feedStatus === 'LIVE' ? 'text-emerald-300' : 'text-amber-300'}`}>{feedStatus}</span></div>
                      <div className="relative h-36 w-full overflow-hidden rounded-lg border border-slate-800 bg-[#0c1017]">
                        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(to right,#334155 1px,transparent 1px),linear-gradient(to bottom,#334155 1px,transparent 1px)', backgroundSize: '32px 28px' }} />
                        <svg className="absolute inset-0 h-full w-full text-cyan-400" preserveAspectRatio="none" viewBox="0 0 400 150" role="img" aria-label="VERTEX simulated market price graph"><polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={svgPoints} /><circle cx={lastSvgPoint.x} cy={lastSvgPoint.y} r="4" fill="#ffffff" stroke="#22d3ee" strokeWidth="2" /></svg>
                        <span className="absolute right-2 top-2 rounded bg-white px-2 py-1 font-mono text-[10px] font-bold text-black">{currentPrice}</span>
                      </div>
                      <p className="text-[9px] text-slate-400">VERTEX simulated demo prices · graph updates as new market ticks arrive.</p>
                      <div className="grid grid-cols-10 gap-1 pt-1" aria-label="Live digits zero to nine">
                        {Array.from({ length: 10 }, (_, digit) => (
                          <div key={digit} className="flex min-w-0 flex-col items-center gap-1">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] font-black ${digit === lastDigit ? 'border-cyan-400 bg-cyan-950 text-cyan-200' : 'border-slate-700 bg-[#0c1017] text-slate-300'}`}>{digit}</span>
                            <span className="text-[8px] font-mono text-slate-400">{stats[digit] ?? 0}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {deepScan.loaded && !deepScan.appeared && !deepScan.expired && <p role="status" className="text-center text-xs font-bold text-cyan-200">MARKET LOADED · WAITING FOR DIGIT {deepScan.digit}</p>}
                  {deepScan.appeared && !deepScan.tradeStarted && !deepScan.expired && (
                    <div className="space-y-2">
                      <p role="status" aria-live="polite" className="text-center text-xs font-black text-emerald-300">TARGET {deepScan.digit} · OPPORTUNITY {Math.min(deepScan.appearances || 1, 2)} OF 2 · CHOOSE NOW</p>
                      <p className="text-center text-[10px] text-slate-300">Stake: ${Number(stake).toFixed(2)} · Demo manual trade</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => {
                          if (accountMode !== 'DEMO') { alert('Live broker trading is not connected. Deep Scan manual trades are available in Demo only.'); return; }
                          if (activeTrade || deepScan.tradeStarted || deepScan.expired || !Number.isFinite(Number(stake)) || Number(stake) <= 0 || demoWallet < Number(stake)) { alert('Check your demo balance and stake, then try again.'); return; }
                          void startServerDemoTrade('Even', 'DEEP_SCAN').then(opened => {
                            if (opened) setDeepScan(previous => previous ? { ...previous, tradeStarted: true, chosenSide: 'EVEN' } : previous);
                          });
                        }} className="rounded-lg bg-emerald-700 py-3 text-xs font-black text-white disabled:opacity-50" disabled={accountMode !== 'DEMO' || !!activeTrade || deepScan.tradeStarted || deepScan.expired}>EVEN</button>
                        <button type="button" onClick={() => {
                          if (accountMode !== 'DEMO') { alert('Live broker trading is not connected. Deep Scan manual trades are available in Demo only.'); return; }
                          if (activeTrade || deepScan.tradeStarted || deepScan.expired || !Number.isFinite(Number(stake)) || Number(stake) <= 0 || demoWallet < Number(stake)) { alert('Check your demo balance and stake, then try again.'); return; }
                          void startServerDemoTrade('Odd', 'DEEP_SCAN').then(opened => {
                            if (opened) setDeepScan(previous => previous ? { ...previous, tradeStarted: true, chosenSide: 'ODD' } : previous);
                          });
                        }} className="rounded-lg bg-rose-700 py-3 text-xs font-black text-white disabled:opacity-50" disabled={accountMode !== 'DEMO' || !!activeTrade || deepScan.tradeStarted || deepScan.expired}>ODD</button>
                      </div>
                    </div>
                  )}
                  {deepScan.expired && <div className="space-y-2"><p role="status" className="text-center text-xs font-black text-rose-300">TARGET PASSED · SIGNAL MISSED</p><button type="button" onClick={runDeepScan} disabled={deepScanning || !!activeTrade} className="w-full rounded-lg bg-rose-600 py-3 text-xs font-black text-white disabled:opacity-40">SCAN AGAIN</button></div>}
                  {deepScan.tradeStarted && <p role="status" className="text-center text-xs font-bold text-cyan-200">Manual {deepScan.chosenSide} trade running…</p>}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'ACCURATE' && (
        <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto w-full">
          <div className="rounded-xl border border-cyan-700/60 bg-[#121824] p-4 space-y-2">
            <div className="flex items-center gap-2"><ScanLine className="w-5 h-5 text-cyan-300" /><h2 className="text-base font-black text-white">VERTEX PRIME AUTO BOT</h2></div>
            <p className="text-xs text-gray-300">Independent analysis panel. Scans the latest observed demo-feed digits and reports their historical frequency.</p>
            <p className="text-[11px] text-amber-300">Historical frequency is not a prediction or guaranteed win probability. Current feed is simulated demo data.</p>
            <button onClick={runAccurateScan} disabled={accurateScanning || priceHistory.length === 0} className="w-full rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 py-3 text-sm font-black text-white">
              {accurateScanning ? 'SCANNING DIGITS…' : 'RUN VERTEX PRIME SCAN'}
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
            <p className="text-xs text-amber-200">Owner controls. Withdrawal requests use a server-side wallet reservation and a manual review queue. Approval does not send money; rejected requests are never refunded automatically.</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-[#090d14] p-3"><p className="text-xs text-gray-400">{liveShowcaseMode ? 'LIVE SHOWCASE BALANCE · VIRTUAL' : 'Demo balance'}</p><p className="text-lg font-black text-white">${demoWallet.toFixed(2)}</p></div>
              <div className="rounded-lg bg-[#090d14] p-3"><p className="text-xs text-gray-400">Session P/L</p><p className="text-lg font-black text-white">${sessionPL.toFixed(2)}</p></div>
            </div>
            <p className="text-sm text-gray-300">{liveShowcaseMode ? 'Showcase trades (simulated)' : 'Demo trades recorded in this browser'}: {trades.length}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['OVERVIEW','Dashboard overview'],
                ['DEPOSITS','Customer deposits'],
                ['REGISTRATIONS','Registered customers'],
                ['CAPITAL','Add customer capital'],
                ['WITHDRAWALS','Withdrawal approvals'],
                ['ACCOUNTS','Account management'],
                ['CENTRAL','Central wallet withdrawal'],
                ['MPESA','M-Pesa connection tests'],
                ['SHARING','Bot sharing / licence transfer']
              ].map(([key,label]) => <button key={key} onClick={() => setAdminSection(key)} aria-pressed={adminSection === key} className={`rounded-lg border px-3 py-3 text-left text-xs font-bold ${adminSection === key ? 'bg-cyan-800 border-cyan-500 text-white' : 'bg-[#090d14] border-gray-700 text-gray-200'}`}>{label}</button>)}
            </div>
            {adminSection === 'MPESA' && <div className="rounded-lg bg-[#090d14] p-3 space-y-3">
              <h3 className="font-bold text-white">Daraja OAuth connection test</h3>
              <p className="text-xs text-gray-300">This checks the configured Daraja Production or Sandbox Consumer Key and Secret only. It does not send an STK Push, request payment, or credit any wallet.</p>
              <button type="button" disabled={mpesaCheckBusy} onClick={runMpesaOAuthCheck} className="w-full rounded-lg bg-cyan-800 disabled:opacity-60 text-white font-bold text-sm py-3">{mpesaCheckBusy ? 'CHECKING DAR AJA OAUTH…' : 'TEST M-PESA OAUTH (NO PAYMENT)'}</button>
              {mpesaCheckResult && <div role="status" aria-live="polite" className={`rounded-lg border p-3 text-sm ${mpesaCheckResult.ok ? 'border-emerald-700 text-emerald-200' : 'border-red-700 text-red-200'}`}>
                <p className="font-bold">{mpesaCheckResult.ok ? 'OAuth connection successful' : 'OAuth connection failed'}</p>
                <p>{mpesaCheckResult.message}</p>
                {mpesaCheckResult.environment && <p>Environment: {mpesaCheckResult.environment}</p>}
              </div>}
              <h3 className="font-bold text-white pt-2">M-Pesa STK preflight · no payment</h3>
              <p className="text-xs text-gray-300">Checks required settings and Daraja OAuth. It does not send an STK prompt, charge a customer, simulate a successful callback, or credit a wallet. It cannot prove the live shortcode or passkey until Safaricom accepts a real STK request.</p>
              <button type="button" disabled={mpesaPreflightBusy} onClick={runMpesaStkPreflight} className="w-full rounded-lg bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm py-3">{mpesaPreflightBusy ? 'CHECKING STK CONFIGURATION…' : 'RUN STK PREFLIGHT (NO PAYMENT)'}</button>
              {mpesaPreflightResult && <div role="status" aria-live="polite" className={`rounded-lg border p-3 text-sm space-y-1 ${mpesaPreflightResult.ok ? 'border-emerald-700 text-emerald-200' : 'border-amber-700 text-amber-200'}`}>
                <p className="font-bold">{mpesaPreflightResult.ok ? 'STK preflight passed' : 'STK preflight needs attention'}</p>
                <p>{mpesaPreflightResult.message || mpesaPreflightResult.error}</p>
                {mpesaPreflightResult.environment && <p>Environment: {mpesaPreflightResult.environment}</p>}
                {mpesaPreflightResult.failed?.length > 0 && <p>Checks needing attention: {mpesaPreflightResult.failed.join(', ')}</p>}
                {mpesaPreflightResult.limitations?.map((item, index) => <p key={index}>{item}</p>)}
              </div>}
            </div>}
            {adminSection === 'OVERVIEW' && <div className="rounded-lg bg-[#090d14] p-3 space-y-2"><h3 className="font-bold text-white">System status</h3><p className="text-xs text-gray-300">Customer deposits: Not connected</p><p className="text-xs text-gray-300">Verified registrations: Not connected</p><p className="text-xs text-gray-300">Withdrawal requests: Manual review; manual refunds only</p><p className="text-xs text-gray-300">Central wallet: Not connected</p><p className="text-xs text-gray-300">MV6 bot licences: Owner-controlled, account-bound activation</p></div>}
            {adminSection === 'DEPOSITS' && <div className="rounded-lg bg-[#090d14] p-3 space-y-2"><h3 className="font-bold text-white">Customer deposits</h3><p className="text-xs text-amber-200">No customer deposit feed is connected. The records below, if any, are only local browser entries and are not proof of payment.</p>{transactions.filter(tx => tx.type === 'DEPOSIT').length === 0 ? <p className="text-sm text-gray-400">No local deposit entries.</p> : transactions.filter(tx => tx.type === 'DEPOSIT').map(tx => <p key={tx.id} className="text-xs text-gray-300">{tx.time} · ${tx.amount.toFixed(2)} · {tx.status}</p>)}</div>}
            {adminSection === 'REGISTRATIONS' && <div className="rounded-lg bg-[#090d14] p-3 space-y-2"><h3 className="font-bold text-white">Registered customers</h3><p className="text-2xl font-black text-white">Unavailable</p><p className="text-xs text-gray-400">Email registration and verification are not connected to a customer database, so a real registration count and customer list cannot be shown yet.</p></div>}
            {adminSection === 'CAPITAL' && <div className="rounded-lg border border-emerald-800 bg-[#090d14] p-4 space-y-3">
              <h3 className="font-bold text-white">Add customer capital · USD</h3>
              <p className="text-xs text-gray-300">Enter the customer's registered email. The credit is recorded against that customer's VERTEX wallet and in the wallet ledger.</p>
              <label className="block text-xs font-bold text-gray-300">Customer account email</label>
              <input type="email" value={capitalEmail} onChange={e => setCapitalEmail(e.target.value)} placeholder="customer@example.com" className="w-full rounded-lg border border-gray-700 bg-[#121824] p-3 text-sm text-white" />
              <label className="block text-xs font-bold text-gray-300">Capital amount (USD)</label>
              <input type="number" min="0.01" max="100000" step="0.01" value={capitalAmount} onChange={e => setCapitalAmount(e.target.value)} placeholder="50.00" className="w-full rounded-lg border border-gray-700 bg-[#121824] p-3 text-sm text-white" />
              <button onClick={handleAdminCapital} disabled={capitalBusy || !capitalEmail.trim() || !capitalAmount} className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-black text-white disabled:opacity-50">{capitalBusy ? 'ADDING CAPITAL…' : 'ADD CAPITAL'}</button>
              <p className="text-[11px] leading-relaxed text-amber-200">Admin credit only. It increases the selected customer's recorded wallet balance; it does not represent a customer deposit or external funds received. Every credit is ledger-recorded.</p>
            </div>}
            {adminSection === 'WITHDRAWALS' && <div className="rounded-lg bg-[#090d14] p-3 space-y-3">
              <h3 className="font-bold text-white">Withdrawal requests · manual review</h3>
              <p className="text-xs text-amber-200">Rejecting never refunds automatically. Use the separate MANUAL REFUND action only when you decide to return the reserved funds. APPROVE does not send money; pay the customer outside VERTEX, then mark PAID.</p>
              <button type="button" disabled={withdrawalAdminBusy} onClick={loadAdminWithdrawals} className="w-full rounded-lg bg-cyan-800 py-3 text-sm font-bold text-white disabled:opacity-50">{withdrawalAdminBusy ? 'LOADING REQUESTS…' : 'REFRESH WITHDRAWAL REQUESTS'}</button>
              {withdrawalRequests.length === 0 ? <p className="text-sm text-gray-400">No withdrawal requests loaded.</p> : withdrawalRequests.map(item => <div key={item.id} className="rounded-lg border border-gray-700 bg-[#121824] p-3 space-y-2">
                <p className="text-sm font-bold text-white">${Number(item.amount).toFixed(2)} · {item.payment_method || 'M-PESA'} · {String(item.status).toUpperCase()}</p>
                <p className="text-xs text-gray-300">Customer ID: {item.user_id}</p>
                <p className="text-xs text-gray-300">Destination: {item.destination_masked || 'Not available'}</p>
                <p className="text-[10px] text-gray-500">Request: {item.id} · {item.created_at ? new Date(item.created_at).toLocaleString() : ''}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={withdrawalAdminBusy} onClick={() => adminWithdrawalAction(item.id,'reveal')} className="rounded bg-slate-700 px-2 py-2 text-xs font-bold text-white">REVEAL PAYOUT NUMBER</button>
                  {item.status === 'pending' && <button type="button" disabled={withdrawalAdminBusy} onClick={() => adminWithdrawalAction(item.id,'approve')} className="rounded bg-emerald-800 px-2 py-2 text-xs font-bold text-white">APPROVE</button>}
                  {item.status === 'pending' && <button type="button" disabled={withdrawalAdminBusy} onClick={() => adminWithdrawalAction(item.id,'reject')} className="rounded bg-red-900 px-2 py-2 text-xs font-bold text-white">REJECT · NO REFUND</button>}
                  {['approved','processing'].includes(item.status) && <button type="button" disabled={withdrawalAdminBusy} onClick={() => adminWithdrawalAction(item.id,'paid')} className="rounded bg-emerald-700 px-2 py-2 text-xs font-bold text-white">MARK PAID</button>}
                  {item.status === 'rejected' && !item.refund_transaction_id && !item.refunded_at && <button type="button" disabled={withdrawalAdminBusy} onClick={() => adminWithdrawalAction(item.id,'refund')} className="rounded bg-amber-700 px-2 py-2 text-xs font-bold text-white">MANUAL REFUND</button>}
                  {item.refunded_at && <p className="col-span-2 text-xs font-bold text-emerald-300">Manual refund recorded: {new Date(item.refunded_at).toLocaleString()}</p>}
                </div>
              </div>)}
            </div>}
            {adminSection === 'ACCOUNTS' && <div className="rounded-lg bg-[#090d14] p-3 space-y-3"><h3 className="font-bold text-white">VERTEX Account Management · Admin Only</h3><p className="text-xs text-gray-300">This section is for managing accounts registered on the VERTEX platform only. No broker account or external trading platform is used.</p><div className="rounded-lg border border-gray-700 bg-[#121824] p-3"><p className="text-sm font-bold text-white">Platform owner</p><p className="text-xs text-gray-300">Signed-in admin: {displayUserName}</p><p className="text-xs text-gray-400">{user.email}</p></div><p className="text-xs text-amber-200">Customer account directory and account actions must be connected to the secure VERTEX admin service before users can be listed, suspended, or edited here.</p><button onClick={() => setActiveTab('ACCOUNT')} className="w-full rounded-lg bg-cyan-800 text-white font-bold text-sm py-3">View my VERTEX account</button></div>}
            {adminSection === 'CENTRAL' && <div className="rounded-lg bg-[#090d14] p-3 space-y-2"><h3 className="font-bold text-white">Central wallet withdrawal</h3><p className="text-xs text-gray-300">Central wallet balance: Not connected. No business wallet or payout provider is linked.</p><button disabled className="w-full rounded-lg bg-gray-700 text-gray-400 font-bold text-sm py-3 opacity-60">Request central withdrawal · unavailable</button><p className="text-[11px] text-amber-200">This panel cannot access or move customer or company funds.</p></div>}
            {adminSection === 'SHARING' && <div className="rounded-lg bg-[#090d14] p-3 space-y-3"><h3 className="font-bold text-white">MV6 AUTO BOT · Buyer activation</h3><p className="text-xs text-gray-300">Enter the email and mobile number already registered on the buyer's verified VERTEX account. Activation is tied to that account's unique ID; another account cannot use it.</p><label className="block text-xs text-gray-300" htmlFor="licence-buyer-email">Buyer VERTEX email</label><input id="licence-buyer-email" type="email" autoComplete="email" value={licenceEmail} onChange={e => setLicenceEmail(e.target.value)} placeholder="buyer@example.com" className="w-full rounded-lg bg-[#121824] border border-gray-700 p-3 text-sm text-white" /><label className="block text-xs text-gray-300" htmlFor="licence-buyer-mobile">Registered mobile number</label><input id="licence-buyer-mobile" type="tel" autoComplete="tel" value={licenceMobile} onChange={e => setLicenceMobile(e.target.value)} placeholder="07XXXXXXXX or 2547XXXXXXXX" className="w-full rounded-lg bg-[#121824] border border-gray-700 p-3 text-sm text-white" /><button disabled={licenceBusy || !licenceEmail.trim() || !licenceMobile.trim()} onClick={() => adminBotLicenceAction('activate')} className="w-full rounded-lg bg-emerald-700 text-white font-bold text-sm py-3 disabled:opacity-50">ACTIVATE & ASSIGN BOT</button><button disabled={licenceBusy || !licenceEmail.trim() || !licenceMobile.trim()} onClick={() => adminBotLicenceAction('revoke')} className="w-full rounded-lg bg-red-900 border border-red-700 text-red-100 font-bold text-sm py-3 disabled:opacity-50">REVOKE LICENCE</button><button disabled={licenceBusy} onClick={loadAdminLicences} className="w-full rounded-lg bg-gray-700 text-white font-bold text-sm py-2.5 disabled:opacity-50">{licenceBusy ? 'PLEASE WAIT…' : 'REFRESH LICENCE LIST'}</button><div className="space-y-2"><h4 className="text-xs font-bold text-white">Assigned bot licences ({licenceRows.length})</h4>{licenceRows.length === 0 ? <p className="text-xs text-gray-400">No licence records loaded. Press Refresh licence list.</p> : licenceRows.map(item => <div key={item.user_id} className="rounded-lg border border-gray-700 bg-[#121824] p-3 space-y-1"><p className="text-xs font-bold text-white">{item.customer_email}</p><p className="text-xs text-gray-300">Mobile: {item.mobile_number}</p><p className={`text-xs font-black ${item.status === 'active' ? 'text-emerald-300' : 'text-red-300'}`}>Status: {item.status.toUpperCase()}</p><p className="text-[10px] text-gray-400">Account ID: {item.user_id}</p></div>)}</div><p className="text-[11px] text-amber-200">Confirm payment before activation. This grants account access only; it does not connect a broker or execute trades.</p></div>}{adminSection === 'OVERVIEW' && <button onClick={resetTradingSession} disabled={!!activeTrade} className="w-full rounded-lg bg-amber-600 text-black font-bold text-sm py-3 disabled:opacity-50">Reset trading session (wallet unchanged)</button>}
            <button onClick={() => { setAdminUnlocked(false); setAdminSection('OVERVIEW'); setActiveTab('TRADE'); }} className="w-full rounded-lg bg-gray-700 text-white font-bold text-sm py-3">Lock Admin Panel</button>
          </section>
        </main>
      )}

      {activeTab === 'ACCOUNT' && (
        <main className="p-4 max-w-lg mx-auto w-full space-y-3">
          <section className="bg-[#121824] border border-gray-800 rounded-xl p-4 space-y-2">
            <h2 className="text-lg font-black text-white">Account management</h2>
            <p className="text-sm text-gray-300">Manage the account identifier linked to your AUTO VERTEX PRIME BOT licence.</p>
            <p className="text-sm text-gray-300">This is your VERTEX platform account. It is not connected to Deriv or any external broker.</p>
            <div className="rounded-lg bg-[#090d14] border border-gray-700 p-3 space-y-1"><p className="text-xs text-gray-400">Account name</p><p className="text-base font-bold text-white">{user.fullName || displayUserName}</p><p className="text-xs text-gray-300">{user.email || 'Not signed in'}</p><p className="text-xs text-gray-400">VERTEX customer account</p></div>
            <p className="text-xs text-gray-400">Your login and account details belong to this VERTEX platform. Admin-only account controls are available to the verified owner from the Admin Panel.</p>
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
            <h2 className="text-lg font-black text-white">AUTO VERTEX PRIME BOT</h2>
            <p className="text-gray-300">Trading education and a demo practice interface. The current build does not execute live broker trades or predict guaranteed outcomes.</p>
            <p className="text-amber-300 font-bold">Never deposit money you cannot afford to lose. There are no guaranteed profits.</p>
            <p className="text-gray-300">VERTEX PRIME V6 AUTO BOT sale price: $192.53 USD (KSh 25,000). For purchase enquiries, contact the seller directly and confirm the buyer licence and verified payment details before paying. Payments are not accepted inside this app yet.</p>
          </section>
          <section className="bg-emerald-950/40 border border-emerald-600 rounded-xl p-4 space-y-3">
            <h3 className="text-base font-black text-emerald-300">BUY VERTEX PRIME V6 AUTO BOT</h3>
            <p className="text-2xl font-black text-white">SALE PRICE: $192.53 USD</p>
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
            <p><strong className="text-white">Can I deposit with Safaricom M-Pesa?</strong> M-Pesa Express is connected through Safaricom Daraja. Wallet credit happens only after Safaricom confirms payment.</p>
            <p><strong className="text-white">Can I withdraw?</strong> M-Pesa withdrawal requests require a verified account, available balance and manual owner review. Payouts are sent manually outside VERTEX; rejected requests are not refunded automatically.</p>
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
              <li>M-Pesa deposits are processed through Safaricom confirmation. Withdrawals require manual review; rejected withdrawals are refunded manually by the VERTEX owner, never automatically.</li>
              <li>Trading involves substantial risk and you may lose all money committed. Past or simulated results do not predict future results.</li>
              <li>No profit, income, accuracy, recovery or return is promised or guaranteed.</li>
              <li>Do not share your account, passwords, verification codes, device access or broker credentials. No copy trading is provided.</li>
              <li>Only pay through the verified M-Pesa prompt shown by VERTEX. Withdrawals require manual owner review. Rejected requests are never automatically refunded; any refund is a separate manual owner action.</li>
              <li>Any buyer licence transfer must be processed through a secure, verified owner service. A transfer must revoke the previous activation before the new buyer is activated; this enforcement is not yet live.</li>
              <li>Users are responsible for complying with applicable laws and the rules of their broker and payment providers.</li>
              <li>Regulatory licensing is not claimed. BCLB status is unverified until valid documentation is supplied and checked.</li>
            </ol>
            <div className="mt-3 border-t border-gray-700 pt-3">
              <a href="https://chat.whatsapp.com/I5o5C2sjgo9HNAvSwdvNcD?s=cl&amp;p=a&amp;mlu=4&amp;ilr=4&amp;iam=2" target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-600">JOIN FREE BINARY TRADING CLASS · WHATSAPP</a>
            </div>
          </section>
        </main>
      )}


      {menuOpen && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/70 w-full h-full" />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[#121824] border-r border-gray-700 p-4 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div><p className="text-white font-black">AUTO VERTEX PRIME BOT</p><p className="text-xs text-gray-400">Navigation · {displayUserName}</p></div>
              <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="text-gray-300 text-2xl px-2">×</button>
            </div>
            <div className="space-y-2">
              {[
                ['TRADE','Trade'],['DEPOSIT','Deposit'],['HISTORY','History'],['INFO','Info & Terms']
              ].map(([tab,label]) => <button key={tab} onClick={() => { setActiveTab(tab); setMenuOpen(false); }} className="w-full text-left rounded-lg bg-[#0c1017] border border-gray-700 px-4 py-3 text-sm font-bold text-white">{label}</button>)}
              {isOwner && (
              <div className="rounded-lg border border-slate-500 bg-slate-900/70 p-3 space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-amber-300">VERTEX OWNER · ADMIN</p>
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
                
                setActiveTrade(null);
                setActiveTab('TRADE');
                setMenuOpen(false);
                alert('ADMIN BOT · LIVE ONLY selected. Live broker order execution is not connected in this build, so no real trade can be placed.');
              }} className="w-full text-left rounded-lg bg-red-950/60 border border-red-700 px-4 py-3 text-sm font-bold text-red-200">ADMIN BOT · LIVE ONLY</button>}
              <button onClick={() => { setAccountMode('DEMO');  setActiveTrade(null); setMenuOpen(false); }} className="w-full text-left rounded-lg bg-emerald-900/40 border border-emerald-700 px-4 py-3 text-sm font-bold text-emerald-300">DEMO account · $10,000 start</button>
              <button onClick={() => { setActiveTab('ACCOUNT'); setMenuOpen(false); }} className="w-full text-left rounded-lg bg-cyan-950/60 border border-cyan-700 px-4 py-3 text-sm font-bold text-cyan-200">Account management</button>
              <button onClick={() => { if (resetTradingSession()) { setAccountMode('DEMO'); setMenuOpen(false); } }} disabled={!!activeTrade} className="w-full text-left rounded-lg bg-[#0c1017] border border-gray-700 px-4 py-3 text-sm font-bold text-yellow-300 disabled:opacity-50">Reset trading session · wallet unchanged</button>
              {!user.loggedIn ? <><button onClick={() => { setMenuOpen(false); setAuthModal('login'); }} className="w-full text-left rounded-lg bg-[#0c1017] border border-gray-700 px-4 py-3 text-sm font-bold text-white">Login</button><button onClick={() => { setMenuOpen(false); setAuthModal('signup'); }} className="w-full text-left rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white">Sign up</button></> : <button onClick={async () => { try { const { error } = await supabase.auth.signOut(); if (error) throw error; setUser({ loggedIn: false, email: '', refCode: 'VERTEX-7892' }); setMainWallet(0); setAdminUnlocked(false);  setActiveTrade(null); setAccountMode('DEMO'); setMenuOpen(false); setActiveTab('TRADE'); } catch (error) { alert(error?.message || 'Could not sign out. Please try again.'); } }} className="w-full flex items-center gap-2 text-left rounded-lg bg-red-950/60 border border-red-700 px-4 py-3 text-sm font-bold text-red-200"><LogOut className="w-4 h-4" /> Log out</button>}
            </div>
            <p className="text-[11px] text-gray-500 mt-5">M-Pesa deposits and withdrawal requests are available where configured. Trading uses a simulated demo market; live broker execution is not connected.</p>
          </aside>
        </div>
      )}

      {showTargetAchieved && (
        <div role="alert" aria-live="assertive" className="pointer-events-none fixed inset-x-4 top-20 z-[110] mx-auto max-w-md bg-transparent px-2 py-2 text-center text-xl font-black text-lime-300 [text-shadow:0_0_8px_rgba(163,230,53,0.95),0_0_22px_rgba(132,204,22,0.8)]">
          Alhamdulillah 🤲✨ TARGET PROFIT MADE: ${sessionPL.toFixed(2)}!
        </div>
      )}
      {loginWelcome && (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#090d14]/95 px-5 text-center">
          <div className="w-full max-w-md animate-[fadeIn_0.35s_ease-out] rounded-2xl border border-red-500/60 bg-[#121824] p-6 shadow-[0_0_35px_rgba(239,68,68,0.18)]">
            <p className="text-lg font-black text-red-400">السلام عليكم ورحمة الله وبركاته</p>
            <p className="mt-2 text-2xl font-black tracking-wide text-white">WELCOME BACK, {displayUserName.toUpperCase()}!</p>
            <div className="my-6 flex h-28 items-end justify-center gap-2" aria-label="Animated candlestick welcome">
              {[38,68,48,88,58,76,44,96,62,82,52,72].map((height,index) => <span key={index} className="relative w-2 rounded-sm bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.35)] animate-pulse" style={{height:height+'%',animationDelay:(index*70)+'ms'}}><i className="absolute left-1/2 top-[-9px] h-3 w-px -translate-x-1/2 bg-red-200"/><i className="absolute bottom-[-8px] left-1/2 h-3 w-px -translate-x-1/2 bg-red-200"/></span>)}
            </div>
            <p className="text-xs font-bold text-gray-100">Alhamdulillah — welcome to VERTEX PRO BINARY.</p>
            <p className="mt-1.5 text-[10px] text-gray-300">Bismillah. Trade with patience, wisdom and discipline. InshaAllah.</p>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {authModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#121824] border border-gray-800 rounded-xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {authModal === 'login' ? <LogIn className="w-5 h-5 text-red-500" /> : <UserPlus className="w-5 h-5 text-red-500" />}
              {authModal === 'login' ? 'Login' : 'Create Customer Account'}
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
              <>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Full name</label>
                  <input type="text" autoComplete="name" placeholder="Enter your full name" value={authInput.fullName} onChange={(e) => setAuthInput({ ...authInput, fullName: e.target.value })} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Mobile number (required for bot licence)</label>
                  <input type="tel" inputMode="tel" autoComplete="tel" placeholder="07XXXXXXXX" value={authInput.mobileNumber} onChange={(e) => setAuthInput({ ...authInput, mobileNumber: e.target.value })} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs" />
                </div>
              </>
            )}
            {authModal === 'signup' && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Referral Code</label>
                <input type="text" placeholder="VERTEX-XXXX" value={authInput.ref} onChange={(e) => setAuthInput({ ...authInput, ref: e.target.value })} className="w-full bg-[#090d14] border border-gray-700 text-white rounded-lg p-2.5 text-xs font-mono" />
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
        VERTEX PRIME AUTO BOT · Demo only · Trading involves risk · BCLB licence status unverified
        <button onClick={() => setActiveTab('INFO')} className="block mx-auto mt-1 text-red-400 underline">Terms and Conditions</button>
      </footer>

      {/* Fixed footer: manual EVEN / ODD trade controls above app navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#121824] border-t border-gray-700 px-3 pt-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(0,0,0,0.35)]">
        <nav aria-label="Main navigation" className="flex items-center justify-around gap-2 border-t border-gray-800 pt-2 pb-1">
          <button aria-label="Trade tab" onClick={() => setActiveTab('TRADE')} className={`flex min-w-0 flex-1 flex-col items-center ${activeTab === 'TRADE' ? 'text-red-500' : 'text-gray-400'}`}>
            <BarChart2 className="h-4 w-4" />
            <span className="mt-1 text-[10px] font-bold">Trade</span>
          </button>
          <button aria-label="DeepScan analysis" onClick={() => setActiveTab('DEEPSCAN')} className={`flex min-w-0 flex-1 flex-col items-center ${activeTab === 'DEEPSCAN' ? 'text-violet-300' : 'text-gray-400'}`}>
            <ScanLine className="h-4 w-4" />
            <span className="mt-1 text-[10px] font-bold">DeepScan</span>
          </button>
          <button aria-label="Trading history" onClick={() => setActiveTab('HISTORY')} className={`flex min-w-0 flex-1 flex-col items-center ${activeTab === 'HISTORY' ? 'text-red-500' : 'text-gray-400'}`}>
            <Clock className="h-4 w-4" />
            <span className="mt-1 text-[10px]">History</span>
          </button>
        </nav>
      </div>

    </div>
  );
}