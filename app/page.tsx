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
  type?: "chat"|"image"|"quiz"|"summary"|"resume"|"alerts"|"data";
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
const IMG_STYLES = [
  {id:"realistic",label:"Realistic",icon:"📷"},
  {id:"anime",label:"Anime",icon:"🎌"},
  {id:"cartoon",label:"Cartoon",icon:"🎨"},
  {id:"painting",label:"Painting",icon:"🖼️"},
  {id:"3d",label:"3D Render",icon:"🎮"},
];

function ImageWithLoader({url, prompt}: {url:string, prompt:string}) {
  const [status, setStatus] = useState<"loading"|"loaded"|"error">("loading");
  useEffect(() => { setStatus("loading"); }, [url]);
  return (
    <div style={{borderRadius:16,overflow:"hidden",background:"#0d0d1a"}}>
      {status==="loading" && (
        <div style={{padding:"40px 20px",textAlign:"center",background:"linear-gradient(135deg,rgba(99,102,241,0.08),rgba(168,85,247,0.08))"}}>
          <div style={{fontSize:36,marginBottom:12,display:"inline-block",animation:"spin 2s linear infinite"}}>⚙️</div>
          <div style={{fontSize:14,color:"#a5b4fc",fontWeight:600,marginBottom:4}}>Creating your image...</div>
          <div style={{fontSize:12,color:"#4b5563",marginBottom:16}}>This may take 15-30 seconds</div>
          <div style={{background:"rgba(99,102,241,0.15)",borderRadius:99,height:4,overflow:"hidden",maxWidth:200,margin:"0 auto"}}>
            <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#6366f1,#a855f7)",width:"70%",animation:"shimmer 1.5s ease-in-out infinite"}}/>
          </div>
        </div>
      )}
      {status==="error" && (
        <div style={{padding:"24px",textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:8}}>🖼️</div>
          <div style={{fontSize:13,color:"#9ca3af",marginBottom:12}}>Image still generating...</div>
          <a href={url} target="_blank" rel="noreferrer" style={{padding:"8px 16px",background:"rgba(99,102,241,0.2)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:8,color:"#a5b4fc",fontSize:12,textDecoration:"none",display:"inline-block"}}>🔗 Open Image</a>
        </div>
      )}
      <img src={url} alt={prompt} style={{width:"100%",display:status==="loaded"?"block":"none",maxHeight:400,objectFit:"cover"}} onLoad={()=>setStatus("loaded")} onError={()=>setStatus("error")}/>
      <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)"}}>
        <span style={{fontSize:12,color:"#6b7280",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🎨 {prompt}</span>
        <div style={{display:"flex",gap:8,flexShrink:0,marginLeft:12}}>
          <a href={url} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#818cf8",textDecoration:"none",padding:"4px 10px",background:"rgba(99,102,241,0.15)",borderRadius:6}}>🔗 Open</a>
          <a href={url} download style={{fontSize:12,color:"#a5b4fc",textDecoration:"none",padding:"4px 10px",background:"rgba(168,85,247,0.15)",borderRadius:6}}>⬇️ Save</a>
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
  const [documents, setDocuments] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("documind_docs");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
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

  useEffect(() => {
    const interval = setInterval(() => fetchDocuments(), 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const fetchDocuments = async () => {
    try {
      const r = await axios.get(`${API}/documents?session_id=${sessionId}`);
      const docs = r.data.documents || [];
      setDocuments(docs);
      if (typeof window !== "undefined") localStorage.setItem("documind_docs", JSON.stringify(docs));
      return docs;
    } catch { return []; }
  };

  const loadHistory = async () => {
    try {
      const r = await axios.get(`${API}/history/${sessionId}`);
      if (r.data.history && r.data.history.length > 0) {
        const msgs = r.data.history.slice(-20).map((h: any) => ({
          id: Math.random().toString(),
          role: h.role === "Human" ? "user" : "assistant",
          content: h.content || "",
          sources: [],
          time: h.timestamp ? new Date(h.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : ""
        })).filter((m: any) => m.content.length > 0);
        if (msgs.length > 0) setMessages(msgs);
      }
    } catch {}
  };

  const now = () => new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

  const addMsg = (msg: Partial<Message>) =>
    setMessages(p => [...p, {id:Math.random().toString(), time:now(), role:"assistant", content:"", ...msg} as Message]);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice"); return; }
    const r = new SR();
    r.lang = "en-US"; r.continuous = false;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
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

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true); setUploadProgress(0); setUploadFileName(file.name);
    const iv = setInterval(() => setUploadProgress(p => p < 85 ? p + 4 : p), 200);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("session_id", sessionId);
    try {
      const r = await axios.post(`${API}/upload`, fd);
      clearInterval(iv); setUploadProgress(100);
      if (file.name.match(/\.(csv|xlsx|xls)$/i)) {
        setDataJson(r.data.data_json || "");
        setDataInfo(r.data);
        addMsg({role:"assistant", content:`✅ **${file.name}** loaded!\n📊 ${r.data.rows} rows × ${r.data.columns?.length} columns ready.\n\nGo to **Data** tab to analyze.`});
        setActiveTab("data");
      } else {
        const newDocs = await fetchDocuments();
        if (typeof window !== "undefined") localStorage.setItem("documind_docs", JSON.stringify(newDocs));
        try {
          const sum = await axios.get(`${API}/summary/${encodeURIComponent(file.name)}?session_id=${sessionId}`);
          if (!sum.data.error) addMsg({role:"assistant", type:"summary", content:"", summary:sum.data});
          else addMsg({role:"assistant", content:`✅ **${file.name}** uploaded successfully!\n\nAsk me anything about this document.`});
        } catch { addMsg({role:"assistant", content:`✅ **${file.name}** uploaded!\n\nAsk me anything about this document.`}); }
      }
      setTimeout(() => { setUploading(false); setUploadProgress(0); setUploadFileName(""); setSidebarOpen(false); }, 600);
    } catch {
      clearInterval(iv); setUploading(false); setUploadProgress(0); setUploadFileName("");
      addMsg({role:"assistant", content:"❌ Upload failed. Please check if backend is running."});
    }
  }, [sessionId]);

  const sendMessage = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    if (documents.length === 0) {
      addMsg({role:"assistant", content:"⚠️ Please upload a PDF first using the **+ PDF** button above.\n\nI need a document to answer questions about."});
      return;
    }
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
          const lines = decoder.decode(value).split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              if (data.startsWith("[SOURCES]")) {
                sources = data.replace("[SOURCES]","").replace("[/SOURCES]","").split(",").filter(Boolean);
              } else if (data) {
                fullText += data;
                setMessages(p => p.map(m => m.id===msgId ? {...m, content:fullText, sources} : m));
              }
            }
          }
        }
      }
      setMessages(p => p.map(m => m.id===msgId ? {...m, content:fullText||"No response", sources, confidence:88} : m));
    } catch {
      setMessages(p => p.map(m => m.id===msgId ? {...m, content:"❌ Connection error. Please try again."} : m));
    }
    setLoading(false);
    setTimeout(() => taRef.current?.focus(), 100);
  };

  const generateImage = async () => {
    if (!imagePrompt.trim() || loading) return;
    const prompt = imagePrompt; setImagePrompt("");
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`🎨 Generate: ${prompt} [${imageStyle}]`, time:now()}]);
    setLoading(true);
    addMsg({role:"assistant", type:"image", content:prompt, image_url:""});
    try {
      const r = await axios.post(`${API}/generate-image`, {prompt, session_id:sessionId, style:imageStyle});
      if (r.data.image_url) {
        setMessages(p => {
          const msgs = [...p];
          const last = msgs[msgs.length-1];
          if (last && last.type==="image") last.image_url = r.data.image_url;
          return msgs;
        });
      }
    } catch { addMsg({content:"❌ Image generation failed. Try again."}); }
    setLoading(false);
  };

  const generateQuiz = async () => {
    if (loading) return;
    const freshDocs = await fetchDocuments();
    if (freshDocs.length === 0) { addMsg({content:"⚠️ Please upload a PDF first!"}); return; }
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`📝 Generate ${quizCount} question quiz`, time:now()}]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/quiz`, {num_questions:quizCount, session_id:sessionId});
      if (r.data.questions) { setQuizAnswers({}); setQuizSubmitted(false); addMsg({type:"quiz", content:"", quiz:r.data}); }
      else addMsg({content:`❌ ${r.data.error || "Quiz generation failed. Try again."}`});
    } catch { addMsg({content:"❌ Quiz failed. Please try again."}); }
    setLoading(false);
  };

  const compareDocuments = async () => {
    if (!compareQ||!doc1||!doc2||loading) return;
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`🔀 Comparing: "${compareQ}"\n📄 ${doc1} vs ${doc2}`, time:now()}]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/compare`, {question:compareQ, doc1, doc2, session_id:sessionId});
      addMsg({content:r.data.answer||r.data.error, sources:r.data.sources, confidence:r.data.confidence});
    } catch { addMsg({content:"❌ Comparison failed. Please try again."}); }
    setLoading(false);
    setCompareQ("");
  };

  const chatWithWebsite = async () => {
    if (!webUrl||!webQ||loading) return;
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`🌐 **${webUrl}**\n${webQ}`, time:now()}]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/website-chat`, {url:webUrl, question:webQ, session_id:sessionId});
      addMsg({content:r.data.answer||r.data.error});
    } catch { addMsg({content:"❌ Could not fetch website. Check URL."}); }
    setLoading(false);
    setWebQ("");
  };

  const chatWithYoutube = async () => {
    if (!ytUrl||!ytQ||loading) return;
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`📺 **${ytUrl}**\n${ytQ}`, time:now()}]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/youtube-chat`, {video_url:ytUrl, question:ytQ, session_id:sessionId});
      addMsg({content:r.data.answer||r.data.error});
    } catch { addMsg({content:"❌ YouTube chat failed. Check URL."}); }
    setLoading(false);
    setYtQ("");
  };

  const analyzeResume = async (file: File) => {
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`💼 Analyzing resume: **${file.name}**`, time:now()}]);
    setActiveTab("chat"); setLoading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await axios.post(`${API}/analyze-resume`, fd);
      if (r.data.error) addMsg({content:`❌ ${r.data.error}`});
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
    setDataQ("");
  };

  const getAlerts = async () => {
    if (!alertDoc||loading) return;
    setMessages(p => [...p, {id:Math.random().toString(), role:"user", content:`🔔 Extracting alerts from: **${alertDoc}**`, time:now()}]);
    setActiveTab("chat"); setLoading(true);
    try {
      const r = await axios.post(`${API}/smart-alerts`, {filename:alertDoc, session_id:sessionId});
      if (r.data.error) addMsg({content:`❌ ${r.data.error}`});
      else addMsg({type:"alerts", content:"", alerts:r.data});
    } catch { addMsg({content:"❌ Alert extraction failed."}); }
    setLoading(false);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(()=>setCopied(null), 2000);
  };

  const exportChat = () => {
    const text = messages.map(m=>`[${m.time}] ${m.role==="user"?"You":"DocuMind AI"}:\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text],{type:"text/plain"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="documind-chat.txt"; a.click();
  };

  const clearHistory = async () => {
    try { await axios.delete(`${API}/history/${sessionId}`); setMessages([]); setDocuments([]); localStorage.removeItem("documind_docs"); } catch {}
  };

  const calcScore = (quiz: any) => quiz?.questions?.filter((q:any,i:number)=>quizAnswers[i]===q.correct).length||0;

  const fmt = (s: string) => s
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.*?)\*/g,"<em>$1</em>")
    .replace(/`([^`]+)`/g,"<code style='background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace;color:#a5b4fc'>$1</code>")
    .replace(/^### (.+)$/gm,"<div style='font-size:15px;font-weight:700;color:#e2e8f0;margin:10px 0 4px'>$1</div>")
    .replace(/^## (.+)$/gm,"<div style='font-size:16px;font-weight:800;color:#c7d2fe;margin:12px 0 6px'>$1</div>")
    .replace(/^# (.+)$/gm,"<div style='font-size:18px;font-weight:800;color:#a5b4fc;margin:14px 0 8px'>$1</div>")
    .replace(/^• (.+)$/gm,"<div style='display:flex;gap:8px;margin:3px 0'><span style='color:#6366f1;flex-shrink:0'>◆</span><span>$1</span></div>")
    .replace(/^- (.+)$/gm,"<div style='display:flex;gap:8px;margin:3px 0'><span style='color:#6366f1;flex-shrink:0'>◆</span><span>$1</span></div>")
    .replace(/\n/g,"<br/>");

  const S = {
    card: {background:"rgba(13,13,26,0.98)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:16,padding:16} as React.CSSProperties,
    inp: {width:"100%",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10,padding:"11px 14px",color:"#e2e8f0",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box" as const,marginBottom:10,transition:"border-color 0.2s"},
    btn: (on=true) => ({padding:"12px",background:on?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.08)",border:on?"none":"1px solid rgba(99,102,241,0.2)",borderRadius:12,color:on?"#fff":"#4b5563",fontSize:13,fontWeight:600,cursor:on?"pointer":"not-allowed",width:"100%",transition:"all 0.2s",boxShadow:on?"0 0 20px rgba(99,102,241,0.3)":"none"}) as React.CSSProperties,
  };

  const renderPanel = () => {
    if (activeTab==="chat") return null;
    return (
      <div style={{borderTop:"1px solid rgba(99,102,241,0.12)",background:"rgba(7,7,18,0.99)",backdropFilter:"blur(24px)",padding:"16px",flexShrink:0,maxHeight:"58vh",overflowY:"auto"}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>

          {activeTab==="image" && (
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>🎨 AI Image Generator</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>Describe anything — portraits, landscapes, abstract art, products</div>
              <textarea value={imagePrompt} onChange={e=>setImagePrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();generateImage();}}} placeholder="A professional portrait of a CEO in modern office, dramatic lighting, photorealistic..." rows={3} style={{...S.inp,resize:"none"}}/>
              <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                {IMG_STYLES.map(s=>(
                  <button key={s.id} onClick={()=>setImageStyle(s.id)} style={{padding:"6px 14px",background:imageStyle===s.id?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.06)",border:`1px solid ${imageStyle===s.id?"transparent":"rgba(99,102,241,0.15)"}`,borderRadius:20,cursor:"pointer",color:imageStyle===s.id?"#fff":"#4b5563",fontSize:12,fontWeight:imageStyle===s.id?600:400,transition:"all 0.2s"}}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
              <button onClick={generateImage} disabled={loading||!imagePrompt.trim()} style={S.btn(!loading&&!!imagePrompt.trim())}>{loading?"⏳ Generating...":"🎨 Generate Image"}</button>
              <div style={{fontSize:11,color:"#374151",textAlign:"center",marginTop:8}}>Images appear in chat above • High quality • 1024×1024px</div>
            </div>
          )}

          {activeTab==="quiz" && (
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>📝 AI Quiz Generator</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>Auto-generate MCQ questions from your uploaded document</div>
              {documents.length > 0 ? (
                <>
                  <div style={{padding:"10px 14px",background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:10,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>✅</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#86efac"}}>{documents.length} document{documents.length>1?"s":""} ready</div>
                      <div style={{fontSize:11,color:"#4b5563"}}>{documents.slice(0,2).join(", ")}{documents.length>2?` +${documents.length-2} more`:""}</div>
                    </div>
                  </div>
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:"#6b7280",fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:"1px"}}>Number of Questions</div>
                    <div style={{display:"flex",gap:8}}>
                      {[3,5,10,15].map(n=>(
                        <button key={n} onClick={()=>setQuizCount(n)} style={{flex:1,padding:"10px 4px",background:quizCount===n?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.06)",border:`1px solid ${quizCount===n?"transparent":"rgba(99,102,241,0.15)"}`,borderRadius:10,cursor:"pointer",color:quizCount===n?"#fff":"#6b7280",fontSize:14,fontWeight:700,transition:"all 0.2s"}}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={generateQuiz} disabled={loading} style={S.btn(!loading)}>{loading?"⏳ Generating quiz...":"📝 Generate Quiz → Chat"}</button>
                </>
              ) : (
                <div onClick={()=>fileRef.current?.click()} style={{border:"2px dashed rgba(99,102,241,0.3)",borderRadius:14,padding:"28px",textAlign:"center",cursor:"pointer",background:"rgba(99,102,241,0.03)",transition:"all 0.3s"}}>
                  <div style={{fontSize:36,marginBottom:10,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>📄</div>
                  <div style={{fontSize:14,color:"#a5b4fc",fontWeight:600,marginBottom:4}}>Upload PDF to Generate Quiz</div>
                  <div style={{fontSize:12,color:"#374151"}}>Quiz will auto-generate after upload</div>
                </div>
              )}
            </div>
          )}

          {activeTab==="compare" && (
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>🔀 Document Comparison</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>Compare two documents side by side with AI analysis</div>
              {documents.length < 2 ? (
                <div>
                  <div style={{padding:"16px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:12,marginBottom:12,textAlign:"center"}}>
                    <div style={{fontSize:24,marginBottom:8}}>📄</div>
                    <div style={{fontSize:13,color:"#fcd34d",fontWeight:600,marginBottom:4}}>Need {2-documents.length} more PDF{2-documents.length>1?"s":""}</div>
                    <div style={{fontSize:12,color:"#6b7280"}}>You have {documents.length} document. Upload {2-documents.length} more to compare.</div>
                  </div>
                  <button onClick={()=>fileRef.current?.click()} style={S.btn()}>📄 Upload PDF</button>
                </div>
              ) : (
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                    <div>
                      <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>Document 1</div>
                      <select value={doc1} onChange={e=>setDoc1(e.target.value)} style={{...S.inp,marginBottom:0}}>
                        <option value="" style={{background:"#0f0f1a"}}>Select...</option>
                        {documents.map((d,i)=><option key={i} value={d} style={{background:"#0f0f1a"}}>{d.length>25?d.substring(0,25)+"...":d}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>Document 2</div>
                      <select value={doc2} onChange={e=>setDoc2(e.target.value)} style={{...S.inp,marginBottom:0}}>
                        <option value="" style={{background:"#0f0f1a"}}>Select...</option>
                        {documents.filter(d=>d!==doc1).map((d,i)=><option key={i} value={d} style={{background:"#0f0f1a"}}>{d.length>25?d.substring(0,25)+"...":d}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea value={compareQ} onChange={e=>setCompareQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();compareDocuments();}}} placeholder="What do you want to compare? E.g. 'Key differences in approach'" rows={2} style={{...S.inp,resize:"none"}}/>
                  <button onClick={compareDocuments} disabled={loading||!doc1||!doc2||!compareQ} style={S.btn(!loading&&!!doc1&&!!doc2&&!!compareQ)}>{loading?"⏳ Comparing...":"🔀 Compare Documents → Chat"}</button>
                </>
              )}
            </div>
          )}

          {activeTab==="web" && (
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>🌐 Website Intelligence</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>Ask questions about any website — news, docs, blogs, companies</div>
              <div style={{position:"relative",marginBottom:10}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14}}>🌐</span>
                <input value={webUrl} onChange={e=>setWebUrl(e.target.value)} placeholder="https://example.com" style={{...S.inp,paddingLeft:36,marginBottom:0}}/>
              </div>
              <textarea value={webQ} onChange={e=>setWebQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();chatWithWebsite();}}} placeholder="What do you want to know about this website?" rows={2} style={{...S.inp,resize:"none"}}/>
              <button onClick={chatWithWebsite} disabled={loading||!webUrl||!webQ} style={S.btn(!loading&&!!webUrl&&!!webQ)}>{loading?"⏳ Reading website...":"🌐 Ask Website → Chat"}</button>
            </div>
          )}

          {activeTab==="youtube" && (
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>📺 YouTube Intelligence</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>Ask questions about any YouTube video using its transcript</div>
              <div style={{position:"relative",marginBottom:10}}>
                <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14}}>📺</span>
                <input value={ytUrl} onChange={e=>setYtUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={{...S.inp,paddingLeft:36,marginBottom:0}}/>
              </div>
              <textarea value={ytQ} onChange={e=>setYtQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();chatWithYoutube();}}} placeholder="What do you want to know about this video?" rows={2} style={{...S.inp,resize:"none"}}/>
              <button onClick={chatWithYoutube} disabled={loading||!ytUrl||!ytQ} style={S.btn(!loading&&!!ytUrl&&!!ytQ)}>{loading?"⏳ Getting transcript...":"📺 Ask Video → Chat"}</button>
            </div>
          )}

          {activeTab==="resume" && (
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>💼 AI Resume Analyzer</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:16}}>Get ATS score, strengths, missing skills, and job recommendations</div>
              <div onClick={()=>resumeRef.current?.click()} style={{border:"2px dashed rgba(99,102,241,0.3)",borderRadius:14,padding:"28px",textAlign:"center",cursor:"pointer",background:"rgba(99,102,241,0.03)",transition:"all 0.3s"}}>
                <div style={{fontSize:36,marginBottom:10,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>📄</div>
                <div style={{fontSize:14,color:"#a5b4fc",fontWeight:600,marginBottom:4}}>Upload Resume PDF</div>
                <div style={{fontSize:12,color:"#374151"}}>PDF or TXT • Instant AI analysis</div>
              </div>
              <input ref={resumeRef} type="file" accept=".pdf,.txt" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)analyzeResume(f);if(e.target)e.target.value="";}}/>
              {loading&&<div style={{textAlign:"center",color:"#818cf8",fontSize:13,marginTop:12}}>⏳ Analyzing your resume...</div>}
            </div>
          )}

          {activeTab==="data" && (
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>📊 Data Analyst AI</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>Upload CSV or Excel and get instant AI insights</div>
              {dataJson ? (
                <div style={{padding:"12px 16px",background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:12,marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#86efac",marginBottom:4}}>✅ Data loaded successfully</div>
                  {dataInfo&&<div style={{fontSize:12,color:"#4b5563"}}>{dataInfo.rows} rows × {dataInfo.columns?.length} columns</div>}
                  {dataInfo?.columns&&<div style={{fontSize:11,color:"#374151",marginTop:4}}>📋 {dataInfo.columns.slice(0,4).join(", ")}{dataInfo.columns.length>4?` +${dataInfo.columns.length-4} more`:""}</div>}
                  <button onClick={()=>{setDataJson("");setDataInfo(null);}} style={{marginTop:8,fontSize:11,color:"#ef4444",background:"none",border:"none",cursor:"pointer"}}>✕ Remove data</button>
                </div>
              ) : (
                <div onClick={()=>dataFileRef.current?.click()} style={{border:"2px dashed rgba(99,102,241,0.3)",borderRadius:14,padding:"24px",textAlign:"center",cursor:"pointer",background:"rgba(99,102,241,0.03)",marginBottom:12,transition:"all 0.3s"}}>
                  <div style={{fontSize:36,marginBottom:10}}>📊</div>
                  <div style={{fontSize:14,color:"#a5b4fc",fontWeight:600,marginBottom:4}}>Upload CSV or Excel</div>
                  <div style={{fontSize:12,color:"#374151"}}>.csv, .xlsx, .xls supported</div>
                </div>
              )}
              <input ref={dataFileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f);if(e.target)e.target.value="";}}/>
              <textarea value={dataQ} onChange={e=>setDataQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();analyzeData();}}} placeholder={dataJson?"Ask anything: 'Top 5 by revenue', 'Average sales', 'Find outliers'...":"Upload data first, then ask questions"} rows={2} style={{...S.inp,resize:"none"}} disabled={!dataJson}/>
              <button onClick={dataJson?analyzeData:()=>dataFileRef.current?.click()} disabled={loading||(!!dataJson&&!dataQ)} style={S.btn(!loading)}>{loading?"⏳ Analyzing...":(dataJson?"📊 Analyze Data → Chat":"📊 Upload Data File")}</button>
            </div>
          )}

          {activeTab==="alerts" && (
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:4}}>🔔 Smart Alert Extractor</div>
              <div style={{fontSize:11,color:"#4b5563",marginBottom:12}}>Auto-extract deadlines, warnings, and action items from documents</div>
              {documents.length > 0 ? (
                <>
                  <div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>Select document to analyze:</div>
                  <select value={alertDoc} onChange={e=>setAlertDoc(e.target.value)} style={S.inp}>
                    <option value="" style={{background:"#0f0f1a"}}>📄 Choose document...</option>
                    {documents.map((d,i)=><option key={i} value={d} style={{background:"#0f0f1a"}}>{d}</option>)}
                  </select>
                  <button onClick={getAlerts} disabled={loading||!alertDoc} style={S.btn(!loading&&!!alertDoc)}>{loading?"⏳ Extracting alerts...":"🔔 Extract Smart Alerts → Chat"}</button>
                </>
              ) : (
                <div onClick={()=>fileRef.current?.click()} style={{border:"2px dashed rgba(99,102,241,0.3)",borderRadius:14,padding:"28px",textAlign:"center",cursor:"pointer",background:"rgba(99,102,241,0.03)",transition:"all 0.3s"}}>
                  <div style={{fontSize:36,marginBottom:10,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>📄</div>
                  <div style={{fontSize:14,color:"#a5b4fc",fontWeight:600,marginBottom:4}}>Upload PDF First</div>
                  <div style={{fontSize:12,color:"#374151"}}>Then extract deadlines and alerts</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",background:"#06060f",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden"}}>
      
      {/* Animated background */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",top:"5%",left:"5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%)",animation:"orb 16s ease-in-out infinite"}}/>
        <div style={{position:"absolute",bottom:"5%",right:"5%",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.06) 0%,transparent 70%)",animation:"orb 20s ease-in-out infinite reverse"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",width:250,height:250,borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.04) 0%,transparent 70%)",animation:"orb 12s ease-in-out infinite 4s"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.018) 1px,transparent 1px)",backgroundSize:"56px 56px"}}/>
      </div>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex"}}>
          <div onClick={()=>setSidebarOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)"}}/>
          <div style={{position:"relative",width:isMobile?"88vw":"300px",maxWidth:310,height:"100%",background:"rgba(6,6,16,0.99)",borderRight:"1px solid rgba(99,102,241,0.18)",display:"flex",flexDirection:"column",padding:"16px 14px",overflowY:"auto",zIndex:1,animation:"slideInLeft 0.25s ease"}}>
            
            {/* Sidebar header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🧠</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>DocuMind AI</div>
                  <div style={{fontSize:9,color:"#6366f1",fontWeight:700,letterSpacing:"1px"}}>SETTINGS</div>
                </div>
              </div>
              <button onClick={()=>setSidebarOpen(false)} style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,padding:"5px 10px",cursor:"pointer",color:"#818cf8",fontSize:14}}>✕</button>
            </div>

            {/* Upload area */}
            <div onDrop={e=>{e.preventDefault();Array.from(e.dataTransfer.files).forEach(f=>uploadFile(f));}} onDragOver={e=>e.preventDefault()} onClick={()=>fileRef.current?.click()} style={{border:"2px dashed rgba(99,102,241,0.28)",borderRadius:14,padding:"16px",textAlign:"center",cursor:"pointer",marginBottom:14,background:"rgba(99,102,241,0.03)",transition:"all 0.3s"}}>
              <div style={{fontSize:28,marginBottom:6,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>📄</div>
              <div style={{fontSize:12,color:"#a5b4fc",fontWeight:600}}>Drop files or tap to upload</div>
              <div style={{fontSize:10,color:"#374151",marginTop:2}}>PDF, CSV, Excel supported</div>
            </div>

            {/* Mode selector */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"#374151",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8}}>Response Mode</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {MODES.map(m=>(
                  <button key={m.id} onClick={()=>setMode(m.id)} style={{padding:"8px 6px",background:mode===m.id?"rgba(99,102,241,0.2)":"rgba(99,102,241,0.04)",border:`1px solid ${mode===m.id?"rgba(99,102,241,0.5)":"rgba(99,102,241,0.1)"}`,borderRadius:10,cursor:"pointer",color:mode===m.id?"#a5b4fc":"#4b5563",fontSize:12,fontWeight:mode===m.id?700:400,transition:"all 0.2s"}}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"#374151",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",marginBottom:8}}>Language</div>
              <select value={language} onChange={e=>setLanguage(e.target.value)} style={{width:"100%",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:10,padding:"9px 12px",color:"#c7d2fe",fontSize:13,outline:"none"}}>
                {LANGUAGES.map(l=><option key={l} value={l} style={{background:"#0f0f1a"}}>{l}</option>)}
              </select>
            </div>

            {/* Documents */}
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:10,color:"#374151",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase"}}>Documents ({documents.length})</div>
                <button onClick={fetchDocuments} style={{fontSize:10,color:"#6366f1",background:"none",border:"none",cursor:"pointer"}}>🔄 Refresh</button>
              </div>
              {documents.length===0 ? (
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <div style={{fontSize:32,opacity:0.2,marginBottom:6}}>📂</div>
                  <div style={{fontSize:11,color:"#374151"}}>No documents uploaded yet</div>
                </div>
              ) : documents.map((doc,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:"rgba(99,102,241,0.06)",borderRadius:10,marginBottom:5,border:"1px solid rgba(99,102,241,0.12)"}}>
                  <span style={{fontSize:14}}>📄</span>
                  <span style={{fontSize:11,color:"#c7d2fe",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={doc}>{doc}</span>
                  <button onClick={()=>axios.delete(`${API}/documents/${encodeURIComponent(doc)}?session_id=${sessionId}`).then(fetchDocuments)} style={{background:"none",border:"none",cursor:"pointer",color:"#4b5563",fontSize:13,padding:"2px"}}>✕</button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{paddingTop:12,borderTop:"1px solid rgba(99,102,241,0.1)",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
              <button onClick={exportChat} style={{padding:"8px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,cursor:"pointer",color:"#818cf8",fontSize:11,fontWeight:600}}>📥 Export</button>
              <button onClick={clearHistory} style={{padding:"8px",background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,cursor:"pointer",color:"#f87171",fontSize:11,fontWeight:600}}>🗑️ Clear</button>
            </div>
            <div style={{textAlign:"center",fontSize:10,color:"#1f2937"}}>Built by <span style={{color:"#818cf8",fontWeight:600}}>Aryan Dhiman</span> • DocuMind AI</div>
          </div>
        </div>
      )}

      {/* TOPBAR */}
      <div style={{padding:isMobile?"8px 12px":"10px 18px",borderBottom:"1px solid rgba(99,102,241,0.1)",background:"rgba(6,6,15,0.98)",backdropFilter:"blur(24px)",zIndex:30,position:"relative",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:9,padding:"7px 11px",cursor:"pointer",color:"#818cf8",fontSize:15,lineHeight:1,flexShrink:0}}>☰</button>
          
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
            <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 0 16px rgba(99,102,241,0.5)",flexShrink:0,animation:"glow 3s ease-in-out infinite"}}>🧠</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:isMobile?14:16,fontWeight:800,color:"#fff",lineHeight:1.2,letterSpacing:"-0.5px"}}>DocuMind AI</div>
              <div style={{fontSize:9,color:"#6366f1",fontWeight:700,letterSpacing:"1.5px"}}>RAG · GROQ · FAISS</div>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <button onClick={loadHistory} title="Load History" style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:8,padding:"6px 9px",cursor:"pointer",color:"#818cf8",fontSize:13}}>🕐</button>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:documents.length>0?"#22c55e":"#6366f1",boxShadow:`0 0 8px ${documents.length>0?"#22c55e":"#6366f1"}`,animation:"pulse 2s ease-in-out infinite"}}/>
              <span style={{fontSize:11,color:"#4b5563",fontWeight:500}}>{documents.length} doc{documents.length!==1?"s":""}</span>
            </div>
            <button onClick={()=>{setSidebarOpen(false);fileRef.current?.click();}} style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:9,padding:"7px 14px",cursor:"pointer",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0,boxShadow:"0 0 14px rgba(99,102,241,0.35)",letterSpacing:"0.3px"}}>+ PDF</button>
            <input ref={fileRef} type="file" accept=".pdf,.csv,.xlsx,.xls" multiple style={{display:"none"}} onChange={e=>{Array.from(e.target.files||[]).forEach(f=>uploadFile(f));if(e.target)e.target.value="";}}/>
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div style={{marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:11,color:"#a5b4fc"}}>⚙️ {uploadFileName}</span>
              <span style={{fontSize:11,color:"#6366f1",fontWeight:600}}>{uploadProgress}%</span>
            </div>
            <div style={{background:"rgba(99,102,241,0.12)",borderRadius:99,height:3,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#6366f1,#a855f7,#3b82f6)",width:`${uploadProgress}%`,transition:"width 0.3s"}}/>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:2,overflowX:"auto",paddingBottom:1,scrollbarWidth:"none"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{if(t.id==="quiz"){window.location.href="/quiz";return;}setActiveTab(t.id);}} style={{padding:isMobile?"5px 8px":"6px 12px",background:activeTab===t.id?"rgba(99,102,241,0.2)":"transparent",border:`1px solid ${activeTab===t.id?"rgba(99,102,241,0.4)":"transparent"}`,borderRadius:8,cursor:"pointer",color:activeTab===t.id?"#a5b4fc":"#4b5563",fontSize:isMobile?10:12,fontWeight:activeTab===t.id?700:400,whiteSpace:"nowrap",transition:"all 0.2s",flexShrink:0}}>
              {t.icon}{!isMobile&&` ${t.label}`}
            </button>
          ))}
        </div>
      </div>

      {/* MESSAGES */}
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:isMobile?"10px 12px":"14px 20px",display:"flex",flexDirection:"column",gap:12,zIndex:10,position:"relative"}}>
        
        {/* Welcome screen */}
        {messages.length===0 && (
          <div style={{textAlign:"center",marginTop:isMobile?20:50,animation:"fadeIn 0.6s ease",padding:"0 12px"}}>
            <div style={{fontSize:isMobile?52:64,marginBottom:12,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>🧠</div>
            <div style={{fontSize:isMobile?20:26,fontWeight:800,color:"#fff",letterSpacing:"-1px",marginBottom:6}}>DocuMind AI</div>
            <div style={{fontSize:13,color:"#374151",marginBottom:20}}>World&apos;s most advanced document intelligence platform</div>
            
            <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",maxWidth:440,margin:"0 auto 24px"}}>
              {["⚡ Fast RAG","🎯 Citations","🌍 10 Languages","🎤 Voice","🎨 Image AI","📝 Auto Quiz","🌐 Web RAG","📺 YouTube","💼 Resume AI","📊 Data Analysis","🔔 Smart Alerts"].map((f,i)=>(
                <span key={i} style={{padding:"4px 10px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:99,fontSize:11,color:"#6366f1",fontWeight:500}}>{f}</span>
              ))}
            </div>

            <button onClick={()=>fileRef.current?.click()} style={{padding:"14px 32px",background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:16,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 0 28px rgba(99,102,241,0.45)",animation:"pulse 2s ease-in-out infinite",marginBottom:20}}>
              📄 Upload PDF to Start
            </button>

            {documents.length>0 && (
              <div>
                <div style={{fontSize:12,color:"#374151",marginBottom:10}}>Quick questions:</div>
                <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",maxWidth:380,margin:"0 auto"}}>
                  {["Summarize this document","What are the key points?","List all important facts","Explain the main concepts"].map((s,i)=>(
                    <button key={i} onClick={()=>sendMessage(s)} style={{padding:"8px 14px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:20,fontSize:12,color:"#a5b4fc",cursor:"pointer",transition:"all 0.2s"}}>{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} style={{display:"flex",gap:8,flexDirection:msg.role==="user"?"row-reverse":"row",alignItems:"flex-start",animation:"slideIn 0.25s ease"}}>
            <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,background:msg.role==="user"?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.1)",border:`1px solid ${msg.role==="user"?"rgba(99,102,241,0.5)":"rgba(99,102,241,0.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:msg.role==="user"?"0 0 14px rgba(99,102,241,0.3)":"none",marginTop:2}}>
              {msg.role==="user"?"👤":"🧠"}
            </div>
            
            <div style={{maxWidth:isMobile?"90%":"78%",minWidth:60}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,justifyContent:msg.role==="user"?"flex-end":"flex-start",flexWrap:"wrap"}}>
                <span style={{fontSize:11,color:"#374151",fontWeight:600}}>{msg.role==="user"?"You":"DocuMind AI"}</span>
                {msg.time&&<span style={{fontSize:10,color:"#1f2937"}}>{msg.time}</span>}
                {msg.confidence&&<span style={{fontSize:10,padding:"1px 7px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:99,color:"#86efac",fontWeight:600}}>{msg.confidence}% confident</span>}
              </div>

              {/* Summary card */}
              {msg.type==="summary"&&msg.summary&&(
                <div style={{...S.card,maxWidth:440}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:8}}>📊 {msg.summary.title||"Document Analysis"}</div>
                  <div style={{fontSize:13,color:"#9ca3af",marginBottom:10,lineHeight:1.7}}>{msg.summary.summary}</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
                    {msg.summary.topics?.map((t:string,j:number)=><span key={j} style={{fontSize:10,padding:"3px 8px",background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:99,color:"#818cf8"}}>{t}</span>)}
                  </div>
                  <div style={{background:"rgba(99,102,241,0.04)",borderRadius:10,padding:12,marginBottom:10}}>
                    {msg.summary.key_points?.map((p:string,j:number)=>(
                      <div key={j} style={{display:"flex",gap:8,marginBottom:5}}>
                        <span style={{color:"#6366f1",flexShrink:0,fontSize:11,marginTop:1}}>◆</span>
                        <span style={{fontSize:12,color:"#9ca3af",lineHeight:1.6}}>{p}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,padding:"3px 10px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:99,color:"#fcd34d"}}>📚 {msg.summary.difficulty}</span>
                    <span style={{fontSize:11,padding:"3px 10px",background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:99,color:"#67e8f9"}}>⏱️ {msg.summary.reading_time}</span>
                  </div>
                </div>
              )}

              {/* Image */}
              {msg.type==="image"&&(
                <div style={{maxWidth:440}}>
                  {msg.image_url ? <ImageWithLoader url={msg.image_url} prompt={msg.content||""}/> : (
                    <div style={{...S.card,textAlign:"center",padding:"32px"}}>
                      <div style={{fontSize:32,marginBottom:10,animation:"spin 2s linear infinite",display:"inline-block"}}>⚙️</div>
                      <div style={{fontSize:13,color:"#a5b4fc"}}>Generating image...</div>
                    </div>
                  )}
                </div>
              )}

              {/* Quiz */}
              {msg.type==="quiz"&&msg.quiz&&(
                <div style={{...S.card,maxWidth:500}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:12}}>📝 Quiz — {msg.quiz.questions?.length} Questions</div>
                  {msg.quiz.questions?.map((q:any,qi:number)=>(
                    <div key={qi} style={{marginBottom:14,background:"rgba(99,102,241,0.04)",borderRadius:12,padding:12,border:"1px solid rgba(99,102,241,0.08)"}}>
                      <div style={{fontSize:13,color:"#e2e8f0",fontWeight:600,marginBottom:8,lineHeight:1.6}}>Q{qi+1}. {q.question}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:5}}>
                        {q.options?.map((opt:string,oi:number)=>{
                          const letter=opt.charAt(0);
                          const sel=quizAnswers[qi]===letter;
                          const correct=quizSubmitted&&letter===q.correct;
                          const wrong=quizSubmitted&&sel&&letter!==q.correct;
                          return (
                            <button key={oi} onClick={()=>!quizSubmitted&&setQuizAnswers(a=>({...a,[qi]:letter}))} style={{padding:"9px 12px",background:correct?"rgba(34,197,94,0.12)":wrong?"rgba(239,68,68,0.12)":sel?"rgba(99,102,241,0.18)":"rgba(99,102,241,0.04)",border:`1px solid ${correct?"rgba(34,197,94,0.35)":wrong?"rgba(239,68,68,0.35)":sel?"rgba(99,102,241,0.4)":"rgba(99,102,241,0.1)"}`,borderRadius:9,cursor:quizSubmitted?"default":"pointer",color:correct?"#86efac":wrong?"#fca5a5":sel?"#a5b4fc":"#6b7280",fontSize:12,textAlign:"left",transition:"all 0.2s",lineHeight:1.5}}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {quizSubmitted&&q.explanation&&<div style={{marginTop:8,padding:"8px 10px",background:"rgba(99,102,241,0.07)",borderRadius:8,fontSize:11,color:"#818cf8",lineHeight:1.6}}>💡 {q.explanation}</div>}
                    </div>
                  ))}
                  {!quizSubmitted?(
                    <button onClick={()=>setQuizSubmitted(true)} style={{padding:"11px",background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:11,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>Submit Answers</button>
                  ):(
                    <div style={{textAlign:"center",padding:"16px",background:"rgba(99,102,241,0.06)",borderRadius:12,border:"1px solid rgba(99,102,241,0.12)"}}>
                      <div style={{fontSize:28,fontWeight:800,color:calcScore(msg.quiz)>=msg.quiz.questions.length*0.7?"#86efac":"#fca5a5"}}>{calcScore(msg.quiz)}/{msg.quiz.questions?.length}</div>
                      <div style={{fontSize:12,color:"#6b7280",marginTop:4}}>{calcScore(msg.quiz)>=msg.quiz.questions.length*0.7?"🎉 Excellent work!":"📚 Keep practicing!"}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Resume */}
              {msg.type==="resume"&&msg.resume&&(
                <div style={{...S.card,maxWidth:440}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:12}}>💼 {msg.resume.name||"Resume Analysis"}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                    {[{v:msg.resume.score||0,l:"Resume Score",c:"#a5b4fc",bg:"rgba(99,102,241,0.08)"},{v:msg.resume.ats_score||0,l:"ATS Score",c:"#86efac",bg:"rgba(34,197,94,0.08)"},{v:msg.resume.experience_level||"N/A",l:"Level",c:"#fcd34d",bg:"rgba(245,158,11,0.08)"}].map((item,i)=>(
                      <div key={i} style={{background:item.bg,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1px solid ${item.c}22`}}>
                        <div style={{fontSize:18,fontWeight:800,color:item.c}}>{item.v}{typeof item.v==="number"?"%":""}</div>
                        <div style={{fontSize:9,color:"#4b5563",marginTop:2}}>{item.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:10,lineHeight:1.7}}>{msg.resume.summary}</div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:10,color:"#22c55e",fontWeight:700,marginBottom:4}}>✅ STRENGTHS</div>
                    {msg.resume.strengths?.map((s:string,i:number)=><div key={i} style={{fontSize:12,color:"#9ca3af",marginBottom:3}}>• {s}</div>)}
                  </div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:10,color:"#ef4444",fontWeight:700,marginBottom:4}}>❌ MISSING SKILLS</div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{msg.resume.missing_skills?.map((s:string,i:number)=><span key={i} style={{fontSize:10,padding:"2px 8px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:99,color:"#fca5a5"}}>{s}</span>)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#6366f1",fontWeight:700,marginBottom:4}}>🎯 BEST ROLES</div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{msg.resume.best_roles?.map((r:string,i:number)=><span key={i} style={{fontSize:10,padding:"2px 8px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:99,color:"#818cf8"}}>{r}</span>)}</div>
                  </div>
                </div>
              )}

              {/* Alerts */}
              {msg.type==="alerts"&&msg.alerts&&(
                <div style={{...S.card,maxWidth:460}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#c7d2fe",marginBottom:6}}>🔔 Smart Alerts</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginBottom:12,lineHeight:1.6}}>{msg.alerts.summary}</div>
                  {msg.alerts.alerts?.map((a:any,i:number)=>(
                    <div key={i} style={{padding:"10px 14px",background:a.priority==="high"?"rgba(239,68,68,0.06)":a.priority==="medium"?"rgba(245,158,11,0.06)":"rgba(99,102,241,0.04)",borderRadius:11,marginBottom:6,border:`1px solid ${a.priority==="high"?"rgba(239,68,68,0.18)":a.priority==="medium"?"rgba(245,158,11,0.18)":"rgba(99,102,241,0.12)"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:600,color:"#e2e8f0",lineHeight:1.4,flex:1,marginRight:8}}>{a.title}</span>
                        <span style={{fontSize:9,padding:"2px 7px",background:a.priority==="high"?"rgba(239,68,68,0.15)":a.priority==="medium"?"rgba(245,158,11,0.15)":"rgba(99,102,241,0.15)",border:`1px solid ${a.priority==="high"?"rgba(239,68,68,0.3)":a.priority==="medium"?"rgba(245,158,11,0.3)":"rgba(99,102,241,0.3)"}`,borderRadius:99,color:a.priority==="high"?"#fca5a5":a.priority==="medium"?"#fcd34d":"#818cf8",flexShrink:0,fontWeight:600}}>{a.priority}</span>
                      </div>
                      <div style={{fontSize:12,color:"#9ca3af",lineHeight:1.5}}>{a.description}</div>
                      {a.date&&<div style={{fontSize:11,color:"#6366f1",marginTop:4}}>📅 {a.date}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Regular chat message */}
              {!msg.type&&msg.content&&(
                <div>
                  <div style={{padding:"12px 16px",borderRadius:msg.role==="user"?"16px 4px 16px 16px":"4px 16px 16px 16px",background:msg.role==="user"?"linear-gradient(135deg,#4f46e5,#7c3aed)":"rgba(13,13,26,0.98)",border:`1px solid ${msg.role==="user"?"rgba(99,102,241,0.45)":"rgba(99,102,241,0.12)"}`,fontSize:13,lineHeight:1.8,color:"#e2e8f0",boxShadow:msg.role==="user"?"0 4px 20px rgba(99,102,241,0.2)":"0 2px 12px rgba(0,0,0,0.4)"}} dangerouslySetInnerHTML={{__html:fmt(msg.content)}}/>
                  {msg.role==="assistant"&&msg.content&&(
                    <div style={{display:"flex",gap:5,marginTop:5}}>
                      <button onClick={()=>copyText(msg.content,msg.id)} style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#818cf8",fontSize:11}}>{copied===msg.id?"✅ Copied":"📋 Copy"}</button>
                      <button onClick={()=>speak(msg.content)} style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#818cf8",fontSize:11}}>🔊 Speak</button>
                    </div>
                  )}
                </div>
              )}

              {/* Sources */}
              {msg.sources&&msg.sources.length>0&&(
                <div style={{marginTop:5,display:"flex",gap:4,flexWrap:"wrap",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
                  {msg.sources.map((s,j)=><span key={j} style={{fontSize:10,padding:"2px 8px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:99,color:"#6b7280"}}>📄 {s}</span>)}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading&&(
          <div style={{display:"flex",gap:8,alignItems:"flex-start",animation:"slideIn 0.25s ease"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,marginTop:2}}>🧠</div>
            <div style={{padding:"12px 16px",background:"rgba(13,13,26,0.98)",borderRadius:"4px 16px 16px 16px",border:"1px solid rgba(99,102,241,0.12)"}}>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:["#6366f1","#a855f7","#3b82f6"][i],animation:"bounce 0.9s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}
                <span style={{fontSize:12,color:"#374151",marginLeft:6}}>DocuMind is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FEATURE PANEL */}
      {renderPanel()}

      {/* INPUT */}
      <div style={{padding:isMobile?"8px 12px 12px":"10px 18px 14px",borderTop:"1px solid rgba(99,102,241,0.1)",background:"rgba(6,6,15,0.99)",backdropFilter:"blur(24px)",zIndex:20,position:"relative",flexShrink:0}}>
        <div style={{display:"flex",gap:8,alignItems:"flex-end",background:"rgba(99,102,241,0.04)",border:`1px solid ${input.trim()?"rgba(99,102,241,0.35)":"rgba(99,102,241,0.12)"}`,borderRadius:16,padding:"10px 12px",transition:"border-color 0.3s",boxShadow:input.trim()?"0 0 20px rgba(99,102,241,0.1)":"none"}}>
          <button onClick={startVoice} style={{background:listening?"rgba(239,68,68,0.15)":"none",border:listening?"1px solid rgba(239,68,68,0.3)":"none",borderRadius:7,cursor:"pointer",fontSize:18,padding:"2px 4px",lineHeight:1,flexShrink:0,color:listening?"#ef4444":"#374151",transition:"all 0.2s"}}>{listening?"🔴":"🎤"}</button>
          <textarea
            ref={taRef}
            value={input}
            onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(activeTab!=="chat")setActiveTab("chat");sendMessage();}}}
            onFocus={()=>{if(activeTab!=="chat")setActiveTab("chat");}}
            placeholder={documents.length>0?"Ask anything about your documents... (Enter to send)":"Upload a PDF to start asking questions"}
            disabled={loading}
            rows={1}
            style={{flex:1,background:"transparent",border:"none",color:"#e2e8f0",fontSize:14,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.7,maxHeight:120,overflowY:"auto"}}
          />
          <button onClick={()=>{if(activeTab!=="chat")setActiveTab("chat");sendMessage();}} disabled={loading||!input.trim()} style={{width:38,height:38,borderRadius:12,border:"none",background:!loading&&input.trim()?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.08)",cursor:!loading&&input.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,transition:"all 0.25s",flexShrink:0,boxShadow:input.trim()?"0 0 18px rgba(99,102,241,0.4)":"none"}}>
            {loading?<span style={{animation:"spin 1s linear infinite",display:"inline-block",fontSize:14}}>⏳</span>:"🚀"}
          </button>
        </div>
        <div style={{fontSize:10,color:"#111827",textAlign:"center",marginTop:5}}>Enter to send · Shift+Enter for new line · 🎤 voice input · 🕐 load history</div>
      </div>

      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(25px,-20px) scale(1.05)}66%{transform:translate(-20px,25px) scale(0.95)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 16px rgba(99,102,241,0.5)}50%{box-shadow:0 0 32px rgba(99,102,241,0.9),0 0 60px rgba(168,85,247,0.4)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{width:30%}50%{width:80%}100%{width:30%}}
        *{scrollbar-width:thin;scrollbar-color:#6366f1 #0a0a18;-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:linear-gradient(#6366f1,#a855f7);border-radius:99px}
        textarea::placeholder{color:#1f2937}
        select option{background:#0a0a18;color:#e2e8f0}
        button:active{transform:scale(0.96)}
        input[type="file"]{display:none!important}
      `}</style>
    </div>
  );
}
