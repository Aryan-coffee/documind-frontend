"use client";
import { useState, useRef } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Question {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

export default function QuizPage() {
  const [step, setStep] = useState<"upload"|"config"|"quiz"|"result">("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState("");
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{[k:number]:string}>({});
  const [quizCount, setQuizCount] = useState(5);
  const [currentQ, setCurrentQ] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadPDF = async (file: File) => {
    if (!file.name.endsWith(".pdf")) { alert("Only PDF!"); return; }
    setUploading(true); setUploadProgress(0); setError("");
    const iv = setInterval(() => setUploadProgress(p => p < 88 ? p + 4 : p), 200);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("session_id", "quiz_" + Date.now());
    try {
      const r = await axios.post(`${API}/upload`, fd);
      clearInterval(iv); setUploadProgress(100);
      if (r.data.error) { setError(r.data.error); setUploading(false); return; }
      setUploadedFile(file.name);
      setTimeout(() => { setUploading(false); setStep("config"); }, 500);
    } catch(e: any) {
      clearInterval(iv); setUploading(false);
      setError("Upload failed. Is backend running on port 8000?");
    }
  };

  const generateQuiz = async () => {
    setGenerating(true); setError("");
    try {
      const r = await axios.post(`${API}/quiz`, { num_questions: quizCount });
      if (r.data.error) { setError(r.data.error); setGenerating(false); return; }
      if (r.data.questions && r.data.questions.length > 0) {
        setQuestions(r.data.questions);
        setAnswers({});
        setSubmitted(false);
        setCurrentQ(0);
        setStep("quiz");
      } else {
        setError("No questions generated. Try again.");
      }
    } catch(e: any) {
      setError("Quiz generation failed: " + (e?.message || "Unknown error"));
    }
    setGenerating(false);
  };

  const score = questions.filter((q,i) => answers[i] === q.correct).length;
  const percent = questions.length > 0 ? Math.round((score/questions.length)*100) : 0;

  const grade = percent >= 90 ? {l:"A+",c:"#22c55e",m:"Outstanding! 🏆"} :
                percent >= 80 ? {l:"A",c:"#86efac",m:"Excellent! 🎉"} :
                percent >= 70 ? {l:"B",c:"#fbbf24",m:"Good job! 👍"} :
                percent >= 60 ? {l:"C",c:"#f97316",m:"Keep going! 📚"} :
                                {l:"D",c:"#ef4444",m:"Study more! 💪"};

  return (
    <div style={{minHeight:"100vh",background:"#07070f",fontFamily:"'Segoe UI',system-ui,sans-serif",padding:"20px 16px"}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",top:"10%",left:"10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%)",animation:"orb 14s ease-in-out infinite"}}/>
        <div style={{position:"absolute",bottom:"10%",right:"10%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.05) 0%,transparent 70%)",animation:"orb 18s ease-in-out infinite reverse"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(99,102,241,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.015) 1px,transparent 1px)",backgroundSize:"60px 60px"}}/>
      </div>

      <div style={{maxWidth:640,margin:"0 auto",position:"relative",zIndex:10}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:6,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>📝</div>
          <div style={{fontSize:26,fontWeight:800,color:"#fff",letterSpacing:"-1px"}}>DocuMind Quiz</div>
          <div style={{fontSize:12,color:"#4b5563",marginTop:4}}>AI-powered quiz generator from any PDF</div>
          <a href="/" style={{display:"inline-block",marginTop:10,padding:"5px 14px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,color:"#818cf8",fontSize:12,textDecoration:"none"}}>← Back to Chat</a>
        </div>

        {/* Steps */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24}}>
          {[{id:"upload",label:"Upload",icon:"📄"},{id:"config",label:"Configure",icon:"⚙️"},{id:"quiz",label:"Quiz",icon:"📝"},{id:"result",label:"Result",icon:"🏆"}].map((s,i,arr)=>{
            const steps = ["upload","config","quiz","result"];
            const current = steps.indexOf(step);
            const idx = steps.indexOf(s.id);
            return (
              <div key={s.id} style={{display:"flex",alignItems:"center"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:current===idx?"linear-gradient(135deg,#6366f1,#a855f7)":current>idx?"rgba(99,102,241,0.25)":"rgba(99,102,241,0.06)",border:`2px solid ${current===idx?"#6366f1":current>idx?"rgba(99,102,241,0.4)":"rgba(99,102,241,0.12)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,transition:"all 0.3s",color:current===idx?"#fff":current>idx?"#818cf8":"#374151"}}>
                    {current>idx?"✓":s.icon}
                  </div>
                  <span style={{fontSize:9,color:current===idx?"#a5b4fc":"#374151",fontWeight:current===idx?700:400}}>{s.label}</span>
                </div>
                {i<arr.length-1&&<div style={{width:36,height:2,background:current>idx?"rgba(99,102,241,0.35)":"rgba(99,102,241,0.08)",margin:"0 4px",marginBottom:18,transition:"all 0.3s"}}/>}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{padding:"12px 16px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:10,marginBottom:16,fontSize:12,color:"#fca5a5",display:"flex",alignItems:"center",gap:8}}>
            <span>❌</span>{error}
            <button onClick={()=>setError("")} style={{marginLeft:"auto",background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
        )}

        {/* UPLOAD */}
        {step==="upload" && (
          <div style={{background:"rgba(11,11,22,0.95)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:20,padding:24}}>
            <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:4}}>📄 Upload Your PDF</div>
            <div style={{fontSize:12,color:"#4b5563",marginBottom:16}}>Upload any PDF — lecture notes, research paper, textbook chapter</div>

            {!uploading ? (
              <div onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)uploadPDF(f);}} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${dragOver?"#6366f1":"rgba(99,102,241,0.28)"}`,borderRadius:16,padding:"40px 20px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.03)",transition:"all 0.3s"}}>
                <div style={{fontSize:44,marginBottom:10,display:"inline-block",animation:"float 3s ease-in-out infinite"}}>📄</div>
                <div style={{fontSize:15,fontWeight:700,color:"#a5b4fc",marginBottom:6}}>Drop PDF here or tap to browse</div>
                <div style={{fontSize:11,color:"#374151"}}>Any PDF document works</div>
                <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadPDF(f);if(e.target)e.target.value="";}}/>
              </div>
            ) : (
              <div style={{padding:"28px",textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:10,display:"inline-block",animation:"spin 1.5s linear infinite"}}>⚙️</div>
                <div style={{fontSize:14,fontWeight:700,color:"#a5b4fc",marginBottom:4}}>Processing PDF...</div>
                <div style={{fontSize:11,color:"#4b5563",marginBottom:14}}>Building AI knowledge base from your document</div>
                <div style={{background:"rgba(99,102,241,0.12)",borderRadius:99,height:8,overflow:"hidden",maxWidth:280,margin:"0 auto"}}>
                  <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#6366f1,#a855f7)",width:`${uploadProgress}%`,transition:"width 0.3s"}}/>
                </div>
                <div style={{fontSize:13,color:"#6366f1",marginTop:8,fontWeight:600}}>{uploadProgress}%</div>
              </div>
            )}

            <div style={{marginTop:16,display:"flex",gap:6,flexWrap:"wrap"}}>
              {["📚 Textbooks","📰 Research","⚖️ Legal","🏥 Medical","💻 Technical"].map((t,i)=>(
                <span key={i} style={{padding:"4px 10px",background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.14)",borderRadius:99,fontSize:11,color:"#818cf8"}}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* CONFIG */}
        {step==="config" && (
          <div style={{background:"rgba(11,11,22,0.95)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:20,padding:24}}>
            <div style={{padding:"12px 16px",background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:10,marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>✅</span>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#86efac"}}>{uploadedFile}</div>
                <div style={{fontSize:11,color:"#4b5563"}}>Successfully processed and ready</div>
              </div>
            </div>

            <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:18}}>⚙️ Configure Your Quiz</div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:"#6b7280",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:"1px"}}>Number of Questions</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[{n:3,l:"Quick"},{n:5,l:"Normal"},{n:10,l:"Full"},{n:15,l:"Deep"}].map(item=>(
                  <button key={item.n} onClick={()=>setQuizCount(item.n)} style={{padding:"16px 8px",background:quizCount===item.n?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.05)",border:`2px solid ${quizCount===item.n?"transparent":"rgba(99,102,241,0.12)"}`,borderRadius:12,cursor:"pointer",color:quizCount===item.n?"#fff":"#4b5563",transition:"all 0.2s",boxShadow:quizCount===item.n?"0 0 20px rgba(99,102,241,0.3)":"none"}}>
                    <div style={{fontSize:22,fontWeight:800}}>{item.n}</div>
                    <div style={{fontSize:9,marginTop:2,opacity:0.8}}>{item.l}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{padding:"12px 14px",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.12)",borderRadius:10,marginBottom:20}}>
              <div style={{fontSize:11,color:"#818cf8",marginBottom:4}}>ℹ️ What happens next</div>
              <div style={{fontSize:11,color:"#4b5563",lineHeight:1.6}}>AI will analyze your PDF and generate {quizCount} multiple-choice questions with detailed explanations. This takes 10-20 seconds.</div>
            </div>

            <button onClick={generateQuiz} disabled={generating} style={{width:"100%",padding:"14px",background:generating?"rgba(99,102,241,0.15)":"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:14,color:"#fff",fontSize:15,fontWeight:700,cursor:generating?"not-allowed":"pointer",boxShadow:generating?"none":"0 0 24px rgba(99,102,241,0.3)",transition:"all 0.3s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {generating ? <><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⚙️</span> Generating {quizCount} Questions...</> : <>🚀 Generate Quiz Now</>}
            </button>

            <button onClick={()=>{setStep("upload");setUploadedFile("");}} style={{width:"100%",padding:"10px",background:"transparent",border:"none",color:"#374151",fontSize:12,cursor:"pointer",marginTop:8}}>← Upload different PDF</button>
          </div>
        )}

        {/* QUIZ */}
        {step==="quiz" && !submitted && questions.length > 0 && (
          <div>
            {/* Progress */}
            <div style={{background:"rgba(11,11,22,0.95)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:14,padding:"12px 16px",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,color:"#818cf8",fontWeight:600}}>Question {currentQ+1} of {questions.length}</span>
                <span style={{fontSize:12,color:"#4b5563"}}>{Object.keys(answers).length}/{questions.length} answered</span>
              </div>
              <div style={{background:"rgba(99,102,241,0.1)",borderRadius:99,height:6,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#6366f1,#a855f7)",width:`${((currentQ+1)/questions.length)*100}%`,transition:"width 0.4s"}}/>
              </div>
            </div>

            {/* Question Card */}
            <div style={{background:"rgba(11,11,22,0.95)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:20,padding:22,marginBottom:14,animation:"fadeIn 0.3s ease"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>{currentQ+1}</div>
                <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0",lineHeight:1.6}}>{questions[currentQ]?.question}</div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {questions[currentQ]?.options?.map((opt,oi)=>{
                  const letter = opt.charAt(0);
                  const selected = answers[currentQ]===letter;
                  return (
                    <button key={oi} onClick={()=>setAnswers(a=>({...a,[currentQ]:letter}))} style={{padding:"13px 16px",background:selected?"rgba(99,102,241,0.18)":"rgba(99,102,241,0.03)",border:`2px solid ${selected?"#6366f1":"rgba(99,102,241,0.1)"}`,borderRadius:12,cursor:"pointer",color:selected?"#c7d2fe":"#9ca3af",fontSize:13,textAlign:"left",transition:"all 0.2s",display:"flex",alignItems:"center",gap:12,boxShadow:selected?"0 0 14px rgba(99,102,241,0.15)":"none"}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:selected?"linear-gradient(135deg,#6366f1,#a855f7)":"rgba(99,102,241,0.07)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:selected?"#fff":"#4b5563",flexShrink:0,transition:"all 0.2s"}}>{letter}</div>
                      <span style={{lineHeight:1.5}}>{opt.substring(3)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nav */}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button onClick={()=>setCurrentQ(q=>Math.max(0,q-1))} disabled={currentQ===0} style={{flex:1,padding:"11px",background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:12,color:currentQ===0?"#1f2937":"#818cf8",fontSize:13,fontWeight:600,cursor:currentQ===0?"not-allowed":"pointer"}}>← Prev</button>
              {currentQ<questions.length-1 ? (
                <button onClick={()=>setCurrentQ(q=>q+1)} style={{flex:2,padding:"11px",background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Next →</button>
              ) : (
                <button onClick={()=>{setSubmitted(true);setStep("result");}} style={{flex:2,padding:"11px",background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 0 20px rgba(34,197,94,0.25)"}}>🏆 Submit Quiz</button>
              )}
            </div>

            {/* Dots */}
            <div style={{display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap"}}>
              {questions.map((_,i)=>(
                <button key={i} onClick={()=>setCurrentQ(i)} style={{width:26,height:26,borderRadius:"50%",background:i===currentQ?"linear-gradient(135deg,#6366f1,#a855f7)":answers[i]?"rgba(34,197,94,0.18)":"rgba(99,102,241,0.07)",border:`1px solid ${i===currentQ?"transparent":answers[i]?"rgba(34,197,94,0.35)":"rgba(99,102,241,0.12)"}`,cursor:"pointer",color:i===currentQ?"#fff":answers[i]?"#86efac":"#374151",fontSize:10,fontWeight:600,transition:"all 0.2s"}}>{i+1}</button>
              ))}
            </div>
          </div>
        )}

        {/* RESULT */}
        {step==="result" && submitted && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            {/* Score */}
            <div style={{background:"rgba(11,11,22,0.95)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:20,padding:28,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:56,marginBottom:8}}>{percent>=70?"🏆":"📚"}</div>
              <div style={{fontSize:44,fontWeight:900,color:grade.c,marginBottom:4}}>{grade.l}</div>
              <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:4}}>{score} out of {questions.length} correct</div>
              <div style={{fontSize:36,fontWeight:800,color:grade.c,marginBottom:6}}>{percent}%</div>
              <div style={{fontSize:14,color:"#9ca3af"}}>{grade.m}</div>

              {/* Progress ring visual */}
              <div style={{margin:"20px auto",width:120,height:12,background:"rgba(99,102,241,0.1)",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${percent}%`,background:`linear-gradient(90deg,${grade.c},${grade.c}aa)`,borderRadius:99,transition:"width 1s ease"}}/>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:16}}>
                {[{l:"✅ Correct",v:score,c:"#22c55e"},{l:"❌ Wrong",v:questions.length-score,c:"#ef4444"},{l:"📊 Score",v:`${percent}%`,c:grade.c}].map((item,i)=>(
                  <div key={i} style={{background:`${item.c}11`,border:`1px solid ${item.c}33`,borderRadius:10,padding:"10px 6px"}}>
                    <div style={{fontSize:18,fontWeight:800,color:item.c}}>{item.v}</div>
                    <div style={{fontSize:10,color:"#4b5563",marginTop:2}}>{item.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Review */}
            <div style={{background:"rgba(11,11,22,0.95)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:20,padding:20,marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:14}}>📋 Detailed Review</div>
              {questions.map((q,i)=>{
                const userAns = answers[i];
                const correct = userAns===q.correct;
                const correctOpt = q.options.find(o=>o.startsWith(q.correct+")"))||q.options.find(o=>o.charAt(0)===q.correct)||q.correct;
                const userOpt = userAns ? (q.options.find(o=>o.startsWith(userAns+")"))||q.options.find(o=>o.charAt(0)===userAns)||userAns) : "Not answered";
                return (
                  <div key={i} style={{marginBottom:12,padding:"14px",background:correct?"rgba(34,197,94,0.05)":"rgba(239,68,68,0.05)",borderRadius:12,border:`1px solid ${correct?"rgba(34,197,94,0.18)":"rgba(239,68,68,0.18)"}`}}>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <span style={{fontSize:16,flexShrink:0}}>{correct?"✅":"❌"}</span>
                      <div style={{fontSize:12,fontWeight:600,color:"#e2e8f0",lineHeight:1.5}}>Q{i+1}. {q.question}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:6}}>
                      <span style={{fontSize:11,padding:"3px 10px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:6,color:"#86efac",display:"inline-block"}}>✓ Correct: {correctOpt}</span>
                      {!correct&&<span style={{fontSize:11,padding:"3px 10px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:6,color:"#fca5a5",display:"inline-block"}}>✗ Your answer: {userOpt}</span>}
                    </div>
                    {q.explanation&&<div style={{fontSize:11,color:"#818cf8",padding:"6px 10px",background:"rgba(99,102,241,0.07)",borderRadius:8,lineHeight:1.5}}>💡 {q.explanation}</div>}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>{setStep("config");setAnswers({});setSubmitted(false);setCurrentQ(0);}} style={{padding:"12px",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:12,color:"#818cf8",fontSize:13,fontWeight:600,cursor:"pointer"}}>🔄 Retry Quiz</button>
              <button onClick={()=>{setStep("upload");setUploadedFile("");setAnswers({});setSubmitted(false);setQuestions([]);setCurrentQ(0);}} style={{padding:"12px",background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>📄 New PDF</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0)}33%{transform:translate(20px,-15px)}66%{transform:translate(-15px,20px)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        body{margin:0}
        button:active{transform:scale(0.97)}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:linear-gradient(#6366f1,#a855f7);border-radius:99px}
      `}</style>
    </div>
  );
}
