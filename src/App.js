import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithPopup,
  linkWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  EmailAuthProvider,
  linkWithCredential
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  CheckCircle, 
  RefreshCw,
  Volume2,
  Video,
  AlertCircle,
  User,
  ShieldCheck,
  ChevronRight,
  Upload,
  Download,
  Smartphone,
  Square,
  Monitor,
  Music,
  CreditCard,
  Sparkles,
  Wand2,
  X,
  Play,
  Pause,
  Activity,
  LogOut,
  Eye,
  EyeOff,
  Cpu,
  Headphones,
  ChevronDown
} from 'lucide-react';

// --- PRODUCTION FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');
const appId = 'advocalize-pro-v2'; // VERSION 2.1 STABLE

const PLANS = [
  { id: 'single', label: 'Quick Top-up', credits: 1, price: 10, color: 'emerald' },
  { id: 'starter', label: 'Starter Pack', credits: 10, price: 99, color: 'indigo' },
  { id: 'pro', label: 'Creator Pro', credits: 50, price: 399, color: 'purple' },
  { id: 'agency', label: 'Agency Scale', credits: 200, price: 999, color: 'blue' },
];

const RATIOS = [
  { id: 'story', label: 'Story', icon: Smartphone, width: 720, height: 1280, ratio: 9/16 },
  { id: 'square', label: 'Post', icon: Square, width: 1080, height: 1080, ratio: 1/1 },
  { id: 'cinema', label: 'Cinema', icon: Monitor, width: 1280, height: 720, ratio: 16/9 },
];

const LANGUAGES_LIST = [
  { id: 'en-IN', label: 'Indian English', premium: false },
  { id: 'hi-IN', label: 'Hindi (हिन्दी)', premium: false },
  { id: 'mr-IN', label: 'Marathi (मराठी)', premium: true },
  { id: 'bn-IN', label: 'Bengali (বাংলা)', premium: true },
  { id: 'ta-IN', label: 'Tamil (தமிழ்)', premium: true },
  { id: 'te-IN', label: 'Telugu (తెలుగు)', premium: true },
  { id: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)', premium: true },
  { id: 'gu-IN', label: 'Gujarati (ગુજરાતી)', premium: true },
];

const VOICES = [
  { name: 'Aoede', label: 'Warm Storyteller', gender: 'female', premium: false },
  { name: 'Charon', label: 'Deep & Bold', gender: 'male', premium: false },
  { name: 'Fenrir', label: 'Strong Authority', gender: 'male', premium: true },
  { name: 'Kore', label: 'Versatile Pro', gender: 'female', premium: true },
  { name: 'Leda', label: 'Clear & Crisp', gender: 'female', premium: true },
  { name: 'Despina', label: 'Conversational', gender: 'female', premium: true },
  { name: 'Puck', label: 'Upbeat Energy', gender: 'male', premium: true },
  { name: 'Sadachbia', label: 'Calm Authority', gender: 'male', premium: true },
];

const TONES = [
  { id: 'Professional', premium: false },
  { id: 'Friendly', premium: false },
  { id: 'Cheerful', premium: true },
  { id: 'Urgent (Sale)', premium: true },
  { id: 'Luxury', premium: true },
  { id: 'Whispering', premium: true },
  { id: 'Excited', premium: true },
  { id: 'Trustworthy & Warm', premium: true },
];

const VOICE_PREVIEW_PHRASES = {
  'en-IN': "Welcome to VocalAd. Your voice, your brand.",
  'hi-IN': "नमस्ते, VocalAd में आपका स्वागत है।",
  'mr-IN': "नमस्कार, VocalAd मध्ये आपले स्वागत आहे।",
  'bn-IN': "নমস্কার, VocalAd-এ আপনাকে স্বাগতম।",
  'ta-IN': "வணக்கம், VocalAd உங்களை வரவேற்கிறது.",
  'te-IN': "నమస్కారం, VocalAd లో మీకు స్వాగతం.",
  'kn-IN': "ನಮಸ್ಕಾರ, VocalAd ಗೆ ಸ್ವಾಗತ.",
  'gu-IN': "નમસ્તે, VocalAd માં આપનું સ્વાગત છે.",
};

const SPEEDS = [
  { label: 'Normal', instruction: 'at a normal, natural pace' },
  { label: 'Slow', instruction: 'at a slow, deliberate pace' },
  { label: 'Brisk', instruction: 'at a brisk, energetic pace' },
  { label: 'Fast', instruction: 'at a very fast, high-speed marketing pace' }
];

const THEMES = {
  studio: {
    name: "Studio Dark",
    page: "bg-mesh text-slate-100 min-h-screen",
    card: "glass-card shadow-[0_0_100px_rgba(79,70,229,0.05)]",
    nav: "bg-slate-950/40 border-b border-white/5 backdrop-blur-md",
    textHead: "text-white font-['Plus_Jakarta_Sans'] font-black tracking-tight",
    textBody: "text-slate-400 font-['Plus_Jakarta_Sans'] font-medium",
    accent: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 btn-shimmer",
    input: "bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10",
    dropdown: "bg-slate-900/90 border-white/10 backdrop-blur-3xl",
    radius: "rounded-[3rem]",
    btnRadius: "rounded-2xl"
  }
};

const App = () => {
  const [currentTheme] = useState('studio');
  const t = THEMES[currentTheme];

  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState({ creditsRemaining: 0, tier: 'free', videoCount: 0, voiceSamples: 0 });
  const [localVoiceCount, setLocalVoiceCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const dropdownRef = useRef(null);
  const paymentTimeoutRef = useRef(null);
  
  const [modalReason, setModalReason] = useState("limit");
  const [authMode, setAuthMode] = useState('signup'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const [step, setStep] = useState(0); 
  const [image, setImage] = useState(null); 
  const [assetType, setAssetType] = useState('image'); 

  const [videoMode, setVideoMode] = useState('loop');
  const [videoStartOffset, setVideoStartOffset] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [selectedRatio, setSelectedRatio] = useState(RATIOS[0]);
  const [fitMode, setFitMode] = useState('contain');
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES_LIST[0]);
  const [selectedTone, setSelectedTone] = useState(TONES[0].id);
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].name); 
  const [selectedSpeed, setSelectedSpeed] = useState(SPEEDS[0]);

  const [showMagicWand, setShowMagicWand] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState("");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioTakes, setAudioTakes] = useState([]); // [{url, blob}], index 0 = most recent
  const [selectedTakeIdx, setSelectedTakeIdx] = useState(0);
  const [sessionToast, setSessionToast] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewSampleUrl, setPreviewSampleUrl] = useState(null);
  const [showVoiceTest, setShowVoiceTest] = useState(false);
  const previewCacheRef = useRef({});
  const [showMixPopup, setShowMixPopup] = useState(false);
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef(null);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [masteringProgress, setMasteringProgress] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const previewVideoRef = useRef(null);
  const previewAudioRef = useRef(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);

  useEffect(() => {
    if (step !== 3) return;
    const v = previewVideoRef.current;
    const a = previewAudioRef.current;
    if (!a) return;
    const updateDuration = () => setPreviewDuration(a.duration);
    a.addEventListener('loadedmetadata', updateDuration);
    if (a.duration) setPreviewDuration(a.duration);
    if (!isPreviewPlaying) { a.pause(); if (v) v.pause(); return; }
    // For AI Director, wire up the loop-back handler on the preview element
    if (v && assetType === 'video' && videoMode === 'ai_director') {
      const safeOffset = Math.min(videoStartOffset, v.duration - 0.5);
      const onEnded = () => { v.currentTime = safeOffset; v.play().catch(() => {}); };
      v.addEventListener('ended', onEnded);
      v._aiDirectorCleanup = () => v.removeEventListener('ended', onEnded);
    }
    const syncPreview = () => {
      if (!isPreviewPlaying) return;
      if (a.paused && isPreviewPlaying) { setIsPreviewPlaying(false); return; }
      setPreviewTime(a.currentTime);
      if (v && assetType === 'video' && videoMode !== 'ai_director') {
        const aPos = a.currentTime;
        const vDur = v.duration;
        const expected = videoMode === 'loop' ? aPos % vDur : Math.min(aPos, vDur - 0.1);
        if (Math.abs(v.currentTime - expected) > 0.3) v.currentTime = expected;
      }
      requestAnimationFrame(syncPreview);
    };
    if (isPreviewPlaying) { a.play().catch(() => setIsPreviewPlaying(false)); if (v && assetType === 'video') v.play().catch(() => {}); requestAnimationFrame(syncPreview); }
    return () => {
      a.removeEventListener('loadedmetadata', updateDuration);
      a.pause();
      if (v) { v.pause(); if (v._aiDirectorCleanup) { v._aiDirectorCleanup(); delete v._aiDirectorCleanup; } }
    };
  }, [isPreviewPlaying, videoMode, videoStartOffset, step, assetType]);

  const [error, setError] = useState(null);
  const [pendingDownloadType, setPendingDownloadType] = useState(null); 

  const [showUPIModal, setShowUPIModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => { setError(null); }, [step]);

  useEffect(() => {
    if (step !== 3 || assetType !== 'video' || !videoDuration || !previewDuration) return;
    const ratio = previewDuration / videoDuration;
    if (ratio < 0.5) setVideoMode('ai_director');
    else if (ratio > 1.5) setVideoMode('loop');
    else setVideoMode('freeze');
  }, [step, videoDuration, previewDuration, assetType]);

  useEffect(() => {
    if (!showVoiceTest) return;
    const cacheKey = `${selectedVoice}|${selectedTone}|${selectedLanguage.id}`;
    if (previewCacheRef.current[cacheKey]) setPreviewSampleUrl(previewCacheRef.current[cacheKey]);
    else setPreviewSampleUrl(null);
  }, [selectedVoice, selectedTone, selectedLanguage.id, showVoiceTest]);

  useEffect(() => {
    const v = previewVideoRef.current;
    if (!v || assetType !== 'video' || step !== 3 || isPreviewPlaying) return;
    if (videoMode === 'ai_director' && videoDuration && previewDuration) {
      const safeOffset = Math.min(videoStartOffset, videoDuration - 0.5);
      v.currentTime = safeOffset;
      v.playbackRate = Math.min(Math.max((videoDuration - safeOffset) / previewDuration, 0.5), 2.0);
    } else {
      v.currentTime = 0;
      v.playbackRate = 1;
    }
  }, [videoMode, videoStartOffset, videoDuration, previewDuration, step, assetType, isPreviewPlaying]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowProfileDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); await signInAnonymously(auth); } 
      else {
        setUser(u);
        if (!u.isAnonymous) {
          setShowAuthModal(false);
          await setDoc(doc(db, 'artifacts', appId, 'users', u.uid), { email: u.email, lastLogin: new Date().toISOString(), uid: u.uid, displayName: u.displayName || "" }, { merge: true });
        }
        // eslint-disable-next-line no-use-before-define
        if (pendingDownloadType && !u.isAnonymous) { triggerDownload(pendingDownloadType); setPendingDownloadType(null); }
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDownloadType]);

  useEffect(() => {
    if (!user) return;
    const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
    const unsubscribe = onSnapshot(usageRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // ARCHITECT'S SYNC LOGIC:
        // If we were waiting for a payment, and credits just increased, trigger success!
        if (isSubmittingPayment && (data.creditsRemaining > (usage.creditsRemaining || 0))) {
            if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
            setPaymentSuccess(true);
            setIsSubmittingPayment(false);
            // Close modal after showing success for 4 seconds
            setTimeout(() => {
                setShowUPIModal(false);
                setPaymentSuccess(false);
            }, 4000);
        }
        setUsage(data);
      } else {
        setDoc(usageRef, { creditsRemaining: 3, tier: 'free', videoCount: 0, voiceSamples: 0 });
      }
    }, (err) => console.error("Usage listener error:", err));
    return () => unsubscribe();
  }, [user, isSubmittingPayment, usage.creditsRemaining]);

  const signInWithGoogle = async () => {
    setIsAuthLoading(true); setAuthError("");
    const provider = new GoogleAuthProvider();
    try {
      if (authMode === 'signup' && user?.isAnonymous) {
        try { await linkWithPopup(user, provider); } 
        catch (linkErr) {
          if (linkErr.code === 'auth/credential-already-in-use') await signInWithPopup(auth, provider);
          else throw linkErr;
        }
      } else { await signInWithPopup(auth, provider); }
      setShowAuthModal(false);
    } catch (err) { setAuthError(err.message); } finally { setIsAuthLoading(false); }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault(); setIsAuthLoading(true); setAuthError("");
    try {
      if (authMode === 'signup') {
        if (user?.isAnonymous) {
          try { await linkWithCredential(user, EmailAuthProvider.credential(email, password)); } 
          catch (linkErr) { if (linkErr.code === 'auth/email-already-in-use') { setAuthError("Email exists. Try logging in!"); setAuthMode('login'); setIsAuthLoading(false); return; } else throw linkErr; }
        } else await createUserWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else if (authMode === 'reset') { await sendPasswordResetEmail(auth, email); setAuthMessage("Reset link sent!"); }
      setShowAuthModal(false);
    } catch (err) { setAuthError(err.message); } finally { setIsAuthLoading(false); }
  };

  const handleSignOut = async () => {
    try { setLocalVoiceCount(0); setAudioTakes([]); setSelectedTakeIdx(0); setFinalVideoUrl(null); await signOut(auth); setShowProfileDropdown(false); }
    catch (err) { console.error("Sign out failed", err); }
  };

  const handleInitiatePayment = async () => {
    if (!window.Razorpay) {
        setAuthError("Razorpay SDK not loaded. Try refreshing or check internet.");
        return;
    }

    const rzpKey = process.env.REACT_APP_RAZORPAY_KEY_ID;
    if (!rzpKey) {
      setAuthError("Payment config missing. Please contact support.");
      console.error("[Payment] REACT_APP_RAZORPAY_KEY_ID is undefined in this build.");
      return;
    }

    setIsSubmittingPayment(true); setAuthError("");
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions(app, 'us-central1');
      const createOrder = httpsCallable(functions, 'createOrderV2');
      const result = await createOrder({ amount: selectedPlan.price, planId: selectedPlan.id });

      if (!result?.data?.orderId) throw new Error("Server failed to generate Order ID.");

      const options = {
        key: rzpKey,
        amount: selectedPlan.price * 100,
        currency: "INR",
        name: "VocalAd AI",
        description: `Credits for ${selectedPlan.label}`,
        order_id: result.data.orderId,
        handler: function() {
          if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
        },
        prefill: { email: user?.email || "" },
        theme: { color: "#4f46e5" },
        modal: {
            ondismiss: function() {
                if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
                setIsSubmittingPayment(false);
            }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function(response) {
        if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
        setAuthError(`Payment failed: ${response.error.description}`);
        setIsSubmittingPayment(false);
      });
      rzp.open();

      paymentTimeoutRef.current = setTimeout(() => {
        setIsSubmittingPayment(false);
        setAuthError("Taking longer than usual. If your payment went through, credits will appear shortly.");
      }, 180000);
    } catch (err) {
      setAuthError(`Technical Error: ${err.message}`);
      setIsSubmittingPayment(false);
    }
  };

  const pcmToWav = (pcmBuffer, sampleRate) => {
    const dataLength = pcmBuffer.byteLength;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const ws = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    ws(0, 'RIFF'); view.setUint32(4, 36 + dataLength, true); ws(8, 'WAVE'); ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); ws(36, 'data'); view.setUint32(40, dataLength, true);
    new Uint8Array(buffer, 44).set(new Uint8Array(pcmBuffer));
    return new Blob([buffer], { type: 'audio/wav' });
  };


  const handleConfigChange = (type, val) => {
    const isPremium = (type === 'lang' && LANGUAGES_LIST.find(l => l.id === val)?.premium) ||
                      (type === 'voice' && VOICES.find(v => v.name === val)?.premium) ||
                      (type === 'tone' && TONES.find(t => t.id === val)?.premium);
    if (isPremium && usage.tier !== 'paid') { setModalReason("premium_locked"); setShowAuthModal(true); return; }
    if (type === 'lang') setSelectedLanguage(LANGUAGES_LIST.find(l => l.id === val));
    if (type === 'voice') setSelectedVoice(val);
    if (type === 'tone') setSelectedTone(val);
  };

  const generateAudio = async () => {
    if (!text.trim()) return;
    setError(null);
    if (localVoiceCount >= 5) {
      if (usage.tier !== 'paid') { setModalReason("voice_limit_free"); setShowAuthModal(true); }
      else setError("Session limit reached (5/5). Start a new project to generate more voices.");
      return;
    }
    setIsGeneratingAudio(true);
    const newCount = localVoiceCount + 1;
    setLocalVoiceCount(newCount);
    setAudioProgress(10);
    const progressInterval = setInterval(() => {
      setAudioProgress(p => p < 85 ? p + 5 : p);
    }, 1200);
    try {
      const generateVoiceFn = httpsCallable(functions, 'generateVoice');
      const result = await generateVoiceFn({
        text: text.trim(),
        voiceName: selectedVoice,
        tone: selectedTone,
        speed: selectedSpeed.instruction
      });
      clearInterval(progressInterval);
      const { audioBase64, mimeType } = result.data;
      const sampleRate = parseInt((mimeType || '').match(/sampleRate=(\d+)/)?.[1] || "24000");
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const blob = pcmToWav(bytes.buffer, sampleRate);
      const url = URL.createObjectURL(blob);
      setAudioTakes(prev => [{ url, blob }, ...prev].slice(0, 5));
      setSelectedTakeIdx(0);
      setAudioProgress(100);
      setTimeout(() => { setIsGeneratingAudio(false); setAudioProgress(0); }, 500);
      if (newCount === 2) { setSessionToast("3 voices left this session"); setTimeout(() => setSessionToast(null), 3000); }
      else if (newCount === 4) { setSessionToast("Last voice remaining — choose your best take!"); setTimeout(() => setSessionToast(null), 4000); }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message);
      setIsGeneratingAudio(false);
    }
  };

  const previewVoice = async () => {
    const cacheKey = `${selectedVoice}|${selectedTone}|${selectedLanguage.id}`;
    if (previewCacheRef.current[cacheKey]) {
      setPreviewSampleUrl(previewCacheRef.current[cacheKey]);
      return;
    }
    // Voice sample preview deferred — static samples to be added later
    setIsPreviewing(false);
  };

  const createVideo = async () => {
    if (!image || !audioTakes.length || !user) return;
    const audioBlob = audioTakes[selectedTakeIdx]?.blob;
    if (!audioBlob) return;
    if (usage.creditsRemaining <= 0) { if (user && !user.isAnonymous) { setShowUPIModal(true); } else { setModalReason("out_of_credits"); setShowAuthModal(true); } return; }
    setIsCreatingVideo(true); setMasteringProgress(0);
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const voiceBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
      const duration = voiceBuffer.duration;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = selectedRatio.width; canvas.height = selectedRatio.height;
      let assetElement;
      if (assetType === 'video') {
        assetElement = document.createElement('video'); assetElement.src = image; assetElement.muted = true; assetElement.crossOrigin = "anonymous";
        await new Promise(r => { assetElement.onloadeddata = r; assetElement.load(); });
        const vDur = assetElement.duration;
        const startOffset = videoMode === 'ai_director' ? Math.min(videoStartOffset, vDur - 0.5) : 0;
        if (videoMode === 'ai_director') {
          const availableClip = vDur - startOffset;
          assetElement.playbackRate = Math.min(Math.max(availableClip / duration, 0.5), 2.0);
          assetElement.loop = false;
          assetElement.onended = () => { assetElement.currentTime = startOffset; assetElement.play(); };
        } else if (videoMode === 'loop') {
          assetElement.playbackRate = 1; assetElement.loop = true;
        } else {
          assetElement.playbackRate = 1; assetElement.loop = false;
          assetElement.onended = () => assetElement.pause();
        }
        assetElement.currentTime = startOffset;
        await new Promise(r => { let done = false; const resolve = () => { if (!done) { done = true; r(); } }; assetElement.addEventListener('seeked', resolve, { once: true }); setTimeout(resolve, 1000); });
      } else {
        assetElement = new Image(); assetElement.src = image; assetElement.crossOrigin = "anonymous";
        await new Promise(r => assetElement.onload = r);
      }
      const assetWidth = assetType === 'video' ? assetElement.videoWidth : assetElement.width;
      const assetHeight = assetType === 'video' ? assetElement.videoHeight : assetElement.height;
      const assetRatio = assetWidth / assetHeight;
      const canvasRatio = canvas.width / canvas.height;
      let dw, dh, ox = 0, oy = 0;
      if (fitMode === 'cover') {
        if (assetRatio > canvasRatio) { dh = canvas.height; dw = assetWidth * (canvas.height / assetHeight); ox = (canvas.width - dw) / 2; }
        else { dw = canvas.width; dh = assetHeight * (canvas.width / assetWidth); oy = (canvas.height - dh) / 2; }
      } else {
        if (assetRatio > canvasRatio) { dw = canvas.width; dh = assetHeight * (canvas.width / assetWidth); oy = (canvas.height - dh) / 2; }
        else { dh = canvas.height; dw = assetWidth * (canvas.height / assetHeight); ox = (canvas.width - dw) / 2; }
      }
      // Apply user pan offset for images
      if (assetType === 'image') { ox += imagePan.x * (dw - canvas.width); oy += imagePan.y * (dh - canvas.height); }
      const stream = canvas.captureStream(30);
      const audioStream = audioContext.createMediaStreamDestination();
      const voiceSource = audioContext.createBufferSource(); voiceSource.buffer = voiceBuffer; voiceSource.connect(audioStream);
      const mediaRecorder = new MediaRecorder(new MediaStream([...stream.getVideoTracks(), ...audioStream.stream.getAudioTracks()]), { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 5000000 });
      const chunks = []; mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        setFinalVideoUrl(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })));
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats'), { creditsRemaining: increment(-1) });
        setIsCreatingVideo(false); setStep(4);
      };
      const fadeStart = duration - 0.8;
      let startTime = null; let animFrameId; let isRecording = true;
      const renderFrame = (timestamp) => {
        if (!isRecording) return;
        if (!startTime) startTime = timestamp;
        const elapsed = (timestamp - startTime) / 1000;
        setMasteringProgress(Math.min(Math.round((elapsed / duration) * 100), 99));
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (fitMode !== 'cover') { ctx.save(); ctx.filter = 'blur(60px) brightness(0.4)'; ctx.drawImage(assetElement, -canvas.width, -canvas.height, canvas.width * 3, canvas.height * 3); ctx.restore(); }
        ctx.drawImage(assetElement, ox, oy, dw, dh);
        if (elapsed >= fadeStart) { const a = Math.min((elapsed - fadeStart) / 0.8, 1); ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        animFrameId = requestAnimationFrame(renderFrame);
      };
      mediaRecorder.start(); voiceSource.start();
      if (assetType === 'video') assetElement.play();
      requestAnimationFrame(renderFrame);
      setTimeout(() => { isRecording = false; cancelAnimationFrame(animFrameId); mediaRecorder.stop(); voiceSource.stop(); if (assetType === 'video') assetElement.pause(); }, (duration + 0.15) * 1000);
    } catch (err) { setError("Mastering failed."); setIsCreatingVideo(false); }
  };

  const handleDownloadClick = (type) => {
    if (user?.isAnonymous) { setPendingDownloadType(type); setModalReason("download_lock"); setAuthMode("signup"); setShowAuthModal(true); }
    else triggerDownload(type);
  };

  const triggerDownload = (type) => {
    const a = document.createElement('a');
    if (type === 'video' && finalVideoUrl) { a.href = finalVideoUrl; a.download = `VocalAd_${selectedRatio.id}.webm`; }
    else if (type === 'audio' && audioTakes[selectedTakeIdx]?.url) { a.href = audioTakes[selectedTakeIdx].url; a.download = 'VocalAd_Master.wav'; }
    else return;
    a.click();
  };

  const handlePurchase = () => { if (user?.isAnonymous) { setModalReason("purchase_lock"); setAuthMode("signup"); setShowAuthModal(true); return; } setShowUPIModal(true); };

  const getModalContent = () => {
    switch (modalReason) {
      case "voice_limit_free": return { icon: <Volume2 className="w-8 h-8" />, title: "Voice Limit Reached", body: "3 free voice attempts used. Sign in to continue." };
      case "out_of_credits": return { icon: <Video className="w-8 h-8" />, title: "Credits Exhausted", body: "Top up now to continue creating." };
      case "download_lock": return { icon: <Download className="w-8 h-8" />, title: "Claim Your Ad", body: "Sign in to save and download your work." };
      case "purchase_lock": return { icon: <CreditCard className="w-8 h-8" />, title: "Sign In to Upgrade", body: "Create an account to purchase credits." };
      case "premium_locked": return { icon: <Sparkles className="w-8 h-8" />, title: "Premium Feature", body: "Upgrade to Creator Pro to unlock advanced features." };
      default: return { icon: <Sparkles className="w-8 h-8" />, title: "Welcome to VocalAd.ai", body: "Access premium AI tools and high-fidelity production." };
    }
  };

  return (
    <div className={`min-h-screen font-sans p-2 md:p-8 transition-colors duration-700 ${t.page}`}>
      {/* UPI Modal */}
      {showUPIModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className={`${t.dropdown} border border-white/10 rounded-[2.5rem] p-6 md:p-10 max-w-lg w-full shadow-2xl relative`}>
            {isSubmittingPayment && !paymentSuccess && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex flex-col items-center justify-center gap-6 rounded-[2.5rem]">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-black text-white">Verifying Transaction</h3>
                        <p className="text-slate-400 text-xs px-12">Confirm payment in your UPI app. We're waiting for the bank's signal.</p>
                    </div>
                </div>
            )}
            {paymentSuccess && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-[160] flex flex-col items-center justify-center gap-6 rounded-[2.5rem] animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center border-2 border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.1)]"><CheckCircle className="w-12 h-12" /></div>
                <div className="text-center px-8">
                    <h3 className="text-3xl font-black text-white tracking-tight">Payment Verified</h3>
                    <p className="text-slate-400 text-sm">Credits added! Your studio is now unlocked.</p>
                </div>
              </div>
            )}
            <button onClick={() => setShowUPIModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-[130] bg-black/20 p-2 rounded-full"><X className="w-5 h-5" /></button>
            <div className="space-y-8 text-left">
              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></div><div><h3 className="text-xl font-black text-white">Secure Top-up</h3><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Razorpay Protected</p></div></div>
              <div className="space-y-4">
                {!showAllPlans ? (
                  <div className="p-6 rounded-[2rem] border-2 border-emerald-500/30 bg-emerald-500/5 text-center space-y-3">
                    <p className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Current Selection</p>
                    <h4 className="text-2xl font-black text-white">{selectedPlan.label} / ₹{selectedPlan.price}</h4>
                    <button onClick={() => setShowAllPlans(true)} className="text-[10px] font-black text-indigo-400 underline underline-offset-4">Change Plan</button>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {PLANS.map(p => (
                      <button key={p.id} onClick={() => setSelectedPlan(p)} className={`p-4 rounded-2xl border-2 transition-all flex justify-between items-center ${selectedPlan.id === p.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/5'}`}>
                        <div><p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{p.label}</p><h4 className="text-sm font-black text-white">{p.credits} Credits</h4></div>
                        <p className="text-xl font-black text-white">₹{p.price}</p>
                      </button>
                    ))}
                    <button onClick={() => setShowAllPlans(false)} className="text-[10px] font-black text-slate-500 uppercase py-2">Back</button>
                  </div>
                )}
              </div>
              <button onClick={handleInitiatePayment} disabled={isSubmittingPayment} className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 transition-all ${t.accent} active:scale-95 disabled:opacity-50`}>
                {isSubmittingPayment ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-6 h-6" />} Checkout ₹{selectedPlan.price}
              </button>
              {authError && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] font-bold text-center leading-relaxed animate-in shake-1">{authError}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
           <div className={`${t.dropdown} rounded-[2.5rem] p-8 max-w-sm w-full border text-center space-y-6 shadow-2xl relative`}>
            {isAuthLoading && <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 rounded-[2.5rem]"><RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" /><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Verifying Identity...</p></div>}
            <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-[60]"><X className="w-6 h-6" /></button>
            <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto">{getModalContent().icon}</div>
            <h3 className={`text-2xl font-black ${t.textHead}`}>{getModalContent().title}</h3>
            <button onClick={signInWithGoogle} disabled={isAuthLoading} className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-slate-100 transition-all border border-slate-200 disabled:opacity-50"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" /> Connect with Google</button>
            <div className="flex items-center gap-4 py-1"><div className="h-px bg-white/10 flex-1" /><span className="text-[10px] font-black text-slate-500 uppercase">or</span><div className="h-px bg-white/10 flex-1" /></div>
            {authMode !== 'reset' && (
              <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 w-full">
                <button onClick={() => setAuthMode('signup')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Sign Up</button>
                <button onClick={() => setAuthMode('login')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Login</button>
              </div>
            )}
            {authMode === 'reset' && <p className="text-slate-400 text-xs text-center">Enter your email and we'll send a reset link.</p>}
            {authMessage && <p className="text-emerald-400 text-xs font-bold text-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-3 px-4">{authMessage}</p>}
            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
              <input type="email" placeholder="Work Email" className={`w-full p-4 rounded-2xl outline-none border transition-all ${t.input} text-sm`} value={email} onChange={e => setEmail(e.target.value)} required />
              {authMode !== 'reset' && (
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Password" className={`w-full p-4 rounded-2xl outline-none border transition-all ${t.input} text-sm`} value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-500">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              )}
              <button type="submit" disabled={isAuthLoading} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${t.accent} shadow-xl shadow-indigo-500/20 disabled:opacity-50`}>
                {authMode === 'signup' ? "Create Account" : authMode === 'login' ? "Access Studio" : "Send Reset Link"}
              </button>
              {authMode === 'login' && <button type="button" onClick={() => { setAuthMode('reset'); setAuthMessage(''); setAuthError(''); }} className="w-full text-center text-[10px] text-slate-500 hover:text-indigo-400 font-bold transition-all">Forgot Password?</button>}
              {authMode === 'reset' && <button type="button" onClick={() => setAuthMode('login')} className="w-full text-center text-[10px] text-slate-500 hover:text-indigo-400 font-bold transition-all">Back to Login</button>}
            </form>
          </div>
        </div>
      )}

      {/* Main Studio Card */}
      <div className={`max-w-6xl mx-auto rounded-[1.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden border transition-all duration-700 relative ${t.card}`}>
        <div className={`flex items-center justify-between p-4 md:p-8 border-b backdrop-blur-xl sticky top-0 z-40 transition-all ${t.nav}`}>
           <div className="flex items-center gap-2 md:gap-3">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg transition-all ${t.accent}`}><Cpu className="w-5 h-5 md:w-6 md:h-6" /></div>
              <h1 className={`text-lg md:text-2xl font-black tracking-tighter transition-all ${t.textHead}`}>VocalAd.ai</h1>
           </div>
           <div className="flex items-center gap-2 md:gap-4 relative" ref={dropdownRef}>
              <button onClick={handlePurchase} className="bg-indigo-500/10 px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-[9px] md:text-[10px] font-black tracking-widest border border-indigo-500/20 flex items-center gap-1.5 md:gap-2 hover:bg-indigo-500/20 transition-all">
                 <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /><span className="text-white">{usage.creditsRemaining ?? 0}</span><span className="text-indigo-300 opacity-60 hidden xs:inline">CREDITS</span>
              </button>
              <button onClick={() => setShowProfileDropdown(!showProfileDropdown)} className={`w-9 h-9 md:w-11 md:h-11 rounded-full border-2 flex items-center justify-center transition-all overflow-hidden ${showProfileDropdown ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-800'}`}>
                 {user?.isAnonymous ? <User className="w-4 h-4 md:w-5 md:h-5 text-slate-400" /> : <div className={`w-full h-full flex items-center justify-center font-black text-sm ${t.accent}`}>{user?.email?.charAt(0).toUpperCase()}</div>}
              </button>
              {showProfileDropdown && (
                <div className={`absolute top-full right-0 mt-3 w-64 border rounded-[1.5rem] md:rounded-[2rem] shadow-2xl p-4 animate-in fade-in zoom-in-95 z-[100] backdrop-blur-3xl ${t.dropdown}`}>
                   <div className="px-3 py-3 border-b border-white/5 mb-3 bg-white/5 rounded-xl text-left">
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Studio Identity</p>
                      <p className="text-xs font-black truncate text-white mb-3">{user?.isAnonymous ? "Guest Ad-Maker" : user?.email}</p>
                      <div className="bg-black/40 p-2.5 rounded-lg border border-white/5 flex justify-between items-center">
                        <p className="text-lg font-black text-white leading-none">{usage.creditsRemaining ?? 0} Credits</p>
                        <button onClick={() => {setShowUPIModal(true); setShowProfileDropdown(false);}} className="p-1.5 bg-indigo-500 text-white rounded-md"><CreditCard className="w-3.5 h-3.5" /></button>
                      </div>
                   </div>
                   <div className="space-y-1 text-left">
                      <button onClick={handlePurchase} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 text-[11px] font-bold text-slate-300"><ShieldCheck className="w-4 h-4 text-indigo-500" /> Subscription Plan</button>
                      <div className="h-px bg-white/5 my-2" />
                      {user?.isAnonymous ? (
                        <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); setShowProfileDropdown(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-[11px] font-black text-white ${t.accent}`}><User className="w-4 h-4" /> Link Account</button>
                      ) : (
                        <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-500/10 text-[11px] font-bold text-red-400"><LogOut className="w-4 h-4" /> Sign Out</button>
                      )}
                   </div>
                </div>
              )}
           </div>
        </div>

        <div className="p-4 md:p-12">
          {error && <div className="mb-6 p-4 md:p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-left animate-in slide-in-from-top-2"><AlertCircle className="w-5 h-5 shrink-0" /><p className="text-[10px] md:text-xs font-bold uppercase tracking-wider">{error}</p></div>}

          {step === 0 && (
            <div className="animate-in fade-in py-8 md:py-24 text-center max-w-4xl mx-auto space-y-10">
               <div className="space-y-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[9px] font-black uppercase tracking-widest mx-auto"><Activity className="w-3 h-3" /> Professional Lab v2.1</div>
                  <h2 className={`text-4xl md:text-8xl font-black tracking-tighter leading-tight ${t.textHead}`}>Create high-impact AI voiceover <span className="text-indigo-500">for your assets.</span></h2>
                  <div className="flex flex-col items-center pt-8">
                     <button onClick={() => document.getElementById('imageInput').click()} className={`w-full sm:w-auto px-10 py-5 md:px-14 md:py-7 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-4 group ${t.accent}`}><Upload className="w-6 h-6 group-hover:animate-bounce" /> Add Your Media Asset</button>
                  </div>
               </div>
               <input id="imageInput" type="file" className="hidden" accept="image/*,video/*,.gif" onChange={(e) => {
                const file = e.target.files[0]; if (!file) return;
                if (file.size > 50 * 1024 * 1024) { setError("File too large. Please use a file under 50MB."); return; }
                const isVideo = file.type.startsWith('video') && file.type !== 'image/gif';
                setAssetType(isVideo ? 'video' : 'image');
                setImagePan({ x: 0, y: 0 });
                const reader = new FileReader(); reader.onload = (ev) => { setImage(ev.target.result); setStep(1); }; reader.readAsDataURL(file);
              }} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-6">
              <h2 className={`text-2xl md:text-4xl font-black tracking-tighter ${t.textHead}`}>1. Delivery Style</h2>
              <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto pb-4 max-w-4xl mx-auto hide-scrollbar">
                {RATIOS.map(r => (
                  <button key={r.id} onClick={() => setSelectedRatio(r)} className={`min-w-[140px] p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${selectedRatio.id === r.id ? 'border-indigo-500 bg-indigo-500/10' : `hover:border-indigo-300 ${t.input}`}`}>
                    <r.icon className={`w-8 h-8 ${selectedRatio.id === r.id ? 'text-indigo-500' : ''}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${selectedRatio.id === r.id ? 'text-indigo-500' : ''}`}>{r.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-center gap-2 bg-black/40 p-1.5 rounded-xl w-fit mx-auto border border-white/5">
                  <button onClick={() => setFitMode('cover')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${fitMode === 'cover' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Fill Screen</button>
                  <button onClick={() => setFitMode('contain')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${fitMode === 'contain' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Fit Entire</button>
              </div>
              <div className="relative mx-auto bg-black rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl border-4 md:border-8 border-slate-800" style={{ width: '220px', aspectRatio: selectedRatio.ratio }}>
                {assetType === 'image'
                  ? <img src={image} className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`} style={{ objectPosition: `${50 + imagePan.x * 50}% ${50 + imagePan.y * 50}%` }} alt="Preview" />
                  : <video src={image} muted autoPlay loop className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`} />}
              </div>
              {assetType === 'image' && fitMode === 'cover' && (
                <p className="text-center text-[9px] font-black uppercase tracking-widest text-slate-600 mt-2">Drag preview to reframe</p>
              )}
              <div className="flex justify-between items-center max-w-2xl mx-auto w-full pt-4">
                 <button onClick={() => setStep(0)} className={`${t.textBody} font-black text-[10px] uppercase`}>Back</button>
                 <button onClick={() => setStep(2)} className={`px-10 py-4 rounded-xl font-black text-sm flex items-center gap-2 shadow-xl ${t.accent}`}>Voice Studio <ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-10 max-w-5xl mx-auto">
               <div className="flex flex-col gap-6 md:gap-8 text-left">
                  <div className="space-y-3">
                     <div className="flex items-center justify-between px-1">
                        <label className={`font-black text-[10px] uppercase tracking-widest ${t.textBody}`}>Script Master</label>
                        <button onClick={() => { setMagicPrompt(text || ""); setShowMagicWand(true); }} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-500/20 transition-all"><Wand2 className="w-3 h-3" /> Write with AI</button>
                     </div>
                     <textarea className={`w-full p-6 md:p-8 h-48 border-2 rounded-[2rem] focus:border-indigo-500 outline-none transition-all text-base md:text-lg font-medium shadow-inner ${t.input}`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type ad text here..." />
                     <div className="flex justify-between px-2 pt-1">
                       <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{text.trim() ? text.trim().split(/\s+/).length : 0} words · ~{Math.round((text.trim() ? text.trim().split(/\s+/).length : 0) / 2.5)}s</span>
                       <span className={`text-[9px] font-bold uppercase tracking-widest ${localVoiceCount >= 4 ? 'text-amber-500' : 'text-slate-600'}`}>{localVoiceCount}/5 voices used</span>
                     </div>
                  </div>

                  {/* GRID ALIGNMENT: 4 Equal Columns */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 items-end">
                    <div className="flex flex-col gap-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 opacity-60 px-1">Language</label>
                       <div className="relative">
                         <select className={`w-full p-4 md:p-5 pr-10 border-2 rounded-2xl font-bold text-[11px] md:text-xs transition-all ${t.input} cursor-pointer appearance-none`} value={selectedLanguage.id} onChange={e => handleConfigChange('lang', e.target.value)}>
                           {LANGUAGES_LIST.map(l => <option key={l.id} value={l.id}>{l.label} {l.premium && usage.tier !== 'paid' ? ' 🔒' : ''}</option>)}
                         </select>
                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                       </div>
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 opacity-60 px-1">Voice Style</label>
                       <div className="relative">
                         <select className={`w-full p-4 md:p-5 pr-10 border-2 rounded-2xl font-bold text-[11px] md:text-xs transition-all ${t.input} cursor-pointer appearance-none`} value={selectedVoice} onChange={e => handleConfigChange('voice', e.target.value)}>
                           {VOICES.map(v => <option key={v.name} value={v.name}>{v.label} ({v.gender === 'female' ? 'Female' : 'Male'}){v.premium && usage.tier !== 'paid' ? ' 🔒' : ''}</option>)}
                         </select>
                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                       </div>
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 opacity-60 px-1">Performance</label>
                       <div className="relative">
                         <select className={`w-full p-4 md:p-5 pr-10 border-2 rounded-2xl font-bold text-[11px] md:text-xs transition-all ${t.input} cursor-pointer appearance-none`} value={selectedTone} onChange={e => handleConfigChange('tone', e.target.value)}>
                           {TONES.map(ton => <option key={ton.id} value={ton.id}>{ton.id} {ton.premium && usage.tier !== 'paid' ? ' 🔒' : ''}</option>)}
                         </select>
                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                       </div>
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 opacity-60 px-1">Pace</label>
                       <div className="relative">
                         <select className={`w-full p-4 md:p-5 pr-10 border-2 rounded-2xl font-bold text-[11px] md:text-xs transition-all ${t.input} cursor-pointer appearance-none`} value={selectedSpeed.label} onChange={e => setSelectedSpeed(SPEEDS.find(s => s.label === e.target.value))}>
                           {SPEEDS.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
                         </select>
                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                       </div>
                    </div>
                  </div>


                  <button disabled={!text.trim() || isGeneratingAudio || localVoiceCount >= 5} onClick={generateAudio} className={`w-full py-5 md:py-6 text-white rounded-[2rem] font-black text-base md:text-xl shadow-2xl flex items-center justify-center gap-4 transition-all ${isGeneratingAudio ? 'bg-slate-500' : localVoiceCount >= 5 ? 'bg-slate-700 cursor-not-allowed' : t.accent}`}>
                    {isGeneratingAudio ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Volume2 className="w-7 h-7" />}
                    {isGeneratingAudio ? "Producing Talent..." : localVoiceCount >= 5 ? "Session Limit Reached — Start New Project" : audioTakes.length > 0 ? `Generate Take ${audioTakes.length + 1}` : "Generate AI Voiceover"}
                  </button>
                  {isGeneratingAudio && audioProgress > 0 && (
                    <div className="space-y-1.5 px-1 animate-in fade-in">
                      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-indigo-400"><span>{audioProgress < 60 ? "Refining Script..." : "Synthesising Voice..."}</span><span>{audioProgress}%</span></div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${audioProgress}%` }} /></div>
                    </div>
                  )}

                  {audioTakes.length > 0 && !isGeneratingAudio && (
                    <div className="space-y-3 animate-in slide-in-from-top-4">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Your Takes</p>
                      </div>
                      {audioTakes.map((take, idx) => (
                        <div key={idx} onClick={() => setSelectedTakeIdx(idx)} className={`p-4 md:p-5 rounded-2xl border-2 transition-all cursor-pointer ${idx === selectedTakeIdx ? 'border-indigo-500/70 bg-indigo-500/8' : 'border-white/5 bg-slate-900/50 hover:border-white/15'}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${idx === selectedTakeIdx ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'}`}>
                              {idx === selectedTakeIdx && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex-1">
                              Take {audioTakes.length - idx}{idx === 0 ? ' · Latest' : ''}
                            </p>
                            {idx === selectedTakeIdx && <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">Selected</span>}
                          </div>
                          <audio controls src={take.url} controlsList="nodownload noplaybackrate" className="w-full h-8 invert opacity-80" onClick={e => e.stopPropagation()} />
                        </div>
                      ))}
                      <button onClick={() => setShowMixPopup(true)} className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg ${t.accent} active:scale-95`}><Video className="w-4 h-4" /> Finalize Your Ad →</button>
                    </div>
                  )}

                  <button onClick={() => setStep(1)} className={`w-full text-center ${t.textBody} font-black text-[9px] uppercase hover:text-indigo-500`}>Back to delivery style</button>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-4 md:py-6 space-y-10 animate-in fade-in max-w-5xl mx-auto">
              <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="relative group mx-auto bg-black rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl border-[8px] md:border-[12px] border-slate-800 w-[240px] md:w-[280px]" style={{ aspectRatio: selectedRatio.ratio }}>
                   {assetType === 'image'
                     ? <img src={image} className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'} ${fitMode === 'cover' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                         style={{ objectPosition: `${50 + imagePan.x * 50}% ${50 + imagePan.y * 50}%`, userSelect: 'none' }}
                         onMouseDown={fitMode === 'cover' ? (e) => { setIsPanning(true); panStartRef.current = { mx: e.clientX, my: e.clientY, px: imagePan.x, py: imagePan.y }; } : undefined}
                         onMouseMove={fitMode === 'cover' ? (e) => { if (!isPanning || !panStartRef.current) return; const dx = (e.clientX - panStartRef.current.mx) / 120; const dy = (e.clientY - panStartRef.current.my) / 120; setImagePan({ x: Math.max(-1, Math.min(1, panStartRef.current.px - dx)), y: Math.max(-1, Math.min(1, panStartRef.current.py - dy)) }); } : undefined}
                         onMouseUp={() => setIsPanning(false)} onMouseLeave={() => setIsPanning(false)}
                         onTouchStart={fitMode === 'cover' ? (e) => { setIsPanning(true); panStartRef.current = { mx: e.touches[0].clientX, my: e.touches[0].clientY, px: imagePan.x, py: imagePan.y }; } : undefined}
                         onTouchMove={fitMode === 'cover' ? (e) => { if (!isPanning || !panStartRef.current) return; const dx = (e.touches[0].clientX - panStartRef.current.mx) / 120; const dy = (e.touches[0].clientY - panStartRef.current.my) / 120; setImagePan({ x: Math.max(-1, Math.min(1, panStartRef.current.px - dx)), y: Math.max(-1, Math.min(1, panStartRef.current.py - dy)) }); } : undefined}
                         onTouchEnd={() => setIsPanning(false)}
                         draggable={false} alt="Mix" />
                     : <video ref={previewVideoRef} src={image} muted className="w-full h-full object-cover" onLoadedMetadata={(e) => setVideoDuration(e.target.duration)} />}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 md:p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between gap-4">
                         <button onClick={() => setIsPreviewPlaying(!isPreviewPlaying)} className="w-12 h-12 md:w-14 md:h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all">{isPreviewPlaying ? <Pause className="w-5 h-5 md:w-6 md:h-6 fill-white" /> : <Play className="w-5 h-5 md:w-6 md:h-6 fill-white ml-0.5 md:ml-1" />}</button>
                         <div className="flex-1 space-y-2">
                            <div className="h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${(previewTime / previewDuration) * 100}%` }} /></div>
                            <p className="text-[9px] font-black text-white uppercase tracking-widest">{Math.floor(previewTime)}s / {Math.floor(previewDuration)}s</p>
                         </div>
                      </div>
                   </div>
                   {!isPreviewPlaying && <div onClick={() => setIsPreviewPlaying(true)} className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"><div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20"><Play className="w-7 h-7 md:w-8 md:h-8 fill-white ml-1" /></div></div>}
                   <audio ref={previewAudioRef} src={audioTakes[selectedTakeIdx]?.url} onEnded={() => setIsPreviewPlaying(false)} className="hidden" />
                </div>
                <div className="space-y-6 md:space-y-8 w-full text-left p-2">
                  <div className="space-y-2"><h2 className={`text-3xl md:text-4xl font-black tracking-tighter ${t.textHead}`}>Final Mix</h2><p className={`text-[13px] md:text-sm ${t.textBody}`}>Preview your ad and download when ready.</p></div>
                  <div className="bg-black/40 border border-white/5 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 shadow-inner">
                    {assetType === 'video' && (() => {
                      const ratio = previewDuration && videoDuration ? previewDuration / videoDuration : null;
                      const recommendedMode = ratio === null ? null : ratio < 0.5 ? 'ai_director' : ratio > 1.5 ? 'loop' : 'freeze';
                      const vSec = videoDuration ? Math.round(videoDuration) : 0;
                      const aSec = previewDuration ? Math.round(previewDuration) : 0;
                      const recommendationMessage = ratio === null ? null
                        : ratio < 0.5 ? `Your video (${vSec}s) is much longer than your voice (${aSec}s) — Auto Fit speeds it to match your voiceover perfectly`
                        : ratio > 1.5 ? `Your voice (${aSec}s) is longer than your video (${vSec}s) — Loop Video replays it smoothly until the end`
                        : `Lengths are close — Freeze Frame plays your video once and holds the last shot cleanly`;
                      const modeDescriptions = {
                        loop: "Video replays from the start until your voiceover ends",
                        freeze: "Video plays once then holds on the last frame",
                        ai_director: "AI auto-adjusts video speed to match your voiceover · pick your start scene below"
                      };
                      return (
                      <div className="space-y-3">
                        <label className={`text-[9px] font-black uppercase tracking-widest ${t.textBody}`}>Mixing Style</label>
                        {recommendationMessage && <p className="text-[9px] text-emerald-400/80 font-black px-1 leading-relaxed">{recommendationMessage}</p>}
                        <div className={`flex gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5`}>
                          {[{id:'loop',label:'Loop Video'},{id:'freeze',label:'Freeze Frame'},{id:'ai_director',label:'Auto Fit ✦'}].map(m => (
                            <button key={m.id} onClick={() => setVideoMode(m.id)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all relative ${videoMode === m.id ? 'bg-indigo-600 text-white shadow-lg' : recommendedMode === m.id ? 'text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                              {m.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-slate-500 font-black px-1 animate-in fade-in">{modeDescriptions[videoMode]}</p>
                      </div>
                      );
                    })()}
                    <div className="space-y-4">
                      <button disabled={isCreatingVideo} onClick={createVideo} className={`w-full py-5 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-xl shadow-2xl flex items-center justify-center gap-4 transition-all ${isCreatingVideo ? 'bg-slate-700' : t.accent}`}>
                        {isCreatingVideo ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                        {isCreatingVideo ? "Building your ad..." : <span className="flex items-center gap-3">Download Your Vocal Ad <span className="text-[9px] font-black bg-white/10 px-2 py-1 rounded-full">1 CREDIT</span></span>}
                      </button>
                      {isCreatingVideo && (
                         <div className="space-y-2 px-2 animate-in fade-in">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-indigo-400"><span>Synthesis</span><span>{masteringProgress}%</span></div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${masteringProgress}%` }} /></div>
                         </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} className={`w-full text-center ${t.textBody} font-black text-[10px] uppercase hover:text-indigo-500`}>Adjust script or voice</button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-8 md:space-y-12 animate-in zoom-in-95 py-6 md:py-12">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.1)]"><CheckCircle className="w-10 h-10 md:w-12 md:h-12" /></div>
              <h2 className={`text-4xl md:text-6xl font-black tracking-tighter ${t.textHead}`}>Production Ready!</h2>
              <div className="bg-black p-3 md:p-4 rounded-[3rem] md:rounded-[4rem] max-w-[240px] md:max-w-sm mx-auto shadow-2xl border-[8px] md:border-[12px] border-slate-900" style={{ aspectRatio: selectedRatio.ratio }}>
                {finalVideoUrl && <video controls autoPlay controlsList="nodownload noplaybackrate" className="w-full h-full rounded-[2rem] md:rounded-[2.5rem]" src={finalVideoUrl} />}
              </div>
              <div className="flex flex-col gap-3 md:gap-4 max-w-sm mx-auto px-4">
                 <button onClick={() => handleDownloadClick('video')} className={`px-10 py-5 md:px-12 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-xl shadow-2xl flex items-center justify-center gap-4 transition-all ${t.accent} active:scale-95`}><Download className="w-6 h-6 md:w-7 md:h-7" /> Download Your VocalAd</button>
                 <button onClick={() => handleDownloadClick('audio')} className="px-10 py-4 border-2 border-slate-700 rounded-xl md:rounded-2xl font-black uppercase text-[10px] text-slate-400 flex items-center justify-center gap-3 hover:text-white transition-all"><Music className="w-4 h-4 md:w-5 md:h-5" /> Download Voiceover Only (.wav)</button>
                 <button onClick={() => { setImage(null); setStep(0); setAudioTakes([]); setSelectedTakeIdx(0); setFinalVideoUrl(null); setLocalVoiceCount(0); }} className="py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-300">Start New Project</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 md:mt-12 text-center pb-12"><p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Powered by Gemini 2.0 Pro & VocalAd AI Engine</p></div>
      {sessionToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-white/10 rounded-2xl px-6 py-3 shadow-2xl animate-in slide-in-from-bottom-4 pointer-events-none">
          <p className="text-white text-xs font-black text-center whitespace-nowrap">{sessionToast}</p>
        </div>
      )}
      {showMagicWand && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-10 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button onClick={() => setShowMagicWand(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
            <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-2"><Wand2 className="w-8 h-8" /></div>
            <h3 className="text-3xl font-black text-white tracking-tight">Write with AI</h3>
            <p className="text-slate-400 text-sm">Target Language: <span className="text-indigo-400 font-bold">{selectedLanguage.label}</span></p>
            <textarea className="w-full p-6 bg-slate-800 border-2 border-slate-700 rounded-2xl outline-none text-white focus:border-indigo-500 h-32" placeholder="e.g. A shoe brand summer sale, 15 second TV spot..." value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} />
            {authError && <p className="text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{authError}</p>}
            <button onClick={async () => {
                if (!magicPrompt.trim()) return;
                setIsGeneratingScript(true); setAuthError("");
                try {
                  const generateScriptFn = httpsCallable(functions, 'generateScript');
                  const result = await generateScriptFn({ prompt: magicPrompt.trim(), language: selectedLanguage.label });
                  setText(result.data.script); setShowMagicWand(false);
                } catch (e) { setAuthError(e.message); } finally { setIsGeneratingScript(false); }
            }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-3">
              {isGeneratingScript ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGeneratingScript ? "Drafting..." : "Generate Magic Script"}
            </button>
          </div>
        </div>
      )}

      {showMixPopup && (() => {
        const vSec = videoDuration ? Math.round(videoDuration) : 0;
        const aSec = previewDuration ? Math.round(previewDuration) : 0;
        const ratio = previewDuration && videoDuration ? previewDuration / videoDuration : null;
        const isBadFit = ratio !== null && (ratio < 0.1 || ratio > 10);
        const isGoodFit = ratio !== null && ratio >= 0.5 && ratio <= 1.5;
        const recommendedMode = ratio === null ? 'loop' : ratio < 0.5 ? 'ai_director' : ratio > 1.5 ? 'loop' : 'freeze';
        const { title, body, color } = isBadFit
          ? { title: "Poor match", body: `Your voice (${aSec}s) and video (${vSec}s) are very different lengths. All mixing styles will produce a short ad. For best results, record a longer voiceover or use a shorter video clip.`, color: 'amber' }
          : isGoodFit
          ? { title: "Great match!", body: `Your voice (${aSec}s) and video (${vSec}s) are well matched. We've selected Freeze Frame — your video plays once cleanly.`, color: 'emerald' }
          : ratio < 0.5
          ? { title: "Auto Fit recommended", body: `Your video (${vSec}s) is longer than your voice (${aSec}s). Auto Fit will speed-match the video to your voiceover.`, color: 'indigo' }
          : { title: "Loop Video recommended", body: `Your voice (${aSec}s) is longer than your video (${vSec}s). Loop Video will replay your clip smoothly until the voiceover ends.`, color: 'indigo' };
        const colorMap = { emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20', indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full space-y-5 shadow-2xl">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${colorMap[color]}`}>
                {isBadFit ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />} {title}
              </div>
              <p className="text-white font-black text-lg leading-snug tracking-tight">Your final ad will be <span className="text-indigo-400">{aSec > 0 ? `${aSec}s` : '—'}</span></p>
              <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
              <div className="flex flex-col gap-3 pt-1">
                {isBadFit ? (
                  <>
                    <button onClick={() => { setShowMixPopup(false); }} className="w-full py-3 bg-slate-700 text-white rounded-2xl font-black text-sm">Go Back & Adjust</button>
                    <button onClick={() => { setVideoMode(recommendedMode); setShowMixPopup(false); setStep(3); }} className="w-full py-3 border border-white/10 text-slate-400 rounded-2xl font-black text-sm">Continue Anyway</button>
                  </>
                ) : (
                  <button onClick={() => { setVideoMode(recommendedMode); setShowMixPopup(false); setStep(3); }} className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 ${t.accent}`}>
                    Looks Good — Let's Go →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default App;
