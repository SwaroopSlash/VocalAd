import React, { useState, useEffect } from 'react';
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
  linkWithCredential,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithPhoneNumber
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
  Hash
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
  { id: 'story', label: 'WhatsApp/Story', icon: Smartphone, width: 720, height: 1280, ratio: 9/16 },
  { id: 'square', label: 'Instagram Post', icon: Square, width: 1080, height: 1080, ratio: 1/1 },
  { id: 'cinema', label: 'Laptop/TV', icon: Monitor, width: 1280, height: 720, ratio: 16/9 },
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

const App = () => {
  // --- Auth & Usage State ---
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState({ creditsRemaining: 3, tier: 'free', voiceSamples: 0 });
  const [localVoiceCount, setLocalVoiceCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
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
  const [selectedTone, setSelectedTone] = useState(TONES[0]);
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[1].name);
  const [selectedSpeed, setSelectedSpeed] = useState(SPEEDS[0]);
  
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingDownloadType, setPendingDownloadType] = useState(null); // 'video' or 'audio'

  const apiKey = process.env.REACT_APP_GEMINI_API_KEY; 

  // --- Auth logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setUser(u);
        
        // Auto-close modal if user becomes permanent
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
    const savedText = localStorage.getItem('advocalize_v2_draft');
    if (savedText) setText(savedText);
  }, []);

  useEffect(() => {
    if (text) localStorage.setItem('advocalize_v2_draft', text);
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

  const handleSignOut = () => signOut(auth);

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
    setError(null); // Clear previous errors

    // Voice Generation Credit Logic
    const isPro = usage.tier === 'paid';
    
    if (!isPro) {
      if (localVoiceCount >= 3) {
        setModalReason("voice_limit_free");
        setShowAuthModal(true);
        return;
      }
    } else {
      // Pro Tier: 5 free, then 1 credit per batch of 5
      if (localVoiceCount >= 5 && (localVoiceCount - 5) % 5 === 0) {
        if (usage.creditsRemaining <= 0) {
          setModalReason("out_of_credits");
          setShowAuthModal(true);
          return;
        }
        const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
        await updateDoc(usageRef, { creditsRemaining: increment(-1) });
        setStatusMessage("Batch limit reached. 1 Credit used for next 5 samples.");
      } else if (usage.creditsRemaining <= 0 && localVoiceCount === 0) {
        setModalReason("out_of_credits");
        setShowAuthModal(true);
        return;
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
         // Safety Fallback for restricted keys
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

  const createVideo = async () => {
    if (!image || !audioBlob || !user) return;
    if (usage.creditsRemaining <= 0) { 
      setModalReason("out_of_credits"); 
      setShowAuthModal(true); 
      return; 
    }

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
        
        // Fit Logic
        const imgRatio = img.width / img.height; const canvasRatio = canvas.width / canvas.height;
        let dw, dh, ox = 0, oy = 0;
        if (imgRatio > canvasRatio) { dh = canvas.height; dw = img.width * (canvas.height / img.height); ox = (canvas.width - dw) / 2; }
        else { dw = canvas.width; dh = img.height * (canvas.width / img.width); oy = (canvas.height - dh) / 2; }
        
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    if (type === 'video' && finalVideoUrl) { a.href = finalVideoUrl; a.download = `AdVocalize_${selectedRatio.id}.webm`; }
    else if (type === 'audio' && audioUrl) { a.href = audioUrl; a.download = 'AdVocalize_Master.wav'; }
    else return;
    a.click();
  };

  const getModalContent = () => {
    switch (modalReason) {
      case "voice_limit_free":
        return {
          icon: <Volume2 className="w-8 h-8" />,
          title: "Voice Limit Reached",
          body: "You've used your 3 free voice attempts for this project. Sign up or upgrade to Pro for unlimited experiments!"
        };
      case "out_of_credits":
        return {
          icon: <Video className="w-8 h-8" />,
          title: "Credits Exhausted",
          body: "You've run out of credits. Purchase more to continue rendering high-impact video ads."
        };
      case "download_lock":
        return {
          icon: <Download className="w-8 h-8" />,
          title: "Claim Your Ad",
          body: "Your masterpiece is ready! Create a free account to download and save your projects permanently."
        };
      default:
        return {
          icon: <Lock className="w-8 h-8" />,
          title: "Restricted Access",
          body: "Please sign in or upgrade to continue."
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8">
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-800 rounded-[2.5rem] p-10 max-w-sm w-full border border-slate-700 text-center space-y-6">
            <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto">
              {getModalContent().icon}
            </div>
            <h3 className="text-2xl font-black">{authMode === 'reset' ? "Reset Password" : getModalContent().title}</h3>
            <p className="text-slate-400 text-sm">{authMode === 'reset' ? "We'll send a recovery link to your email." : getModalContent().body}</p>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input type="email" placeholder="Email Address" className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl outline-none text-white" value={email} onChange={e => setEmail(e.target.value)} required />
              {authMode !== 'reset' && (
                <input type="password" placeholder="Password" className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl outline-none text-white" value={password} onChange={e => setPassword(e.target.value)} required />
              )}
              <button type="submit" className="w-full py-4 bg-indigo-600 rounded-2xl font-bold">
                {authMode === 'signup' ? "Sign Up" : authMode === 'login' ? "Login" : "Send Reset Link"}
              </button>
            </form>
            
            {authMode !== 'reset' && (
              <button onClick={signInWithGoogle} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2"><User /> Google</button>
            )}

            <div className="flex flex-col gap-4 text-xs font-bold uppercase tracking-widest">
              <div className="flex justify-center gap-4">
                <button onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')} className="text-indigo-400">
                  {authMode === 'signup' ? "Already have an account? Login" : "Need an account? Sign Up"}
                </button>
              </div>
              {authMode === 'login' && (
                <button onClick={() => setAuthMode('reset')} className="text-slate-500 hover:text-slate-300 transition-colors">Forgot Password?</button>
              )}
              {authMode === 'reset' && (
                <button onClick={() => setAuthMode('login')} className="text-indigo-400">Back to Login</button>
              )}
            </div>
            {authError && <p className="text-red-400 text-xs font-bold">{authError}</p>}
            {authMessage && <p className="text-green-400 text-xs font-bold">{authMessage}</p>}
            <button onClick={() => setShowAuthModal(false)} className="text-slate-500 font-bold text-xs uppercase tracking-widest">Close</button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-700">
        <div className="bg-indigo-600 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 flex items-center gap-4">
             <div className="bg-black/20 backdrop-blur-xl px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest border border-white/10 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                {usage.tier.toUpperCase()} | {usage.creditsRemaining ?? 0} CREDITS
             </div>
             {user?.isAnonymous ? (
                <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black tracking-widest border border-white/10 flex items-center gap-2"><User className="w-3 h-3"/> SIGN IN</button>
             ) : (
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-black tracking-widest hidden sm:inline">{user?.email?.toUpperCase()}</span>
                   <button onClick={handleSignOut} className="bg-red-500/20 p-2 rounded-full border border-red-500/20 text-red-300"><User className="w-4 h-4" /></button>
                </div>
             )}
          </div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3"><Video className="w-10 h-10" /> AdVocalize Pro <span className="text-xs bg-white/20 px-2 py-1 rounded ml-2 uppercase tracking-widest">v2 Unified</span></h1>
          <div className="flex mt-12 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= i ? 'bg-white shadow-[0_0_15px_white]' : 'bg-white/10'}`} />)}</div>
        </div>

        <div className="p-10 text-center">
          {error && <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-left animate-in slide-in-from-top-2"><AlertCircle className="w-6 h-6" /><p className="text-xs font-bold uppercase tracking-wider">{error}</p></div>}

          {step === 0 && (
            <div className="py-16 space-y-12 animate-in zoom-in-95">
              <div className="space-y-5">
                <h2 className="text-6xl font-black tracking-tighter text-white">Ad Creation Redefined.</h2>
                <p className="text-slate-400 text-xl max-w-xl mx-auto">Create high-impact video ads with AI.</p>
              </div>
              <button onClick={() => document.getElementById('imageInput').click()} className="px-14 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 transition-all flex items-center gap-4 mx-auto group"><Upload className="w-6 h-6 group-hover:animate-bounce" /> Upload Visual</button>
              <input id="imageInput" type="file" className="hidden" accept="image/*" onChange={(e) => {
                const reader = new FileReader();
                reader.onload = (ev) => { setImage(ev.target.result); setStep(1); };
                reader.readAsDataURL(e.target.files[0]);
              }} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6">
              <h2 className="text-3xl font-black text-white">1. Select Delivery Style</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {RATIOS.map(r => (
                  <button key={r.id} onClick={() => setSelectedRatio(r)} className={`p-8 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-4 ${selectedRatio.id === r.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'}`}>
                    <r.icon className="w-10 h-10" />
                    <span className="text-xs font-black uppercase tracking-widest">{r.label}</span>
                  </button>
                ))}
              </div>
              <div className="relative mx-auto bg-black rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-700" style={{ width: '280px', aspectRatio: selectedRatio.ratio }}>
                <img src={image} className="w-full h-full object-cover opacity-80" alt="Preview" />
              </div>
              <div className="flex justify-between items-center max-w-2xl mx-auto w-full pt-4">
                 <button onClick={() => setStep(0)} className="text-slate-500 font-black text-xs uppercase">Back</button>
                 <button onClick={() => setStep(2)} className="px-12 py-5 bg-slate-100 text-slate-900 rounded-[2rem] font-black flex items-center gap-2 shadow-xl active:scale-95 transition-all">Next: Voice Talent <ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                  <div className="space-y-4">
                     <label className="font-black text-slate-400 tracking-wider text-xs uppercase">Marketing Copy</label>
                     <textarea className="w-full p-8 h-72 bg-slate-900/50 border-2 border-slate-700 rounded-[2rem] focus:border-indigo-500 outline-none transition-all text-lg font-medium text-white" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter script..." />
                  </div>
                  <div className="space-y-8">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tone</label>
                           <select className="w-full p-4 border-2 border-slate-700 rounded-2xl bg-slate-900 text-white font-bold text-sm" value={selectedTone} onChange={e => {
                              const isPro = usage.tier === 'paid';
                              const index = TONES.indexOf(e.target.value);
                              if (!isPro && index !== 0) return; // Only index 0 (Professional) is free
                              setSelectedTone(e.target.value);
                           }}>
                              {TONES.map((t, idx) => (
                                 <option key={t} value={t} disabled={usage.tier !== 'paid' && idx !== 0}>
                                    {t} {usage.tier !== 'paid' && idx !== 0 ? ' (PRO 🔒)' : ''}
                                 </option>
                              ))}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Speech Pace</label>
                           <select className="w-full p-4 border-2 border-slate-700 rounded-2xl bg-slate-900 text-white font-bold text-sm" value={selectedSpeed.label} onChange={e => {
                              const isPro = usage.tier === 'paid';
                              const speed = SPEEDS.find(s => s.label === e.target.value);
                              const index = SPEEDS.indexOf(speed);
                              if (!isPro && index !== 0) return; // Only 1.0x is free
                              setSelectedSpeed(speed);
                           }}>
                              {SPEEDS.map((s, idx) => (
                                 <option key={s.label} value={s.label} disabled={usage.tier !== 'paid' && idx !== 0}>
                                    {s.label} {usage.tier !== 'paid' && idx !== 0 ? ' (PRO 🔒)' : ''}
                                 </option>
                              ))}
                           </select>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">AI Voice Talent</label>
                        <div className="max-h-56 overflow-y-auto border-2 border-slate-700 p-2 rounded-[1.5rem] bg-slate-900/30">
                           {VOICES.map((v, idx) => {
                              const isProFeature = idx !== 1; // Charon (Male) is at index 1 and is free
                              const isLocked = usage.tier !== 'paid' && isProFeature;
                              return (
                                 <button 
                                    key={v.name} 
                                    onClick={() => !isLocked && setSelectedVoice(v.name)} 
                                    title={isLocked ? "Available for Pro users" : ""}
                                    className={`w-full p-4 text-left rounded-xl border-2 text-sm font-bold transition-all mb-2 flex items-center justify-between ${isLocked ? 'opacity-40 cursor-not-allowed bg-slate-900/50 grayscale' : selectedVoice === v.name ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800'}`}
                                 >
                                    <span className="flex items-center gap-2">
                                       {v.label}
                                       {isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                                    </span>
                                    {selectedVoice === v.name && !isLocked && <CheckCircle className="w-4 h-4 text-white" />}
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  </div>
               </div>
               <div className="flex flex-col gap-6 pt-10 border-t-2 border-slate-700">
                  {isGeneratingAudio && (
                     <div className="space-y-4 max-w-xl mx-auto w-full">
                        <div className="flex justify-between items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                           <span className="flex items-center gap-2 animate-pulse"><BrainCircuit className="w-4 h-4" /> {statusMessage}</span>
                           <span>{audioProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-700">
                           <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${audioProgress}%` }} />
                        </div>
                     </div>
                  )}
                  <div className="flex justify-between items-center max-w-2xl mx-auto w-full">
                     <button onClick={() => setStep(1)} className="text-slate-500 font-black text-xs uppercase">Back</button>
                     <button disabled={!text.trim() || isGeneratingAudio} onClick={generateAudio} className={`px-12 py-5 text-white rounded-[2rem] font-black shadow-2xl flex items-center gap-4 ${isGeneratingAudio ? 'bg-slate-700' : 'bg-indigo-600'}`}>
                        {isGeneratingAudio ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                        {isGeneratingAudio ? "Producing..." : "Generate AI Voice"}
                     </button>
                  </div>
               </div>
               {audioUrl && !isGeneratingAudio && (
                  <div className="p-8 bg-indigo-600 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 border-4 border-indigo-400 animate-in zoom-in-95 max-w-3xl mx-auto text-left">
                     <div className="flex-1 w-full"><p className="text-white/60 font-black text-xs tracking-widest uppercase mb-4 px-2">audio preview</p><audio controls src={audioUrl} className="w-full rounded-full" /></div>
                     <button onClick={() => setStep(3)} className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black whitespace-nowrap active:scale-95 shadow-lg">Confirm & Mix</button>
                  </div>
               )}
            </div>
          )}

          {step === 3 && (
            <div className="py-12 space-y-12 animate-in fade-in">
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
                   <button disabled={isCreatingVideo} onClick={createVideo} className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl flex items-center gap-3">
                    {isCreatingVideo ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Video className="w-6 h-6" />}
                    {isCreatingVideo ? "Processing..." : "Create Ad Video"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-12 animate-in zoom-in-95 py-12">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl"><CheckCircle className="w-12 h-12" /></div>
              <h2 className="text-5xl font-black tracking-tighter text-white">Success!</h2>
              <div className="bg-black p-8 rounded-[4rem] max-w-sm mx-auto shadow-2xl border-[12px] border-slate-800" style={{ aspectRatio: selectedRatio.ratio }}>
                {finalVideoUrl && <video controls autoPlay className="w-full h-full rounded-[2.5rem]" src={finalVideoUrl} />}
              </div>
              <div className="flex flex-col gap-4 max-w-sm mx-auto px-6">
                 <button onClick={() => handleDownloadClick('video')} className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95"><Download className="w-7 h-7" /> Download Video</button>
                 <button onClick={() => handleDownloadClick('audio')} className="px-10 py-5 border-2 border-slate-700 rounded-[2rem] font-black uppercase text-xs text-slate-400 flex items-center justify-center gap-3"><Music className="w-5 h-5" /> Download Audio</button>
                 <button onClick={() => { setImage(null); setStep(0); setText(""); setAudioUrl(null); setFinalVideoUrl(null); setLocalVoiceCount(0); }} className="py-4 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] hover:text-slate-300">New Project</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
