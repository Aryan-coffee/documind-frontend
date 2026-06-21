"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  confidence?: number;
  image_url?: string;
  type?: "chat"|"image"|"quiz"|"summary"|"resume"|"alerts";
  quiz?: any;
  summary?: any;
  resume?: any;
  alerts?: any;
  time?: string;
}

const TABS = [
  {id:"chat",icon:"💬",label:"Chat"},
  {id:"image",icon:"🎨",label:"Image"},
  {id:"quiz",icon:"📝",label:"Quiz"},
  {id:"compare",icon:"🔀",label:"Compare"},
  {id:"web",icon:"🌐",label:"Web"},
  {id:"youtube",icon:"📺",label:"YouTube"},
  {id:"resume",icon:"💼",label:"Resume"},
  {id:"data",icon:"📊",label:"Data"},
  {id:"alerts",icon:"🔔",label:"Alerts"},
];

const MODES = [
  {id:"normal",icon:"🤖",label:"Normal"},
  {id:"student",icon:"🎓",label:"Student"},
  {id:"professor",icon:"👨‍🏫",label:"Professor"},
  {id:"summary",icon:"📋",label:"Summary"},
];

const LANGUAGES = ["English","Hindi","Spanish","French","German","Arabic","Japanese","Portuguese","Russian","Chinese"];
const IMG_STYLES = ["realistic","anime","cartoon","painting","3d"];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documents, setDocuments] = useState<string[]>([]);
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("documind_session");
      if (saved) return saved;
      const newId = "s_" + Date.now();
      localStorage.setItem("documind_session", newId);
      return newId;
    }
    return "s_" + Date.now();
  });
  const [dragOver, setDragOver] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState("normal");
  const [language, setLanguage] = useState("English");
  const [activeTab, setActiveTab] = useState("chat");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState("realistic");
  const [quizCount, setQuizCount] = useState(5);
  const [compareQ, setCompareQ] = useState("");
  const [doc1, setDoc1] = useState("");
  const [doc2, setDoc2] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [webQ, setWebQ] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [ytQ, setYtQ] = useState("");
  const [alertDoc, setAlertDoc] = useState("");
  const [dataJson, setDataJson] = useState("");
  const [dataQ, setDataQ] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<{[k:number]:string}>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [copied, setCopied] = useState<string|null>(null);
  const [listening, setListening] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { fetchDocuments(); loadHistory(); }, []);
  
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto focus input when switching to chat tab
  useEffect(() => {
    if (activeTab === "chat" && taRef.current && !isMobile) {
      setTimeout(() => taRef.current?.focus(), 100);
    }
  }, [activeTab]);

  const fetchDocuments = async () => {
    try { const r = await axios.get(`${API}/documents`); setDocuments(r.data.documents || []); } catch {}
  };

  const loadHistory = async () => {
    try {
      const r = await axios.get(`${API}/history/${sessionId}`);
      if (r.data.history && r.data.history.length > 0) {
        const msgs = r.data.history.slice(-30).map((h: any) => ({
          id: Math.random().toString(),
          role: h.role === "Human" ? "user" : "assistant",
          content: h.content || "",
          sources: [],
          time: h.timestamp ? new Date(h.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : ""
        })).filter((m: any) => m.content.length > 0);
        setMessages(msgs);
      }
    } catch(e) { console.log("History error:", e); }
  };



  const now = () => new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  
  const addMsg = (msg: Partial<Message>) => {
    setMessages(p => [...p, {id:Math.random().toString(), time:now(), ...msg} as Message]);
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice input"); return; }
    const r = new SR();
    r.lang = "en-US"; r.continuous = false; r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
      setListening(false);
      setTimeout(() => taRef.current?.focus(), 100);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g,"").substring(0,500));
    u.rate = 1; window.speechSynthesis.speak(u);
  };

  const uploadPDF = useCallback(async (file: File) => {
    if (!file.name.match(/\.(pdf|csv|xlsx)$/i)) { alert("PDF, CSV or Excel only!"); return; }
    setUploading(true); setUploadProgress(0);
    const iv = setInterval(() => setUploadProgress(p => Math.min(p+3,88)), 150);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("session_id", sessionId);
    try {
      const r = await axios.post(`${API}/upload`, fd);
      clearInterval(iv); setUploadProgress(100);
      if (file.name.endsWith(".pdf")) {
        await fetchDocuments();
        try {
          const sum = await axios.get(`${API}/summary/${encodeURIComponent(file.name)}`);
          if (!sum.data.error) addMsg({role:"assistant", type:"summary", content:"", summary:sum.data});
          else addMsg({role:"assistant", content:`✅ **${file.name}** loaded! Ask me anything.`});
        } catch { addMsg({role:"assistant", content:`✅ **${file.name}** loaded!`}); }
      } else {
        setDataJson(r.data.data_json || "");
        addMsg({role:"assistant", content:`✅ **${file.name}** loaded! Go to 📊 Data tab.`});
      }
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setSidebarOpen(false);
        setActiveTab("chat");
        setTimeout(() => taRef.current?.focus(), 200);
      }, 600);
    } catch {
      clearInterval(iv);
      setUploading(false);
      setUploadProgress(0);
      alert("Upload failed");
    }
  }, [sessionId]);

  const sendMessage = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading || documents.length===0) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    addMsg({role:"user", content:q});
    setLoading(true);
    try {
      const r = await axios.post(`${API}/chat`, {question:q, session_id:sessionId, mode, language});
      addMsg({role:"assistant", content:r.data.error||r.data.answer, sources:r.data.sources, confidence:r.data.confidence});
    } catch { addMsg({role:"assistant", content:"⚠️ Connection error."}); }
    setLoading(false);
    setTimeout(() => taRef.current?.focus(), 100);
  };

  const generateImage = async () => {
    if (!imagePrompt.trim() || loading) return;
    const prompt = imagePrompt;
    setImagePrompt("");
    setActiveTab("chat");
    addMsg({role:"user", content:`🎨 Generate: ${prompt} [${imageStyle}]`});
    setLoading(true);
    try {
      const r = await axios.post(`${API}/generate-image`, {prompt, session_id:sessionId, style:imageStyle});
      if (r.data.image_url) addMsg({role:"assistant", type:"image", content:prompt, image_url:r.data.image_url});
      else addMsg({role:"assistant", content:"Image generation failed. Try again."});
    } catch { addMsg({role:"assistant", content:"Image generation failed."}); }
    setLoading(false);
  };

  const generateQuiz = async () => {
    if (documents.length===0 || loading) return;
    setActiveTab("chat");
    addMsg({role:"user", content:`📝 Generate ${quizCount} question quiz`});
    setLoading(true);
    try {
      const r = await axios.post(`${API}/quiz`, {num_questions:quizCount});
      if (r.data.questions) {
        setQuizAnswers({}); setQuizSubmitted(false);
        addMsg({role:"assistant", type:"quiz", content:"", quiz:r.data});
      } else addMsg({role:"assistant", content:"Quiz generation failed."});
    } catch { addMsg({role:"assistant", content:"Quiz failed."}); }
    setLoading(false);
  };

  const compareDocuments = async () => {
    if (!compareQ||!doc1||!doc2||loading) return;
    setActiveTab("chat");
    addMsg({role:"user", content:`🔀 Compare: ${compareQ}`});
    setLoading(true);
    try {
      const r = await axios.post(`${API}/compare`, {question:compareQ, doc1, doc2, session_id:sessionId});
      addMsg({role:"assistant", content:r.data.answer||r.data.error, sources:r.data.sources, confidence:r.data.confidence});
    } catch { addMsg({role:"assistant", content:"Compare failed."}); }
    setLoading(false);
  };

  const chatWithWebsite = async () => {
    if (!webUrl||!webQ||loading) return;
    setActiveTab("chat");
    addMsg({role:"user", content:`🌐 ${webUrl}\n${webQ}`});
    setLoading(true);
    try {
      const r = await axios.post(`${API}/website-chat`, {url:webUrl, question:webQ, session_id:sessionId});
      addMsg({role:"assistant", content:r.data.answer||r.data.error});
    } catch { addMsg({role:"assistant", content:"Website chat failed."}); }
    setLoading(false);
  };

  const chatWithYoutube = async () => {
    if (!ytUrl||!ytQ||loading) return;
    setActiveTab("chat");
    addMsg({role:"user", content:`📺 ${ytUrl}\n${ytQ}`});
    setLoading(true);
    try {
      const r = await axios.post(`${API}/youtube-chat`, {video_url:ytUrl, question:ytQ, session_id:sessionId});
      addMsg({role:"assistant", content:r.data.answer||r.data.error});
    } catch { addMsg({role:"assistant", content:"YouTube chat failed."}); }
    setLoading(false);
  };

  const analyzeResume = async (file: File) => {
    setActiveTab("chat");
    addMsg({role:"user", content:`💼 Analyzing: ${file.name}`});
    setLoading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await axios.post(`${API}/analyze-resume`, fd);
      if (r.data.error) addMsg({role:"assistant", content:r.data.error});
      else addMsg({role:"assistant", type:"resume", content:"", resume:r.data});
    } catch { addMsg({role:"assistant", content:"Resume analysis failed."}); }
    setLoading(false);
  };

  const analyzeData = async () => {
    if (!dataQ||!dataJson||loading) return;
    setActiveTab("chat");
    addMsg({role:"user", content:`📊 ${dataQ}`});
    setLoading(true);
    try {
      const r = await axios.post(`${API}/analyze-data-json`, {question:dataQ, data_json:dataJson});
      addMsg({role:"assistant", content:r.data.answer||r.data.error});
    } catch { addMsg({role:"assistant", content:"Data analysis failed."}); }
    setLoading(false);
  };

  const getAlerts = async () => {
    if (!alertDoc||loading) return;
    setActiveTab("chat");
    addMsg({role:"user", content:`🔔 Alerts from: ${alertDoc}`});
    setLoading(true);
    try {
      const r = await axios.post(`${API}/smart-alerts`, {filename:alertDoc});
      if (r.data.error) addMsg({role:"assistant", content:r.data.error});
      else addMsg({role:"assistant", type:"alerts", content:"", alerts:r.data});
    } catch { addMsg({role:"assistant", content:"Alert extraction failed."}); }
    setLoading(false);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(()=>setCopied(null),2000);
  };

  const exportChat = () => {
    const text = messages.map(m=>`[${m.time}] ${m.role==="user"?"You":"AI"}:\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text],{type:"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="chat.txt"; a.click();
  };

  const clearHistory = async () => {
    try { await axios.delete(`${API}/history/${sessionId}`); setMessages([]); } catch {}
  };

  const calcScore = (quiz: any) =>
    quiz?.questions?.filter((q:any,i:number)=>quizAnswers[i]===q.correct).length||0;

  const fmt = (s: string) => s
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.*?)\*/g,"<em>$1</em>")
    .replace(/`([^`]+)`/g,"<code style='background:rgba(99,102,241,0.25);padding:1px 5px;border-radius:4px;font-size:11px;font-family:monospace'>$1</code>")
    .replace(/\n/g,"<br/>");

  const badge = (color: string, text: string) => (
    <span key={text} style={{fontSize:9,padding:"2px 7px",background:`${color}22`,border:`1px solid ${color}44`,borderRadius:99,color,marginRight:3,display:"inline-block",marginBottom:3}}>{text}</span>
  );

  const C = {
    card: {background:"rgba(11,11,22,0.94)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:14,padding:"14px"},
    inp: {width:"100%",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box" as const,marginBottom:8},
    btn: (on=true) => ({padding:"12px",background:on?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.12)",border:"none",borderRadius:12,color:on?"#fff":"#4b5563",fontSize:13,fontWeight:600 as const,cursor:on?"pointer" as const:"not-allowed" as const,width:"100%",transition:"all 0.2s",marginTop:4}),
  };

  // Feature panel content - shown above chat input when not on chat tab
  const renderFeaturePanel = () => {
    if (activeTab === "chat") return null;

    return (
      <div style={{borderTop:"1px solid rgba(99,102,241,0.15)",background:"rgba(7,7,15,0.98)",backdropFilter:"blur(20px)",padding:"12px 14px",zIndex:25,position:"relative"}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>

          {activeTab==="image"&&(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:8}}>🎨 AI Image Generator</div>
              <textarea value={imagePrompt} onChange={e=>setImagePrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();generateImage();}}} placeholder="Describe image... (Enter to generate)" rows={2} style={{...C.inp,resize:"none"}}/>
              <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
                {IMG_STYLES.map(s=>(
                  <button key={s} onClick={()=>setImageStyle(s)} style={{padding:"4px 10px",background:imageStyle===s?"rgba(99,102,241,0.25)":"rgba(99,102,241,0.06)",border:`1px solid ${imageStyle===s?"rgba(99,102,241,0.4)":"rgba(99,102,241,0.12)"}`,borderRadius:8,cursor:"pointer",color:imageStyle===s?"#a5b4fc":"#4b5563",fontSize:11,fontWeight:imageStyle===s?700:400,textTransform:"capitalize"}}>{s}</button>
                ))}
              </div>
              <button onClick={generateImage} disabled={loading||!imagePrompt.trim()} style={C.btn(!loading&&!!imagePrompt.trim())}>{loading?"⏳ Generating...":"🎨 Generate Image"}</button>
            </div>
          )}

          {activeTab==="quiz"&&(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:8}}>📝 Quiz Generator</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"#6b7280"}}>Questions:</span>
                {[3,5,10,15].map(n=>(
                  <button key={n} onClick={()=>setQuizCount(n)} style={{padding:"5px 11px",background:quizCount===n?"rgba(99,102,241,0.25)":"rgba(99,102,241,0.06)",border:`1px solid ${quizCount===n?"rgba(99,102,241,0.4)":"rgba(99,102,241,0.12)"}`,borderRadius:8,cursor:"pointer",color:quizCount===n?"#a5b4fc":"#4b5563",fontSize:12,fontWeight:quizCount===n?700:400}}>{n}</button>
                ))}
              </div>
              <button onClick={generateQuiz} disabled={loading||documents.length===0} style={C.btn(!loading&&documents.length>0)}>{loading?"⏳ Generating...":"📝 Generate Quiz → Chat"}</button>
              {documents.length===0&&<div style={{fontSize:11,color:"#f87171",marginTop:6,textAlign:"center"}}>Upload a PDF first</div>}
            </div>
          )}

          {activeTab==="compare"&&(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:8}}>🔀 Compare Documents</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                <select value={doc1} onChange={e=>setDoc1(e.target.value)} style={{...C.inp,marginBottom:0}}>
                  <option value="" style={{background:"#0f0f1a"}}>Document 1</option>
                  {documents.map(d=><option key={d} value={d} style={{background:"#0f0f1a"}}>{d.substring(0,20)}...</option>)}
                </select>
                <select value={doc2} onChange={e=>setDoc2(e.target.value)} style={{...C.inp,marginBottom:0}}>
                  <option value="" style={{background:"#0f0f1a"}}>Document 2</option>
                  {documents.map(d=><option key={d} value={d} style={{background:"#0f0f1a"}}>{d.substring(0,20)}...</option>)}
                </select>
              </div>
              <textarea value={compareQ} onChange={e=>setCompareQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();compareDocuments();}}} placeholder="What to compare? (Enter to search)" rows={2} style={{...C.inp,resize:"none"}}/>
              <button onClick={compareDocuments} disabled={loading||!doc1||!doc2||!compareQ} style={C.btn(!loading&&!!doc1&&!!doc2&&!!compareQ)}>{loading?"⏳ Comparing...":"🔀 Compare → Chat"}</button>
            </div>
          )}

          {activeTab==="web"&&(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:8}}>🌐 Website RAG</div>
              <input value={webUrl} onChange={e=>setWebUrl(e.target.value)} placeholder="https://example.com" style={C.inp}/>
              <textarea value={webQ} onChange={e=>setWebQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();chatWithWebsite();}}} placeholder="What to know about this site? (Enter to search)" rows={2} style={{...C.inp,resize:"none"}}/>
              <button onClick={chatWithWebsite} disabled={loading||!webUrl||!webQ} style={C.btn(!loading&&!!webUrl&&!!webQ)}>{loading?"⏳ Reading...":"🌐 Ask Website → Chat"}</button>
            </div>
          )}

          {activeTab==="youtube"&&(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:8}}>📺 YouTube RAG</div>
              <input value={ytUrl} onChange={e=>setYtUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={C.inp}/>
              <textarea value={ytQ} onChange={e=>setYtQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();chatWithYoutube();}}} placeholder="What to know about this video? (Enter to search)" rows={2} style={{...C.inp,resize:"none"}}/>
              <button onClick={chatWithYoutube} disabled={loading||!ytUrl||!ytQ} style={C.btn(!loading&&!!ytUrl&&!!ytQ)}>{loading?"⏳ Getting transcript...":"📺 Ask Video → Chat"}</button>
            </div>
          )}

          {activeTab==="resume"&&(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:8}}>💼 Resume Analyzer</div>
              <div onClick={()=>resumeRef.current?.click()} style={{border:"2px dashed rgba(99,102,241,0.25)",borderRadius:12,padding:"16px",textAlign:"center",cursor:"pointer",background:"rgba(99,102,241,0.03)",marginBottom:8}}>
                <div style={{fontSize:24,marginBottom:4}}>📄</div>
                <div style={{fontSize:13,color:"#a5b4fc",fontWeight:600}}>Tap to Upload Resume PDF</div>
                <div style={{fontSize:11,color:"#374151",marginTop:2}}>Result appears in chat ↑</div>
                <input ref={resumeRef} type="file" accept=".pdf,.txt" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)analyzeResume(f);if(e.target)e.target.value="";}}/>
              </div>
              {loading&&<div style={{textAlign:"center",color:"#818cf8",fontSize:12}}>⏳ Analyzing resume...</div>}
            </div>
          )}

          {activeTab==="data"&&(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:8}}>📊 Data Analyst AI</div>
              {dataJson?(
                <div style={{padding:"7px 12px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:8,marginBottom:8,fontSize:12,color:"#86efac"}}>✅ Data loaded!</div>
              ):(
                <div style={{padding:"10px",background:"rgba(99,102,241,0.05)",borderRadius:8,marginBottom:8,textAlign:"center",fontSize:11,color:"#6b7280"}}>Upload CSV/Excel via + PDF button first</div>
              )}
              <textarea value={dataQ} onChange={e=>setDataQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();analyzeData();}}} placeholder="What insights? (Enter to analyze)" rows={2} style={{...C.inp,resize:"none"}}/>
              <button onClick={analyzeData} disabled={loading||!dataJson||!dataQ} style={C.btn(!loading&&!!dataJson&&!!dataQ)}>{loading?"⏳ Analyzing...":"📊 Analyze → Chat"}</button>
            </div>
          )}

          {activeTab==="alerts"&&(
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:8}}>🔔 Smart Alerts Extractor</div>
              <select value={alertDoc} onChange={e=>setAlertDoc(e.target.value)} style={C.inp}>
                <option value="" style={{background:"#0f0f1a"}}>Select Document</option>
                {documents.map(d=><option key={d} value={d} style={{background:"#0f0f1a"}}>{d}</option>)}
              </select>
              <button onClick={getAlerts} disabled={loading||!alertDoc} style={C.btn(!loading&&!!alertDoc)}>{loading?"⏳ Extracting...":"🔔 Extract Alerts → Chat"}</button>
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",background:"#07070f",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden",position:"relative"}}>

      {/* BG */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",top:"10%",left:"5%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.06) 0%,transparent 70%)",animation:"orb 14s ease-in-out infinite"}}/>
        <div style={{position:"absolute",bottom:"10%",right:"5%",width:250,height:250,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.05) 0%,transparent 70%)",animation:"orb 18s ease-in-out infinite reverse"}}/>
        {!isMobile && Array.from({length:12}).map((_,i)=>(
          <div key={i} style={{position:"absolute",left:`${(i*37+7)%95}%`,top:`${(i*53+13)%90}%`,width:"2px",height:"2px",borderRadius:"50%",background:["rgba(99,102,241,0.4)","rgba(168,85,247,0.3)","rgba(59,130,246,0.3)"][i%3],animation:`star ${7+i%9}s ease-in-out infinite`,animationDelay:`${(i*0.4)%7}s`}}/>
        ))}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.015) 1px,transparent 1px)",backgroundSize:"60px 60px"}}/>
      </div>

      {/* TOPBAR */}
      <div style={{padding:isMobile?"8px 10px":"10px 16px",borderBottom:"1px solid rgba(99,102,241,0.12)",background:"rgba(7,7,15,0.97)",backdropFilter:"blur(20px)",zIndex:30,position:"relative",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,padding:"6px 10px",cursor:"pointer",color:"#818cf8",fontSize:14,lineHeight:1,flexShrink:0}}>☰</button>
          <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
            <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:"0 0 14px rgba(99,102,241,0.4)",flexShrink:0,animation:"glow 3s ease-in-out infinite"}}>🧠</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:isMobile?13:15,fontWeight:800,color:"#fff",lineHeight:1.2}}>DocuMind AI</div>
              <div style={{fontSize:9,color:"#6366f1",fontWeight:700,letterSpacing:"1px"}}>RAG · GROQ · FAISS</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:documents.length>0?"#22c55e":"#6366f1",boxShadow:`0 0 6px ${documents.length>0?"#22c55e":"#6366f1"}`,animation:"pulse 2s ease-in-out infinite"}}/>
              <span style={{fontSize:10,color:"#4b5563"}}>{documents.length}</span>
            </div>
            <button onClick={()=>{setSidebarOpen(false);fileRef.current?.click();}} style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#fff",fontSize:11,fontWeight:700,flexShrink:0,boxShadow:"0 0 12px rgba(99,102,241,0.3)"}}>+ PDF</button>
            <input ref={fileRef} type="file" accept=".pdf,.csv,.xlsx,.xls" multiple style={{display:"none"}} onChange={e=>{Array.from(e.target.files||[]).forEach(uploadPDF);if(e.target)e.target.value="";}}/>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading&&(
          <div style={{marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:10,color:"#a5b4fc"}}>⚙️ Processing...</span>
              <span style={{fontSize:10,color:"#6366f1"}}>{uploadProgress}%</span>
            </div>
            <div style={{background:"rgba(99,102,241,0.15)",borderRadius:99,height:3,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#6366f1,#a855f7)",width:`${uploadProgress}%`,transition:"width 0.3s"}}/>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:3,overflowX:"auto",paddingBottom:1}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:isMobile?"5px 8px":"5px 10px",background:activeTab===t.id?"rgba(99,102,241,0.2)":"transparent",border:`1px solid ${activeTab===t.id?"rgba(99,102,241,0.4)":"transparent"}`,borderRadius:8,cursor:"pointer",color:activeTab===t.id?"#a5b4fc":"#4b5563",fontSize:isMobile?10:11,fontWeight:activeTab===t.id?700:400,whiteSpace:"nowrap",transition:"all 0.2s",flexShrink:0}}>
              {t.icon}{!isMobile&&` ${t.label}`}
            </button>
          ))}
        </div>
      </div>

      {/* SIDEBAR OVERLAY */}
      {sidebarOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex"}}>
          <div onClick={()=>setSidebarOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"relative",width:isMobile?"82vw":"280px",maxWidth:300,height:"100%",background:"rgba(6,6,16,0.99)",borderRight:"1px solid rgba(99,102,241,0.2)",display:"flex",flexDirection:"column",padding:"14px 12px",overflowY:"auto",zIndex:1,animation:"slideInLeft 0.25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>⚙️ Settings</div>
              <button onClick={()=>setSidebarOpen(false)} style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"#818cf8",fontSize:13}}>✕</button>
            </div>

            {/* Upload area in sidebar */}
            <div onDrop={e=>{e.preventDefault();setDragOver(false);Array.from(e.dataTransfer.files).forEach(uploadPDF);}} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${dragOver?"#6366f1":"rgba(99,102,241,0.22)"}`,borderRadius:12,padding:"14px",textAlign:"center",cursor:"pointer",marginBottom:12,background:"rgba(99,102,241,0.03)",transition:"all 0.3s"}}>
              <div style={{fontSize:24,marginBottom:4,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>📄</div>
              <div style={{fontSize:12,color:"#a5b4fc",fontWeight:600}}>Drop PDF / CSV / Excel</div>
              <div style={{fontSize:10,color:"#374151",marginTop:2}}>or tap to browse</div>
            </div>

            {/* Mode */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:9,color:"#374151",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:6}}>Response Mode</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                {MODES.map(m=>(
                  <button key={m.id} onClick={()=>setMode(m.id)} style={{padding:"7px 5px",background:mode===m.id?"rgba(99,102,241,0.2)":"rgba(99,102,241,0.04)",border:`1px solid ${mode===m.id?"rgba(99,102,241,0.4)":"rgba(99,102,241,0.1)"}`,borderRadius:8,cursor:"pointer",color:mode===m.id?"#a5b4fc":"#4b5563",fontSize:11,fontWeight:mode===m.id?700:400,transition:"all 0.2s"}}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:9,color:"#374151",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:6}}>Language</div>
              <select value={language} onChange={e=>setLanguage(e.target.value)} style={{width:"100%",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,padding:"8px 10px",color:"#c7d2fe",fontSize:12,outline:"none"}}>
                {LANGUAGES.map(l=><option key={l} value={l} style={{background:"#0f0f1a"}}>{l}</option>)}
              </select>
            </div>

            {/* Docs list */}
            <div style={{flex:1}}>
              <div style={{fontSize:9,color:"#374151",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8}}>Documents ({documents.length})</div>
              {documents.length===0?(
                <div style={{textAlign:"center",padding:"14px 0"}}>
                  <div style={{fontSize:26,opacity:0.2}}>📂</div>
                  <div style={{fontSize:11,color:"#374151",marginTop:4}}>No documents yet</div>
                </div>
              ):documents.map((doc,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 9px",background:"rgba(99,102,241,0.07)",borderRadius:8,marginBottom:4,border:"1px solid rgba(99,102,241,0.12)"}}>
                  <span style={{fontSize:11}}>📄</span>
                  <span style={{fontSize:10,color:"#c7d2fe",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={doc}>{doc}</span>
                  <button onClick={()=>axios.delete(`${API}/documents/${encodeURIComponent(doc)}`).then(fetchDocuments)} style={{background:"none",border:"none",cursor:"pointer",color:"#4b5563",fontSize:12,padding:"2px 4px"}}>✕</button>
                </div>
              ))}
            </div>

            <div style={{paddingTop:10,borderTop:"1px solid rgba(99,102,241,0.1)",display:"flex",gap:5,marginBottom:8}}>
              <button onClick={exportChat} style={{flex:1,padding:"7px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:7,cursor:"pointer",color:"#818cf8",fontSize:10}}>📥 Export</button>
              <button onClick={clearHistory} style={{flex:1,padding:"7px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:7,cursor:"pointer",color:"#f87171",fontSize:10}}>🗑️ Clear</button>
            </div>
            <div style={{textAlign:"center",fontSize:10,color:"#374151"}}>Built by <span style={{color:"#818cf8",fontWeight:600}}>Aryan Dhiman</span></div>
          </div>
        </div>
      )}

      {/* CHAT MESSAGES AREA */}
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:isMobile?"10px 10px":"12px 16px",display:"flex",flexDirection:"column",gap:10,zIndex:10,position:"relative"}}>

        {/* Welcome screen */}
        {messages.length===0&&(
          <div style={{textAlign:"center",marginTop:isMobile?16:40,animation:"fadeIn 0.6s ease",padding:"0 10px"}}>
            <div style={{fontSize:isMobile?48:56,marginBottom:10,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>🧠</div>
            <div style={{fontSize:isMobile?18:22,fontWeight:800,color:"#fff",letterSpacing:"-1px",marginBottom:6}}>DocuMind AI</div>
            <div style={{fontSize:12,color:"#374151",marginBottom:16}}>World's most advanced document intelligence</div>
            <div style={{display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap",maxWidth:380,margin:"0 auto 14px",padding:"0 5px"}}>
              {["⚡ Fast","🎯 Sources","🌍 10 Languages","🎤 Voice","🎨 Image","📝 Quiz","🌐 Web","📺 YouTube","💼 Resume","📊 Data"].map((f,i)=>(
                <span key={i} style={{padding:"3px 8px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:99,fontSize:10,color:"#818cf8"}}>{f}</span>
              ))}
            </div>
            {documents.length>0?(
              <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",maxWidth:320,margin:"0 auto"}}>
                {["Summarize this","Key points?","Important facts","Explain methodology"].map((s,i)=>(
                  <button key={i} onClick={()=>sendMessage(s)} style={{padding:"7px 12px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.22)",borderRadius:99,fontSize:11,color:"#a5b4fc",cursor:"pointer"}}>{s}</button>
                ))}
              </div>
            ):(
              <button onClick={()=>fileRef.current?.click()} style={{marginTop:12,padding:"12px 24px",background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:14,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 0 24px rgba(99,102,241,0.4)",animation:"pulse 2s ease-in-out infinite"}}>📄 Upload PDF to Start</button>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} style={{display:"flex",gap:7,flexDirection:msg.role==="user"?"row-reverse":"row",alignItems:"flex-start",animation:"slideIn 0.25s ease"}}>
            <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,background:msg.role==="user"?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,boxShadow:msg.role==="user"?"0 0 12px rgba(99,102,241,0.3)":"none"}}>
              {msg.role==="user"?"👤":"🧠"}
            </div>

            <div style={{maxWidth:isMobile?"88%":"80%",minWidth:60}}>
              <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3,justifyContent:msg.role==="user"?"flex-end":"flex-start",flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:"#374151",fontWeight:600}}>{msg.role==="user"?"You":"DocuMind AI"}</span>
                {msg.time&&<span style={{fontSize:9,color:"#1f2937"}}>{msg.time}</span>}
                {msg.confidence&&<span style={{fontSize:9,padding:"1px 6px",background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:99,color:"#86efac"}}>{msg.confidence}%</span>}
              </div>

              {/* Summary Card */}
              {msg.type==="summary"&&msg.summary&&(
                <div style={{background:"rgba(11,11,22,0.94)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:14,padding:13,maxWidth:420}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:6}}>📊 {msg.summary.title||"Document Analysis"}</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:8,lineHeight:1.6}}>{msg.summary.summary}</div>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:8}}>{msg.summary.topics?.map((t:string,j:number)=>badge("#6366f1",t))}</div>
                  <div style={{background:"rgba(99,102,241,0.05)",borderRadius:8,padding:10,marginBottom:8}}>
                    {msg.summary.key_points?.map((p:string,j:number)=>(
                      <div key={j} style={{display:"flex",gap:5,marginBottom:4}}>
                        <span style={{color:"#6366f1",flexShrink:0,fontSize:10}}>◆</span>
                        <span style={{fontSize:11,color:"#9ca3af"}}>{p}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:4}}>{badge("#f59e0b",`📚 ${msg.summary.difficulty||"N/A"}`)}{badge("#06b6d4",`⏱️ ${msg.summary.reading_time||"N/A"}`)}</div>
                </div>
              )}

              {/* Image */}
              {msg.type==="image"&&msg.image_url&&(
                <div style={{background:"rgba(11,11,22,0.94)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:14,overflow:"hidden",maxWidth:400}}>
                  <img src={msg.image_url} alt={msg.content} style={{width:"100%",display:"block",maxHeight:260,objectFit:"cover"}} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                  <div style={{padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:10,color:"#6b7280",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🎨 {msg.content}</span>
                    <a href={msg.image_url} download style={{fontSize:11,color:"#818cf8",textDecoration:"none",flexShrink:0}}>⬇️</a>
                  </div>
                </div>
              )}

              {/* Quiz */}
              {msg.type==="quiz"&&msg.quiz&&(
                <div style={{background:"rgba(11,11,22,0.94)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:14,padding:13,maxWidth:460}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:10}}>📝 Quiz — {msg.quiz.questions?.length} Questions</div>
                  {msg.quiz.questions?.map((q:any,qi:number)=>(
                    <div key={qi} style={{marginBottom:12,background:"rgba(99,102,241,0.04)",borderRadius:10,padding:10}}>
                      <div style={{fontSize:12,color:"#e2e8f0",fontWeight:600,marginBottom:7,lineHeight:1.5}}>Q{qi+1}. {q.question}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {q.options?.map((opt:string,oi:number)=>{
                          const letter=opt.charAt(0);
                          const sel=quizAnswers[qi]===letter;
                          const correct=quizSubmitted&&letter===q.correct;
                          const wrong=quizSubmitted&&sel&&letter!==q.correct;
                          return (
                            <button key={oi} onClick={()=>!quizSubmitted&&setQuizAnswers(a=>({...a,[qi]:letter}))} style={{padding:"8px 10px",background:correct?"rgba(34,197,94,0.15)":wrong?"rgba(239,68,68,0.15)":sel?"rgba(99,102,241,0.2)":"rgba(99,102,241,0.05)",border:`1px solid ${correct?"rgba(34,197,94,0.4)":wrong?"rgba(239,68,68,0.4)":sel?"rgba(99,102,241,0.4)":"rgba(99,102,241,0.1)"}`,borderRadius:8,cursor:quizSubmitted?"default":"pointer",color:correct?"#86efac":wrong?"#fca5a5":sel?"#a5b4fc":"#6b7280",fontSize:12,textAlign:"left",transition:"all 0.2s",lineHeight:1.4}}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {quizSubmitted&&q.explanation&&<div style={{marginTop:6,padding:"6px 8px",background:"rgba(99,102,241,0.08)",borderRadius:6,fontSize:10,color:"#818cf8",lineHeight:1.5}}>💡 {q.explanation}</div>}
                    </div>
                  ))}
                  {!quizSubmitted?(
                    <button onClick={()=>setQuizSubmitted(true)} style={{padding:"10px",background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",width:"100%",marginTop:4}}>Submit Quiz</button>
                  ):(
                    <div style={{textAlign:"center",padding:12,background:"rgba(99,102,241,0.08)",borderRadius:10}}>
                      <div style={{fontSize:22,fontWeight:800,color:calcScore(msg.quiz)>=msg.quiz.questions.length*0.7?"#86efac":"#fca5a5"}}>{calcScore(msg.quiz)}/{msg.quiz.questions?.length}</div>
                      <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{calcScore(msg.quiz)>=msg.quiz.questions.length*0.7?"Excellent! 🎉":"Keep studying! 📚"}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Resume */}
              {msg.type==="resume"&&msg.resume&&(
                <div style={{background:"rgba(11,11,22,0.94)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:14,padding:13,maxWidth:400}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:10}}>💼 {msg.resume.name||"Resume Analysis"}</div>
                  <div style={{display:"flex",gap:6,marginBottom:10}}>
                    {[{v:msg.resume.score||0,l:"Score",c:"#a5b4fc",bg:"rgba(99,102,241,0.08)"},{v:msg.resume.ats_score||0,l:"ATS",c:"#86efac",bg:"rgba(34,197,94,0.08)"},{v:msg.resume.experience_level||"N/A",l:"Level",c:"#fcd34d",bg:"rgba(245,158,11,0.08)"}].map((item,i)=>(
                      <div key={i} style={{flex:1,background:item.bg,borderRadius:8,padding:"8px",textAlign:"center"}}>
                        <div style={{fontSize:16,fontWeight:800,color:item.c}}>{item.v}</div>
                        <div style={{fontSize:9,color:"#4b5563"}}>{item.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:8,lineHeight:1.6}}>{msg.resume.summary}</div>
                  <div style={{marginBottom:6}}><div style={{fontSize:9,color:"#22c55e",fontWeight:700,marginBottom:3}}>✅ STRENGTHS</div>{msg.resume.strengths?.map((s:string,i:number)=><div key={i} style={{fontSize:11,color:"#9ca3af",marginBottom:2}}>• {s}</div>)}</div>
                  <div style={{marginBottom:6}}><div style={{fontSize:9,color:"#ef4444",fontWeight:700,marginBottom:3}}>❌ MISSING</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{msg.resume.missing_skills?.map((s:string,i:number)=>badge("#ef4444",s))}</div></div>
                  <div><div style={{fontSize:9,color:"#6366f1",fontWeight:700,marginBottom:3}}>🎯 BEST ROLES</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{msg.resume.best_roles?.map((r:string,i:number)=>badge("#6366f1",r))}</div></div>
                </div>
              )}

              {/* Alerts */}
              {msg.type==="alerts"&&msg.alerts&&(
                <div style={{background:"rgba(11,11,22,0.94)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:14,padding:13,maxWidth:420}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>🔔 Smart Alerts</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:10,lineHeight:1.5}}>{msg.alerts.summary}</div>
                  {msg.alerts.alerts?.map((a:any,i:number)=>(
                    <div key={i} style={{padding:"9px 11px",background:a.priority==="high"?"rgba(239,68,68,0.07)":a.priority==="medium"?"rgba(245,158,11,0.07)":"rgba(99,102,241,0.05)",borderRadius:10,marginBottom:5,border:`1px solid ${a.priority==="high"?"rgba(239,68,68,0.2)":a.priority==="medium"?"rgba(245,158,11,0.2)":"rgba(99,102,241,0.12)"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                        <span style={{fontSize:11,fontWeight:600,color:"#e2e8f0",lineHeight:1.4,flex:1,marginRight:6}}>{a.title}</span>
                        {badge(a.priority==="high"?"#ef4444":a.priority==="medium"?"#f59e0b":"#6366f1",a.priority)}
                      </div>
                      <div style={{fontSize:11,color:"#9ca3af",lineHeight:1.5}}>{a.description}</div>
                      {a.date&&<div style={{fontSize:10,color:"#6366f1",marginTop:3}}>📅 {a.date}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Normal message */}
              {!msg.type&&msg.content&&(
                <div style={{position:"relative"}}>
                  <div style={{padding:"10px 13px",borderRadius:msg.role==="user"?"14px 4px 14px 14px":"4px 14px 14px 14px",background:msg.role==="user"?"linear-gradient(135deg,#4f46e5,#7c3aed)":"rgba(11,11,22,0.94)",border:`1px solid ${msg.role==="user"?"rgba(99,102,241,0.4)":"rgba(99,102,241,0.14)"}`,fontSize:13,lineHeight:1.75,color:"#e2e8f0",boxShadow:msg.role==="user"?"0 4px 16px rgba(99,102,241,0.2)":"0 2px 10px rgba(0,0,0,0.4)",whiteSpace:"pre-wrap"}} dangerouslySetInnerHTML={{__html:fmt(msg.content)}}/>
                  {msg.role==="assistant"&&(
                    <div style={{display:"flex",gap:4,marginTop:4}}>
                      <button onClick={()=>copyText(msg.content,msg.id)} style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:6,padding:"3px 8px",cursor:"pointer",color:"#818cf8",fontSize:10,transition:"all 0.2s"}}>{copied===msg.id?"✅ Copied":"📋 Copy"}</button>
                      <button onClick={()=>speak(msg.content)} style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:6,padding:"3px 8px",cursor:"pointer",color:"#818cf8",fontSize:10}}>🔊 Speak</button>
                    </div>
                  )}
                </div>
              )}

              {/* Sources */}
              {msg.sources&&msg.sources.length>0&&(
                <div style={{marginTop:4,display:"flex",gap:4,flexWrap:"wrap",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
                  {msg.sources.map((s,j)=><span key={j} style={{fontSize:9,padding:"2px 7px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:99,color:"#818cf8"}}>📄 {s}</span>)}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading&&(
          <div style={{display:"flex",gap:7,alignItems:"flex-start",animation:"slideIn 0.25s ease"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🧠</div>
            <div style={{padding:"10px 14px",background:"rgba(11,11,22,0.94)",borderRadius:"4px 14px 14px 14px",border:"1px solid rgba(99,102,241,0.14)"}}>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:["#6366f1","#a855f7","#3b82f6"][i],animation:"bounce 0.8s ease-in-out infinite",animationDelay:`${i*0.18}s`}}/>)}
                <span style={{fontSize:11,color:"#374151",marginLeft:5}}>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FEATURE PANEL — shown above input when not on chat tab */}
      {renderFeaturePanel()}

      {/* CHAT INPUT — always visible at bottom */}
      <div style={{padding:isMobile?"8px 10px":"10px 14px",borderTop:activeTab==="chat"?"1px solid rgba(99,102,241,0.12)":"none",background:"rgba(7,7,15,0.98)",backdropFilter:"blur(20px)",zIndex:20,position:"relative",flexShrink:0}}>
        <div ref={inputAreaRef} style={{display:"flex",gap:6,alignItems:"flex-end",background:"rgba(99,102,241,0.05)",border:`1px solid ${input.trim()?"rgba(99,102,241,0.38)":"rgba(99,102,241,0.14)"}`,borderRadius:14,padding:"8px 10px",transition:"border-color 0.3s",boxShadow:input.trim()?"0 0 20px rgba(99,102,241,0.08)":"none"}}>
          <button onClick={startVoice} style={{background:listening?"rgba(239,68,68,0.15)":"none",border:listening?"1px solid rgba(239,68,68,0.3)":"none",borderRadius:6,cursor:"pointer",fontSize:16,padding:"2px 4px",lineHeight:1,flexShrink:0,color:listening?"#ef4444":"#4b5563",transition:"all 0.2s"}}>{listening?"🔴":"🎤"}</button>
          <textarea
            ref={taRef}
            value={input}
            onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";}}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
            onFocus={()=>{if(activeTab!=="chat")setActiveTab("chat");}}
            placeholder={documents.length>0?activeTab!=="chat"?`Tap here to chat... or use ${TABS.find(t=>t.id===activeTab)?.icon} above`:"Ask anything... (🎤 voice available)":"Upload a PDF to start..."}
            disabled={documents.length===0||loading}
            rows={1}
            style={{flex:1,background:"transparent",border:"none",color:"#e2e8f0",fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.6,maxHeight:100,overflowY:"auto"}}
          />
          <button
            onClick={()=>sendMessage()}
            disabled={loading||!input.trim()||documents.length===0}
            style={{width:34,height:34,borderRadius:10,border:"none",background:!loading&&input.trim()&&documents.length>0?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.1)",cursor:!loading&&input.trim()&&documents.length>0?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,transition:"all 0.25s",flexShrink:0,boxShadow:input.trim()&&documents.length>0?"0 0 16px rgba(99,102,241,0.35)":"none"}}
          >
            {loading?<span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⏳</span>:"🚀"}
          </button>
        </div>
        <div style={{fontSize:9,color:"#1f2937",textAlign:"center",marginTop:4}}>Enter to send · Shift+Enter new line · 🎤 voice</div>
      </div>

      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0)}33%{transform:translate(20px,-15px)}66%{transform:translate(-15px,20px)}}
        @keyframes star{0%,100%{opacity:0.1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.4)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 14px rgba(99,102,241,0.4)}50%{box-shadow:0 0 28px rgba(99,102,241,0.8)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        *{scrollbar-width:thin;scrollbar-color:#6366f1 #0f0f1a;-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:linear-gradient(#6366f1,#a855f7);border-radius:99px}
        textarea::placeholder{color:#2d3748}
        select option{background:#0f0f1a;color:#e2e8f0}
        button:active{transform:scale(0.95)}
        input[type="file"]{display:none!important}
      `}</style>
    </div>
  );
}






