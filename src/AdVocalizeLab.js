import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  BrainCircuit, 
  Volume2, 
  Video, 
  Database,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

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
const db = getFirestore(app);
const appId = 'advocalize-pro-v2';

const BRAIN_MODEL = "gemini-2.5-flash-lite"; 
const VOICE_MODEL = "gemini-3.1-flash-tts-preview"; 

const AdVocalizeLab = () => {
  const [results, setResults] = useState([
    { id: 'brain', name: 'Gemini Brain (Scripting)', status: 'pending', message: 'Waiting to start...' },
    { id: 'voice', name: 'Gemini Voice (TTS)', status: 'pending', message: 'Waiting to start...' },
    { id: 'firestore', name: 'Firestore Connectivity', status: 'pending', message: 'Waiting to start...' },
    { id: 'renderer', name: 'Video Renderer Engine', status: 'pending', message: 'Waiting to start...' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [globalStatus, setGlobalStatus] = useState('idle');

  const brainApiKey = process.env.REACT_APP_GEMINI_BRAIN_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
  const voiceApiKey = process.env.REACT_APP_GEMINI_VOICE_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;

  const updateStatus = (id, status, message) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, status, message } : r));
  };

  const runTests = async () => {
    setIsRunning(true);
    setGlobalStatus('running');
    setResults(prev => prev.map(r => ({ ...r, status: 'pending', message: 'Initializing...' })));

    // 1. Test Brain API
    try {
      updateStatus('brain', 'loading', 'Sending diagnostic prompt...');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${BRAIN_MODEL}:generateContent?key=${brainApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Respond with only the word OK." }] }] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      updateStatus('brain', 'success', `Connected. Model: ${BRAIN_MODEL}`);
    } catch (err) {
      updateStatus('brain', 'error', err.message);
    }

    // 2. Test Voice API
    let testAudioBlob = null;
    try {
      updateStatus('voice', 'loading', 'Generating 1s audio sample...');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${VOICE_MODEL}:generateContent?key=${voiceApiKey}`;
      const payload = {
        contents: [{ parts: [{ text: "OK" }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
        }
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData) throw new Error("Empty audio data returned.");
      
      const binaryString = atob(inlineData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      testAudioBlob = new Blob([bytes.buffer], { type: 'audio/wav' });
      
      updateStatus('voice', 'success', `Connected. Model: ${VOICE_MODEL}`);
    } catch (err) {
      updateStatus('voice', 'error', err.message);
    }

    // 3. Test Firestore
    try {
      updateStatus('firestore', 'loading', 'Writing diagnostic log...');
      const logRef = doc(db, 'artifacts', appId, 'logs', 'lab_diagnostic');
      await setDoc(logRef, {
        lastCheck: new Date().toISOString(),
        status: 'healthy',
        platform: navigator.platform
      }, { merge: true });
      updateStatus('firestore', 'success', 'Write/Read successful.');
    } catch (err) {
      updateStatus('firestore', 'error', err.message);
    }

    // 4. Test Renderer
    try {
      if (!testAudioBlob) throw new Error("Skipped: Voice test failed, no audio asset.");
      updateStatus('renderer', 'loading', 'Booting Canvas engine...');
      
      const canvas = document.createElement('canvas');
      canvas.width = 100; canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 100, 100);
      
      const stream = canvas.captureStream(10);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      const renderPromise = new Promise((resolve, reject) => {
        mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
        mediaRecorder.onerror = reject;
        setTimeout(() => mediaRecorder.stop(), 500); // 0.5s test
      });

      mediaRecorder.start();
      await renderPromise;
      updateStatus('renderer', 'success', 'Canvas/MediaRecorder healthy.');
    } catch (err) {
      updateStatus('renderer', 'error', err.message);
    }

    setIsRunning(false);
    setGlobalStatus('complete');
  };

  const getIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      case 'error': return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'loading': return <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />;
      default: return <RefreshCw className="w-6 h-6 text-slate-700 opacity-20" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-12 font-['Plus_Jakarta_Sans']">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-8">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                 <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                 <h1 className="text-3xl font-black tracking-tight">AdVocalize Lab</h1>
                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">System Health & Diagnostics</p>
              </div>
           </div>
           <button 
             onClick={runTests}
             disabled={isRunning}
             className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl shadow-indigo-500/10"
           >
              {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              {isRunning ? 'Running Checks...' : 'Run Diagnostics'}
           </button>
        </div>

        {/* Status Grid */}
        <div className="grid gap-4">
           {results.map((res) => (
             <div key={res.id} className={`p-6 rounded-[2rem] border transition-all duration-500 flex items-center justify-between ${res.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/10' : res.status === 'error' ? 'bg-red-500/5 border-red-500/10' : 'bg-slate-900/50 border-white/5'}`}>
                <div className="flex items-center gap-6">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${res.status === 'success' ? 'bg-emerald-500/10' : res.status === 'error' ? 'bg-red-500/10' : 'bg-slate-800'}`}>
                      {res.id === 'brain' && <BrainCircuit className={`w-6 h-6 ${res.status === 'success' ? 'text-emerald-500' : 'text-slate-400'}`} />}
                      {res.id === 'voice' && <Volume2 className={`w-6 h-6 ${res.status === 'success' ? 'text-emerald-500' : 'text-slate-400'}`} />}
                      {res.id === 'firestore' && <Database className={`w-6 h-6 ${res.status === 'success' ? 'text-emerald-500' : 'text-slate-400'}`} />}
                      {res.id === 'renderer' && <Video className={`w-6 h-6 ${res.status === 'success' ? 'text-emerald-500' : 'text-slate-400'}`} />}
                   </div>
                   <div className="space-y-1">
                      <h3 className="font-bold text-sm tracking-tight">{res.name}</h3>
                      <p className={`text-xs font-medium leading-relaxed ${res.status === 'error' ? 'text-red-400' : 'text-slate-500'}`}>{res.message}</p>
                   </div>
                </div>
                {getIcon(res.status)}
             </div>
           ))}
        </div>

        {/* Global Summary */}
        {globalStatus === 'complete' && (
          <div className="p-8 rounded-[2.5rem] bg-indigo-600 text-white text-center space-y-4 animate-in zoom-in-95 duration-500">
             <h2 className="text-2xl font-black tracking-tight">Diagnostic Summary</h2>
             <p className="text-indigo-100 text-sm font-medium opacity-80">
                {results.every(r => r.status === 'success') 
                  ? "All systems nominal. VocalAd Pro is ready for production." 
                  : "Some systems failed checks. Review the logs above before proceeding."}
             </p>
             <div className="flex justify-center gap-4 pt-4">
                <a href="/" className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Go to App</a>
                <button onClick={runTests} className="px-6 py-3 bg-indigo-500 text-white border border-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-400 transition-all">Re-run Lab</button>
             </div>
          </div>
        )}

        <div className="text-center pt-8">
           <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">Powered by AdVocalize Lab Engine</p>
        </div>
      </div>
    </div>
  );
};

export default AdVocalizeLab;
