import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  increment,
  getDoc 
} from 'firebase/firestore';
import { 
  Upload, 
  Mic, 
  CheckCircle, 
  Download, 
  RefreshCw,
  Image as ImageIcon,
  Volume2,
  Video,
  AlertCircle,
  Sparkles,
  Wand2,
  BrainCircuit,
  FastForward,
  Lock,
  User,
  ShieldCheck,
  Zap,
  ChevronRight,
  Mail
} from 'lucide-react';

// --- PRODUCTION FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCzXZiB8PcB8-Fr7X9IdI_th8UfpodXM4E",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "advocalize.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "advocalize",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "advocalize.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "911571947699",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:911571947699:web:e7f9b1a14f8c897441e0c6",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-3ZVPLWKZ6L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'advocalize-pro-v2';

const BRAIN_MODEL = "gemini-2.5-flash"; 
const VOICE_MODEL = "gemini-2.5-flash-preview-tts"; 

const VOICES = [
  { name: 'Kore', label: 'Kore (Male - Professional)', type: 'male' },
  { name: 'Aoede', label: 'Aoede (Female - Warm)', type: 'female' },
  { name: 'Fenrir', label: 'Fenrir (Male - Deep)', type: 'male' },
  { name: 'Charon', label: 'Charon (Male - Authoritative)', type: 'male' },
  { name: 'Leda', label: 'Leda (Female - Soft)', type: 'female' },
  { name: 'Zephyr', label: 'Zephyr (Male - Energetic)', type: 'male' },
];

const TONES = ['Professional', 'Cheerful', 'Urgent (Sale)', 'Luxury', 'Friendly', 'Whispering', 'Excited', 'Trustworthy & Warm'];
const LANGUAGES = [{ code: 'en', label: 'English' }, { code: 'mr', label: 'Marathi' }, { code: 'hi', label: 'Hindi' }];
const SPEEDS = [
  { label: 'Normal (1.0x)', instruction: 'at a normal, natural pace' },
  { label: 'Slow (0.8x)', instruction: 'at a slow, deliberate pace' },
  { label: 'Brisk (1.25x)', instruction: 'at a brisk, energetic pace' },
  { label: 'Fast (1.5x)', instruction: 'at a very fast, high-speed marketing pace' }
];

const App = () => {
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState({ videoCount: 0, tier: 'free' });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [modalReason, setModalReason] = useState("limit");
  const [step, setStep] = useState(0); 
  const [image, setImage] = useState(null);
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[1].name);
  const [selectedTone, setSelectedTone] = useState(TONES[7]);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [selectedSpeed, setSelectedSpeed] = useState(SPEEDS[0]);
  
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const apiKey = process.env.REACT_APP_GEMINI_API_KEY || ""; 

  // --- Auth logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setUser(u);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Usage Listener ---
  useEffect(() => {
    if (!user) return;
    const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
    const unsubscribe = onSnapshot(usageRef, (docSnap) => {
      if (docSnap.exists()) {
        setUsage(docSnap.data());
      } else {
        setDoc(usageRef, { videoCount: 0, tier: 'free' });
      }
    }, (err) => console.error("Firestore error:", err));
    return () => unsubscribe();
  }, [user]);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
    } catch (err) {
      setError("Note: Google Popup may be blocked in some previews. Use a local environment for full Google Auth testing.");
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;
    const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
    await updateDoc(usageRef, { tier: 'paid', videoCount: usage.videoCount });
    setShowAuthModal(false);
  };

  const pcmToWav = (pcmBuffer, sampleRate) => {
    const dataLength = pcmBuffer.byteLength;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(0, 'RIFF'); view.setUint32(4, 36 + dataLength, true); writeString(8, 'WAVE');
    writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeString(36, 'data'); view.setUint32(40, dataLength, true);
    new Uint8Array(buffer, 44).set(new Uint8Array(pcmBuffer));
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const callGemini = async (prompt, model, isAudio = false, imageData = null) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const parts = [{ text: prompt }];
    if (imageData) parts.push({ inlineData: { mimeType: "image/png", data: imageData.split(',')[1] } });
    
    const payload = {
      contents: [{ parts }],
      ...(isAudio && {
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } }
        }
      })
    };

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      const err = await response.json();
      return { error: true, status: response.status, message: err.error?.message };
    }
    return await response.json();
  };

  const generateAIScript = async (fromImageOnly = false) => {
    setIsGeneratingScript(true);
    setError(null);
    try {
      let prompt = `Write a high-converting marketing ad script in ${selectedLanguage.label}. Tone: ${selectedTone}. `;
      if (fromImageOnly) prompt += `Analyze this image and write 2 sentences of copy based on it.`;
      else prompt += `Refine these notes: "${text}".`;
      prompt += " Only output the script text.";
      
      const res = await callGemini(prompt, BRAIN_MODEL, false, fromImageOnly ? image : null);
      if (res.error) throw new Error(res.message);
      
      const aiScript = res.candidates?.[0]?.content?.parts?.[0]?.text || "";
      setText(aiScript.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim());
    } catch (err) {
      setError("Script generation failed.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const generateAudio = async () => {
    if (!text.trim()) { setError("Please provide a script."); return; }
    
    const maxVideos = usage.tier === 'paid' ? 10 : 3;
    if (usage.videoCount >= maxVideos) {
      setModalReason("limit");
      setShowAuthModal(true);
      return;
    }

    setIsGeneratingAudio(true);
    setAudioProgress(10);
    setError(null);
    setStatusMessage("AI Director: Planning delivery...");

    try {
      const res1 = await callGemini(`Refine this for commercial voiceover: "${text}". Language: ${selectedLanguage.label}. Speed: ${selectedSpeed.instruction}. Output ONLY plain text.`, BRAIN_MODEL);
      if (res1.error) throw new Error(res1.message);
      const refinedScript = res1.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();

      setAudioProgress(40);
      setStatusMessage("AI Voice: Synthesizing mastered audio...");

      const res2 = await callGemini(refinedScript, VOICE_MODEL, true);
      
      // Fallback logic for environments without 2.5 TTS access
      if (res2.status === 403 || res2.error) {
        const dummyWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
        const response = await fetch(dummyWav);
        const blob = await response.blob();
        setAudioUrl(URL.createObjectURL(blob));
        setAudioBlob(blob);
        setAudioProgress(100);
        setError("Note: Gemini 2.5 TTS Preview is currently restricted for public API Keys. Using test placeholder.");
        setTimeout(() => { setIsGeneratingAudio(false); setAudioProgress(0); setStatusMessage(""); }, 2000);
        return;
      }

      const inlineData = res2.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const sampleRate = parseInt(inlineData.mimeType.match(/sampleRate=(\d+)/)?.[1] || "24000");
      const binaryString = atob(inlineData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      const blob = pcmToWav(bytes.buffer, sampleRate);
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
      const duration = audioBuffer.duration;

      if (duration > 120) {
        throw new Error("Enterprise Limit: Scripts over 2 minutes require an Enterprise Plan. Contact us to proceed.");
      }
      if (duration > 30 && usage.tier === 'free') {
        setModalReason("duration");
        setShowAuthModal(true);
        setIsGeneratingAudio(false);
        return;
      }

      setAudioUrl(URL.createObjectURL(blob));
      setAudioBlob(blob);
      setAudioProgress(100);
      setTimeout(() => { setIsGeneratingAudio(false); setAudioProgress(0); setStatusMessage(""); }, 500);
    } catch (err) {
      setError(err.message);
      setIsGeneratingAudio(false);
      setAudioProgress(0);
    }
  };

  const createVideo = async () => {
    if (!image || !audioBlob || !user) return;
    setIsCreatingVideo(true);
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = image;
      await new Promise(resolve => img.onload = resolve);
      canvas.width = 1280; canvas.height = 720;
      const stream = canvas.captureStream(30);
      const audioStream = audioContext.createMediaStreamDestination();
      const audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer; audioSource.connect(audioStream);
      const combinedStream = new MediaStream([...stream.getVideoTracks(), ...audioStream.stream.getAudioTracks()]);
      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        setFinalVideoUrl(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })));
        const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
        await updateDoc(usageRef, { videoCount: increment(1) });
        setIsCreatingVideo(false); setStep(4);
      };
      mediaRecorder.start(); audioSource.start();
      const startTime = performance.now();
      const animate = (time) => {
        const elapsed = (time - startTime) / 1000;
        if (elapsed > audioBuffer.duration) { mediaRecorder.stop(); audioSource.stop(); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    } catch (err) { setError("Video rendering failed."); setIsCreatingVideo(false); }
  };

  const handleDownloadClick = (e) => {
    if (user && user.isAnonymous) {
      e.preventDefault();
      setModalReason("signup");
      setShowAuthModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8 selection:bg-indigo-500/30">
      {/* Auth & Limit Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-800 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl text-center space-y-6 border border-slate-700">
            <div className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-indigo-500/5">
              {modalReason === "signup" ? <ShieldCheck className="w-10 h-10" /> : <Lock className="w-10 h-10" />}
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">
                {modalReason === "signup" ? "Save & Download" : modalReason === "limit" ? "Limit Reached" : "Length Limit"}
              </h3>
              <p className="text-slate-400 text-sm">
                {modalReason === "limit" ? "You've used all credits. Upgrade for ₹50 to get 10 HD exports up to 2 minutes!" : 
                 modalReason === "duration" ? "Free videos are capped at 30s. Upgrade to ₹50 for 2-minute ads!" : 
                 "Sign in with Google to download your HD commercial and unlock your 3 free credits."}
              </p>
            </div>
            
            {user && user.isAnonymous && (
              <button onClick={signInWithGoogle} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95">
                <User className="w-5 h-5" /> Sign in with Google
              </button>
            )}

            {(!user || !user.isAnonymous) && modalReason !== "signup" && usage.tier === 'free' && (
              <button onClick={handleUpgrade} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95">
                <Zap className="w-5 h-5 fill-current" /> Buy 10 Credits (₹50)
              </button>
            )}
            
            <button onClick={() => setShowAuthModal(false)} className="text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-300">Close</button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-700">
        <div className="bg-indigo-600 p-10 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8">
            <div className="bg-black/20 backdrop-blur-xl px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest border border-white/10 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
              {usage.tier === 'paid' ? "PREMIUM TIER" : "FREE TIER"} | {usage.tier === 'paid' ? Math.max(0, 10 - usage.videoCount) : Math.max(0, 3 - usage.videoCount)} LEFT
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-3">
            <Video className="w-10 h-10" /> AdVocalize Pro <span className="text-xs bg-white/20 px-2 py-1 rounded ml-2 uppercase tracking-widest">Version 2</span>
          </h1>
          <div className="flex mt-12 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= i ? 'bg-white shadow-[0_0_15px_white]' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>

        <div className="p-10 text-center">
          {error && (
            <div className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 text-left">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                {error.includes("Enterprise") && (
                  <button className="text-[10px] bg-red-400 text-red-950 px-3 py-1 rounded-full font-black flex items-center gap-1 mt-2">
                    <Mail className="w-3 h-3" /> Contact Sales
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 0 && (
            <div className="py-16 space-y-12 animate-in zoom-in-95">
              <div className="space-y-5">
                <h2 className="text-6xl font-black tracking-tighter leading-tight text-white">Ad Creation Redefined.</h2>
                <p className="text-slate-400 text-xl max-w-xl mx-auto font-medium">Create high-impact video ads with AI. Starting at ₹0.</p>
              </div>
              <button onClick={() => document.getElementById('imageInput').click()} className="px-14 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 transition-all flex items-center gap-4 mx-auto group active:scale-95">
                <Upload className="w-6 h-6 group-hover:animate-bounce" /> Upload Visual
              </button>
              <input id="imageInput" type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => { setImage(event.target.result); setStep(1); };
                    reader.readAsDataURL(file);
                  }
              }} />
            </div>
          )}

          {step === 1 && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6">
               <h2 className="text-3xl font-black text-white tracking-tight">1. Creative Asset</h2>
               <img src={image} className="w-full max-w-2xl mx-auto h-auto rounded-[2.5rem] shadow-2xl border-4 border-white" alt="Preview" />
               <button onClick={() => setStep(2)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-2 mx-auto mt-6 active:scale-95 transition-all shadow-xl">Next: Configure Copy <ChevronRight className="w-5 h-5" /></button>
             </div>
          )}

          {step === 2 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                <div className="space-y-4 text-left">
                  <label className="font-black text-slate-400 tracking-wider text-xs uppercase">Marketing Copy</label>
                  <textarea className="w-full p-6 h-72 border-2 border-slate-700 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-lg font-medium shadow-sm bg-slate-900/50 text-white" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter script details..." />
                </div>
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6 text-left">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Language</label>
                      <select className="w-full p-4 border-2 border-slate-700 rounded-2xl bg-slate-900 text-white font-bold text-sm focus:border-indigo-500 outline-none shadow-sm" value={selectedLanguage.code} onChange={(e) => setSelectedLanguage(LANGUAGES.find(l => l.code === e.target.value))}>
                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Speech Pace</label>
                      <select className="w-full p-4 border-2 border-slate-700 rounded-2xl bg-slate-900 text-white font-bold text-sm focus:border-indigo-500 outline-none shadow-sm" value={selectedSpeed.label} onChange={(e) => setSelectedSpeed(SPEEDS.find(s => s.label === e.target.value))}>
                        {SPEEDS.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">AI Voice Talent</label>
                    <div className="max-h-56 overflow-y-auto border-2 border-slate-700 p-2 rounded-[1.5rem] bg-slate-900/30 custom-scrollbar shadow-inner text-left">
                      {VOICES.map((v) => (
                        <button key={v.name} onClick={() => setSelectedVoice(v.name)} className={`w-full p-4 text-left rounded-xl border-2 text-sm font-bold transition-all mb-2 flex items-center justify-between ${selectedVoice === v.name ? 'bg-indigo-600 border-indigo-400 text-white shadow-md ring-4 ring-indigo-50' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800'}`}>
                          {v.label}
                          {selectedVoice === v.name && <CheckCircle className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-6 pt-10 border-t-2 border-slate-700">
                {isGeneratingAudio && (
                  <div className="space-y-4 max-w-xl mx-auto w-full">
                    <div className="flex justify-between items-center text-[10px] font-black text-indigo-400 tracking-[0.2em] uppercase">
                      <span className="flex items-center gap-2 animate-pulse"><BrainCircuit className="w-4 h-4" /> {statusMessage}</span>
                      <span>{audioProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner border border-slate-700">
                      <div className="bg-gradient-to-r from-indigo-400 to-indigo-700 h-full transition-all duration-300" style={{ width: `${audioProgress}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center max-w-2xl mx-auto w-full">
                  <button onClick={() => setStep(1)} className="px-8 py-4 text-slate-500 font-black tracking-widest text-xs uppercase hover:text-slate-300 transition-all">Back</button>
                  <button disabled={!text.trim() || isGeneratingAudio} onClick={generateAudio} className={`px-12 py-5 text-white rounded-[2rem] font-black shadow-2xl transition-all active:scale-95 flex items-center gap-4 ${(!text.trim() || isGeneratingAudio) ? 'bg-slate-700 cursor-not-allowed text-slate-500 opacity-50 shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}>
                    {isGeneratingAudio ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                    {isGeneratingAudio ? "Producing..." : "Generate AI Voice"}
                  </button>
                </div>
              </div>
              {audioUrl && !isGeneratingAudio && (
                <div className="p-8 bg-indigo-600 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 border-4 border-indigo-400 shadow-xl animate-in zoom-in-95 max-w-3xl mx-auto text-left">
                  <div className="flex-1 w-full text-left">
                    <p className="text-white/60 font-black text-xs tracking-widest uppercase mb-4 px-2">produced audio preview</p>
                    <audio controls src={audioUrl} className="w-full brightness-110 contrast-125 rounded-full" />
                  </div>
                  <button onClick={() => setStep(3)} className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black whitespace-nowrap active:scale-95 shadow-lg hover:bg-slate-50 transition-all">Confirm & Mix</button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="py-12 space-y-12 animate-in fade-in duration-500">
              <img src={image} className="max-h-96 rounded-[3.5rem] shadow-2xl mx-auto border-8 border-slate-700 transition-transform hover:rotate-1" alt="Mixing" />
              <div className="max-w-md mx-auto space-y-8 text-center">
                <h2 className="text-4xl font-black tracking-tighter text-white">Final Production</h2>
                <div className="flex gap-4 justify-center">
                   <button onClick={() => setStep(2)} className="px-8 py-4 border-2 border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-700 transition-all">Back</button>
                   <button disabled={isCreatingVideo} onClick={createVideo} className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl flex items-center gap-3 mx-auto hover:bg-indigo-700 transition-all active:scale-95 shadow-indigo-100">
                    {isCreatingVideo ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Video className="w-6 h-6" />}
                    {isCreatingVideo ? "Rendering HD..." : "Export Commercial"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-12 animate-in zoom-in-95 py-12">
              <div className="space-y-4">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl ring-8 ring-green-50">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <h2 className="text-5xl font-black tracking-tighter text-white">Production Complete!</h2>
              </div>
              <div className="bg-black p-8 rounded-[4rem] max-w-2xl mx-auto shadow-2xl border-[12px] border-slate-800 ring-4 ring-indigo-500/10">
                {finalVideoUrl && (
                  <video controls autoPlay className="w-full rounded-[2.5rem]" src={finalVideoUrl} controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} />
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-6 justify-center px-6 max-w-2xl mx-auto">
                <button onClick={() => {setImage(null); setStep(0); setText(""); setAudioUrl(null); setFinalVideoUrl(null);}} className="px-10 py-5 border-2 border-slate-700 rounded-[2rem] font-black uppercase text-xs hover:bg-slate-100 flex-1 transition-all text-slate-400 tracking-widest">New Project</button>
                <button onClick={handleDownloadClick} className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 flex-1 transition-all hover:bg-indigo-700 shadow-indigo-100">
                  <Download className="w-7 h-7" /> Download HD Video
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};

export default App;