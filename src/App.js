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
  Languages,
  Layers,
  Activity,
  LogOut,
  Settings,
  Eye,
  EyeOff,
  Cpu
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
const appId = 'advocalize-pro-v2';

const BRAIN_MODEL = "gemini-2.0-flash-lite"; 
const VOICE_MODEL = "gemini-2.0-flash-preview-tts"; 

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
  { name: 'Aoede', label: 'Aoede (Female)', premium: false },
  { name: 'Charon', label: 'Charon (Male)', premium: false },
  { name: 'Fenrir', label: 'Fenrir (Authority)', premium: true },
  { name: 'Kore', label: 'Kore (Versatile)', premium: true },
  { name: 'Leda', label: 'Leda (Professional)', premium: true },
  { name: 'Despina', label: 'Despina (Warm)', premium: true },
  { name: 'Puck', label: 'Puck (Upbeat)', premium: true },
  { name: 'Sadachbia', label: 'Sadachbia (Authority)', premium: true },
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

const SPEEDS = [
  { label: 'Normal (1.0x)', instruction: 'at a normal, natural pace' },
  { label: 'Slow (0.8x)', instruction: 'at a slow, deliberate pace' },
  { label: 'Brisk (1.25x)', instruction: 'at a brisk, energetic pace' },
  { label: 'Fast (1.5x)', instruction: 'at a very fast, high-speed marketing pace' }
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
  const [usage, setUsage] = useState({ creditsRemaining: 3, tier: 'free', videoCount: 0, voiceSamples: 0 });
  const [localVoiceCount, setLocalVoiceCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const dropdownRef = useRef(null);
  
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
  const [videoVolume, setVideoVolume] = useState(0.5); 
  const [videoMode, setVideoLoopMode] = useState('loop'); 
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
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
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
    const syncPreview = () => {
      if (!isPreviewPlaying) return;
      if (a.paused && isPreviewPlaying) { setIsPreviewPlaying(false); return; }
      setPreviewTime(a.currentTime);
      if (v && assetType === 'video') {
        const aPos = a.currentTime;
        const vDur = v.duration;
        const expected = videoMode === 'loop' ? aPos % vDur : Math.min(aPos, vDur - 0.1);
        if (Math.abs(v.currentTime - expected) > 0.3) v.currentTime = expected;
      }
      requestAnimationFrame(syncPreview);
    };
    if (isPreviewPlaying) { a.play().catch(() => setIsPreviewPlaying(false)); if (v && assetType === 'video') v.play().catch(() => {}); requestAnimationFrame(syncPreview); }
    return () => { a.removeEventListener('loadedmetadata', updateDuration); a.pause(); if (v) v.pause(); };
  }, [isPreviewPlaying, videoMode, step, assetType]);

  const [error, setError] = useState(null);
  const [pendingDownloadType, setPendingDownloadType] = useState(null); 

  const [showUPIModal, setShowUPIModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const brainApiKey = process.env.REACT_APP_GEMINI_BRAIN_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
  const voiceApiKey = process.env.REACT_APP_GEMINI_VOICE_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;

  useEffect(() => { setError(null); }, [step]);

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
          const profileRef = doc(db, 'artifacts', appId, 'users', u.uid);
          await setDoc(profileRef, { email: u.email, lastLogin: new Date().toISOString(), uid: u.uid, displayName: u.displayName || "" }, { merge: true });
        }
        if (pendingDownloadType && !u.isAnonymous) { triggerDownload(pendingDownloadType); setPendingDownloadType(null); }
      }
    });
    return () => unsubscribe();
  }, [pendingDownloadType]);

  useEffect(() => {
    if (!user) return;
    const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
    const unsubscribe = onSnapshot(usageRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.creditsRemaining === undefined) {
          const initial = data.tier === 'paid' ? 10 : 3;
          const remaining = Math.max(0, initial - (data.videoCount || 0));
          setUsage({ ...data, creditsRemaining: remaining });
          updateDoc(usageRef, { creditsRemaining: remaining });
        } else setUsage(data);
      } else setDoc(usageRef, { creditsRemaining: 3, tier: 'free', videoCount: 0, voiceSamples: 0 });
    }, (err) => console.error("Usage listener error:", err));
    return () => unsubscribe();
  }, [user]);

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
    try { setLocalVoiceCount(0); setAudioUrl(null); setFinalVideoUrl(null); await signOut(auth); setShowProfileDropdown(false); } 
    catch (err) { console.error("Sign out failed", err); }
  };

  // ARCHITECT'S SELF-HEALING LOADER
  const loadRazorpay = () => new Promise((res) => {
    if (window.Razorpay) return res(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.body.appendChild(s);
  });

  const handleInitiatePayment = async () => {
    // 1. Force check for SDK
    const isLoaded = await loadRazorpay();
    if (!isLoaded || !window.Razorpay) { 
        setAuthError("Razorpay SDK not available. Check your internet or disable ad-blockers."); 
        return; 
    }

    setIsSubmittingPayment(true); setAuthError("");
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions(app, 'us-central1');
      const createOrder = httpsCallable(functions, 'createOrderV2');
      const orderData = await createOrder({ amount: selectedPlan.price, planId: selectedPlan.id });

      if (!orderData?.data?.orderId) throw new Error("No Order ID returned from server.");

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_live_SfCZvOMFGefR8r",
        amount: selectedPlan.price * 100,
        currency: "INR",
        name: "VocalAd AI",
        description: `Credits for ${selectedPlan.label}`,
        order_id: orderData.data.orderId,
        handler: function(response) {
          setPaymentSuccess(true);
          setShowUPIModal(false);
        },
        prefill: { email: user?.email || "" },
        theme: { color: "#4f46e5" },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (err) { 
      console.error("Payment Error:", err);
      setAuthError(`Checkout Error: ${err.message || "Please try again."}`); 
    } 
    finally { setIsSubmittingPayment(false); }
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

  const callGemini = async (prompt, model, isAudio = false) => {
    const activeKey = isAudio ? voiceApiKey : brainApiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
    const payload = { contents: [{ parts: [{ text: prompt }] }], ...(isAudio && { generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } } } }) };
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) { const err = await response.json(); return { error: true, message: err.error?.message }; }
    return await response.json();
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
    const isPro = usage.tier === 'paid';
    if (!isPro && localVoiceCount >= 3) { setModalReason("voice_limit_free"); setShowAuthModal(true); return; }
    if (isPro && localVoiceCount >= 5 && (localVoiceCount - 5) % 5 === 0) {
      if (usage.creditsRemaining <= 0) { setModalReason("out_of_credits"); setShowAuthModal(true); return; }
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats'), { creditsRemaining: increment(-1) });
    }
    setIsGeneratingAudio(true); setLocalVoiceCount(prev => prev + 1); setAudioProgress(20);
    try {
      const internalPrompt = `Theatrical script producer. Refine for high-converting ${selectedTone} commercial in ${selectedLanguage.label}. Preserve original wording. Plain text only. Text: "${text}"`;
      const res1 = await callGemini(internalPrompt, BRAIN_MODEL);
      const refinedScript = res1.error ? text : res1.candidates?.[0]?.content?.parts?.[0]?.text;
      setAudioProgress(60);
      const res2 = await callGemini(refinedScript, VOICE_MODEL, true);
      if (res2.error) throw new Error(res2.message);
      const inlineData = res2.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData) throw new Error("Voice engine error.");
      const sampleRate = parseInt(inlineData.mimeType.match(/sampleRate=(\d+)/)?.[1] || "24000");
      const binaryString = atob(inlineData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const blob = pcmToWav(bytes.buffer, sampleRate);
      setAudioUrl(URL.createObjectURL(blob)); setAudioBlob(blob); setAudioProgress(100);
      setTimeout(() => { setIsGeneratingAudio(false); setAudioProgress(0); }, 500);
    } catch (err) { setError(err.message); setIsGeneratingAudio(false); }
  };

  const createVideo = async () => {
    if (!image || !audioBlob || !user) return;
    if (usage.creditsRemaining <= 0) { setModalReason("out_of_credits"); setShowAuthModal(true); return; }
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
      } else {
        assetElement = new Image(); assetElement.src = image; assetElement.crossOrigin = "anonymous";
        await new Promise(r => assetElement.onload = r);
      }
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
      mediaRecorder.start(); voiceSource.start();
      const totalFrames = Math.ceil(duration * 30);
      let currentFrame = 0;
      const renderFrame = async () => {
        if (currentFrame >= totalFrames) { mediaRecorder.stop(); voiceSource.stop(); return; }
        const currentTime = currentFrame / 30;
        setMasteringProgress(Math.round((currentFrame / totalFrames) * 100));
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const assetWidth = assetType === 'video' ? assetElement.videoWidth : assetElement.width;
        const assetHeight = assetType === 'video' ? assetElement.videoHeight : assetElement.height;
        const assetRatio = assetWidth / assetHeight;
        const canvasRatio = canvas.width / canvas.height;
        if (assetType === 'video') {
            const vDur = assetElement.duration;
            assetElement.currentTime = videoMode === 'loop' ? currentTime % vDur : Math.min(currentTime, vDur - 0.1);
            await new Promise(r => { const os = () => { assetElement.removeEventListener('seeked', os); r(); }; assetElement.addEventListener('seeked', os); });
        }
        let dw, dh, ox = 0, oy = 0;
        if (fitMode === 'cover') {
          if (assetRatio > canvasRatio) { dh = canvas.height; dw = assetWidth * (canvas.height / assetHeight); ox = (canvas.width - dw) / 2; }
          else { dw = canvas.width; dh = assetHeight * (canvas.width / assetWidth); oy = (canvas.height - dh) / 2; }
        } else {
          if (assetRatio > canvasRatio) { dw = canvas.width; dh = assetHeight * (canvas.width / assetWidth); oy = (canvas.height - dh) / 2; }
          else { dh = canvas.height; dw = assetWidth * (canvas.height / assetHeight); ox = (canvas.width - dw) / 2; }
          ctx.save(); ctx.filter = 'blur(60px) brightness(0.4)'; ctx.drawImage(assetElement, -canvas.width, -canvas.height, canvas.width*3, canvas.height*3); ctx.restore();
        }
        ctx.drawImage(assetElement, ox, oy, dw, dh);
        currentFrame++; requestAnimationFrame(renderFrame);
      };
      requestAnimationFrame(renderFrame);
    } catch (err) { setError("Mastering failed."); setIsCreatingVideo(false); }
  };

  const handleDownloadClick = (type) => {
    if (user?.isAnonymous) { setPendingDownloadType(type); setModalReason("download_lock"); setAuthMode("signup"); setShowAuthModal(true); }
    else triggerDownload(type);
  };

  const triggerDownload = (type) => {
    const a = document.createElement('a');
    if (type === 'video' && finalVideoUrl) { a.href = finalVideoUrl; a.download = `VocalAd_${selectedRatio.id}.webm`; }
    else if (type === 'audio' && audioUrl) { a.href = audioUrl; a.download = 'VocalAd_Master.wav'; }
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
      case "premium_locked": return { icon: <Sparkles className="w-8 h-8" />, title: "Premium Feature", body: "Upgrade to Creator Pro to unlock." };
      default: return { icon: <Sparkles className="w-8 h-8" />, title: "Welcome to VocalAd.ai", body: "Sign in to access premium AI voices." };
    }
  };

  return (
    <div className={`min-h-screen font-sans p-2 md:p-8 transition-colors duration-700 ${t.page}`}>
      {/* UPI Modal */}
      {showUPIModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className={`${t.dropdown} border border-white/10 rounded-[2.5rem] p-6 md:p-10 max-w-lg w-full shadow-2xl relative`}>
            {paymentSuccess && (
              <div className="sticky top-0 left-0 right-0 bottom-0 bg-slate-900/95 backdrop-blur-md z-[120] flex flex-col items-center justify-center gap-6 rounded-[2rem]">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center border-2 border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.1)]"><CheckCircle className="w-12 h-12" /></div>
                <div className="text-center px-8"><h3 className="text-3xl font-black text-white tracking-tight">Success</h3><p className="text-slate-400 text-sm">Credits added shortly.</p><button onClick={() => {setPaymentSuccess(false); setShowUPIModal(false);}} className="mt-4 px-6 py-2 bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Close</button></div>
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
              {authError && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] font-bold text-center">{authError}</div>}
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
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 w-full">
              <button onClick={() => setAuthMode('signup')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Sign Up</button>
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Login</button>
            </div>
            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
              <input type="email" placeholder="Work Email" className={`w-full p-4 rounded-2xl outline-none border transition-all ${t.input} text-sm`} value={email} onChange={e => setEmail(e.target.value)} required />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Password" className={`w-full p-4 rounded-2xl outline-none border transition-all ${t.input} text-sm`} value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-500">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
              <button type="submit" disabled={isAuthLoading} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${t.accent} shadow-xl shadow-indigo-500/20 disabled:opacity-50`}>{authMode === 'signup' ? "Create Account" : "Access Studio"}</button>
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
                        <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-500/10 text-[11px] font-bold text-red-400"><LogOut className="w-4 h-4" /> Terminate Session</button>
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
               <input id="imageInput" type="file" className="hidden" accept="image/*,video/*" onChange={(e) => {
                const file = e.target.files[0]; if (!file) return;
                setAssetType(file.type.startsWith('video') ? 'video' : 'image');
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
                {assetType === 'image' ? <img src={image} className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`} alt="Preview" /> : <video src={image} muted autoPlay loop className={`w-full h-full ${fitMode === 'cover' ? 'object-cover' : 'object-contain'}`} />}
              </div>
              <div className="flex justify-between items-center max-w-2xl mx-auto w-full pt-4">
                 <button onClick={() => setStep(0)} className={`${t.textBody} font-black text-[10px] uppercase`}>Back</button>
                 <button onClick={() => setStep(2)} className={`px-10 py-4 rounded-xl font-black text-sm flex items-center gap-2 shadow-xl ${t.accent}`}>AI Talent <ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-10 max-w-5xl mx-auto">
               <div className="flex flex-col gap-6 md:gap-8 text-left">
                  <div className="space-y-3">
                     <div className="flex items-center justify-between px-1">
                        <label className={`font-black text-[10px] uppercase tracking-widest ${t.textBody}`}>Script Master</label>
                        <button onClick={() => setShowMagicWand(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-500/20 transition-all"><Wand2 className="w-3 h-3" /> Magic Wand</button>
                     </div>
                     <textarea className={`w-full p-6 md:p-8 h-48 border-2 rounded-[2rem] focus:border-indigo-500 outline-none transition-all text-base md:text-lg font-medium shadow-inner ${t.input}`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type ad text here..." />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 items-end">
                    <div className="space-y-2">
                       <label className={`text-[9px] font-black uppercase tracking-widest ${t.textBody} opacity-60 px-1`}>Language</label>
                       <select className={`w-full p-4 md:p-5 border-2 rounded-2xl font-bold text-[11px] md:text-xs transition-all ${t.input} cursor-pointer`} value={selectedLanguage.id} onChange={e => handleConfigChange('lang', e.target.value)}>
                          {LANGUAGES_LIST.map(l => <option key={l.id} value={l.id}>{l.label} {l.premium && usage.tier !== 'paid' ? ' 🔒' : ''}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className={`text-[9px] font-black uppercase tracking-widest ${t.textBody} opacity-60 px-1`}>AI Talent</label>
                       <select className={`w-full p-4 md:p-5 border-2 rounded-2xl font-bold text-[11px] md:text-xs transition-all ${t.input} cursor-pointer`} value={selectedVoice} onChange={e => handleConfigChange('voice', e.target.value)}>
                          {VOICES.map(v => <option key={v.name} value={v.name}>{v.label} {v.premium && usage.tier !== 'paid' ? ' 🔒' : ''}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className={`text-[9px] font-black uppercase tracking-widest ${t.textBody} opacity-60 px-1`}>Performance</label>
                       <select className={`w-full p-4 md:p-5 border-2 rounded-2xl font-bold text-[11px] md:text-xs transition-all ${t.input} cursor-pointer`} value={selectedTone} onChange={e => handleConfigChange('tone', e.target.value)}>
                          {TONES.map(ton => <option key={ton.id} value={ton.id}>{ton.id} {ton.premium && usage.tier !== 'paid' ? ' 🔒' : ''}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className={`text-[9px] font-black uppercase tracking-widest ${t.textBody} opacity-60 px-1`}>Pace</label>
                       <select className={`w-full p-4 md:p-5 border-2 rounded-2xl font-bold text-[11px] md:text-xs transition-all ${t.input} cursor-pointer`} value={selectedSpeed.label} onChange={e => setSelectedSpeed(SPEEDS.find(s => s.label === e.target.value))}>
                          {SPEEDS.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
                       </select>
                    </div>
                  </div>

                  <button disabled={!text.trim() || isGeneratingAudio} onClick={generateAudio} className={`w-full py-5 md:py-6 text-white rounded-[2rem] font-black text-base md:text-xl shadow-2xl flex items-center justify-center gap-4 transition-all ${isGeneratingAudio ? 'bg-slate-500' : t.accent}`}>
                    {isGeneratingAudio ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Volume2 className="w-7 h-7" />}
                    {isGeneratingAudio ? "Producing Talent..." : "Generate AI Voiceover"}
                  </button>

                  {audioUrl && !isGeneratingAudio && (
                     <div className={`p-6 md:p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 border-2 animate-in slide-in-from-top-4 bg-slate-900/50 border-white/5 shadow-2xl`}>
                        <div className="flex-1 w-full space-y-3 text-center md:text-left">
                           <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">Audition Preview</p>
                           <audio controls src={audioUrl} className="w-full h-10 invert opacity-80" />
                        </div>
                        <button onClick={() => setStep(3)} className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black text-sm md:text-base shadow-xl flex items-center justify-center gap-3 ${t.accent} active:scale-95`}><Video className="w-5 h-5" /> Mastering Studio</button>
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
                   {assetType === 'image' ? <img src={image} className="w-full h-full object-cover" alt="Mix" /> : <video ref={previewVideoRef} src={image} muted className="w-full h-full object-cover" />}
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
                   <audio ref={previewAudioRef} src={audioUrl} onEnded={() => setIsPreviewPlaying(false)} className="hidden" />
                </div>
                <div className="space-y-6 md:space-y-8 w-full text-left p-2">
                  <div className="space-y-2"><h2 className={`text-3xl md:text-4xl font-black tracking-tighter ${t.textHead}`}>Mixing Studio</h2><p className={`text-[13px] md:text-sm ${t.textBody}`}>Finalize your high-fidelity production for export.</p></div>
                  <div className="bg-black/40 border border-white/5 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] space-y-6 shadow-inner">
                    <div className="space-y-4">
                      <button disabled={isCreatingVideo} onClick={createVideo} className={`w-full py-5 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-xl shadow-2xl flex items-center justify-center gap-4 transition-all ${isCreatingVideo ? 'bg-slate-700' : t.accent}`}>
                        {isCreatingVideo ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                        {isCreatingVideo ? "Mastering Production..." : "Export High-Fidelity Ad"}
                      </button>
                      {isCreatingVideo && (
                         <div className="space-y-2 px-2 animate-in fade-in">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-indigo-400"><span>Synthesis</span><span>{masteringProgress}%</span></div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${masteringProgress}%` }} /></div>
                         </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} className={`w-full text-center ${t.textBody} font-black text-[10px] uppercase hover:text-indigo-500`}>Adjust script or talent</button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-8 md:space-y-12 animate-in zoom-in-95 py-6 md:py-12">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.1)]"><CheckCircle className="w-10 h-10 md:w-12 md:h-12" /></div>
              <h2 className={`text-4xl md:text-6xl font-black tracking-tighter ${t.textHead}`}>Production Ready!</h2>
              <div className="bg-black p-3 md:p-4 rounded-[3rem] md:rounded-[4rem] max-w-[240px] md:max-w-sm mx-auto shadow-2xl border-[8px] md:border-[12px] border-slate-900" style={{ aspectRatio: selectedRatio.ratio }}>
                {finalVideoUrl && <video controls autoPlay className="w-full h-full rounded-[2rem] md:rounded-[2.5rem]" src={finalVideoUrl} />}
              </div>
              <div className="flex flex-col gap-3 md:gap-4 max-w-sm mx-auto px-4">
                 <button onClick={() => handleDownloadClick('video')} className={`px-10 py-5 md:px-12 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-xl shadow-2xl flex items-center justify-center gap-4 transition-all ${t.accent} active:scale-95`}><Download className="w-6 h-6 md:w-7 md:h-7" /> Download Video</button>
                 <button onClick={() => handleDownloadClick('audio')} className="px-10 py-4 border-2 border-slate-700 rounded-xl md:rounded-2xl font-black uppercase text-[10px] text-slate-400 flex items-center justify-center gap-3 hover:text-white transition-all"><Music className="w-4 h-4 md:w-5 md:h-5" /> Audio Only</button>
                 <button onClick={() => { setImage(null); setStep(0); setText(""); setAudioUrl(null); setFinalVideoUrl(null); setLocalVoiceCount(0); }} className="py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-300">Start New Project</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 md:mt-12 text-center pb-12"><p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Powered by Gemini 2.0 Pro & VocalAd AI Engine</p></div>
      {showMagicWand && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-10 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button onClick={() => setShowMagicWand(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
            <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-2"><Wand2 className="w-8 h-8" /></div>
            <h3 className="text-3xl font-black text-white tracking-tight">Magic Architect</h3>
            <p className="text-slate-400 text-sm">Target Language: <span className="text-indigo-400 font-bold">{selectedLanguage.label}</span></p>
            <textarea className="w-full p-6 bg-slate-800 border-2 border-slate-700 rounded-2xl outline-none text-white focus:border-indigo-500 h-32" placeholder="e.g. A shoe brand summer sale..." value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} />
            <button onClick={async () => {
                setIsGeneratingScript(true); try {
                  const prompt = `Ad copywriter. Describe: "${magicPrompt}". Language: ${selectedLanguage.label}. Write 15s commercial script. Max 40 words. Plain text only.`;
                  const res = await callGemini(prompt, BRAIN_MODEL);
                  setText(res.candidates?.[0]?.content?.[0]?.parts?.[0]?.text?.replace(/```/g, '') || ""); setShowMagicWand(false);
                } catch (e) { setError(e.message); } finally { setIsGeneratingScript(false); }
            }} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-3">
              {isGeneratingScript ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isGeneratingScript ? "Drafting..." : "Generate Magic Script"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
