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
  BrainCircuit,
  Lock,
  User,
  ShieldCheck,
  ChevronRight,
  Upload,
  Download,
  Smartphone,
  Square,
  Monitor,
  Music,
  LogOut,
  CreditCard,
  Settings,
  Sparkles,
  Wand2,
  X,
  Eye,
  EyeOff
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

const BRAIN_MODEL = "gemini-2.5-flash-lite"; 
const VOICE_MODEL = "gemini-3.1-flash-tts-preview"; 

const PLANS = [
  { id: 'dummy', label: 'Backend Test', credits: 0, price: 1.23, color: 'slate' },
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

const VOICES = [
  { name: 'Aoede', label: 'Aoede (Female - Thoughtful)', type: 'female' },
  { name: 'Charon', label: 'Charon (Male - Assured)', type: 'male' },
  { name: 'Fenrir', label: 'Fenrir (Male - Authoritative)', type: 'male' },
  { name: 'Kore', label: 'Kore (Female - Versatile)', type: 'female' },
  { name: 'Leda', label: 'Leda (Female - Professional)', type: 'female' },
  { name: 'Despina', label: 'Despina (Female - Warm)', type: 'female' },
  { name: 'Puck', label: 'Puck (Male - Upbeat)', type: 'male' },
  { name: 'Sadachbia', label: 'Sadachbia (Male - Deep Authority)', type: 'male' },
];

const TONES = ['Professional', 'Cheerful', 'Urgent (Sale)', 'Luxury', 'Friendly', 'Whispering', 'Excited', 'Trustworthy & Warm'];
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
  // --- Theme State ---
  const [currentTheme] = useState('studio');
  const t = THEMES[currentTheme];

  // --- Auth & Usage State ---
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState({ creditsRemaining: 3, tier: 'free', voiceSamples: 0 });
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

  // --- Engine State ---
  const [step, setStep] = useState(0); 
  const [image, setImage] = useState(null); // This will hold the URL for preview
  const [assetType, setAssetType] = useState('image'); // 'image' or 'video'
  const [videoVolume, setVideoVolume] = useState(0.5); 
  const [selectedRatio, setSelectedRatio] = useState(RATIOS[2]);
  const [fitMode, setFitMode] = useState('cover'); // 'cover' or 'contain'
  const [selectedTone, setSelectedTone] = useState(TONES[0]);
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].name); // Aoede (Female) Default
  const [selectedSpeed, setSelectedSpeed] = useState(SPEEDS[0]);

  const [showMagicWand, setShowMagicWand] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState("");
  const [magicError, setMagicError] = useState(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingDownloadType, setPendingDownloadType] = useState(null); 

  // --- UPI Payment State ---
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // DUAL API STRATEGY: Isolate Brain and Voice quotas
  const brainApiKey = process.env.REACT_APP_GEMINI_BRAIN_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
  const voiceApiKey = process.env.REACT_APP_GEMINI_VOICE_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;

  // --- Clear Error on Step Change ---
  useEffect(() => {
    setError(null);
  }, [step]);

  // --- Click Outside Handler for Dropdown ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Auth logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        await signInAnonymously(auth);
      } else {
        setUser(u);
        if (!u.isAnonymous) {
          setShowAuthModal(false);
          const profileRef = doc(db, 'artifacts', appId, 'users', u.uid);
          await setDoc(profileRef, { 
            email: u.email, 
            lastLogin: new Date().toISOString(), 
            uid: u.uid,
            displayName: u.displayName || "" 
          }, { merge: true });
        }
        
        if (pendingDownloadType && !u.isAnonymous) {
          triggerDownload(pendingDownloadType);
          setPendingDownloadType(null);
        }
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDownloadType]);

  // --- Draft Persistence ---
  useEffect(() => {
    const savedText = localStorage.getItem('vocalad_draft');
    if (savedText) setText(savedText);
  }, []);

  useEffect(() => {
    if (text) localStorage.setItem('vocalad_draft', text);
  }, [text]);

  // --- Usage Listener ---
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
        } else {
          setUsage(data);
        }
      } else {
        // Fresh Start: Initial 3 credits for new users
        setDoc(usageRef, { creditsRemaining: 3, tier: 'free', videoCount: 0, voiceSamples: 0 });
      }
    }, (err) => console.error("Usage listener error:", err));
    return () => unsubscribe();
  }, [user]);

  // --- Auth Actions ---
  const signInWithGoogle = async () => {
    setIsAuthLoading(true);
    setAuthError("");
    const provider = new GoogleAuthProvider();
    try {
      if (authMode === 'signup' && user?.isAnonymous) {
        try {
          await linkWithPopup(user, provider);
        } catch (linkErr) {
          // If account already exists, just sign in instead of linking
          if (linkErr.code === 'auth/credential-already-in-use') {
            await signInWithPopup(auth, provider);
          } else throw linkErr;
        }
      } else {
        await signInWithPopup(auth, provider);
      }
      setShowAuthModal(false);
    } catch (err) { 
      console.error(err);
      setAuthError(err.code === 'auth/popup-blocked' ? "Login popup was blocked. Please enable popups." : err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault(); 
    setIsAuthLoading(true);
    setAuthError(""); 
    setAuthMessage("");
    try {
      if (authMode === 'signup') {
        if (user?.isAnonymous) {
          try {
            const credential = EmailAuthProvider.credential(email, password);
            await linkWithCredential(user, credential);
          } catch (linkErr) {
            if (linkErr.code === 'auth/email-already-in-use') {
              setAuthError("Email already exists. Try logging in!");
              setAuthMode('login');
              setIsAuthLoading(false);
              return;
            } else throw linkErr;
          }
        } else {
          await createUserWithEmailAndPassword(auth, email, password);
        }
        setShowAuthModal(false);
      } else if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        setShowAuthModal(false);
      } else if (authMode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setAuthMessage("Reset link sent! Please check your inbox.");
      }
    } catch (err) { 
      let msg = err.message;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = authMode === 'login' 
          ? "Incorrect email/password or account doesn't exist. Try Signing Up?" 
          : "Invalid email or password format.";
      }
      if (err.code === 'auth/user-not-found') msg = "No account found with this email. Try Signing Up?";
      setAuthError(msg); 
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLocalVoiceCount(0); // Reset local count for next guest session
      setAudioUrl(null);
      setFinalVideoUrl(null);
      await signOut(auth);
      setShowProfileDropdown(false);
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  // --- Payment Actions ---
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleInitiatePayment = async () => {
    const res = await loadRazorpayScript();
    if (!res) {
      setAuthError("Razorpay SDK failed to load. Check your internet.");
      return;
    }

    setIsSubmittingPayment(true);
    setAuthError("");

    try {
      // Call our secure backend to create an Order
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions(app, 'us-central1'); // Explicitly set region
      const createOrder = httpsCallable(functions, 'createOrderV2');
      
      const orderData = await createOrder({ 
        amount: selectedPlan.price, 
        planId: selectedPlan.id,
        appId: appId 
      });

      if (!orderData?.data?.orderId) {
        throw new Error("No Order ID returned from server.");
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_live_SfCZvOMFGefR8r",
        amount: selectedPlan.price * 100,
        currency: "INR",
        name: "VocalAd AI",
        description: `Credits for ${selectedPlan.label}`,
        order_id: orderData.data.orderId,
        handler: function (response) {
          // This runs immediately after payment UI success
          setPaymentSuccess(true);
          // Actual credits are added by the Webhook (Part 2) for security
        },
        prefill: {
          email: user?.email || "",
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response) {
        setAuthError(`Payment failed: ${response.error.description}`);
      });
      rzp1.open();
    } catch (err) {
      console.error("Payment Initiation Error:", err);
      // Show the specific error from Firebase or Razorpay
      setAuthError(`Checkout Error: ${err.message || "Failed to initiate secure checkout."}`);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // --- Engine Actions ---
  const pcmToWav = (pcmBuffer, sampleRate) => {
    const dataLength = pcmBuffer.byteLength;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF'); view.setUint32(4, 36 + dataLength, true); writeString(8, 'WAVE');
    writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeString(36, 'data'); view.setUint32(40, dataLength, true);
    new Uint8Array(buffer, 44).set(new Uint8Array(pcmBuffer));
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const callGemini = async (prompt, model, isAudio = false) => {
    // Selection of API key based on request type
    const activeKey = isAudio ? voiceApiKey : brainApiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      ...(isAudio && {
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } }
        }
      })
    };
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) { const err = await response.json(); return { error: true, message: err.error?.message }; }
    return await response.json();
  };

  const logErrorToFirestore = async (errorMsg, context) => {
    try {
      const logRef = doc(db, 'artifacts', appId, 'logs', new Date().getTime().toString());
      await setDoc(logRef, {
        userId: user?.uid || 'anonymous',
        email: user?.email || 'anonymous',
        error: errorMsg,
        context: context,
        timestamp: new Date().toISOString(),
        platform: navigator.platform,
        userAgent: navigator.userAgent
      });
    } catch (err) {
      console.error("Critical: Failed to log error to Firestore", err);
    }
  };

  const generateAudio = async () => {
    if (!text.trim()) return;
    setError(null);

    const isPro = usage.tier === 'paid';
    if (!isPro) {
      if (localVoiceCount >= 3) { setModalReason("voice_limit_free"); setShowAuthModal(true); return; }
    } else {
      if (localVoiceCount >= 5 && (localVoiceCount - 5) % 5 === 0) {
        if (usage.creditsRemaining <= 0) { setModalReason("out_of_credits"); setShowAuthModal(true); return; }
        const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
        await updateDoc(usageRef, { creditsRemaining: increment(-1) });
        setStatusMessage("Batch limit reached. 1 Credit used for next 5 samples.");
      } else if (usage.creditsRemaining <= 0 && localVoiceCount === 0) {
        setModalReason("out_of_credits"); setShowAuthModal(true); return;
      }
    }

    setIsGeneratingAudio(true); 
    setLocalVoiceCount(prev => prev + 1);
    setAudioProgress(20); 
    setStatusMessage("Analyzing Dialect...");
    try {
      const res1 = await callGemini(`Refine this for commercial voiceover with a ${selectedTone} tone. CRITICAL: Identify and preserve the original language and regional dialect exactly. Do not translate. Output ONLY plain text. Text: "${text}"`, BRAIN_MODEL);
      const refinedScript = res1.error ? text : res1.candidates?.[0]?.content?.parts?.[0]?.text;
      
      setAudioProgress(60); setStatusMessage("AI Talent: Recording...");
      const res2 = await callGemini(refinedScript, VOICE_MODEL, true);
      
      if (res2.error) {
         const dummyWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
         const response = await fetch(dummyWav); const blob = await response.blob();
         setAudioUrl(URL.createObjectURL(blob)); setAudioBlob(blob);
         setError("AI Voice currently unavailable. Using test audio.");
         setIsGeneratingAudio(false); return;
      }

      const inlineData = res2.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData) throw new Error("Voice engine returned empty data. Please try a different script.");
      
      const sampleRate = parseInt(inlineData.mimeType.match(/sampleRate=(\d+)/)?.[1] || "24000");
      const binaryString = atob(inlineData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      const blob = pcmToWav(bytes.buffer, sampleRate);
      setAudioUrl(URL.createObjectURL(blob)); setAudioBlob(blob); setAudioProgress(100);
      setTimeout(() => { setIsGeneratingAudio(false); setAudioProgress(0); }, 500);
    } catch (err) { 
      setError(err.message); 
      setIsGeneratingAudio(false); 
      logErrorToFirestore(err.message, "generateAudio");
    }
  };

  const generateMagicScript = async () => {
    if (!magicPrompt.trim()) return;
    setIsGeneratingScript(true);
    setMagicError(null);
    try {
      const prompt = `You are an expert ad copywriter. Based on this description "${magicPrompt}", write a high-converting commercial script for a 15-second ad. Max 40 words. Output ONLY the plain script text without any labels or instructions. Do NOT use markdown.`;
      const res = await callGemini(prompt, BRAIN_MODEL);
      
      if (res.error) {
        if (res.message?.includes("quota") || res.message?.includes("limit")) {
          throw new Error("AI (Brain) Quota Exceeded. Please try again in 30 seconds or check your API key limits.");
        }
        throw new Error(res.message || "AI was unable to generate a script.");
      }
      
      let generated = res.candidates?.[0]?.content?.parts?.[0]?.text || "";
      generated = generated.replace(/```[a-z]*\n?|```/gi, '').trim();
      
      if (!generated) throw new Error("Received empty script from AI.");
      
      setText(generated);
      setShowMagicWand(false);
      setMagicPrompt("");
      if (image) setStep(2); 
    } catch (err) {
      // Close modal and show error on main dashboard as requested
      setShowMagicWand(false);
      setError(err.message);
      logErrorToFirestore(err.message, "generateMagicScript");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const createVideo = async () => {
    if (!image || !audioBlob || !user) return;
    if (usage.creditsRemaining <= 0) { setModalReason("out_of_credits"); setShowAuthModal(true); return; }

    setIsCreatingVideo(true);
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const voiceBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = selectedRatio.width;
      canvas.height = selectedRatio.height;

      // Prepare Asset
      let assetElement;
      if (assetType === 'video') {
        assetElement = document.createElement('video');
        assetElement.src = image;
        assetElement.muted = true;
        assetElement.loop = true;
        await new Promise(r => {
          assetElement.onloadeddata = r;
          assetElement.load();
        });
        assetElement.play();
      } else {
        assetElement = new Image();
        assetElement.src = image;
        await new Promise(r => assetElement.onload = r);
      }

      const stream = canvas.captureStream(30);
      const audioStream = audioContext.createMediaStreamDestination();
      
      // Voice Source
      const voiceSource = audioContext.createBufferSource();
      voiceSource.buffer = voiceBuffer;
      voiceSource.connect(audioStream);

      // Video Audio Source (if applicable)
      if (assetType === 'video') {
        const videoAudioSource = audioContext.createMediaElementSource(assetElement);
        const videoGain = audioContext.createGain();
        videoGain.gain.value = videoVolume;
        videoAudioSource.connect(videoGain);
        videoGain.connect(audioStream);
      }

      const combinedStream = new MediaStream([...stream.getVideoTracks(), ...audioStream.stream.getAudioTracks()]);
      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = async () => {
        if (assetType === 'video') assetElement.pause();
        setFinalVideoUrl(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })));
        const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
        await updateDoc(usageRef, { creditsRemaining: increment(-1) });
        setIsCreatingVideo(false);
        setStep(4);
      };

      mediaRecorder.start();
      voiceSource.start();

      const startTime = performance.now();
      const animate = (time) => {
        const elapsed = (time - startTime) / 1000;
        if (elapsed > voiceBuffer.duration) {
          mediaRecorder.stop();
          voiceSource.stop();
          return;
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const assetWidth = assetType === 'video' ? assetElement.videoWidth : assetElement.width;
        const assetHeight = assetType === 'video' ? assetElement.videoHeight : assetElement.height;
        const assetRatio = assetWidth / assetHeight;
        const canvasRatio = canvas.width / canvas.height;
        
        let dw, dh, ox = 0, oy = 0;

        if (fitMode === 'cover') {
          if (assetRatio > canvasRatio) {
            dh = canvas.height;
            dw = assetWidth * (canvas.height / assetHeight);
            ox = (canvas.width - dw) / 2;
          } else {
            dw = canvas.width;
            dh = assetHeight * (canvas.width / assetWidth);
            oy = (canvas.height - dh) / 2;
          }
        } else {
          if (assetRatio > canvasRatio) {
            dw = canvas.width;
            dh = assetHeight * (canvas.width / assetWidth);
            oy = (canvas.height - dh) / 2;
          } else {
            dh = canvas.height;
            dw = assetWidth * (canvas.height / assetHeight);
            ox = (canvas.width - dw) / 2;
          }

          // Blurred Background for Contain
          ctx.save();
          ctx.filter = 'blur(40px) brightness(0.4)';
          const bW = canvasRatio > assetRatio ? canvas.height * assetRatio : canvas.width;
          const bH = canvasRatio > assetRatio ? canvas.height : canvas.width / assetRatio;
          ctx.drawImage(assetElement, (canvas.width - bW*2)/2, (canvas.height - bH*2)/2, bW*2, bH*2);
          ctx.restore();
        }

        ctx.drawImage(assetElement, ox, oy, dw, dh);
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    } catch (err) {
      console.error(err);
      setError("Video rendering failed. Ensure your asset is valid.");
      setIsCreatingVideo(false);
      logErrorToFirestore(err.message, "createVideo");
    }
  };

  const handleDownloadClick = (type) => {
    if (user?.isAnonymous) {
      setPendingDownloadType(type); 
      setModalReason("download_lock"); 
      setAuthMode("login"); 
      setShowAuthModal(true);
    } else triggerDownload(type);
  };

  const triggerDownload = (type) => {
    const a = document.createElement('a');
    if (type === 'video' && finalVideoUrl) { a.href = finalVideoUrl; a.download = `VocalAd_${selectedRatio.id}.webm`; }
    else if (type === 'audio' && audioUrl) { a.href = audioUrl; a.download = 'VocalAd_Master.wav'; }
    else return;
    a.click();
  };

  const handlePurchase = () => {
    if (user?.isAnonymous) {
      setModalReason("purchase_lock");
      setAuthMode("signup");
      setShowAuthModal(true);
      return;
    }
    setShowUPIModal(true);
  };

  const getModalContent = () => {
    switch (modalReason) {
      case "voice_limit_free":
        return { icon: <Volume2 className="w-8 h-8" />, title: "Voice Limit Reached", body: "You've used your 3 free voice attempts. Sign in or upgrade to explore unlimited possibilities!" };
      case "out_of_credits":
        return { icon: <Video className="w-8 h-8" />, title: "Credits Exhausted", body: "You've run out of credits. Top up now to continue creating high-impact masterpieces." };
      case "download_lock":
        return { icon: <Download className="w-8 h-8" />, title: "Claim Your Masterpiece", body: "Your ad is ready! Create a free account to download and save your projects permanently." };
      case "purchase_lock":
        return { icon: <CreditCard className="w-8 h-8" />, title: "Sign In to Upgrade", body: "Please create an account or login to purchase credits and unlock premium features." };
      default:
        return { icon: <Sparkles className="w-8 h-8" />, title: "Welcome to VocalAd.ai", body: "Sign in to access your projects and explore our premium AI voice talent." };
    }
  };

  return (
    <div className={`min-h-screen font-sans p-4 md:p-8 transition-colors duration-700 ${t.page}`}>
      {/* UPI Payment Modal */}
      {showUPIModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in duration-300">
          <div className={`${t.dropdown} border border-white/10 rounded-[2.5rem] p-6 md:p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative transition-all duration-500 custom-scrollbar`}>
            {paymentSuccess && (
              <div className="sticky top-0 left-0 right-0 bottom-0 min-h-[400px] bg-slate-900/95 backdrop-blur-md z-[120] flex flex-col items-center justify-center gap-6 rounded-[2rem] animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center border-2 border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.2)]"><CheckCircle className="w-12 h-12" /></div>
                <div className="text-center space-y-2 px-8">
                  <h3 className="text-3xl font-black text-white tracking-tight">Order Created</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-medium">Please complete the payment in the Razorpay window. Credits will be added once verified.</p>
                  <button onClick={() => {setPaymentSuccess(false); setShowUPIModal(false);}} className="mt-4 px-6 py-2 bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all">Close</button>
                </div>
              </div>
            )}

            <button onClick={() => setShowUPIModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-[130] bg-black/20 p-2 rounded-full backdrop-blur-md"><X className="w-5 h-5" /></button>
            
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner shrink-0"><ShieldCheck className="w-6 h-6 md:w-8 md:h-8" /></div>
                 <div>
                    <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Upgrade Your Vision</h3>
                    <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Secure Checkout Engine</p>
                 </div>
              </div>

              {/* Plan Selector */}
              <div className="space-y-4">
                {!showAllPlans ? (
                  <div className="p-6 md:p-8 rounded-[2rem] border-2 border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-500/5 text-center space-y-3 animate-in fade-in zoom-in-95">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Current Selection</p>
                    <h4 className="text-2xl md:text-3xl font-black text-white">{selectedPlan.credits || selectedPlan.label} {selectedPlan.credits ? 'Credits' : ''} / ₹{selectedPlan.price}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Perfect for immediate creative needs.</p>
                    <button 
                      onClick={() => setShowAllPlans(true)} 
                      className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest pt-2 underline underline-offset-4"
                    >
                      View All Bulk Plans
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 gap-3">
                      {PLANS.map(plan => (
                        <button 
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan)}
                          className={`p-4 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all text-left flex items-center justify-between group relative overflow-hidden ${selectedPlan.id === plan.id ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5' : 'border-white/5 hover:border-white/10 bg-white/5'}`}
                        >
                          {selectedPlan.id === plan.id && <div className="absolute top-0 right-0 p-2 bg-indigo-500 text-white rounded-bl-xl"><CheckCircle className="w-3 h-3" /></div>}
                          <div className="space-y-1">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${selectedPlan.id === plan.id ? 'text-indigo-400' : 'text-slate-500'}`}>{plan.label}</p>
                            <h4 className="text-base md:text-lg font-black text-white">{plan.credits} Credits</h4>
                          </div>
                          <div className="text-right">
                            <p className="text-xl md:text-2xl font-black text-white">₹{plan.price}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setShowAllPlans(false)} 
                      className="w-full text-center text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest py-2"
                    >
                      Back to Selection
                    </button>
                  </div>
                )}
              </div>

              {/* UPI Action Area */}
              <div className="bg-black/40 rounded-[2rem] p-6 md:p-8 border border-white/5 space-y-6 shadow-inner text-center">
                 <div className="space-y-4">
                    <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-black text-white">Secure Payment</h4>
                    <p className="text-[12px] text-slate-400 font-medium leading-relaxed px-2">
                      Complete payment of <span className="text-white font-bold">₹{selectedPlan.price}</span>. Credits will be linked to <span className="text-indigo-400 font-bold">{user?.email}</span>.
                    </p>
                 </div>

                 <button 
                    onClick={handleInitiatePayment}
                    disabled={isSubmittingPayment}
                    className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all ${t.accent} shadow-2xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50`}
                 >
                    {isSubmittingPayment ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                    {isSubmittingPayment ? "Preparing..." : "Checkout Now"}
                 </button>

                 {authError && (
                   <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 text-red-400 animate-in shake-1">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p className="text-[11px] font-bold leading-tight">{authError}</p>
                   </div>
                 )}

                 <div className="flex items-center justify-center gap-4 pt-2">
                    <div className="flex -space-x-2">
                       <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[8px] font-bold">UPI</div>
                       <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[8px] font-bold">CC</div>
                       <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[8px] font-bold">DC</div>
                    </div>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">PCI-DSS Compliant</p>
                 </div>
              </div>
              <p className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-widest pb-4">VocalAd Engine v3.0 Production Ready</p>
            </div>
          </div>
        </div>
      )}

      {/* Magic Wand Modal */}
      {showMagicWand && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-10 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button onClick={() => setShowMagicWand(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-2"><Wand2 className="w-8 h-8" /></div>
            <h3 className="text-3xl font-black text-white tracking-tight">Magic Script Architect</h3>
            <p className="text-slate-400 text-sm">Describe your product or offer in a few words, and our AI will craft a high-converting 15-second ad script for you.</p>
            <div className="space-y-4">
              <textarea 
                className="w-full p-6 bg-slate-800 border-2 border-slate-700 rounded-2xl outline-none text-white focus:border-indigo-500 h-32 transition-all" 
                placeholder="e.g. A coffee shop offering 50% off on all lattes this weekend only."
                value={magicPrompt}
                onChange={e => setMagicPrompt(e.target.value)}
              />
              
              {magicError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-in shake-1">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-red-400 text-xs font-bold leading-relaxed">{magicError}</p>
                </div>
              )}

              <button 
                onClick={generateMagicScript}
                disabled={isGeneratingScript || !magicPrompt.trim()}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 transition-all flex items-center justify-center gap-3"
              >
                {isGeneratingScript ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isGeneratingScript ? "Drafting your Script..." : "Generate Magic Script"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`${t.dropdown} rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full border text-center space-y-6 shadow-2xl relative overflow-hidden transition-all duration-500`}>
            {isAuthLoading && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Verifying Identity...</p>
              </div>
            )}

            <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-[60]"><X className="w-6 h-6" /></button>
            
            {/* Tabs */}
            {authMode !== 'reset' && (
              <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 w-full">
                <button onClick={() => { setAuthMode('signup'); setAuthError(""); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${authMode === 'signup' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Sign Up</button>
                <button onClick={() => { setAuthMode('login'); setAuthError(""); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Login</button>
              </div>
            )}

            <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto">{getModalContent().icon}</div>
            <h3 className={`text-2xl font-black ${t.textHead}`}>{authMode === 'reset' ? "Reset Password" : getModalContent().title}</h3>
            <p className={`${t.textBody} text-[11px] leading-relaxed`}>{authMode === 'reset' ? "We'll send a recovery link to your email." : getModalContent().body}</p>
            
            {authMode !== 'reset' && (
              <button 
                onClick={signInWithGoogle}
                disabled={isAuthLoading}
                className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-slate-100 transition-all border border-slate-200 disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Connect with Google
              </button>
            )}

            {authMode !== 'reset' && (
              <div className="flex items-center gap-4 py-1">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">or</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input type="email" placeholder="Email Address" className={`w-full p-4 rounded-2xl outline-none border transition-all ${t.input} text-sm`} value={email} onChange={e => setEmail(e.target.value)} required />
              
              {authMode !== 'reset' && (
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    className={`w-full p-4 pr-12 rounded-2xl outline-none border transition-all ${t.input} text-sm`} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              <button type="submit" disabled={isAuthLoading} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${t.accent} shadow-xl shadow-indigo-500/20 disabled:opacity-50`}>
                {authMode === 'signup' ? "Create Account" : authMode === 'login' ? "Access Profile" : "Send Reset Link"}
              </button>
            </form>

            <div className="flex flex-col gap-4 text-[10px] font-black uppercase tracking-widest pt-2">
              {authMode === 'login' && <button onClick={() => setAuthMode('reset')} className={`${t.textBody} hover:text-indigo-400 transition-colors`}>Forgot Password?</button>}
              {authMode === 'reset' && <button onClick={() => setAuthMode('login')} className="text-indigo-400">Back to Login</button>}
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in shake-1">
                <p className="text-red-400 text-[10px] font-black uppercase tracking-wider leading-relaxed">{authError}</p>
              </div>
            )}
            {authMessage && <p className="text-green-400 text-[10px] font-black uppercase tracking-wider">{authMessage}</p>}
          </div>
        </div>
      )}

      <div className={`max-w-6xl mx-auto rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border transition-all duration-700 relative ${t.card}`}>
        {/* Navigation Bar */}
        <div className={`flex items-center justify-between p-4 md:p-8 border-b backdrop-blur-xl sticky top-0 z-40 transition-all ${t.nav}`}>
           <div className="flex items-center gap-2 md:gap-3">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg transition-all ${t.accent}`}>
                 <Video className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h1 className={`text-lg md:text-2xl font-black tracking-tighter transition-all ${t.textHead}`}>VocalAd.ai</h1>
           </div>

           <div className="flex items-center gap-2 md:gap-4 relative" ref={dropdownRef}>
              <button 
                onClick={handlePurchase}
                className="bg-indigo-500/10 px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-[10px] md:text-[11px] font-black tracking-widest border border-indigo-500/20 flex items-center gap-1.5 md:gap-2.5 hover:bg-indigo-500/20 transition-all shadow-lg shadow-indigo-500/5 group"
              >
                 <div className="w-4 h-4 md:w-5 md:h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><ShieldCheck className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" /></div>
                 <span className="text-white font-extrabold">{usage.creditsRemaining ?? 0}</span>
                 <span className="text-indigo-300 opacity-80">CREDITS</span>
              </button>
              
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className={`w-9 h-9 md:w-11 md:h-11 rounded-full border-2 flex items-center justify-center transition-all overflow-hidden ${showProfileDropdown ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-800'}`}
              >
                 {user?.isAnonymous ? <User className="w-4 h-4 md:w-5 md:h-5 text-slate-400" /> : <div className={`w-full h-full flex items-center justify-center font-black text-sm ${t.accent}`}>{user?.email?.charAt(0).toUpperCase()}</div>}
              </button>

              {showProfileDropdown && (
                <div className={`absolute top-full right-0 mt-4 w-72 md:w-80 border rounded-[2rem] shadow-2xl p-4 md:p-6 animate-in fade-in zoom-in-95 z-50 backdrop-blur-2xl transition-all ${t.dropdown}`}>
                   <div className="px-3 py-4 border-b border-white/5 mb-4 bg-white/5 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Active Tier</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${usage.tier === 'paid' ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                          {usage.tier || 'Free'}
                        </span>
                      </div>
                      <p className={`text-sm font-black truncate text-white`}>{user?.isAnonymous ? "Guest Ad-Maker" : user?.email}</p>
                      <div className="mt-3 flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                        <div className="text-left">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Available Balance</p>
                          <p className="text-xl font-black text-white leading-none mt-1">{usage.creditsRemaining ?? 0} Credits</p>
                        </div>
                        <button onClick={handlePurchase} className="p-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-all"><CreditCard className="w-4 h-4" /></button>
                      </div>
                   </div>

                   <div className="space-y-1.5">
                      <button onClick={() => { 
                         const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
                         updateDoc(usageRef, { lastRefresh: new Date().toISOString() });
                         setShowProfileDropdown(false);
                      }} className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all text-xs font-bold ${t.textBody} group`}>
                         <span className="flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> Sync Credits
                         </span>
                         <span className="text-[9px] opacity-40">Just now</span>
                      </button>
                      
                      <button onClick={handlePurchase} className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-xs font-bold ${t.textBody} group`}>
                         <ShieldCheck className="w-4 h-4 group-hover:text-indigo-500" /> Subscription Details
                      </button>
                      
                      <button className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-xs font-bold ${t.textBody} group`}>
                         <Settings className="w-4 h-4 group-hover:text-indigo-500" /> Preferences
                      </button>

                      <div className="h-px bg-white/5 my-3" />
                      
                      {user?.isAnonymous ? (
                        <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); setShowProfileDropdown(false); }} className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-xs font-black text-white ${t.accent} shadow-xl shadow-indigo-600/20`}>
                           <User className="w-4 h-4" /> Sign In / Create Account
                        </button>
                      ) : (
                        <button onClick={handleSignOut} className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 transition-all text-xs font-bold text-red-400 group`}>
                           <LogOut className="w-4 h-4" /> Sign Out from System
                        </button>
                      )}
                   </div>
                </div>
              )}
           </div>
        </div>

        <div className="p-5 md:p-12 text-center">
          {error && <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-left animate-in slide-in-from-top-2"><AlertCircle className="w-6 h-6" /><p className="text-xs font-bold uppercase tracking-wider">{error}</p></div>}

          {step === 0 && (
            <div className="animate-in fade-in zoom-in-95 duration-700">
               {/* Hero Section */}
               <div className="flex flex-col items-center py-12 lg:py-24 text-center max-w-4xl mx-auto space-y-10">
                  <div className="space-y-8">
                     <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] mx-auto">
                        <Sparkles className="w-3 h-3" /> Voice Your Vision
                     </div>
                     <h2 className={`text-5xl md:text-8xl font-black tracking-tighter transition-all leading-[1.3] md:leading-[0.9] ${t.textHead}`}>
                        Create high-impact AI voiceover <br className="hidden md:block"/> <span className="text-indigo-500">for your assets.</span>
                     </h2>
                     <p className={`text-lg md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto transition-all ${t.textBody}`}>
                        Create high-impact voiceover for your assets: images, GIFs, and videos.
                     </p>
                     <div className="flex flex-col items-center gap-6 pt-4">
                        <button onClick={() => document.getElementById('imageInput').click()} className={`w-full sm:w-auto px-12 py-6 md:px-14 md:py-7 text-white rounded-[2rem] font-black text-lg md:text-xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-4 group ${t.accent}`}>
                           <Upload className="w-6 h-6 group-hover:animate-bounce" /> Get Started by adding Asset
                        </button>
                        <div className={`flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border transition-all ${t.nav}`}>
                           <div className="flex -space-x-3">
                              {[1,2,3].map(i => <div key={i} className={`w-8 h-8 rounded-full border-2 overflow-hidden flex items-center justify-center text-[10px] font-bold ${t.input}`}>U{i}</div>)}
                           </div>
                           <p className={`text-[10px] font-black uppercase tracking-widest leading-none text-left ${t.textBody}`}>Used by 500+ <br/> marketers</p>
                        </div>
                     </div>
                  </div>
               </div>
               <input id="imageInput" type="file" className="hidden" accept="image/*,video/*" onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const type = file.type.startsWith('video') ? 'video' : 'image';
                setAssetType(type);
                const reader = new FileReader();
                reader.onload = (ev) => { setImage(ev.target.result); setStep(1); };
                reader.readAsDataURL(file);
              }} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 md:space-y-10 animate-in slide-in-from-bottom-6 duration-700">
              <h2 className={`text-3xl md:text-4xl font-black tracking-tighter transition-all ${t.textHead}`}>1. Delivery Style</h2>
              
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Horizontal Ratios for Mobile Friendly */}
                <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-6 overflow-x-auto pb-4 md:pb-0 scrollbar-hide px-2">
                  {RATIOS.map(r => (
                    <button key={r.id} onClick={() => setSelectedRatio(r)} className={`min-w-[120px] md:min-w-0 p-4 md:p-8 rounded-2xl md:rounded-3xl border-2 md:border-4 transition-all flex flex-col items-center gap-2 md:gap-4 flex-shrink-0 ${selectedRatio.id === r.id ? 'border-indigo-500 bg-indigo-500/10' : `hover:border-indigo-300 ${t.input}`}`}>
                      <r.icon className={`w-6 h-6 md:w-10 md:h-10 ${selectedRatio.id === r.id ? 'text-indigo-500' : ''}`} />
                      <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${selectedRatio.id === r.id ? 'text-indigo-500' : ''}`}>{r.label}</span>
                    </button>
                  ))}
                </div>

                {/* Compact Fit Mode Switcher */}
                <div className="flex justify-center items-center gap-2 bg-black/40 p-1.5 rounded-xl md:rounded-2xl w-fit mx-auto border border-white/5 shadow-inner">
                    <button onClick={() => setFitMode('cover')} className={`px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${fitMode === 'cover' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Fill Screen</button>
                    <button onClick={() => setFitMode('contain')} className={`px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${fitMode === 'contain' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Fit Entire</button>
                </div>
              </div>

              {/* Above the fold Preview */}
              <div className="relative mx-auto bg-black rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-700 border-4 md:border-8 border-slate-700" style={{ width: '200px', mdWidth: '280px', aspectRatio: selectedRatio.ratio }}>
                {assetType === 'image' ? (
                  <>
                    {fitMode === 'contain' && <img src={image} className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-150" alt="Background" />}
                    <img src={image} className={`w-full h-full relative z-10 ${fitMode === 'cover' ? 'object-cover' : 'object-contain'} opacity-90`} alt="Preview" />
                  </>
                ) : (
                  <>
                    {fitMode === 'contain' && <video src={image} muted autoPlay loop className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-150" />}
                    <video src={image} muted autoPlay loop className={`w-full h-full relative z-10 ${fitMode === 'cover' ? 'object-cover' : 'object-contain'} opacity-90`} />
                  </>
                )}
              </div>

              <div className="flex justify-between items-center max-w-2xl mx-auto w-full pt-2 md:pt-8">
                 <button onClick={() => setStep(0)} className={`${t.textBody} font-black text-[10px] md:text-xs uppercase hover:text-indigo-500 transition-colors`}>Back</button>
                 <button onClick={() => setStep(2)} className={`px-8 py-4 md:px-12 md:py-5 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-base flex items-center gap-2 shadow-xl transition-all ${t.accent}`}>Next: AI Talent <ChevronRight className="w-4 h-4 md:w-5 md:h-5" /></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 md:space-y-10 animate-in slide-in-from-bottom-10 duration-700 pb-24 md:pb-0">
               <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-12 text-left">
                  {/* Script Section - Always Top on Mobile */}
                  <div className="space-y-4 order-1">
                     <div className="flex items-center justify-between px-1">
                        <label className={`font-black tracking-wider text-[9px] md:text-[10px] uppercase ${t.textBody}`}>Script Polish</label>
                        <button 
                           onClick={() => setShowMagicWand(true)}
                           className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-500/20 transition-all"
                        >
                           <Wand2 className="w-3 h-3" /> Magic Generator
                        </button>
                     </div>
                     <textarea className={`w-full p-6 md:p-8 h-48 md:h-80 border-2 rounded-2xl md:rounded-3xl focus:border-indigo-500 outline-none transition-all text-base md:text-lg font-medium placeholder-slate-600 shadow-inner ${t.input}`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your ad script here... AI will polish it for the perfect delivery." />
                     
                     {/* Logic-First: Generate Button right under textarea */}
                     <button disabled={!text.trim() || isGeneratingAudio} onClick={generateAudio} className={`w-full py-5 text-white rounded-2xl font-black text-lg shadow-2xl flex items-center justify-center gap-4 transition-all ${isGeneratingAudio ? 'bg-slate-500' : t.accent}`}>
                        {isGeneratingAudio ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Volume2 className="w-6 h-6" />}
                        {isGeneratingAudio ? "Producing Voice..." : "Generate AI Voice"}
                     </button>
                  </div>

                  {/* Settings Section - Below on Mobile, Side by Side on Desktop */}
                  <div className="space-y-6 md:space-y-8 order-2">
                     <div className="px-1 flex items-center justify-between">
                        <label className={`font-black tracking-wider text-[9px] md:text-[10px] uppercase ${t.textBody}`}>Fine-Tune Talent</label>
                        <div className="flex items-center gap-3">
                           <div className="flex flex-col items-end">
                              <p className={`text-[10px] font-black ${text.split(/\s+/).filter(x => x).length > (usage.tier === 'paid' ? 300 : 75) ? 'text-red-500' : 'text-indigo-400'}`}>
                                 {text.split(/\s+/).filter(x => x).length} / {usage.tier === 'paid' ? '300' : '75'} Words
                              </p>
                              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Est: {(text.split(/\s+/).filter(x => x).length / 2.5).toFixed(1)}s</p>
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                           <label className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${t.textBody} opacity-60`}>Voice Tone</label>
                           <select className={`w-full p-3.5 md:p-4 border-2 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm transition-all ${t.input}`} value={selectedTone} onChange={e => {
                              const isPro = usage.tier === 'paid';
                              const index = TONES.indexOf(e.target.value);
                              if (!isPro && index !== 0) return;
                              setSelectedTone(e.target.value);
                           }}>
                              {TONES.map((t, idx) => (
                                 <option key={t} value={t} disabled={usage.tier !== 'paid' && idx !== 0}>
                                    {t} {usage.tier !== 'paid' && idx !== 0 ? ' \ud83d\udd12' : ''}
                                 </option>
                              ))}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${t.textBody} opacity-60`}>Speech Pace</label>
                           <select className={`w-full p-3.5 md:p-4 border-2 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm transition-all ${t.input}`} value={selectedSpeed.label} onChange={e => {
                              const isPro = usage.tier === 'paid';
                              const speed = SPEEDS.find(s => s.label === e.target.value);
                              const index = SPEEDS.indexOf(speed);
                              if (!isPro && index !== 0) return;
                              setSelectedSpeed(speed);
                           }}>
                              {SPEEDS.map((s, idx) => (
                                 <option key={s.label} value={s.label} disabled={usage.tier !== 'paid' && idx !== 0}>
                                    {s.label} {usage.tier !== 'paid' && idx !== 0 ? ' \ud83d\udd12' : ''}
                                 </option>
                              ))}
                           </select>
                        </div>
                     </div>
                     {assetType === 'video' && (
                        <div className="space-y-3 p-4 bg-black/20 rounded-2xl border border-white/5 shadow-inner">
                           <div className="flex justify-between items-center">
                              <label className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${t.textBody} opacity-80`}>Original Video Volume</label>
                              <span className="text-[10px] font-black text-indigo-400">{Math.round(videoVolume * 100)}%</span>
                           </div>
                           <input type="range" min="0" max="1" step="0.01" value={videoVolume} onChange={(e) => setVideoVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500 cursor-pointer" />
                           <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter italic text-center">Lower this for better AI Voice clarity (Ducking)</p>
                        </div>
                     )}
                     <div className="space-y-2">
                        <label className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-1 ${t.textBody} opacity-60`}>AI Voice Talent</label>
                        <div className={`max-h-48 md:max-h-60 overflow-y-auto border-2 p-2 rounded-2xl md:rounded-3xl transition-all ${t.nav} custom-scrollbar`}>
                           {VOICES.map((v, idx) => {
                              const isProFeature = idx !== 0; // Aoede is index 0 and is free
                              const isLocked = usage.tier !== 'paid' && isProFeature;
                              return (
                                 <button key={v.name} onClick={() => !isLocked && setSelectedVoice(v.name)} className={`w-full p-3.5 md:p-4 text-left rounded-xl border-2 text-xs md:text-sm font-bold transition-all mb-2 flex items-center justify-between ${isLocked ? 'opacity-40 cursor-not-allowed grayscale' : selectedVoice === v.name ? `${t.accent} text-white shadow-lg border-transparent` : `bg-transparent border-transparent ${t.textBody} hover:bg-black/5`}`}>
                                    <span className="flex items-center gap-2">
                                       {v.label}
                                       {isLocked && <div className="flex items-center gap-1 bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full text-[8px]"><Lock className="w-2.5 h-2.5" /> PRO</div>}
                                    </span>
                                    {selectedVoice === v.name && !isLocked && <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="flex flex-col gap-6 pt-4 border-t border-black/5">
                  {isGeneratingAudio && (
                     <div className="space-y-4 max-w-xl mx-auto w-full">
                        <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                           <span className="flex items-center gap-2 animate-pulse"><BrainCircuit className="w-3.5 h-3.5 md:w-4 md:h-4" /> {statusMessage}</span>
                           <span>{audioProgress}%</span>
                        </div>
                        <div className={`w-full rounded-full h-1.5 md:h-2 overflow-hidden border transition-all ${t.input}`}>
                           <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${audioProgress}%` }} />
                        </div>
                     </div>
                  )}

                  {/* Redesigned Audio Block - Directly below generation */}
                  {audioUrl && !isGeneratingAudio && (
                     <div className={`p-5 md:p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 border-2 animate-in slide-in-from-top-4 max-w-4xl mx-auto text-left shadow-2xl transition-all w-full bg-slate-900/50 border-white/5`}>
                        <div className="flex-1 w-full">
                           <div className="flex items-center justify-between mb-4 px-2">
                              <p className="text-indigo-400 font-black text-[9px] md:text-[10px] tracking-widest uppercase">Master Audio Clip</p>
                              <span className="text-[10px] font-bold text-slate-500">{(audioBlob?.size / 1024).toFixed(1)} KB</span>
                           </div>
                           <audio 
                              controls 
                              controlsList="nodownload" 
                              onContextMenu={(e) => e.preventDefault()}
                              src={audioUrl} 
                              className="w-full h-10 md:h-12 invert opacity-80" 
                           />
                        </div>
                        <button onClick={() => setStep(3)} className={`w-full md:w-auto px-10 py-5 rounded-2xl font-black text-sm md:text-base whitespace-nowrap transition-all shadow-xl flex items-center justify-center gap-3 ${t.accent}`}>
                           <Video className="w-5 h-5" /> Mix with Assets
                        </button>
                     </div>
                  )}

                  <div className="flex justify-between items-center max-w-2xl mx-auto w-full">
                     <button onClick={() => setStep(1)} className={`${t.textBody} font-black text-[10px] md:text-xs uppercase hover:text-indigo-500 transition-colors`}>Back</button>
                  </div>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-12 space-y-12 animate-in fade-in duration-700">
              <div className="relative mx-auto bg-black rounded-[4rem] overflow-hidden shadow-2xl border-8 border-slate-700" style={{ width: '280px', aspectRatio: selectedRatio.ratio }}>
                <img src={image} className={`w-full h-full object-cover transition-opacity duration-500 ${isCreatingVideo ? 'opacity-50' : 'opacity-100'}`} alt="Mixing" />
                {isCreatingVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin" />
                  </div>
                )}
              </div>
              <div className="max-w-md mx-auto space-y-8 text-center">
                <h2 className="text-4xl font-black tracking-tighter text-white">Ready to Mix</h2>
                <div className="flex gap-4 justify-center">
                   <button onClick={() => setStep(2)} className="px-8 py-4 border-2 border-slate-700 rounded-2xl font-black text-xs uppercase text-slate-400">Back</button>
                   <button disabled={isCreatingVideo} onClick={createVideo} className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl flex items-center gap-3 hover:bg-indigo-500 transition-all">
                    {isCreatingVideo ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Video className="w-6 h-6" />}
                    {isCreatingVideo ? "Rendering..." : "Create Final Video"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-12 animate-in zoom-in-95 py-12 duration-700">
              <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/20"><CheckCircle className="w-12 h-12" /></div>
              <h2 className="text-6xl font-black tracking-tighter text-white">VocalAd Ready!</h2>
              <div className="bg-black p-4 rounded-[4rem] max-w-sm mx-auto shadow-2xl border-[12px] border-slate-900" style={{ aspectRatio: selectedRatio.ratio }}>
                {finalVideoUrl && <video controls autoPlay className="w-full h-full rounded-[2.5rem]" src={finalVideoUrl} />}
              </div>
              <div className="flex flex-col gap-4 max-w-sm mx-auto px-6 pt-4">
                 <button onClick={() => handleDownloadClick('video')} className="px-12 py-6 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-2xl flex items-center justify-center gap-4 hover:bg-indigo-500 transition-all"><Download className="w-7 h-7" /> Download Video</button>
                 <button onClick={() => handleDownloadClick('audio')} className="px-10 py-5 border-2 border-slate-700 rounded-2xl font-black uppercase text-xs text-slate-400 flex items-center justify-center gap-3 hover:text-white hover:border-slate-600 transition-all"><Music className="w-5 h-5" /> Download Audio Only</button>
                 <button onClick={() => { setImage(null); setStep(0); setText(""); setAudioUrl(null); setFinalVideoUrl(null); setLocalVoiceCount(0); }} className="py-6 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] hover:text-slate-300 transition-colors">Create Another Project</button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="mt-12 text-center pb-12">
         <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Powered by Gemini 1.5 & VocalAd AI Engine</p>
      </div>
    </div>
  );
};

export default App;
