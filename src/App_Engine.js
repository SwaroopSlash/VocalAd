import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  RefreshCw,
  Volume2,
  Video,
  AlertCircle,
  BrainCircuit,
  ChevronRight,
  Upload,
  Download,
  Smartphone,
  Square,
  Monitor,
  Music
} from 'lucide-react';

const BRAIN_MODEL = "gemini-1.5-flash-latest"; 
const VOICE_MODEL = "gemini-3.1-flash-tts-preview"; 

const RATIOS = [
  { id: 'story', label: 'WhatsApp/Story', icon: Smartphone, width: 720, height: 1280, ratio: 9/16 },
  { id: 'square', label: 'Instagram Post', icon: Square, width: 1080, height: 1080, ratio: 1/1 },
  { id: 'cinema', label: 'Laptop/TV', icon: Monitor, width: 1280, height: 720, ratio: 16/9 },
];

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
  const [step, setStep] = useState(0); 
  const [image, setImage] = useState(null);
  const [selectedRatio, setSelectedRatio] = useState(RATIOS[2]);
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[1].name);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [selectedSpeed, setSelectedSpeed] = useState(SPEEDS[0]);
  
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const apiKey = process.env.REACT_APP_GEMINI_API_KEY; 

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
    if (!response.ok) {
        const err = await response.json();
        return { error: true, message: err.error?.message };
    }
    return await response.json();
  };

  const generateAudio = async () => {
    if (!text.trim()) return;
    setIsGeneratingAudio(true);
    setAudioProgress(20);
    setStatusMessage("Refining Script...");
    try {
      const res1 = await callGemini(`Refine this for commercial voiceover: "${text}". Language: ${selectedLanguage.label}. Speed: ${selectedSpeed.instruction}. Output ONLY plain text.`, BRAIN_MODEL);
      const refinedScript = res1.error ? text : res1.candidates?.[0]?.content?.parts?.[0]?.text;
      
      setAudioProgress(60);
      setStatusMessage("Synthesizing Voice...");
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
      setTimeout(() => { setIsGeneratingAudio(false); setAudioProgress(0); }, 500);
    } catch (err) {
      setError(err.message);
      setIsGeneratingAudio(false);
    }
  };

  const createVideo = async () => {
    if (!image || !audioBlob) return;
    setIsCreatingVideo(true);
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.src = image;
      await new Promise(resolve => img.onload = resolve);

      // Set canvas to selected aspect ratio
      canvas.width = selectedRatio.width;
      canvas.height = selectedRatio.height;

      const stream = canvas.captureStream(30);
      const audioStream = audioContext.createMediaStreamDestination();
      const audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer; audioSource.connect(audioStream);
      
      const combinedStream = new MediaStream([...stream.getVideoTracks(), ...audioStream.stream.getAudioTracks()]);
      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        setFinalVideoUrl(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })));
        setIsCreatingVideo(false);
        setStep(4);
      };

      mediaRecorder.start(); audioSource.start();
      const startTime = performance.now();
      
      const animate = (time) => {
        const elapsed = (time - startTime) / 1000;
        if (elapsed > audioBuffer.duration) { mediaRecorder.stop(); audioSource.stop(); return; }

        // Smart Scaling Logic (Cover Fill)
        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

        if (imgRatio > canvasRatio) {
          drawHeight = canvas.height;
          drawWidth = img.width * (canvas.height / img.height);
          offsetX = (canvas.width - drawWidth) / 2;
        } else {
          drawWidth = canvas.width;
          drawHeight = img.height * (canvas.width / img.width);
          offsetY = (canvas.height - drawHeight) / 2;
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        // Subtle overlay
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    } catch (err) {
      setError("Rendering failed.");
      setIsCreatingVideo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-8">
      <div className="max-w-4xl mx-auto bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-700">
        <div className="bg-indigo-600 p-8 flex justify-between items-center text-white">
          <h1 className="text-2xl font-black flex items-center gap-2"><Video /> ENGINE V1 <span className="text-[10px] bg-white/20 px-2 py-1 rounded">LAB MODE</span></h1>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map(i => <div key={i} className={`w-3 h-3 rounded-full ${step >= i ? 'bg-white' : 'bg-white/20'}`} />)}
          </div>
        </div>

        <div className="p-10">
          {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold">{error}</div>}

          {step === 0 && (
            <div className="py-20 text-center space-y-8">
              <h2 className="text-5xl font-black tracking-tight">Core Engine Lab</h2>
              <p className="text-slate-400">Testing Aspect Ratios & Canvas Mixing</p>
              <button onClick={() => document.getElementById('engineInput').click()} className="px-10 py-5 bg-indigo-600 rounded-[2rem] font-black text-lg shadow-xl hover:scale-105 transition-all">Upload Test Visual</button>
              <input id="engineInput" type="file" className="hidden" onChange={(e) => {
                const reader = new FileReader();
                reader.onload = (ev) => { setImage(ev.target.result); setStep(1); };
                reader.readAsDataURL(e.target.files[0]);
              }} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 animate-in fade-in">
              <h2 className="text-2xl font-black">1. Select Output Style</h2>
              <div className="grid grid-cols-3 gap-4">
                {RATIOS.map(r => (
                  <button key={r.id} onClick={() => setSelectedRatio(r)} className={`p-6 rounded-3xl border-4 transition-all flex flex-col items-center gap-4 ${selectedRatio.id === r.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'}`}>
                    <r.icon className="w-8 h-8" />
                    <span className="text-xs font-black uppercase tracking-widest">{r.label}</span>
                  </button>
                ))}
              </div>
              <div className={`relative mx-auto bg-black rounded-3xl overflow-hidden shadow-2xl transition-all duration-500`} style={{ width: '300px', aspectRatio: selectedRatio.ratio }}>
                <img src={image} className="w-full h-full object-cover opacity-80" alt="Preview" />
                <div className="absolute inset-0 flex items-center justify-center border-2 border-indigo-500/50">
                   <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-1 rounded uppercase">{selectedRatio.width} x {selectedRatio.height}</span>
                </div>
              </div>
              <button onClick={() => setStep(2)} className="w-full py-5 bg-slate-100 text-slate-900 rounded-[2rem] font-black flex items-center justify-center gap-2 active:scale-95 transition-all">Continue to Voice <ChevronRight /></button>
            </div>
          )}

          {step === 2 && (
             <div className="space-y-8">
                <textarea className="w-full p-8 h-48 bg-slate-900 border-2 border-slate-700 rounded-[2.5rem] focus:border-indigo-500 outline-none text-xl font-medium" value={text} onChange={(e) => setText(e.target.value)} placeholder="Marketing script..." />
                <div className="flex justify-between items-center">
                   <button onClick={() => setStep(1)} className="text-slate-500 font-black text-xs uppercase">Back</button>
                   <button disabled={isGeneratingAudio} onClick={generateAudio} className="px-10 py-4 bg-indigo-600 rounded-full font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                     {isGeneratingAudio ? <RefreshCw className="animate-spin" /> : <Volume2 />}
                     {isGeneratingAudio ? "Producing AI Voice..." : "Generate Voice"}
                   </button>
                </div>
                {audioUrl && (
                  <div className="p-6 bg-indigo-600 rounded-[2rem] flex items-center justify-between gap-6 animate-in zoom-in-95">
                    <audio src={audioUrl} controls className="flex-1 h-10 brightness-110" />
                    <button onClick={() => setStep(3)} className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-black shadow-lg">Next</button>
                  </div>
                )}
             </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-8">
               <div className="relative mx-auto bg-black rounded-3xl overflow-hidden shadow-2xl" style={{ width: '200px', aspectRatio: selectedRatio.ratio }}>
                 <img src={image} className="w-full h-full object-cover opacity-50" alt="Preview" />
                 <div className="absolute inset-0 flex items-center justify-center"><RefreshCw className="w-10 h-10 text-white animate-spin opacity-20" /></div>
               </div>
               <h2 className="text-3xl font-black">Mixing Final Asset</h2>
               <p className="text-slate-500">Blending {selectedRatio.label} visual with AI Voice...</p>
               <button disabled={isCreatingVideo} onClick={createVideo} className="px-14 py-6 bg-indigo-600 rounded-[2rem] font-black text-xl shadow-2xl flex items-center gap-3 mx-auto active:scale-95 transition-all">
                 {isCreatingVideo ? <RefreshCw className="animate-spin" /> : <Video />}
                 {isCreatingVideo ? "Rendering..." : "Export Commercial"}
               </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-500/5"><CheckCircle className="w-10 h-10" /></div>
              <h2 className="text-4xl font-black">Core Engine Success</h2>
              <div className="bg-black p-4 rounded-[3rem] shadow-2xl border-4 border-slate-700 max-w-sm mx-auto" style={{ aspectRatio: selectedRatio.ratio }}>
                 <video src={finalVideoUrl} controls autoPlay className="w-full h-full rounded-[2.5rem]" />
              </div>
              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                 <button onClick={() => {
                   const a = document.createElement('a');
                   a.href = finalVideoUrl;
                   a.download = `AdVocalize_${selectedRatio.id}.webm`;
                   a.click();
                 }} className="w-full py-5 bg-indigo-600 rounded-2xl font-black flex items-center justify-center gap-3"><Download /> Download Video</button>
                 
                 <button onClick={() => {
                    const a = document.createElement('a');
                    a.href = audioUrl;
                    a.download = `AdVocalize_Master.wav`;
                    a.click();
                 }} className="w-full py-5 border-2 border-slate-700 rounded-2xl font-black flex items-center justify-center gap-3 text-slate-400 hover:bg-slate-700 transition-all"><Music className="w-5 h-5" /> Download Audio Only</button>

                 <button onClick={() => setStep(0)} className="py-4 text-slate-500 font-black text-xs uppercase mt-4">New Engine Test</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
