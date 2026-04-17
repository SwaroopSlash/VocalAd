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
  X
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

const BRAIN_MODEL = "gemini-1.5-flash-latest"; 
const VOICE_MODEL = "gemini-3.1-flash-tts-preview"; 

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
    page: "bg-slate-950 text-slate-100",
    card: "bg-slate-900/50 border-white/5 shadow-2xl backdrop-blur-xl",
    nav: "bg-slate-900/80 border-b border-white/5",
    textHead: "text-white font-['Plus_Jakarta_Sans'] font-extrabold tracking-tight",
    textBody: "text-slate-400 font-['Plus_Jakarta_Sans']",
    accent: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20",
    input: "bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500",
    dropdown: "bg-slate-900/90 border-white/10 backdrop-blur-xl",
    radius: "rounded-[2.5rem]",
    btnRadius: "rounded-2xl"
  }
};

const App = () => {
  // --- Theme State ---
  const [currentTheme, setCurrentTheme] = useState('studio');
  const t = THEMES[currentTheme];

  // --- Auth & Usage State ---
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState({ creditsRemaining: 3, tier: 'free', voiceSamples: 0 });
  const [localVoiceCount, setLocalVoiceCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  const [modalReason, setModalReason] = useState("limit");
  const [authMode, setAuthMode] = useState('signup'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // --- Engine State ---
  const [step, setStep] = useState(0); 
  const [image, setImage] = useState(null);
  const [selectedRatio, setSelectedRatio] = useState(RATIOS[2]);
  const [fitMode, setFitMode] = useState('cover'); // 'cover' or 'contain'
  const [selectedTone, setSelectedTone] = useState(TONES[0]);
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].name); // Aoede (Female) Default
  const [selectedSpeed, setSelectedSpeed] = useState(SPEEDS[0]);

  const [showMagicWand, setShowMagicWand] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState("");
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

  const apiKey = process.env.REACT_APP_GEMINI_API_KEY; 

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
        await signInAnonymously(auth);
      } else {
        setUser(u);
        if (!u.isAnonymous) {
          setShowAuthModal(false);
          const profileRef = doc(db, 'artifacts', appId, 'users', u.uid);
          await setDoc(profileRef, { email: u.email, lastLogin: new Date().toISOString(), uid: u.uid }, { merge: true });
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
        setDoc(usageRef, { creditsRemaining: 3, tier: 'free', videoCount: 0, voiceSamples: 0 });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // --- Auth Actions ---
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      if (user?.isAnonymous) await linkWithPopup(user, provider);
      else await signInWithPopup(auth, provider);
      setShowAuthModal(false);
    } catch (err) { setError("Google Auth restricted in this environment."); }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault(); setAuthError(""); setAuthMessage("");
    try {
      if (authMode === 'signup') {
        if (user?.isAnonymous) await linkWithCredential(user, EmailAuthProvider.credential(email, password));
        else await createUserWithEmailAndPassword(auth, email, password);
        setShowAuthModal(false);
      } else if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        setShowAuthModal(false);
      } else if (authMode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setAuthMessage("Reset link sent!");
      }
    } catch (err) { setAuthError(err.message); }
  };

  const handleSignOut = () => {
    signOut(auth);
    setShowProfileDropdown(false);
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
    setStatusMessage("Polishing Script...");
    try {
      const res1 = await callGemini(`Refine this for commercial voiceover with a ${selectedTone} tone: "${text}". Speed: ${selectedSpeed.instruction}. Output ONLY plain text.`, BRAIN_MODEL);
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
    } catch (err) { setError(err.message); setIsGeneratingAudio(false); }
  };

  const generateMagicScript = async () => {
    if (!magicPrompt.trim()) return;
    setIsGeneratingScript(true);
    try {
      const prompt = `You are an expert ad copywriter. Based on this description "${magicPrompt}", write a high-converting commercial script for a 15-second ad. Max 40 words. Output ONLY the plain script text without any labels or instructions.`;
      const res = await callGemini(prompt, BRAIN_MODEL);
      const generated = res.candidates?.[0]?.content?.parts?.[0]?.text || "";
      setText(generated);
      setShowMagicWand(false);
      setMagicPrompt("");
    } catch (err) {
      setError("Failed to generate script. Please try again.");
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
      const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
      const img = new Image(); img.src = image; await new Promise(r => img.onload = r);
      
      canvas.width = selectedRatio.width; canvas.height = selectedRatio.height;
      const stream = canvas.captureStream(30);
      const audioStream = audioContext.createMediaStreamDestination();
      const audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer; audioSource.connect(audioStream);
      const combinedStream = new MediaStream([...stream.getVideoTracks(), ...audioStream.stream.getAudioTracks()]);
      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks = []; mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        setFinalVideoUrl(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })));
        const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
        await updateDoc(usageRef, { creditsRemaining: increment(-1) });
        setIsCreatingVideo(false); setStep(4);
      };
      mediaRecorder.start(); audioSource.start();
      const startTime = performance.now();
      const animate = (time) => {
        const elapsed = (time - startTime) / 1000;
        if (elapsed > audioBuffer.duration) { mediaRecorder.stop(); audioSource.stop(); return; }
        
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Fit Logic
        const imgRatio = img.width / img.height; 
        const canvasRatio = canvas.width / canvas.height;
        let dw, dh, ox = 0, oy = 0;

        if (fitMode === 'cover') {
          // Fill logic (current)
          if (imgRatio > canvasRatio) { dh = canvas.height; dw = img.width * (canvas.height / img.height); ox = (canvas.width - dw) / 2; }
          else { dw = canvas.width; dh = img.height * (canvas.width / img.width); oy = (canvas.height - dh) / 2; }
        } else {
          // Contain logic (Fit entire image)
          if (imgRatio > canvasRatio) { dw = canvas.width; dh = img.height * (canvas.width / img.width); oy = (canvas.height - dh) / 2; }
          else { dh = canvas.height; dw = img.width * (canvas.height / img.height); ox = (canvas.width - dw) / 2; }
          
          // Draw blurred background for contain mode
          ctx.save();
          ctx.filter = 'blur(40px) brightness(0.4)';
          const bW = canvasRatio > imgRatio ? canvas.height * imgRatio : canvas.width;
          const bH = canvasRatio > imgRatio ? canvas.height : canvas.width / imgRatio;
          ctx.drawImage(img, (canvas.width - bW*2)/2, (canvas.height - bH*2)/2, bW*2, bH*2);
          ctx.restore();
        }
        
        ctx.drawImage(img, ox, oy, dw, dh);
        ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    } catch (err) { setError("Video rendering failed."); setIsCreatingVideo(false); }
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

  const getModalContent = () => {
    switch (modalReason) {
      case "voice_limit_free":
        return { icon: <Volume2 className="w-8 h-8" />, title: "Voice Limit Reached", body: "You've used your 3 free voice attempts. Sign in or upgrade to explore unlimited possibilities!" };
      case "out_of_credits":
        return { icon: <Video className="w-8 h-8" />, title: "Credits Exhausted", body: "You've run out of credits. Top up now to continue creating high-impact masterpieces." };
      case "download_lock":
        return { icon: <Download className="w-8 h-8" />, title: "Claim Your Masterpiece", body: "Your ad is ready! Create a free account to download and save your projects permanently." };
      default:
        return { icon: <Sparkles className="w-8 h-8" />, title: "Welcome to VocalAd.ai", body: "Sign in to access your projects and explore our premium AI voice talent." };
    }
  };

  return (
    <div className={`min-h-screen font-sans p-4 md:p-8 transition-colors duration-700 ${t.page}`}>
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
          <div className={`${t.dropdown} rounded-[2.5rem] p-10 max-w-sm w-full border text-center space-y-6 shadow-2xl`}>
            <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto">{getModalContent().icon}</div>
            <h3 className={`text-2xl font-black ${t.textHead}`}>{authMode === 'reset' ? "Reset Password" : getModalContent().title}</h3>
            <p className={`${t.textBody} text-sm`}>{authMode === 'reset' ? "We'll send a recovery link to your email." : getModalContent().body}</p>
            
            {authMode !== 'reset' && (
              <button 
                onClick={signInWithGoogle}
                className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-slate-100 transition-all border border-slate-200"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                Connect with Google
              </button>
            )}

            {authMode !== 'reset' && (
              <div className="flex items-center gap-4 py-2">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">or</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input type="email" placeholder="Email Address" className={`w-full p-4 rounded-2xl outline-none border transition-all ${t.input}`} value={email} onChange={e => setEmail(e.target.value)} required />
              {authMode !== 'reset' && <input type="password" placeholder="Password" className={`w-full p-4 rounded-2xl outline-none border transition-all ${t.input}`} value={password} onChange={e => setPassword(e.target.value)} required />}
              <button type="submit" className={`w-full py-4 rounded-2xl font-bold transition-all ${t.accent}`}>{authMode === 'signup' ? "Sign Up" : authMode === 'login' ? "Login" : "Send Reset Link"}</button>
            </form>
            <div className="flex flex-col gap-4 text-xs font-bold uppercase tracking-widest">
              <button onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')} className="text-indigo-400">{authMode === 'signup' ? "Already have an account? Login" : "Need an account? Sign Up"}</button>
              {authMode === 'login' && <button onClick={() => setAuthMode('reset')} className={`${t.textBody} hover:text-indigo-400`}>Forgot Password?</button>}
            </div>
            {authError && <p className="text-red-400 text-xs font-bold">{authError}</p>}
            <button onClick={() => setShowAuthModal(false)} className={`${t.textBody} font-bold text-xs uppercase`}>Close</button>
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
              <div className="bg-black/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[9px] md:text-[10px] font-black tracking-widest border border-black/5 flex items-center gap-1.5 md:gap-2">
                 <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5 text-indigo-500" />
                 <span className="hidden xs:inline">{usage.creditsRemaining ?? 0}</span> CREDITS
              </div>
              
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center transition-all overflow-hidden ${t.input}`}
              >
                 {user?.isAnonymous ? <User className="w-4 h-4 md:w-5 md:h-5" /> : <div className={`w-full h-full flex items-center justify-center font-black text-xs ${t.accent}`}>{user?.email?.charAt(0).toUpperCase()}</div>}
              </button>

              {showProfileDropdown && (
                <div className={`absolute top-full right-0 mt-4 w-60 md:w-64 border rounded-2xl md:rounded-3xl shadow-2xl p-3 md:p-4 animate-in fade-in zoom-in-95 z-50 backdrop-blur-2xl transition-all ${t.dropdown}`}>
                   <div className="px-2 py-3 border-b border-black/5 mb-2">
                      <p className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{usage.tier} account</p>
                      <p className={`text-xs md:sm font-bold truncate ${t.textHead}`}>{user?.isAnonymous ? "Guest Session" : user?.email}</p>
                   </div>
                   <div className="space-y-1">
                      <button className={`w-full flex items-center gap-3 p-2.5 md:p-3 rounded-xl hover:bg-black/5 transition-all text-[11px] md:text-xs font-bold ${t.textBody} group`}>
                         <CreditCard className="w-4 h-4 group-hover:text-indigo-500" /> My Subscription
                      </button>
                      <button className={`w-full flex items-center gap-3 p-2.5 md:p-3 rounded-xl hover:bg-black/5 transition-all text-[11px] md:text-xs font-bold ${t.textBody} group`}>
                         <Settings className="w-4 h-4 group-hover:text-indigo-500" /> Preferences
                      </button>
                      <div className="h-px bg-black/5 my-2" />
                      {user?.isAnonymous ? (
                        <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); setShowProfileDropdown(false); }} className={`w-full flex items-center gap-3 p-2.5 md:p-3 rounded-xl transition-all text-[11px] md:text-xs font-black text-white ${t.accent}`}>
                           <User className="w-4 h-4" /> Sign In / Up
                        </button>
                      ) : (
                        <button onClick={handleSignOut} className={`w-full flex items-center gap-3 p-2.5 md:p-3 rounded-xl hover:bg-red-500/10 transition-all text-[11px] md:text-xs font-bold text-red-500 group`}>
                           <LogOut className="w-4 h-4" /> Sign Out
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
                     <h2 className={`text-5xl md:text-8xl font-black tracking-tighter transition-all leading-[1.1] md:leading-[0.9] ${t.textHead}`}>
                        Create high-impact AI voiceover <br className="hidden md:block"/> <span className="text-indigo-500">for your assets.</span>
                     </h2>
                     <p className={`text-lg md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto transition-all ${t.textBody}`}>
                        Transform static images, GIFs, and videos into conversion-ready ads with professional AI voice talent and script refinement.
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
               <input id="imageInput" type="file" className="hidden" accept="image/*" onChange={(e) => {
                const reader = new FileReader();
                reader.onload = (ev) => { setImage(ev.target.result); setStep(1); };
                reader.readAsDataURL(e.target.files[0]);
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
                {fitMode === 'contain' && <img src={image} className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-150" alt="Background" />}
                <img src={image} className={`w-full h-full relative z-10 ${fitMode === 'cover' ? 'object-cover' : 'object-contain'} opacity-90`} alt="Preview" />
              </div>

              <div className="flex justify-between items-center max-w-2xl mx-auto w-full pt-2 md:pt-8">
                 <button onClick={() => setStep(0)} className={`${t.textBody} font-black text-[10px] md:text-xs uppercase hover:text-indigo-500 transition-colors`}>Back</button>
                 <button onClick={() => setStep(2)} className={`px-8 py-4 md:px-12 md:py-5 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-base flex items-center gap-2 shadow-xl transition-all ${t.accent}`}>Next: AI Talent <ChevronRight className="w-4 h-4 md:w-5 md:h-5" /></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 md:space-y-10 animate-in slide-in-from-bottom-10 duration-700">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 text-left">
                  <div className="space-y-4">
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

                  <div className="space-y-6 md:space-y-8">
                     <div className="px-1"><label className={`font-black tracking-wider text-[9px] md:text-[10px] uppercase ${t.textBody}`}>Fine-Tune Talent</label></div>
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
                     <div className="space-y-2">
                        <label className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest px-1 ${t.textBody} opacity-60`}>AI Voice Talent</label>
                        <div className={`max-h-48 md:max-h-60 overflow-y-auto border-2 p-2 rounded-2xl md:rounded-3xl transition-all ${t.nav}`}>
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
                  {audioUrl && !isGeneratingAudio && (
                     <div className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 border-4 animate-in zoom-in-95 max-w-3xl mx-auto text-left shadow-2xl transition-all ${t.accent} text-white`}>
                        <div className="flex-1 w-full"><p className="text-white/80 font-black text-[9px] md:text-[10px] tracking-widest uppercase mb-3 md:mb-4 px-2">Voiceover Preview</p><audio controls src={audioUrl} className="w-full h-10 md:h-12" /></div>
                        <button onClick={() => setStep(3)} className="w-full md:w-auto bg-white text-indigo-600 px-8 py-4 md:px-10 md:py-5 rounded-xl md:rounded-2xl font-black text-sm md:text-base whitespace-nowrap hover:bg-slate-100 transition-all shadow-xl">Confirm & Mix</button>
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
