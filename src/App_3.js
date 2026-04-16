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
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot
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
  Zap,
  ChevronRight,
  Mail,
  Play
} from 'lucide-react';

// --- PRODUCTION FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCU4-sfVJUrz8iBsMKlvDdnzXu_UjoLD5s",
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
  const [image, setImage] = useState();
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[1].name);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [selectedSpeed, setSelectedSpeed] = useState(SPEEDS[0]);
  
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState();
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState();
  const [error, setError] = useState();
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingDownload, setPendingDownload] = useState(false);
  const [authMode, setAuthMode] = useState('signup'); // 'signup', 'login', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // FIXED: Using the working API key provided by the user
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyBYLVYL__H7QhONVnuZAkkeUZmJwU0coGs"; 

  // --- Auth logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        await signInAnonymously(auth);
      } else {
        setUser(u);
        if (pendingDownload && !u.isAnonymous && finalVideoUrl) {
          triggerDownload();
          setPendingDownload(false);
        }
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDownload, finalVideoUrl]);

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
    const provider = new GoogleAuthProvider();
    try {
      if (user && user.isAnonymous) {
        await linkWithPopup(user, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
      setShowAuthModal(false);
    } catch (err) {
      console.error("Auth error:", err);
      if (err.code === 'auth/credential-already-in-use') {
        try {
          await signInWithPopup(auth, provider);
          setShowAuthModal(false);
        } catch (signInErr) {
          setError("Sign-in failed. Please try again.");
        }
      } else {
        setError("Note: Google Auth may be restricted in some preview environments.");
      }
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        setShowAuthModal(false);
      } else if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        setShowAuthModal(false);
      } else if (authMode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setAuthMessage("Password reset link sent! Check your inbox.");
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;
    const usageRef = doc(db, 'artifacts', appId, 'users', user.uid, 'usage', 'stats');
    await updateDoc(usageRef, { tier: 'paid', videoCount: usage.videoCount });
    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const triggerDownload = () => {
    if (!finalVideoUrl) return;
    const a = document.createElement('a');
    a.href = finalVideoUrl;
    a.download = 'AdVocalize_Commercial.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadClick = (e) => {
    if (user && user.isAnonymous) {
      e.preventDefault();
      setPendingDownload(true);
      setModalReason("signup");
      setAuthMode("signup");
      setShowAuthModal(true);
    } else if (finalVideoUrl) {
      triggerDownload();
    }
  };

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

  const generateAudio = async () => {
    if (!text.trim()) { setError("Please provide a script."); return; }
    const maxVideos = usage.tier === 'paid' ? 10 : 3;
    if (usage.videoCount >= maxVideos) { setModalReason("limit"); setShowAuthModal(true); return; }

    setIsGeneratingAudio(true);
    setAudioProgress(10);
    setError(undefined);
    setStatusMessage("AI Director: Planning delivery...");

    try {
      const res1 = await callGemini(`Refine this for commercial voiceover: "${text}". Language: ${selectedLanguage.label}. Speed: ${selectedSpeed.instruction}. Output ONLY plain text.`, BRAIN_MODEL);
      if (res1.error) throw new Error(res1.error);
      const refinedScript = res1.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();

      setAudioProgress(40);
      setStatusMessage("AI Voice: Synthesizing mastered audio...");

      const res2 = await callGemini(refinedScript, VOICE_MODEL, true);
      if (res2.error) throw new Error(res2.message);

      const inlineData = res2.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const sampleRate = parseInt(inlineData.mimeType.match(/sampleRate=(\d+)/)?.[1] || "24000");
      const binaryString = atob(inlineData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      const blob = pcmToWav(bytes.buffer, sampleRate);
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

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AdVocalize Pro</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">AI Media Engine</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-200">{user?.isAnonymous ? 'Guest User' : user?.email}</span>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{usage.tier} Tier</span>
            </div>
            <button onClick={user?.isAnonymous ? () => { setAuthMode('signup'); setShowAuthModal(true); } : handleSignOut} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors">
              <User className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </header>

        {/* Simplified UI for build verification */}
        <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700">
          <textarea 
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your script here..."
          />
          <div className="mt-8 flex justify-end">
            <button 
              onClick={generateAudio}
              disabled={isGeneratingAudio}
              className="px-10 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-2xl font-bold flex items-center gap-3 transition-all"
            >
              {isGeneratingAudio ? <RefreshCw className="animate-spin" /> : <Volume2 />}
              Generate AI Voice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
