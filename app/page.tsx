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
  {id:"image",icon:"🎨",label:"Image AI"},
  {id:"quiz",icon:"📝",label:"Quiz"},
  {id:"compare",icon:"🔀",label:"Compare"},
  {id:"web",icon:"🌐",label:"Website"},
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

function ImageWithLoader({url, prompt}: {url:string, prompt:string}) {
  const [status, setStatus] = useState<"loading"|"loaded"|"error">("loading");
  useEffect(() => { setStatus("loading"); }, [url]);
  return (
    <div>
      {status==="loading"&&(
        <div style={{padding:"30px",textAlign:"center",background:"rgba(99,102,241,0.05)"}}>
          <div style={{fontSize:28,marginBottom:8,animation:"spin 2s linear infinite",display:"inline-block"}}>⚙️</div>
          <div style={{fontSize:12,color:"#818cf8",marginBottom:4}}>Generating image...</div>
          <div style={{fontSize:10,color:"#4b5563"}}>May take 15-30 seconds</div>
        </div>
      )}
      {status==="error"&&(
        <div style={{padding:"20px",textAlign:"center"}}>
          <div style={{fontSize:13,color:"#f87171",marginBottom:8}}>❌ Image failed to load</div>
          <a href={url} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#818cf8",textDecoration:"none"}}>🔗 Open in new tab</a>
        </div>
      )}
      <img
        src={url} alt={prompt}
        style={{width:"100%",display:status==="loaded"?"block":"none",maxHeight:320,objectFit:"cover"}}
        onLoad={()=>setStatus("loaded")}
        onError={()=>setStatus("error")}
      />
      <div style={{padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid rgba(99,102,241,0.1)"}}>
        <span style={{fontSize:11,color:"#6b7280",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🎨 {prompt}</span>
        <div style={{display:"flex",gap:6}}>
          <a href={url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#818cf8",textDecoration:"none"}}>🔗 Open</a>
          <a href={url} download style={{fontSize:11,color:"#a5b4fc",textDecoration:"none"}}>⬇️ Save</a>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
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
  const [dataInfo, setDataInfo] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<{[k:number]:string}>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [copied, setCopied] = useState<string|null>(null);
  const [listening, setListening] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLInputElement>(null);
  const dataFileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { fetchDocuments(); loadHistory(); }, []);
  
  // Refresh documents every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchDocuments(), 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (activeTab === "chat" && taRef.current && !isMobile) {
      setTimeout(() => taRef.current?.focus(), 100);
    }
  }, [activeTab]);

  const fetchDocuments = async () => {
    try {
      const r = await axios.get(`${API}/documents`);
      setDocuments(r.data.documents || []);
    } catch {}
  };

  const loadHistory = async () => {
    try {
      const sid = typeof window !== "undefined" ? (localStorage.getItem("documind_session") || sessionId) : sessionId;
      const r = await axios.get(`${API}/history/${sid}`);
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
    } catch(e) { console.log("History:", e); }
  };

  const now = () => new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

  const addMsg = (msg: Partial<Message>) =>
    setMessages(p => [...p, {id: Math.random().toString(), time: now(), role:"assistant", content:"", ...msg} as Message]);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice"); return; }
    const r = new SR();
    r.lang = "en-US"; r.continuous = false;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); setTimeout(() => taRef.current?.focus(), 100); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g,"").substring(0,500));
    window.speechSynthesis.speak(u);
  };

  const uploadFile = useCallback(async (file: File, type: "pdf"|"data" = "pdf") => {
    setUploading(true); setUploadProgress(0); setUploadFileName(file.name);
    const iv = setInterval(() => setUploadProgress(p => { if(p<40) return p+6; if(p<70) return p+3; if(p<85) return p+1; return p; }), 200);
    const fd = new FormData(); fd.append("file", file); fd.append("session_id", sessionId);
    try {
      const r = await axios.post(`${API}/upload`, fd);
      clearInterval(iv); setUploadProgress(100);
      if (file.name.match(/\.(csv|xlsx|xls)$/i)) {
        setDataJson(r.data.data_json || "");
        setDataInfo(r.data);
        addMsg({role:"assistant", content:`✅ **${file.name}** loaded! ${r.data.rows} rows × ${r.data.columns?.length} columns ready. Go to 📊 Data tab to analyze.`});
        setActiveTab("data");
      } else {
        const docsRes = await axios.get(`${API}/documents`);
        const newDocs = docsRes.data.documents || [];
        setDocuments(newDocs);
        try {
          const sum = await axios.get(`${API}/summary/${encodeURIComponent(file.name)}`);
          if (!sum.data.error) addMsg({role:"assistant", type:"summary", content:"", summary:sum.data});
          else addMsg({role:"assistant", content:`✅ **${file.name}** loaded! Ask me anything about it.`});
        } catch { addMsg({role:"assistant", content:`✅ **${file.name}** loaded!`}); }
        if (activeTab === "quiz" && newDocs.length > 0) {
          setTimeout(() => generateQuizWithDocs(newDocs), 1000);
        }
      }
      setTimeout(() => { setUploading(false); setUploadProgress(0); setUploadFileName(""); setSidebarOpen(false); }, 800);
    } catch {
      clearInterval(iv); setUploading(false); setUploadProgress(0); setUploadFileName("");
      addMsg({role:"assistant", content:"❌ Upload failed. Check if backend is running."});
    }
  }, [sessionId, activeTab]);

  const sendMessage = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    if (documents.length === 0) { addMsg({role:"assistant", content:"⚠️ Please upload a PDF first using the **+ PDF** button above."}); return; }
    setInput(""); if (taRef.current) taRef.current.style.height = "auto";
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:q, time:now()}]);
    const msgId = Math.random().toString();
    setMessages(p => [...p, {id:msgId, role:"assistant", content:"", time:now()}]);
    setLoading(true);
    try {
      const response = await fetch(`${API}/chat-stream`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({question:q, session_id:sessionId, mode, language})
      });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = ""; let sources: string[] = [];
      if (reader) {
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              if (data.startsWith("[SOURCES]")) {
                const s = data.replace("[SOURCES]","").replace("[/SOURCES]","");
                sources = s ? s.split(",").filter(Boolean) : [];
              } else if (data) {
                fullText += data;
                setMessages(p => p.map(m => m.id===msgId ? {...m, content:fullText, sources} : m));
              }
            }
          }
        }
      }
      setMessages(p => p.map(m => m.id===msgId ? {...m, content:fullText||"No response", sources, confidence:85} : m));
    } catch {
      setMessages(p => p.map(m => m.id===msgId ? {...m, content:"⚠️ Connection error. Is backend running?"} : m));
    }
    setLoading(false);
    setTimeout(() => taRef.current?.focus(), 100);
  };

  const generateImage = async () => {
    if (!imagePrompt.trim() || loading) return;
    const prompt = imagePrompt; setImagePrompt("");
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`🎨 ${prompt} [${imageStyle}]`, time:now()}]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/generate-image`, {prompt, session_id:sessionId, style:imageStyle});
      if (r.data.image_url) addMsg({type:"image", content:prompt, image_url:r.data.image_url});
      else addMsg({content:"❌ Image generation failed. Try again."});
    } catch { addMsg({content:"❌ Image generation failed."}); }
    setLoading(false);
  };

  const generateQuiz = async () => {
    if (loading) return;
    const docs = await axios.get(`${API}/documents`).then(r=>r.data.documents||[]).catch(()=>[]);
    if (docs.length===0) { addMsg({content:"⚠️ Upload a PDF first using + PDF button!"}); return; }
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`📝 Generate ${quizCount} question quiz`, time:now()}]);
    setActiveTab("chat");
    setLoading(true);
    try {
      const r = await axios.post(`${API}/quiz`, {num_questions:quizCount});
      if (r.data.questions) { setQuizAnswers({}); setQuizSubmitted(false); addMsg({type:"quiz", content:"", quiz:r.data}); }
      else addMsg({content:"❌ Quiz generation failed. Try again."});
    } catch { addMsg({content:"❌ Quiz failed."}); }
    setLoading(false);
  };

  const compareDocuments = async () => {
    if (!compareQ||!doc1||!doc2||loading) return;
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`🔀 Compare: ${compareQ}`, time:now()}]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/compare`, {question:compareQ, doc1, doc2, session_id:sessionId});
      addMsg({content:r.data.answer||r.data.error, sources:r.data.sources, confidence:r.data.confidence});
    } catch { addMsg({content:"❌ Compare failed."}); }
    setLoading(false);
  };

  const chatWithWebsite = async () => {
    if (!webUrl||!webQ||loading) return;
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`🌐 ${webUrl}\n${webQ}`, time:now()}]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/website-chat`, {url:webUrl, question:webQ, session_id:sessionId});
      addMsg({content:r.data.answer||r.data.error});
    } catch { addMsg({content:"❌ Website chat failed."}); }
    setLoading(false);
  };

  const chatWithYoutube = async () => {
    if (!ytUrl||!ytQ||loading) return;
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`📺 ${ytUrl}\n${ytQ}`, time:now()}]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/youtube-chat`, {video_url:ytUrl, question:ytQ, session_id:sessionId});
      addMsg({content:r.data.answer||r.data.error});
    } catch { addMsg({content:"❌ YouTube chat failed."}); }
    setLoading(false);
  };

  const analyzeResume = async (file: File) => {
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`💼 Analyzing: ${file.name}`, time:now()}]);
    setActiveTab("chat"); setLoading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await axios.post(`${API}/analyze-resume`, fd);
      if (r.data.error) addMsg({content:r.data.error});
      else addMsg({type:"resume", content:"", resume:r.data});
    } catch { addMsg({content:"❌ Resume analysis failed."}); }
    setLoading(false);
  };

  const analyzeData = async () => {
    if (!dataQ||!dataJson||loading) return;
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`📊 ${dataQ}`, time:now()}]);
    setActiveTab("chat"); setLoading(true);
    try {
      const r = await axios.post(`${API}/analyze-data-json`, {question:dataQ, data_json:dataJson});
      addMsg({content:r.data.answer||r.data.error});
    } catch { addMsg({content:"❌ Data analysis failed."}); }
    setLoading(false);
  };

  const getAlerts = async () => {
    if (!alertDoc||loading) return;
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`🔔 Alerts from: ${alertDoc}`, time:now()}]);
    setActiveTab("chat"); setLoading(true);
    try {
      const r = await axios.post(`${API}/smart-alerts`, {filename:alertDoc});
      if (r.data.error) addMsg({content:r.data.error});
      else addMsg({type:"alerts", content:"", alerts:r.data});
    } catch { addMsg({content:"❌ Alert extraction failed."}); }
    setLoading(false);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(()=>setCopied(null),2000);
  };

  const exportChat = () => {
    const text = messages.map(m=>`[${m.time}] ${m.role==="user"?"You":"AI"}:\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text],{type:"text/plain"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="documind-chat.txt"; a.click();
  };

  const clearHistory = async () => {
    try { await axios.delete(`${API}/history/${sessionId}`); setMessages([]); } catch {}
  };

  const calcScore = (quiz: any) => quiz?.questions?.filter((q:any,i:number)=>quizAnswers[i]===q.correct).length||0;

  const fmt = (s: string) => s
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.*?)\*/g,"<em>$1</em>")
    .replace(/`([^`]+)`/g,"<code style='background:rgba(99,102,241,0.2);padding:1px 5px;border-radius:4px;font-size:11px;font-family:monospace'>$1</code>")
    .replace(/^#{1,3} (.+)$/gm,"<div style='font-size:14px;font-weight:700;color:#c7d2fe;margin:6px 0'>$1</div>")
    .replace(/^• /gm,"◆ ")
    .replace(/\n/g,"<br/>");

  const badge = (color: string, text: string, i=0) => (
    <span key={i} style={{fontSize:9,padding:"2px 7px",background:`${color}20`,border:`1px solid ${color}40`,borderRadius:99,color,marginRight:3,marginBottom:3,display:"inline-block"}}>{text}</span>
  );

  const S = {
    card: {background:"rgba(11,11,22,0.95)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:14,padding:14} as React.CSSProperties,
    inp: {width:"100%",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8} as React.CSSProperties,
    btn: (on=true) => ({padding:"11px",background:on?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.1)",border:"none",borderRadius:12,color:on?"#fff":"#4b5563",fontSize:13,fontWeight:600,cursor:on?"pointer":"not-allowed",width:"100%",transition:"all 0.2s",marginTop:4}) as React.CSSProperties,
  };

  const renderFeaturePanel = () => {
    if (activeTab === "chat") return null;
    return (
      <div style={{borderTop:"1px solid rgba(99,102,241,0.15)",background:"rgba(6,6,15,0.98)",backdropFilter:"blur(20px)",padding:"14px",flexShrink:0,maxHeight:"55vh",overflowY:"auto"}}>
        <div style={{maxWidth:580,margin:"0 auto"}}>

          {activeTab==="image" && (
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:10}}>🎨 AI Image Generator</div>
              <textarea value={imagePrompt} onChange={e=>setImagePrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();generateImage();}}} placeholder="Describe what you want to generate... (Enter to generate)" rows={3} style={{...S.inp,resize:"none"}}/>
              <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap"}}>
                {IMG_STYLES.map(s=>(
                  <button key={s} onClick={()=>setImageStyle(s)} style={{padding:"5px 12px",background:imageStyle===s?"rgba(99,102,241,0.3)":"rgba(99,102,241,0.06)",border:`1px solid ${imageStyle===s?"rgba(99,102,241,0.5)":"rgba(99,102,241,0.15)"}`,borderRadius:8,cursor:"pointer",color:imageStyle===s?"#a5b4fc":"#4b5563",fontSize:11,fontWeight:imageStyle===s?700:400,textTransform:"capitalize"}}>{s}</button>
                ))}
              </div>
              <button onClick={generateImage} disabled={loading||!imagePrompt.trim()} style={S.btn(!loading&&!!imagePrompt.trim())}>{loading?"⏳ Generating image...":"🎨 Generate Image → Chat"}</button>
              <div style={{fontSize:10,color:"#374151",marginTop:6,textAlign:"center"}}>Image appears in chat ↑ • May take 10-15 seconds</div>
            </div>
          )}

          {activeTab==="quiz" && typeof window !== "undefined" && (window.location.href = "/quiz") && (
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:10}}>📝 Auto Quiz Generator</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"#9ca3af"}}>Questions:</span>
                {[3,5,10,15].map(n=>(
                  <button key={n} onClick={()=>setQuizCount(n)} style={{padding:"5px 12px",background:quizCount===n?"rgba(99,102,241,0.3)":"rgba(99,102,241,0.06)",border:`1px solid ${quizCount===n?"rgba(99,102,241,0.5)":"rgba(99,102,241,0.12)"}`,borderRadius:8,cursor:"pointer",color:quizCount===n?"#a5b4fc":"#4b5563",fontSize:12,fontWeight:quizCount===n?700:400}}>{n}</button>
                ))}
              </div>
              {documents.length > 0 ? (
                <>
                  <div style={{padding:"8px 12px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:8,marginBottom:10,fontSize:12,color:"#86efac"}}>✅ {documents.length} doc{documents.length>1?"s":""} ready — {documents.map(d=>d.split("/").pop()).join(", ")}</div>
                  <button onClick={generateQuiz} disabled={loading} style={S.btn(!loading)}>{loading?"⏳ Generating quiz...":"📝 Generate Quiz Now"}</button>
                </>
              ) : (
                <>
                  <div onClick={()=>fileRef.current?.click()} style={{border:"2px dashed rgba(99,102,241,0.3)",borderRadius:12,padding:"20px",textAlign:"center",cursor:"pointer",background:"rgba(99,102,241,0.03)",marginBottom:10,transition:"all 0.2s"}}>
                    <div style={{fontSize:32,marginBottom:8,animation:"float 3s ease-in-out infinite",display:"inline-block"}}>📄</div>
                    <div style={{fontSize:13,color:"#a5b4fc",fontWeight:600}}>Upload PDF to Generate Quiz</div>
                    <div style={{fontSize:11,color:"#374151",marginTop:4}}>Tap here to browse your files</div>
                    <div style={{fontSize:10,color:"#4b5563",marginTop:2}}>Quiz will auto-generate after upload ✨</div>
                  </div>
                  <button onClick={()=>fileRef.current?.click()} style={S.btn(true)}>📄 Upload PDF → Auto Quiz</button>
                </>
              )}
            </div>
          )}

          {activeTab==="compare" && (
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:10}}>🔀 Compare Two Documents</div>
              {documents.length < 2 ? (
                <>
                  <div style={{padding:"12px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,marginBottom:10,textAlign:"center"}}>
                    <div style={{fontSize:13,color:"#fcd34d",marginBottom:4}}>⚠️ Need at least 2 PDFs</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>You have {documents.length} document{documents.length!==1?"s":""}. Upload {2-documents.length} more to compare.</div>
                  </div>
                  <button onClick={()=>fileRef.current?.click()} style={S.btn(true)}>📄 Upload PDF</button>
                </>
              ) : (
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <select value={doc1} onChange={e=>setDoc1(e.target.value)} style={{...S.inp,marginBottom:0}}>
                      <option value="" style={{background:"#0f0f1a"}}>📄 Select Document 1</option>
                      {documents.map((d,i)=><option key={i} value={d} style={{background:"#0f0f1a"}}>{d.length>20?d.substring(0,20)+"...":d}</option>)}
                    </select>
                    <select value={doc2} onChange={e=>setDoc2(e.target.value)} style={{...S.inp,marginBottom:0}}>
                      <option value="" style={{background:"#0f0f1a"}}>📄 Select Document 2</option>
                      {documents.map((d,i)=><option key={i} value={d} style={{background:"#0f0f1a"}}>{d.length>20?d.substring(0,20)+"...":d}</option>)}
                    </select>
                  </div>
                  <textarea value={compareQ} onChange={e=>setCompareQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();compareDocuments();}}} placeholder="What do you want to compare? E.g. 'Key differences' (Enter to compare)" rows={2} style={{...S.inp,resize:"none"}}/>
                  <button onClick={compareDocuments} disabled={loading||!doc1||!doc2||!compareQ} style={S.btn(!loading&&!!doc1&&!!doc2&&!!compareQ)}>{loading?"⏳ Comparing...":"🔀 Compare Documents → Chat"}</button>
                </>
              )}
            </div>
          )}

          {activeTab==="web" && (
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:10}}>🌐 Website RAG — Ask Any Website</div>
              <input value={webUrl} onChange={e=>setWebUrl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")document.querySelector<HTMLTextAreaElement>("#webQ")?.focus();}} placeholder="https://example.com" style={S.inp}/>
              <textarea id="webQ" value={webQ} onChange={e=>setWebQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();chatWithWebsite();}}} placeholder="What do you want to know about this website? (Enter to search)" rows={2} style={{...S.inp,resize:"none"}}/>
              <button onClick={chatWithWebsite} disabled={loading||!webUrl||!webQ} style={S.btn(!loading&&!!webUrl&&!!webQ)}>{loading?"⏳ Reading website...":"🌐 Ask Website → Chat"}</button>
            </div>
          )}

          {activeTab==="youtube" && (
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>📺 YouTube RAG — Ask Any Video</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:10}}>Paste any YouTube URL and ask questions about the video content</div>
              <input value={ytUrl} onChange={e=>setYtUrl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")document.querySelector<HTMLTextAreaElement>("#ytQ")?.focus();}} placeholder="https://youtube.com/watch?v=..." style={S.inp}/>
              <textarea id="ytQ" value={ytQ} onChange={e=>setYtQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();chatWithYoutube();}}} placeholder="What do you want to know about this video? (Enter to search)" rows={2} style={{...S.inp,resize:"none"}}/>
              <button onClick={chatWithYoutube} disabled={loading||!ytUrl||!ytQ} style={S.btn(!loading&&!!ytUrl&&!!ytQ)}>{loading?"⏳ Getting video info...":"📺 Ask Video → Chat"}</button>
            </div>
          )}

          {activeTab==="resume" && (
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>💼 AI Resume Analyzer</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>Get score, strengths, missing skills, and best job roles</div>
              <div onClick={()=>resumeRef.current?.click()} style={{border:"2px dashed rgba(99,102,241,0.3)",borderRadius:12,padding:"20px",textAlign:"center",cursor:"pointer",background:"rgba(99,102,241,0.03)",transition:"all 0.2s"}}>
                <div style={{fontSize:32,marginBottom:8}}>📄</div>
                <div style={{fontSize:13,color:"#a5b4fc",fontWeight:600}}>Tap to Upload Resume PDF</div>
                <div style={{fontSize:11,color:"#374151",marginTop:4}}>Supports PDF and TXT • Analysis appears in chat ↑</div>
              </div>
              <input ref={resumeRef} type="file" accept=".pdf,.txt" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)analyzeResume(f);if(e.target)e.target.value="";}}/>
              {loading&&<div style={{textAlign:"center",color:"#818cf8",fontSize:12,marginTop:10}}>⏳ Analyzing resume...</div>}
            </div>
          )}

          {activeTab==="data" && (
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>📊 Data Analyst AI</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:10}}>Upload CSV or Excel file and ask questions about your data</div>
              {dataJson ? (
                <div style={{padding:"10px 12px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:10,marginBottom:10}}>
                  <div style={{fontSize:12,color:"#86efac",fontWeight:600}}>✅ Data loaded successfully!</div>
                  {dataInfo&&<div style={{fontSize:11,color:"#4b5563",marginTop:3}}>{dataInfo.rows} rows × {dataInfo.columns?.length} columns</div>}
                  {dataInfo?.columns&&<div style={{fontSize:10,color:"#374151",marginTop:3}}>Columns: {dataInfo.columns.slice(0,4).join(", ")}{dataInfo.columns.length>4?"...":""}</div>}
                </div>
              ) : (
                <div onClick={()=>dataFileRef.current?.click()} style={{border:"2px dashed rgba(99,102,241,0.3)",borderRadius:12,padding:"16px",textAlign:"center",cursor:"pointer",background:"rgba(99,102,241,0.03)",marginBottom:10}}>
                  <div style={{fontSize:28,marginBottom:6}}>📊</div>
                  <div style={{fontSize:13,color:"#a5b4fc",fontWeight:600}}>Upload CSV or Excel File</div>
                  <div style={{fontSize:11,color:"#374151",marginTop:3}}>Tap to browse your files</div>
                </div>
              )}
              <input ref={dataFileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f,"data");if(e.target)e.target.value="";}}/>
              <textarea value={dataQ} onChange={e=>setDataQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();analyzeData();}}} placeholder={dataJson?"Ask anything about your data... E.g. 'Top 5 values by revenue' (Enter to analyze)":"Upload data file first, then ask questions here"} rows={2} style={{...S.inp,resize:"none"}} disabled={!dataJson}/>
              <button onClick={dataJson?analyzeData:()=>dataFileRef.current?.click()} disabled={loading||(!!dataJson&&!dataQ)} style={S.btn(!loading)}>
                {loading?"⏳ Analyzing...":(dataJson?"📊 Analyze Data → Chat":"📊 Upload Data File")}
              </button>
            </div>
          )}

          {activeTab==="alerts" && (
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>🔔 Smart Alerts Extractor</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:10}}>Extract deadlines, warnings, and action items from your documents</div>
              {documents.length > 0 ? (
                <>
                  <select value={alertDoc} onChange={e=>setAlertDoc(e.target.value)} style={S.inp}>
                    <option value="" style={{background:"#0f0f1a"}}>📄 Select a document to analyze</option>
                    {documents.map((d,i)=><option key={i} value={d} style={{background:"#0f0f1a"}}>{d}</option>)}
                  </select>
                  <button onClick={getAlerts} disabled={loading||!alertDoc} style={S.btn(!loading&&!!alertDoc)}>{loading?"⏳ Extracting alerts...":"🔔 Extract Smart Alerts → Chat"}</button>
                </>
              ) : (
                <>
                  <div style={{padding:"12px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,marginBottom:10,textAlign:"center"}}>
                    <div style={{fontSize:13,color:"#fcd34d",marginBottom:4}}>📄 No documents uploaded</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>Upload a PDF to extract alerts from it</div>
                  </div>
                  <button onClick={()=>fileRef.current?.click()} style={S.btn(true)}>📄 Upload PDF First</button>
                </>
              )}
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
        <div style={{position:"absolute",top:"5%",left:"5%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.06) 0%,transparent 70%)",animation:"orb 14s ease-in-out infinite"}}/>
        <div style={{position:"absolute",bottom:"5%",right:"5%",width:250,height:250,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.05) 0%,transparent 70%)",animation:"orb 18s ease-in-out infinite reverse"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.015) 1px,transparent 1px)",backgroundSize:"60px 60px"}}/>
      </div>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex"}}>
          <div onClick={()=>setSidebarOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)"}}/>
          <div style={{position:"relative",width:isMobile?"85vw":"290px",maxWidth:300,height:"100%",background:"rgba(6,6,16,0.99)",borderRight:"1px solid rgba(99,102,241,0.2)",display:"flex",flexDirection:"column",padding:"14px 12px",overflowY:"auto",zIndex:1,animation:"slideInLeft 0.25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>⚙️ Settings</div>
              <button onClick={()=>setSidebarOpen(false)} style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"#818cf8",fontSize:13}}>✕</button>
            </div>

            <div onDrop={e=>{e.preventDefault();Array.from(e.dataTransfer.files).forEach(f=>uploadFile(f));}} onDragOver={e=>e.preventDefault()} onClick={()=>fileRef.current?.click()} style={{border:"2px dashed rgba(99,102,241,0.25)",borderRadius:12,padding:"14px",textAlign:"center",cursor:"pointer",marginBottom:12,background:"rgba(99,102,241,0.03)",transition:"all 0.3s"}}>
              <div style={{fontSize:24,marginBottom:4,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>📄</div>
              <div style={{fontSize:12,color:"#a5b4fc",fontWeight:600}}>Drop PDF / CSV / Excel</div>
              <div style={{fontSize:10,color:"#374151",marginTop:2}}>or tap to browse</div>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:9,color:"#374151",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:6}}>Response Mode</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                {MODES.map(m=>(
                  <button key={m.id} onClick={()=>setMode(m.id)} style={{padding:"7px",background:mode===m.id?"rgba(99,102,241,0.2)":"rgba(99,102,241,0.04)",border:`1px solid ${mode===m.id?"rgba(99,102,241,0.4)":"rgba(99,102,241,0.1)"}`,borderRadius:8,cursor:"pointer",color:mode===m.id?"#a5b4fc":"#4b5563",fontSize:11,fontWeight:mode===m.id?700:400}}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:9,color:"#374151",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:6}}>Language</div>
              <select value={language} onChange={e=>setLanguage(e.target.value)} style={{width:"100%",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,padding:"8px 10px",color:"#c7d2fe",fontSize:12,outline:"none"}}>
                {LANGUAGES.map(l=><option key={l} value={l} style={{background:"#0f0f1a"}}>{l}</option>)}
              </select>
            </div>

            <div style={{flex:1}}>
              <div style={{fontSize:9,color:"#374151",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8}}>Documents ({documents.length})</div>
              {documents.length===0 ? (
                <div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:28,opacity:0.2}}>📂</div><div style={{fontSize:11,color:"#374151",marginTop:4}}>No documents yet</div></div>
              ) : documents.map((doc,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",background:"rgba(99,102,241,0.07)",borderRadius:8,marginBottom:4,border:"1px solid rgba(99,102,241,0.12)"}}>
                  <span style={{fontSize:11}}>📄</span>
                  <span style={{fontSize:10,color:"#c7d2fe",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={doc}>{doc}</span>
                  <button onClick={()=>axios.delete(`${API}/documents/${encodeURIComponent(doc)}`).then(fetchDocuments)} style={{background:"none",border:"none",cursor:"pointer",color:"#4b5563",fontSize:12}}>✕</button>
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
            <button onClick={loadHistory} title="Load History" style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:7,padding:"5px 8px",cursor:"pointer",color:"#818cf8",fontSize:12}}>🕐</button>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:documents.length>0?"#22c55e":"#6366f1",boxShadow:`0 0 6px ${documents.length>0?"#22c55e":"#6366f1"}`,animation:"pulse 2s ease-in-out infinite"}}/>
              <span style={{fontSize:10,color:"#4b5563"}}>{documents.length} doc{documents.length!==1?"s":""}</span>
            </div>
            <button onClick={()=>{setSidebarOpen(false);fileRef.current?.click();}} style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#fff",fontSize:11,fontWeight:700,flexShrink:0,boxShadow:"0 0 12px rgba(99,102,241,0.3)"}}>+ PDF</button>
            <input ref={fileRef} type="file" accept=".pdf,.csv,.xlsx,.xls" multiple style={{display:"none"}} onChange={e=>{Array.from(e.target.files||[]).forEach(f=>uploadFile(f));if(e.target)e.target.value="";}}/>
          </div>
        </div>

        {uploading && (
          <div style={{marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:10,color:"#a5b4fc"}}>⚙️ {uploadFileName}</span>
              <span style={{fontSize:10,color:"#6366f1"}}>{uploadProgress}%</span>
            </div>
            <div style={{background:"rgba(99,102,241,0.15)",borderRadius:99,height:3,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#6366f1,#a855f7)",width:`${uploadProgress}%`,transition:"width 0.3s"}}/>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:3,overflowX:"auto",paddingBottom:1}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:isMobile?"5px 7px":"5px 10px",background:activeTab===t.id?"rgba(99,102,241,0.22)":"transparent",border:`1px solid ${activeTab===t.id?"rgba(99,102,241,0.45)":"transparent"}`,borderRadius:8,cursor:"pointer",color:activeTab===t.id?"#a5b4fc":"#4b5563",fontSize:isMobile?9:11,fontWeight:activeTab===t.id?700:400,whiteSpace:"nowrap",transition:"all 0.2s",flexShrink:0}}>
              {t.icon}{!isMobile&&` ${t.label}`}
            </button>
          ))}
        </div>
      </div>

      {/* MESSAGES */}
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:isMobile?"10px":"12px 16px",display:"flex",flexDirection:"column",gap:10,zIndex:10,position:"relative"}}>

        {messages.length===0 && (
          <div style={{textAlign:"center",marginTop:isMobile?16:40,animation:"fadeIn 0.6s ease",padding:"0 10px"}}>
            <div style={{fontSize:isMobile?48:56,marginBottom:10,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>🧠</div>
            <div style={{fontSize:isMobile?18:22,fontWeight:800,color:"#fff",letterSpacing:"-1px",marginBottom:6}}>DocuMind AI</div>
            <div style={{fontSize:12,color:"#374151",marginBottom:16}}>World's most advanced document intelligence</div>
            <div style={{display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap",maxWidth:380,margin:"0 auto 16px"}}>
              {["⚡ Fast RAG","🎯 Citations","🌍 10 Languages","🎤 Voice","🎨 Image AI","📝 Auto Quiz","🌐 Web RAG","📺 YouTube","💼 Resume AI","📊 Data Analysis","🔔 Smart Alerts"].map((f,i)=>(
                <span key={i} style={{padding:"3px 8px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:99,fontSize:10,color:"#818cf8"}}>{f}</span>
              ))}
            </div>
            <button onClick={()=>fileRef.current?.click()} style={{padding:"12px 28px",background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:14,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 0 24px rgba(99,102,241,0.4)",animation:"pulse 2s ease-in-out infinite"}}>
              📄 Upload PDF to Start
            </button>
            {documents.length>0 && (
              <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",maxWidth:320,margin:"16px auto 0"}}>
                {["Summarize this document","What are the key points?","List important facts","Explain the methodology"].map((s,i)=>(
                  <button key={i} onClick={()=>sendMessage(s)} style={{padding:"7px 12px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.22)",borderRadius:99,fontSize:11,color:"#a5b4fc",cursor:"pointer"}}>{s}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{display:"flex",gap:7,flexDirection:msg.role==="user"?"row-reverse":"row",alignItems:"flex-start",animation:"slideIn 0.25s ease"}}>
            <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,background:msg.role==="user"?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,boxShadow:msg.role==="user"?"0 0 12px rgba(99,102,241,0.3)":"none"}}>
              {msg.role==="user"?"👤":"🧠"}
            </div>
            <div style={{maxWidth:isMobile?"88%":"80%",minWidth:60}}>
              <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3,justifyContent:msg.role==="user"?"flex-end":"flex-start",flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:"#374151",fontWeight:600}}>{msg.role==="user"?"You":"DocuMind AI"}</span>
                {msg.time&&<span style={{fontSize:9,color:"#1f2937"}}>{msg.time}</span>}
                {msg.confidence&&<span style={{fontSize:9,padding:"1px 6px",background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:99,color:"#86efac"}}>{msg.confidence}%</span>}
              </div>

              {msg.type==="summary"&&msg.summary&&(
                <div style={{...S.card,maxWidth:420}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:6}}>📊 {msg.summary.title||"Document Analysis"}</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:8,lineHeight:1.6}}>{msg.summary.summary}</div>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:8}}>{msg.summary.topics?.map((t:string,j:number)=>badge("#6366f1",t,j))}</div>
                  <div style={{background:"rgba(99,102,241,0.05)",borderRadius:8,padding:10,marginBottom:8}}>
                    {msg.summary.key_points?.map((p:string,j:number)=>(
                      <div key={j} style={{display:"flex",gap:5,marginBottom:4}}>
                        <span style={{color:"#6366f1",flexShrink:0,fontSize:10}}>◆</span>
                        <span style={{fontSize:11,color:"#9ca3af",lineHeight:1.5}}>{p}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:4}}>{badge("#f59e0b",`📚 ${msg.summary.difficulty||"N/A"}`,0)}{badge("#06b6d4",`⏱️ ${msg.summary.reading_time||"N/A"}`,1)}</div>
                </div>
              )}

              {msg.type==="image"&&msg.image_url&&(
                <div style={{background:"rgba(11,11,22,0.95)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:14,overflow:"hidden",maxWidth:420}}>
                  <ImageWithLoader url={msg.image_url} prompt={msg.content||""} />
                </div>
              )}

              {msg.type==="quiz"&&msg.quiz&&(
                <div style={{...S.card,maxWidth:480}}>
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

              {msg.type==="resume"&&msg.resume&&(
                <div style={{...S.card,maxWidth:420}}>
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
                  <div style={{marginBottom:6}}><div style={{fontSize:9,color:"#ef4444",fontWeight:700,marginBottom:3}}>❌ MISSING SKILLS</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{msg.resume.missing_skills?.map((s:string,i:number)=>badge("#ef4444",s,i))}</div></div>
                  <div><div style={{fontSize:9,color:"#6366f1",fontWeight:700,marginBottom:3}}>🎯 BEST ROLES</div><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{msg.resume.best_roles?.map((r:string,i:number)=>badge("#6366f1",r,i))}</div></div>
                </div>
              )}

              {msg.type==="alerts"&&msg.alerts&&(
                <div style={{...S.card,maxWidth:440}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>🔔 Smart Alerts</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:10,lineHeight:1.5}}>{msg.alerts.summary}</div>
                  {msg.alerts.alerts?.map((a:any,i:number)=>(
                    <div key={i} style={{padding:"9px 11px",background:a.priority==="high"?"rgba(239,68,68,0.07)":a.priority==="medium"?"rgba(245,158,11,0.07)":"rgba(99,102,241,0.05)",borderRadius:10,marginBottom:5,border:`1px solid ${a.priority==="high"?"rgba(239,68,68,0.2)":a.priority==="medium"?"rgba(245,158,11,0.2)":"rgba(99,102,241,0.12)"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                        <span style={{fontSize:11,fontWeight:600,color:"#e2e8f0",lineHeight:1.4,flex:1,marginRight:6}}>{a.title}</span>
                        {badge(a.priority==="high"?"#ef4444":a.priority==="medium"?"#f59e0b":"#6366f1",a.priority,i)}
                      </div>
                      <div style={{fontSize:11,color:"#9ca3af",lineHeight:1.5}}>{a.description}</div>
                      {a.date&&<div style={{fontSize:10,color:"#6366f1",marginTop:3}}>📅 {a.date}</div>}
                    </div>
                  ))}
                </div>
              )}

              {!msg.type&&msg.content&&(
                <div style={{position:"relative"}}>
                  <div style={{padding:"10px 13px",borderRadius:msg.role==="user"?"14px 4px 14px 14px":"4px 14px 14px 14px",background:msg.role==="user"?"linear-gradient(135deg,#4f46e5,#7c3aed)":"rgba(11,11,22,0.95)",border:`1px solid ${msg.role==="user"?"rgba(99,102,241,0.4)":"rgba(99,102,241,0.15)"}`,fontSize:13,lineHeight:1.75,color:"#e2e8f0",boxShadow:msg.role==="user"?"0 4px 16px rgba(99,102,241,0.2)":"0 2px 10px rgba(0,0,0,0.4)",whiteSpace:"pre-wrap"}} dangerouslySetInnerHTML={{__html:fmt(msg.content)}}/>
                  {msg.role==="assistant"&&msg.content&&(
                    <div style={{display:"flex",gap:4,marginTop:4}}>
                      <button onClick={()=>copyText(msg.content,msg.id)} style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:6,padding:"3px 8px",cursor:"pointer",color:"#818cf8",fontSize:10}}>{copied===msg.id?"✅ Copied":"📋 Copy"}</button>
                      <button onClick={()=>speak(msg.content)} style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:6,padding:"3px 8px",cursor:"pointer",color:"#818cf8",fontSize:10}}>🔊 Speak</button>
                    </div>
                  )}
                </div>
              )}

              {msg.sources&&msg.sources.length>0&&(
                <div style={{marginTop:4,display:"flex",gap:4,flexWrap:"wrap",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
                  {msg.sources.map((s,j)=><span key={j} style={{fontSize:9,padding:"2px 7px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:99,color:"#818cf8"}}>📄 {s}</span>)}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading&&(
          <div style={{display:"flex",gap:7,alignItems:"flex-start",animation:"slideIn 0.25s ease"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>🧠</div>
            <div style={{padding:"10px 14px",background:"rgba(11,11,22,0.95)",borderRadius:"4px 14px 14px 14px",border:"1px solid rgba(99,102,241,0.15)"}}>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:["#6366f1","#a855f7","#3b82f6"][i],animation:"bounce 0.8s ease-in-out infinite",animationDelay:`${i*0.18}s`}}/>)}
                <span style={{fontSize:11,color:"#374151",marginLeft:5}}>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FEATURE PANEL */}
      {renderFeaturePanel()}

      {/* CHAT INPUT */}
      <div style={{padding:isMobile?"8px 10px":"10px 14px",borderTop:"1px solid rgba(99,102,241,0.12)",background:"rgba(7,7,15,0.98)",backdropFilter:"blur(20px)",zIndex:20,position:"relative",flexShrink:0}}>
        <div style={{display:"flex",gap:6,alignItems:"flex-end",background:"rgba(99,102,241,0.05)",border:`1px solid ${input.trim()?"rgba(99,102,241,0.38)":"rgba(99,102,241,0.14)"}`,borderRadius:14,padding:"8px 10px",transition:"border-color 0.3s"}}>
          <button onClick={startVoice} style={{background:listening?"rgba(239,68,68,0.15)":"none",border:listening?"1px solid rgba(239,68,68,0.3)":"none",borderRadius:6,cursor:"pointer",fontSize:16,padding:"2px 4px",lineHeight:1,flexShrink:0,color:listening?"#ef4444":"#4b5563",transition:"all 0.2s"}}>{listening?"🔴":"🎤"}</button>
          <textarea
            ref={taRef}
            value={input}
            onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";}}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(activeTab!=="chat")setActiveTab("chat");sendMessage();}}}
            onFocus={()=>{if(activeTab!=="chat")setActiveTab("chat");}}
            placeholder={documents.length>0?"Ask anything about your documents... (🎤 voice available)":"Tap + PDF above to upload a document first"}
            disabled={loading}
            rows={1}
            style={{flex:1,background:"transparent",border:"none",color:"#e2e8f0",fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.6,maxHeight:100,overflowY:"auto"}}
          />
          <button
            onClick={()=>{if(activeTab!=="chat")setActiveTab("chat");sendMessage();}}
            disabled={loading||!input.trim()}
            style={{width:34,height:34,borderRadius:10,border:"none",background:!loading&&input.trim()?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.1)",cursor:!loading&&input.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,transition:"all 0.25s",flexShrink:0,boxShadow:input.trim()?"0 0 16px rgba(99,102,241,0.35)":"none"}}
          >
            {loading?<span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⏳</span>:"🚀"}
          </button>
        </div>
        <div style={{fontSize:9,color:"#111827",textAlign:"center",marginTop:4}}>Enter to send · Shift+Enter new line · 🎤 voice · 🕐 load history</div>
      </div>

      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0)}33%{transform:translate(20px,-15px)}66%{transform:translate(-15px,20px)}}
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











