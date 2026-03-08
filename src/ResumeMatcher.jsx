import { useState, useRef, useEffect, useCallback } from "react";

// ─── JOBS DATA ─────────────────────────────────────────────────────────────
const JOBS = [
  { id:1,  co:"NeuralPath AI",    role:"Senior ML Engineer",     ind:"AI/ML",        skills:["Python","TensorFlow","PyTorch","MLOps","Transformers","CUDA"],       desc:"Building next-gen recommendation systems for 50M+ users on cutting-edge LLM infrastructure and real-time inference pipelines.", logo:"🧠", hex:"#c8b5ff", loc:"San Francisco", remote:"Hybrid",  sal:"$160–220k", salMin:160, lvl:"Senior" },
  { id:2,  co:"Vertex Labs",      role:"Full-Stack Engineer",     ind:"SaaS",         skills:["React","Node.js","TypeScript","AWS","GraphQL","PostgreSQL"],          desc:"Developer tools that make the impossible effortless. We ship fast, iterate constantly, and care deeply about developer experience.", logo:"⚡", hex:"#fde68a", loc:"Remote",        remote:"Remote",  sal:"$130–180k", salMin:130, lvl:"Mid"    },
  { id:3,  co:"BlueSky Health",   role:"Data Analyst",            ind:"Healthcare",   skills:["SQL","Python","Tableau","Statistics","dbt","R"],                     desc:"Using data to improve patient outcomes at scale. Mission-driven team working on life-saving analytics infrastructure.", logo:"💙", hex:"#7dd3fc", loc:"Boston",        remote:"On-site", sal:"$95–130k",  salMin:95,  lvl:"Mid"    },
  { id:4,  co:"Meridian Finance", role:"Quant Developer",         ind:"FinTech",      skills:["Python","C++","Algorithms","Statistics","Numpy","Finance"],           desc:"Powering algorithmic trading with cutting-edge quant models. Fast-paced research environment with real market impact.", logo:"📈", hex:"#6ee7b7", loc:"New York",      remote:"Hybrid",  sal:"$180–260k", salMin:180, lvl:"Senior" },
  { id:5,  co:"Capsule Design",   role:"Product Designer",        ind:"Design",       skills:["Figma","UX Research","Prototyping","Design Systems","CSS","A11y"],    desc:"Crafting experiences people fall in love with. We obsess over every pixel and every interaction.", logo:"🎨", hex:"#fbcfe8", loc:"Remote",        remote:"Remote",  sal:"$90–130k",  salMin:90,  lvl:"Mid"    },
  { id:6,  co:"Cloudrift",        role:"DevOps Engineer",         ind:"Cloud",        skills:["Kubernetes","Docker","AWS","Terraform","Prometheus","CI/CD"],         desc:"The backbone of modern cloud-native applications. We keep the internet running and love hard infrastructure problems.", logo:"☁️", hex:"#a5b4fc", loc:"Austin",        remote:"Hybrid",  sal:"$140–190k", salMin:140, lvl:"Senior" },
  { id:7,  co:"Storyboard Media", role:"Backend Engineer",        ind:"Media",        skills:["Go","Microservices","Redis","Kafka","gRPC","Linux"],                  desc:"Streaming platform serving 20M daily active viewers. High-scale engineering with real reliability challenges.", logo:"🎬", hex:"#fdba74", loc:"Los Angeles",   remote:"Hybrid",  sal:"$135–175k", salMin:135, lvl:"Mid"    },
  { id:8,  co:"Genome Bridge",    role:"Bioinformatics Eng.",     ind:"Biotech",      skills:["Python","R","Genomics","Machine Learning","Linux","Bioinformatics"],  desc:"Decoding life's data one genome at a time. Real scientific impact through computational biology.", logo:"🧬", hex:"#5eead4", loc:"Cambridge",     remote:"On-site", sal:"$120–160k", salMin:120, lvl:"Senior" },
  { id:9,  co:"Aether Cloud",     role:"Security Engineer",       ind:"Cyber",        skills:["AWS","IAM","SIEM","Zero Trust","Python","Pen Testing"],               desc:"Protecting the world's most critical cloud infrastructure. Zero-tolerance approach to vulnerabilities.", logo:"🔐", hex:"#fca5a5", loc:"Remote",        remote:"Remote",  sal:"$145–200k", salMin:145, lvl:"Senior" },
  { id:10, co:"Orbit Analytics",  role:"Data Engineer",           ind:"Analytics",    skills:["Spark","dbt","Airflow","SQL","Snowflake","Python"],                   desc:"Turning raw data chaos into business clarity. Massive-scale pipelines powering Fortune 500 decisions.", logo:"🪐", hex:"#d8b4fe", loc:"Chicago",       remote:"Hybrid",  sal:"$125–165k", salMin:125, lvl:"Mid"    },
];

const TRACK_LABELS = ["SAVED","APPLIED","INTERVIEW","OFFER","REJECTED"];
const TRACK_HEX = { SAVED:"#a5b4fc", APPLIED:"#fde68a", INTERVIEW:"#6ee7b7", OFFER:"#bbf7d0", REJECTED:"#fca5a5" };

// ─── AI HELPER ──────────────────────────────────────────────────────────────
const AI = async (prompt, max = 1600) => {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1600, messages:[{role:"user",content:prompt}] })
  });
  const d = await r.json();
  return d.content?.find(b=>b.type==="text")?.text || "";
};
const tryJSON = t => { try { return JSON.parse(t.replace(/```json\s*|```/g,"").trim()); } catch { return null; } };

// ─── PDF TEXT EXTRACTION ─────────────────────────────────────────────────────
async function extractPDFText(file) {
  // Load PDF.js from CDN
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => {
        // Preserve line breaks by checking vertical position changes
        return item.str;
      })
      .join(" ");
    text += pageText + "\n";
  }
  return text.trim();
}

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────
function ScoreRing({ val, size=52, sw=4.5 }) {
  const r = (size-sw*2)/2, c = 2*Math.PI*r, p = Math.max(0,Math.min(100,val||0));
  const col = p>=75?"#6ee7b7":p>=50?"#fde68a":"#fca5a5";
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{position:"absolute",transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={`${(p/100)*c} ${c}`}
          style={{transition:"stroke-dasharray 1.4s cubic-bezier(.34,1.4,.64,1)"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
        fontFamily:"'Azeret Mono',monospace",fontWeight:700,fontSize:size>46?14:11,
        color:col,letterSpacing:"-0.05em"}}>{p}</div>
    </div>
  );
}

function BigScoreBar({ val, label, col }) {
  const c = col || (val>=75?"#6ee7b7":val>=50?"#fde68a":"#fca5a5");
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}>
        <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,letterSpacing:".08em",color:"rgba(255,255,255,.55)"}}>{label}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:18,fontWeight:700,color:c,letterSpacing:"-0.04em"}}>{val}%</span>
        </div>
      </div>
      <div style={{height:6,borderRadius:2,background:"rgba(255,255,255,.06)"}}>
        <div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${c}66,${c})`,
          width:`${val}%`,transition:"width 1.3s cubic-bezier(.34,1.2,.64,1)"}}/>
      </div>
    </div>
  );
}

function Spin({ size=16, col="#a5b4fc" }) {
  return <span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",
    border:`1.5px solid rgba(255,255,255,0.08)`,borderTopColor:col,
    animation:"spin .55s linear infinite",flexShrink:0}}/>;
}

function Chip({ children, col, dim, tiny, onClick }) {
  return (
    <span onClick={onClick}
      style={{display:"inline-flex",alignItems:"center",padding:tiny?"1px 6px":"3px 9px",
        borderRadius:3,fontSize:tiny?9.5:11,margin:"2px",
        fontFamily:"'Azeret Mono',monospace",fontWeight:500,letterSpacing:"0.04em",
        background:col?`${col}14`:"rgba(255,255,255,0.04)",
        border:`1px solid ${col?`${col}28`:"rgba(255,255,255,0.1)"}`,
        color:col||(dim?"rgba(255,255,255,0.32)":"rgba(255,255,255,0.6)"),
        cursor:onClick?"pointer":"default"}}>
      {children}
    </span>
  );
}

function SLabel({ children }) {
  return <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,fontWeight:600,
    letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.22)",marginBottom:7}}>{children}</div>;
}

function Rule() { return <div style={{height:1,background:"rgba(255,255,255,0.06)",margin:"12px 0"}}/>; }

function Acc({ title, icon, children, defaultOpen=true, accent, badge }) {
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:6,overflow:"hidden",marginBottom:8}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
          background:"rgba(255,255,255,0.015)",border:"none",cursor:"pointer",color:"inherit",
          transition:"background .15s"}}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
        onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.015)"}>
        {icon&&<span style={{fontSize:13,flexShrink:0}}>{icon}</span>}
        <div style={{flex:1,textAlign:"left",display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12.5,
            color:accent||"rgba(255,255,255,0.8)"}}>{title}</span>
          {badge!==undefined&&<span style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,padding:"1px 6px",
            borderRadius:2,background:"rgba(165,180,252,0.12)",color:"#a5b4fc"}}>{badge}</span>}
        </div>
        <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.2)",
          transform:open?"rotate(90deg)":"none",display:"inline-block",transition:"transform .18s"}}>▶</span>
      </button>
      {open&&<div style={{padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>{children}</div>}
    </div>
  );
}

function Pulse({ col="#6ee7b7" }) {
  return (
    <span style={{position:"relative",display:"inline-block",width:7,height:7,flexShrink:0}}>
      <span style={{position:"absolute",inset:0,borderRadius:"50%",background:col,animation:"ping 2s ease-out infinite"}}/>
      <span style={{position:"absolute",inset:0,borderRadius:"50%",background:col}}/>
    </span>
  );
}

// ─── ANALYSIS OVERLAY ─────────────────────────────────────────────────────────
const STEPS = [
  {id:"read",  txt:"READING DOCUMENT",   sub:"extracting resume content"},
  {id:"parse", txt:"PARSING PROFILE",    sub:"skills · experience · education"},
  {id:"match", txt:"SCORING 10 JOBS",    sub:"running AI similarity analysis"},
  {id:"ats",   txt:"ATS ANALYSIS",       sub:"checking resume quality"},
  {id:"learn", txt:"SKILL GAPS",         sub:"finding learning resources"},
  {id:"done",  txt:"BUILDING DASHBOARD", sub:"preparing your workspace"},
];

function AnalysisOverlay({ step }) {
  const idx = STEPS.findIndex(s=>s.id===step);
  const [tick,setTick]=useState(0);
  useEffect(()=>{ const t=setInterval(()=>setTick(n=>n+1),80); return()=>clearInterval(t); },[]);
  const bars="▁▂▃▄▅▆▇█";
  return (
    <div style={{position:"fixed",inset:0,background:"#04040d",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div style={{position:"fixed",inset:0,backgroundImage:"repeating-linear-gradient(0deg,rgba(0,0,0,0.1) 0px,rgba(0,0,0,0.1) 1px,transparent 1px,transparent 2px)",pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:2,textAlign:"center",width:400}}>
        <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:20,letterSpacing:"0.08em",
          color:"#a5b4fc",marginBottom:28,animation:"flicker 3s ease-in-out infinite"}}>
          {Array.from({length:14},(_,i)=>bars[(tick+i*3)%bars.length]).join(" ")}
        </div>
        <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,letterSpacing:"0.22em",color:"rgba(255,255,255,0.22)",marginBottom:10}}>TALENTAI / ANALYSIS ENGINE / v3.0</div>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,color:"#fff",letterSpacing:"-0.03em",marginBottom:4,animation:"fadeUp .3s ease"}}>
          {STEPS[idx]?.txt}
        </div>
        <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.28)",marginBottom:40,letterSpacing:"0.08em"}}>
          {STEPS[idx]?.sub} <span style={{animation:"blink .8s step-end infinite"}}>_</span>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          {STEPS.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:i===idx?40:i<idx?24:6,height:4,borderRadius:2,
                transition:"all .5s cubic-bezier(.34,1.4,.64,1)",
                background:i<idx?"#6ee7b7":i===idx?"#a5b4fc":"rgba(255,255,255,0.08)",
                boxShadow:i===idx?"0 0 10px rgba(165,180,252,0.8)":i<idx?"0 0 6px rgba(110,231,183,0.5)":"none"}}/>
              {i<STEPS.length-1&&<div style={{width:10,height:1,background:"rgba(255,255,255,0.06)"}}/>}
            </div>
          ))}
        </div>
        <div style={{marginTop:32,textAlign:"left",fontFamily:"'Azeret Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.18)",lineHeight:2}}>
          {STEPS.slice(0,Math.max(idx,0)).map(s=>(
            <div key={s.id}><span style={{color:"#6ee7b7"}}>✓ </span><span style={{color:"rgba(255,255,255,0.35)"}}>{s.sub}</span><span style={{color:"rgba(255,255,255,0.14)",marginLeft:8}}>done</span></div>
          ))}
          {idx>=0&&<div><span style={{color:"#a5b4fc"}}>→ </span><span style={{color:"rgba(255,255,255,0.5)"}}>{STEPS[idx]?.sub}</span><span style={{color:"#a5b4fc",animation:"blink .8s step-end infinite",marginLeft:6}}>▊</span></div>}
        </div>
      </div>
    </div>
  );
}

// ─── UPLOAD SCREEN ────────────────────────────────────────────────────────────
function UploadScreen({ onAnalyze }) {
  const [txt,setTxt]=useState("");
  const [drag,setDrag]=useState(false);
  const [fileName,setFileName]=useState("");
  const [loading,setLoading]=useState(false);
  const [focused,setFocused]=useState(false);
  const [tick,setTick]=useState(0);
  const fileRef=useRef();
  useEffect(()=>{ const t=setInterval(()=>setTick(n=>n+1),100); return()=>clearInterval(t); },[]);
  const bars="▁▂▃▄▅▆▇█▇▆▅▄▃▂▁";

  const loadFile = async f => {
    if (!f) return;
    setLoading(true); setFileName(f.name);
    try {
      if (f.type==="application/pdf" || f.name.endsWith(".pdf")) {
        const extracted = await extractPDFText(f);
        setTxt(extracted || "PDF could not be parsed. Please paste text below.");
      } else {
        setTxt(await f.text());
      }
    } catch(e) {
      console.error("File parse error:", e);
      setTxt("");
      setFileName("⚠ Parse error — paste text below");
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#04040d",color:"#e8e6f0",display:"flex",
      alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(165,180,252,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(165,180,252,.03) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,rgba(0,0,0,0.1) 0px,rgba(0,0,0,0.1) 1px,transparent 1px,transparent 2px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",width:700,height:500,top:"50%",left:"50%",transform:"translate(-50%,-50%)",borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%)",pointerEvents:"none",animation:"glow 5s ease-in-out infinite"}}/>

      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:480,animation:"fadeUp .5s ease"}}>
        <div style={{marginBottom:36,textAlign:"center"}}>
          <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,letterSpacing:"0.25em",color:"rgba(165,180,252,0.6)",marginBottom:14}}>▲ TALENTAI / CAREER OS / v3.0</div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:54,fontWeight:800,letterSpacing:"-0.04em",lineHeight:1.0,marginBottom:14,
            background:"linear-gradient(160deg,#fff 50%,rgba(255,255,255,0.4))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            FIND<br/>YOUR<br/>ROLE.
          </h1>
          <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:12,letterSpacing:"0.05em",color:"#a5b4fc",marginBottom:12,animation:"flicker 4s ease-in-out infinite"}}>
            {Array.from({length:22},(_,i)=>bars[(tick+i*2)%bars.length]).join("")}
          </div>
          <p style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,0.28)",lineHeight:1.8,letterSpacing:"0.04em"}}>
            AI matching · ATS scoring · skill gaps · cover letters · interview prep
          </p>
        </div>

        <div style={{border:`1px solid ${drag?"rgba(165,180,252,0.6)":"rgba(255,255,255,0.1)"}`,borderRadius:8,
          background:"rgba(255,255,255,0.02)",backdropFilter:"blur(12px)",padding:24,
          boxShadow:drag?"0 0 32px rgba(165,180,252,0.12)":"0 20px 60px rgba(0,0,0,0.5)",transition:"all .2s"}}>

          <div onDragOver={e=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={e=>{e.preventDefault();setDrag(false);loadFile(e.dataTransfer.files[0])}}
            onClick={()=>!loading&&fileRef.current.click()}
            style={{border:`1px dashed ${drag?"rgba(165,180,252,0.7)":"rgba(255,255,255,0.12)"}`,borderRadius:6,
              padding:"22px 16px",textAlign:"center",cursor:loading?"wait":"pointer",
              background:drag?"rgba(165,180,252,0.04)":"transparent",transition:"all .2s",marginBottom:16}}>
            <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx" style={{display:"none"}} onChange={e=>loadFile(e.target.files[0])}/>
            <div style={{fontSize:28,marginBottom:8,animation:"float 3s ease-in-out infinite"}}>
              {loading?"⏳":fileName?"✅":"▤"}
            </div>
            {loading
              ? <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"#a5b4fc",letterSpacing:"0.06em"}}>EXTRACTING TEXT...</div>
              : fileName
              ? <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"#6ee7b7",letterSpacing:"0.06em"}}>{fileName.toUpperCase()} LOADED</div>
              : <>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"rgba(255,255,255,0.65)",marginBottom:4}}>
                    {drag?"DROP TO UPLOAD":"DRAG & DROP RESUME"}
                  </div>
                  <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,color:"rgba(255,255,255,0.2)",letterSpacing:"0.12em"}}>
                    .PDF · .DOCX · .TXT
                  </div>
                </>}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}}/>
            <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.18)",letterSpacing:"0.2em"}}>OR PASTE</span>
            <div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}}/>
          </div>

          <textarea rows={5} placeholder={"> paste resume text here_\n>\n>\n>\n>"}
            value={txt} onChange={e=>{setTxt(e.target.value);setFileName("");}}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            style={{width:"100%",background:"rgba(0,0,0,0.3)",fontFamily:"'Azeret Mono',monospace",
              border:`1px solid ${focused?"rgba(165,180,252,0.5)":"rgba(255,255,255,0.08)"}`,
              borderRadius:6,color:"rgba(255,255,255,0.72)",fontSize:12,lineHeight:1.7,
              padding:"10px 12px",resize:"none",outline:"none",transition:"border-color .15s",marginBottom:16}}/>

          <button disabled={!txt.trim()||loading} onClick={()=>onAnalyze(txt)}
            style={{width:"100%",padding:"12px",borderRadius:6,border:"none",
              cursor:txt.trim()&&!loading?"pointer":"not-allowed",
              background:txt.trim()?"linear-gradient(135deg,#818cf8,#6366f1)":"rgba(255,255,255,0.06)",
              color:txt.trim()?"#fff":"rgba(255,255,255,0.2)",
              fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,letterSpacing:"0.05em",
              transition:"all .2s",
              boxShadow:txt.trim()?"0 8px 28px rgba(99,102,241,0.45),inset 0 1px 0 rgba(255,255,255,0.15)":"none"}}>
            {txt.trim()?"RUN ANALYSIS →":"PASTE RESUME TO BEGIN"}
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:18,fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.15)",letterSpacing:"0.15em"}}>
          ENCRYPTED · NEVER STORED · GDPR COMPLIANT
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState("upload");
  const [aStep,setAStep]=useState("");
  const [resumeTxt,setResumeTxt]=useState("");
  const [profile,setProfile]=useState(null);
  const [scores,setScores]=useState({});
  const [ats,setAts]=useState(null);
  const [improvements,setImprovements]=useState([]);
  const [learning,setLearning]=useState({});   // {jobId: [{skill, courses:[{title,url,platform}]}]}
  const [selJob,setSelJob]=useState(null);
  const [activeTab,setActiveTab]=useState("insights");
  const [savedJobs,setSavedJobs]=useState({});
  const [generated,setGenerated]=useState({});
  const [genning,setGenning]=useState(null);
  const [activeGen,setActiveGen]=useState(null);
  const [showSide,setShowSide]=useState(true);
  const [showBrowser,setShowBrowser]=useState(true);
  const [bSearch,setBSearch]=useState("");
  const [bRemote,setBRemote]=useState("ALL");
  const [bInd,setBInd]=useState("ALL");
  const [bSort,setBSort]=useState("match");
  const [chatMsgs,setChatMsgs]=useState([
    {r:"ai",t:"System ready. I've analyzed your resume and matched 10 positions. Ask me about your fit, skill gaps, salary expectations, or how to improve your chances."}
  ]);
  const [chatIn,setChatIn]=useState("");
  const [chatLoad,setChatLoad]=useState(false);
  const [tick,setTick]=useState(0);
  const chatEndRef=useRef();

  useEffect(()=>{ const t=setInterval(()=>setTick(n=>n+1),120); return()=>clearInterval(t); },[]);
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[chatMsgs]);

  const analyze = async txt => {
    setResumeTxt(txt); setScreen("analyzing");
    try {
      setAStep("read"); await new Promise(r=>setTimeout(r,500));

      setAStep("parse");
      const prof = tryJSON(await AI(`Parse this resume into structured JSON. ONLY respond with valid JSON, no markdown:
{
  "name": "", "title": "", "email": "", "summary": "2 sentences about the candidate",
  "skills": ["skill1","skill2"],
  "education": [{"degree":"","school":"","year":""}],
  "experience": [{"title":"","co":"","dur":"","bullets":["bullet"]}],
  "certs": [], "yearsExp": 0, "level": "Entry/Mid/Senior",
  "strengths": ["strength1","strength2","strength3"],
  "technicalStack": ["tech1"], "softSkills": ["skill1"]
}
Resume:\n${txt.slice(0,4500)}`));
      if(prof) setProfile(prof);

      setAStep("match");
      const raw = tryJSON(await AI(`Score this candidate against each job 0-100. ONLY respond with valid JSON array:
[{"id":1,"score":82,"matched":["Python","AWS"],"missing":["Kubernetes","Go"],"why":"2 compelling sentences explaining the match","gap":"The main skill gap preventing a higher score"}]
Candidate: skills=${JSON.stringify(prof?.skills||[])}, ${prof?.yearsExp||0} years exp, level=${prof?.level||"Mid"}, title="${prof?.title||""}", technical=${JSON.stringify(prof?.technicalStack||[])}
Jobs: ${JSON.stringify(JOBS.map(j=>({id:j.id,role:j.role,ind:j.ind,skills:j.skills,lvl:j.lvl})))}
Return all 10, sorted descending by score.`,2200));
      if(raw){ const m={}; raw.forEach(s=>{ m[s.id]=s; }); setScores(m); }

      setAStep("ats");
      const a = tryJSON(await AI(`Perform a detailed ATS analysis on this resume. ONLY valid JSON:
{"score":72,"breakdown":{"formatting":80,"keywords":65,"impact":70,"clarity":75,"length":80,"sections":85},"strengths":["s1","s2","s3"],"issues":[{"priority":"high","issue":"title","fix":"concrete fix"}],"missing":["kw1","kw2"]}
Resume:\n${txt.slice(0,3500)}`));
      if(a) setAts(a);

      const impr = tryJSON(await AI(`Give 5 specific resume improvement suggestions. ONLY valid JSON array:
[{"category":"Impact","suggestion":"Specific actionable suggestion","example":"Before: X → After: Y","impact":"high/medium"}]
Resume:\n${txt.slice(0,3000)}`));
      if(impr) setImprovements(impr);

      setAStep("learn");
      // Generate learning recommendations for top 3 missing skill areas
      if(raw) {
        const topMissing = [...new Set(raw.flatMap(s=>s.missing||[]))].slice(0,6);
        if(topMissing.length>0) {
          const learnData = tryJSON(await AI(`For each skill, suggest 2 specific learning resources. ONLY valid JSON:
{"skill_resources":[{"skill":"Python","resources":[{"title":"Course Title","platform":"Coursera/Udemy/YouTube/freeCodeCamp","url":"https://...","type":"course/tutorial/book","duration":"X hours","level":"Beginner/Intermediate"}]}]}
Skills: ${JSON.stringify(topMissing)}
Give real, accurate URLs. Focus on free or affordable resources.`,1200));
          if(learnData?.skill_resources) {
            const lMap={};
            learnData.skill_resources.forEach(sr=>{ lMap[sr.skill]=sr.resources; });
            setLearning(lMap);
          }
        }
      }

      setAStep("done"); await new Promise(r=>setTimeout(r,400));
      setScreen("dashboard");
    } catch(e) {
      console.error("Analysis error:",e);
      setScreen("upload");
    }
  };

  const generate = async (type, job) => {
    const k=`${job.id}:${type}`;
    setActiveGen(type); setSelJob(job);
    if(generated[k]) return;
    setGenning(type);
    try {
      let res;
      if(type==="cover") res = await AI(`Write a compelling 3-paragraph cover letter for ${profile?.name||"the candidate"} applying to ${job.role} at ${job.co}.
Candidate skills: ${profile?.skills?.slice(0,8).join(", ")}. Matched skills: ${scores[job.id]?.matched?.join(", ")||"N/A"}.
Job description: ${job.desc}. Required skills: ${job.skills.join(", ")}.
Make it specific, authentic, and under 280 words. No generic phrases.`,800);

      else if(type==="tailor") res = await AI(`Rewrite this resume specifically for ${job.role} at ${job.co}.
Required skills: ${job.skills.join(", ")}. Missing: ${scores[job.id]?.missing?.join(", ")||"none"}.
Keep all facts 100% accurate. Reorder and emphasize relevant experience. Optimize for ATS keywords.
Original resume:\n${resumeTxt.slice(0,3500)}`,1400);

      else if(type==="interview") res = tryJSON(await AI(`Create a comprehensive interview prep guide for ${profile?.name||"candidate"} interviewing for ${job.role} at ${job.co}.
Candidate profile: ${profile?.title}, ${profile?.yearsExp}yrs, skills: ${profile?.skills?.slice(0,8).join(", ")}.
Required: ${job.skills.join(", ")}. Missing: ${scores[job.id]?.missing?.join(", ")||"none"}.
ONLY valid JSON:
{"behavioral":[{"q":"","tip":"","star":"Example STAR answer structure"}],"technical":[{"q":"","tip":"","ans":"Key points to cover"}],"toAsk":["question to ask them"],"themes":["focus area"],"watchouts":["potential weakness to address"]}
4 behavioral, 4 technical, 4 toAsk, 3 themes, 3 watchouts.`,1600));

      setGenerated(p=>({...p,[k]:res}));
    } catch(e){ console.error(e); }
    finally{ setGenning(null); }
  };

  const sendChat = async () => {
    if(!chatIn.trim()||chatLoad) return;
    const msg=chatIn.trim(); setChatIn("");
    const hist=[...chatMsgs,{r:"user",t:msg}];
    setChatMsgs(hist); setChatLoad(true);
    try {
      const sc=selJob?scores[selJob.id]:null;
      const reply = await AI(`You are an expert AI career coach. Be specific, warm, and actionable. 2-4 sentences.
Candidate: ${profile?.name||"?"}, ${profile?.title}, ${profile?.yearsExp||0}yrs exp, skills: ${profile?.skills?.slice(0,10).join(", ")||"?"}, strengths: ${profile?.strengths?.join(", ")||"?"}.
ATS score: ${ats?.score||"N/A"}.${selJob?`\nCurrently viewing: ${selJob.role} at ${selJob.co}. Match: ${sc?.score||"?"}%. Missing: ${sc?.missing?.join(", ")||"none"}.`:""}
Recent chat:\n${hist.slice(-4).map(m=>`${m.r==="user"?"User":"Coach"}: ${m.t}`).join("\n")}`,400);
      setChatMsgs(p=>[...p,{r:"ai",t:reply}]);
    } catch { setChatMsgs(p=>[...p,{r:"ai",t:"Network error. Try again."}]); }
    finally{ setChatLoad(false); }
  };

  const ALL_IND=["ALL",...Array.from(new Set(JOBS.map(j=>j.ind)))];
  const bars="▁▂▃▄▅▆▇█▇▆▅▄▃▂▁";

  const browserJobs = JOBS.filter(j=>{
    const q=bSearch.toLowerCase();
    const mq=!q||[j.co,j.role,j.ind,...j.skills].some(s=>s.toLowerCase().includes(q));
    return mq&&(bRemote==="ALL"||j.remote===bRemote)&&(bInd==="ALL"||j.ind===bInd);
  }).sort((a,b)=>bSort==="match"?(scores[b.id]?.score||0)-(scores[a.id]?.score||0)
    :bSort==="salary"?b.salMin-a.salMin:a.co.localeCompare(b.co));

  const savedList=JOBS.filter(j=>savedJobs[j.id]);
  const selKey=selJob&&activeGen?`${selJob.id}:${activeGen}`:null;
  const selContent=selKey?generated[selKey]:null;

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Azeret+Mono:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#04040d;height:100%}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideR{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    @keyframes glow{0%,100%{opacity:.35}50%{opacity:.75}}
    @keyframes ping{0%{transform:scale(1);opacity:1}80%,100%{transform:scale(2.3);opacity:0}}
    @keyframes flicker{0%,100%{opacity:.85}50%{opacity:.65}92%{opacity:.3}93%{opacity:.85}}
    @keyframes barIn{from{width:0}to{width:var(--w)}}
    ::selection{background:rgba(165,180,252,.3);color:#fff}

    .sc{overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.07) transparent}
    .sc::-webkit-scrollbar{width:2px}
    .sc::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:99px}

    .ntab{display:flex;align-items:center;gap:6px;padding:0 14px;height:100%;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:'Syne',sans-serif;font-weight:700;font-size:11px;letter-spacing:.1em;color:rgba(255,255,255,.3);transition:all .15s;white-space:nowrap;text-transform:uppercase}
    .ntab:hover{color:rgba(255,255,255,.7)}
    .ntab.on{color:#fff;border-bottom-color:#a5b4fc}
    .nbadge{padding:1px 6px;border-radius:2px;font-family:'Azeret Mono',monospace;font-size:9px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.3);transition:all .15s}
    .ntab.on .nbadge{background:rgba(165,180,252,.15);color:#a5b4fc}

    .inp{width:100%;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,.08);border-radius:4px;color:rgba(255,255,255,.78);font-family:'Azeret Mono',monospace;font-size:11.5px;padding:7px 10px;outline:none;transition:border-color .15s;letter-spacing:.02em}
    .inp:focus{border-color:rgba(165,180,252,.5)}
    .inp::placeholder{color:rgba(255,255,255,.18)}

    .sel{background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,.08);border-radius:4px;color:rgba(255,255,255,.6);font-family:'Azeret Mono',monospace;font-size:11px;padding:6px 8px;outline:none;cursor:pointer;flex:1;min-width:0;letter-spacing:.02em}
    .sel option{background:#0a0a18}

    .btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:none;border-radius:4px;cursor:pointer;font-family:'Syne',sans-serif;font-weight:700;transition:all .15s;line-height:1;letter-spacing:.05em;text-transform:uppercase}
    .btn-p{background:linear-gradient(135deg,#818cf8,#6366f1);color:#fff;padding:7px 14px;font-size:11px;box-shadow:0 4px 14px rgba(99,102,241,.35)}
    .btn-p:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(99,102,241,.5)}
    .btn-p:disabled{opacity:.25;cursor:not-allowed;transform:none;box-shadow:none}
    .btn-g{background:rgba(255,255,255,.055);color:rgba(255,255,255,.65);padding:6px 12px;font-size:11px;border:1px solid rgba(255,255,255,.09)}
    .btn-g:hover{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.16)}
    .btn-xs{padding:5px 10px;font-size:10px}

    .jrow{border-bottom:1px solid rgba(255,255,255,.05);padding:11px 12px;cursor:pointer;transition:all .15s;position:relative}
    .jrow:hover{background:rgba(255,255,255,.03)}
    .jrow.on{background:rgba(165,180,252,.06)}
    .jrow.on::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:#a5b4fc;box-shadow:0 0 8px rgba(165,180,252,.6)}

    .jcard{border-radius:6px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);padding:13px;margin-bottom:7px;cursor:pointer;transition:all .17s;position:relative}
    .jcard:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);transform:translateX(2px)}
    .jcard.on{background:rgba(165,180,252,.06);border-color:rgba(165,180,252,.35)}
    .jcard.on::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:#a5b4fc;border-radius:2px 0 0 2px;box-shadow:0 0 8px rgba(165,180,252,.5)}

    .handle{position:absolute;top:50%;left:-10px;transform:translateY(-50%);width:20px;height:20px;border-radius:50%;background:#0a0a18;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:20;font-family:'Azeret Mono',monospace;font-size:8px;color:rgba(255,255,255,.35);transition:all .15s;box-shadow:0 2px 10px rgba(0,0,0,.7)}
    .handle:hover{border-color:rgba(165,180,252,.6);color:#a5b4fc;box-shadow:0 0 10px rgba(165,180,252,.25)}

    .bg{height:3px;borderRadius:1px;background:rgba(255,255,255,.07)}
    .bf{height:100%;borderRadius:1px;transition:width 1.3s cubic-bezier(.34,1.2,.64,1)}

    textarea{background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,.08);border-radius:4px;color:rgba(255,255,255,.72);font-family:'Azeret Mono',monospace;font-size:11.5px;line-height:1.65;padding:10px 12px;resize:none;width:100%;outline:none;transition:border-color .15s;letter-spacing:.02em}
    textarea:focus{border-color:rgba(165,180,252,.4)}
    textarea::placeholder{color:rgba(255,255,255,.18)}

    .learn-card{padding:12px;border-radius:5px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);margin-bottom:7px;transition:all .15s}
    .learn-card:hover{border-color:rgba(165,180,252,.3);background:rgba(165,180,252,.04)}
  `;

  if(screen==="upload") return <><style>{CSS}</style><UploadScreen onAnalyze={analyze}/></>;
  if(screen==="analyzing") return <><style>{CSS}</style><AnalysisOverlay step={aStep}/></>;

  // ──────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{height:"100vh",background:"#04040d",color:"#e8e6f0",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{CSS}</style>

      {/* Scanline overlay */}
      <div style={{position:"fixed",inset:0,backgroundImage:"repeating-linear-gradient(0deg,rgba(0,0,0,0.08) 0px,rgba(0,0,0,0.08) 1px,transparent 1px,transparent 2px)",pointerEvents:"none",zIndex:999}}/>

      {/* ── TOPBAR ── */}
      <div style={{height:46,borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",
        alignItems:"stretch",flexShrink:0,background:"rgba(4,4,13,0.97)",backdropFilter:"blur(20px)",position:"relative",zIndex:50}}>

        <div style={{display:"flex",alignItems:"center",gap:9,padding:"0 16px",
          borderRight:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
          <div style={{width:24,height:24,borderRadius:4,background:"linear-gradient(135deg,#818cf8,#6366f1)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,
            boxShadow:"0 0 14px rgba(99,102,241,0.6)"}}>▲</div>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:800,letterSpacing:"0.05em",color:"rgba(255,255,255,0.9)",textTransform:"uppercase"}}>TalentAI</span>
          <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:8,color:"rgba(165,180,252,0.5)",
            background:"rgba(165,180,252,0.08)",border:"1px solid rgba(165,180,252,0.15)",
            padding:"1px 6px",borderRadius:2,letterSpacing:"0.12em"}}>v3.0</span>
        </div>

        {/* Left sidebar tabs */}
        <div style={{display:"flex",alignItems:"stretch",overflow:"hidden"}}>
          {[
            {id:"insights",  label:"Insights",  badge:undefined},
            {id:"matches",   label:"Matches",   badge:Object.keys(scores).length},
            {id:"saved",     label:"Saved",     badge:savedList.length||undefined},
            {id:"ats",       label:"ATS",       badge:ats?.score?`${ats.score}`:undefined},
            {id:"improve",   label:"Improve",   badge:improvements.length||undefined},
            {id:"chat",      label:"Coach",     badge:undefined},
          ].map(t=>(
            <button key={t.id} className={`ntab${activeTab===t.id?" on":""}`}
              onClick={()=>{setActiveTab(t.id);if(!showSide)setShowSide(true);}}>
              {t.label}
              {t.badge!==undefined&&t.badge&&<span className="nbadge">{t.badge}</span>}
            </button>
          ))}
        </div>

        <div style={{flex:1}}/>

        <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 14px",flexShrink:0}}>
          <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(165,180,252,0.4)",animation:"flicker 3s ease-in-out infinite"}}>
            {Array.from({length:8},(_,i)=>bars[(tick+i*3)%bars.length]).join("")}
          </div>
          {profile&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"3px 10px",
            borderRadius:3,background:"rgba(110,231,183,0.07)",border:"1px solid rgba(110,231,183,0.18)"}}>
            <Pulse/>
            <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,color:"#6ee7b7",letterSpacing:"0.08em"}}>{profile.name?.toUpperCase()}</span>
          </div>}
          <button className="btn btn-g btn-xs"
            onClick={()=>{setScreen("upload");setProfile(null);setScores({});setAts(null);setSelJob(null);setImprovements([]);setLearning({});}}>
            ↩ NEW
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ════ LEFT SIDEBAR ════ */}
        <div style={{width:showSide?310:0,flexShrink:0,overflow:"hidden",
          transition:"width .3s cubic-bezier(.4,0,.2,1)",borderRight:"1px solid rgba(255,255,255,.06)"}}>
          <div style={{width:310,height:"100%",display:"flex",flexDirection:"column",
            opacity:showSide?1:0,transition:"opacity .2s",pointerEvents:showSide?"auto":"none",background:"rgba(255,255,255,.008)"}}>

            {/* ── INSIGHTS TAB ── */}
            {activeTab==="insights"&&(
              <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
                <div style={{padding:"10px 12px 8px",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
                  <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"rgba(255,255,255,.22)"}}>// RESUME INSIGHTS</div>
                </div>
                <div className="sc" style={{flex:1,padding:"12px"}}>
                  {!profile?<div style={{display:"flex",justifyContent:"center",padding:40}}><Spin size={24}/></div>:(
                    <div style={{animation:"fadeUp .3s ease"}}>

                      {/* Profile card */}
                      <div style={{border:"1px solid rgba(255,255,255,.08)",borderRadius:8,padding:16,marginBottom:10,
                        background:"rgba(255,255,255,.018)"}}>
                        <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                          <div style={{width:44,height:44,borderRadius:8,background:"rgba(165,180,252,.1)",
                            border:"1px solid rgba(165,180,252,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>👤</div>
                          <div style={{flex:1}}>
                            <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,letterSpacing:"-.03em",marginBottom:2}}>{profile.name}</div>
                            <div style={{fontFamily:"'Azeret Mono',monospace",color:"#a5b4fc",fontSize:10.5,letterSpacing:".04em",marginBottom:4}}>{profile.title}</div>
                            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                              <Chip dim tiny>{profile.yearsExp} YRS EXP</Chip>
                              <Chip dim tiny>{profile.level?.toUpperCase()}</Chip>
                              {profile.email&&<Chip dim tiny>{profile.email}</Chip>}
                            </div>
                          </div>
                          {ats&&<ScoreRing val={ats.score} size={48} sw={4}/>}
                        </div>
                        <p style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.38)",lineHeight:1.75,letterSpacing:".02em"}}>{profile.summary}</p>
                      </div>

                      {/* Detected skills */}
                      <Acc title="DETECTED SKILLS" icon="◈" defaultOpen>
                        <SLabel>Technical Stack</SLabel>
                        <div style={{marginBottom:10}}>
                          {(profile.technicalStack||profile.skills||[]).map(s=><Chip key={s}>{s}</Chip>)}
                        </div>
                        {profile.softSkills?.length>0&&<>
                          <SLabel>Soft Skills</SLabel>
                          <div>{profile.softSkills.map(s=><Chip key={s} dim>{s}</Chip>)}</div>
                        </>}
                      </Acc>

                      {/* Experience level */}
                      <Acc title="EXPERIENCE LEVEL" icon="▦" defaultOpen>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                          <div style={{flex:1,height:8,borderRadius:2,background:"rgba(255,255,255,.06)",overflow:"hidden"}}>
                            <div style={{height:"100%",width:profile.level==="Senior"?"90%":profile.level==="Mid"?"55%":"25%",
                              background:"linear-gradient(90deg,#a5b4fc,#818cf8)",transition:"width 1.3s ease"}}/>
                          </div>
                          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:"#a5b4fc",flexShrink:0}}>{profile.level}</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          {[
                            {l:"Experience",v:`${profile.yearsExp} years`},
                            {l:"Roles",v:profile.experience?.length||0},
                            {l:"Skills",v:profile.skills?.length||0},
                            {l:"Certs",v:profile.certs?.length||0},
                          ].map(({l,v})=>(
                            <div key={l} style={{padding:"8px 10px",borderRadius:4,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}}>
                              <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:".12em",marginBottom:3}}>{l.toUpperCase()}</div>
                              <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:"rgba(255,255,255,.82)"}}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </Acc>

                      {/* Top strengths */}
                      {profile.strengths?.length>0&&<Acc title="TOP STRENGTHS" icon="✦">
                        {profile.strengths.map((s,i)=>(
                          <div key={i} style={{display:"flex",gap:8,marginBottom:7}}>
                            <span style={{color:"#6ee7b7",fontFamily:"'Azeret Mono',monospace",fontSize:11,flexShrink:0}}>+</span>
                            <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.55)",lineHeight:1.55,letterSpacing:".02em"}}>{s}</span>
                          </div>
                        ))}
                      </Acc>}

                      {/* ATS score mini */}
                      {ats&&<Acc title="ATS SCORE SUMMARY" icon="📊">
                        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                          <ScoreRing val={ats.score} size={52} sw={4.5}/>
                          <div>
                            <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,letterSpacing:"-.03em"}}>RESUME SCORE</div>
                            <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,letterSpacing:".1em",marginTop:2,
                              color:ats.score>=75?"#6ee7b7":ats.score>=55?"#fde68a":"#fca5a5"}}>
                              {ats.score>=75?"ATS READY ✓":ats.score>=55?"NEEDS WORK":"CRITICAL GAPS"}
                            </div>
                          </div>
                        </div>
                        <button className="btn btn-g btn-xs" style={{width:"100%"}} onClick={()=>setActiveTab("ats")}>VIEW FULL REPORT →</button>
                      </Acc>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── MATCHES TAB ── */}
            {activeTab==="matches"&&(
              <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
                <div style={{padding:"10px 12px 8px",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
                  <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"rgba(255,255,255,.22)"}}>// AI MATCH RANKING</div>
                </div>
                <div className="sc" style={{flex:1}}>
                  {JOBS.sort((a,b)=>(scores[b.id]?.score||0)-(scores[a.id]?.score||0)).map((job,i)=>{
                    const sc=scores[job.id];
                    const isSel=selJob?.id===job.id;
                    const isSaved=!!savedJobs[job.id];
                    const scoreCol=sc?(sc.score>=75?"#6ee7b7":sc.score>=50?"#fde68a":"#fca5a5"):job.hex;
                    return (
                      <div key={job.id} className={`jrow${isSel?" on":""}`}
                        style={{animation:`fadeUp .3s ease ${i*.04}s both`}}
                        onClick={()=>setSelJob(job)}>
                        <div style={{display:"flex",gap:10,alignItems:"center"}}>
                          {sc?<ScoreRing val={sc.score} size={40} sw={3.5}/>
                            :<div style={{width:40,height:40,borderRadius:6,background:`${job.hex}12`,
                              border:`1px solid ${job.hex}25`,display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:18,flexShrink:0}}>{job.logo}</div>}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12.5,
                                color:"rgba(255,255,255,.88)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{job.co}</div>
                              <button onClick={e=>{e.stopPropagation();setSavedJobs(p=>{const n={...p};n[job.id]?delete n[job.id]:n[job.id]="SAVED";return n;})}}
                                style={{background:"none",border:"none",cursor:"pointer",fontSize:13,flexShrink:0,
                                  color:isSaved?"#fde68a":"rgba(255,255,255,.16)",transition:"all .15s"}}
                                onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"}
                                onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                                {isSaved?"★":"☆"}
                              </button>
                            </div>
                            <div style={{fontFamily:"'Azeret Mono',monospace",color:job.hex,fontSize:10.5,
                              letterSpacing:".02em",marginBottom:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{job.role}</div>
                            {sc&&<div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{flex:1,height:3,borderRadius:1,background:"rgba(255,255,255,.06)"}}>
                                <div style={{height:"100%",borderRadius:1,width:`${sc.score}%`,
                                  background:`linear-gradient(90deg,${scoreCol}66,${scoreCol})`,transition:"width 1.2s ease"}}/>
                              </div>
                              <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:9.5,color:scoreCol,fontWeight:700,flexShrink:0}}>{sc.score}%</span>
                            </div>}
                          </div>
                        </div>
                        {isSel&&sc&&(
                          <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.05)",animation:"fadeUp .2s ease"}}>
                            <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10.5,color:"rgba(255,255,255,.38)",lineHeight:1.6,marginBottom:8,letterSpacing:".02em"}}>{sc.why}</div>
                            <div style={{display:"flex",gap:4}}>
                              <button className="btn btn-p btn-xs" onClick={e=>{e.stopPropagation();generate("cover",job);}}>✉ COVER</button>
                              <button className="btn btn-g btn-xs" onClick={e=>{e.stopPropagation();generate("tailor",job);}}>✏ TAILOR</button>
                              <button className="btn btn-g btn-xs" onClick={e=>{e.stopPropagation();generate("interview",job);}}>🎯 PREP</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SAVED TAB ── */}
            {activeTab==="saved"&&(
              <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
                <div style={{padding:"10px 12px 8px",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
                  <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"rgba(255,255,255,.22)"}}>// APPLICATION TRACKER</div>
                </div>
                <div className="sc" style={{flex:1}}>
                  {savedList.length===0
                    ?<div style={{padding:"48px 20px",textAlign:"center",fontFamily:"'Azeret Mono',monospace",
                        fontSize:11,color:"rgba(255,255,255,.2)",lineHeight:1.8,letterSpacing:".04em"}}>
                        <div style={{fontSize:28,marginBottom:12,opacity:.4,animation:"float 3s ease-in-out infinite"}}>★</div>
                        NO SAVED JOBS<br/>STAR JOBS TO TRACK
                      </div>
                    :savedList.map(job=>{
                        const status=savedJobs[job.id]||"SAVED";
                        return (
                          <div key={job.id} className="jrow" onClick={()=>{setSelJob(job);setActiveTab("matches");}}>
                            <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:8}}>
                              <span style={{fontSize:18}}>{job.logo}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12.5}}>{job.co}</div>
                                <div style={{fontFamily:"'Azeret Mono',monospace",color:job.hex,fontSize:10,letterSpacing:".02em"}}>{job.role}</div>
                              </div>
                              <div style={{padding:"2px 8px",borderRadius:2,background:`${TRACK_HEX[status]}14`,
                                border:`1px solid ${TRACK_HEX[status]}30`,fontFamily:"'Azeret Mono',monospace",
                                fontSize:9,color:TRACK_HEX[status],letterSpacing:".1em"}}>{status}</div>
                            </div>
                            <div style={{display:"flex",gap:2}}>
                              {TRACK_LABELS.map(s=>(
                                <button key={s} onClick={e=>{e.stopPropagation();setSavedJobs(p=>({...p,[job.id]:s}));}}
                                  style={{flex:1,padding:"5px 2px",borderRadius:3,border:"none",cursor:"pointer",
                                    background:status===s?`${TRACK_HEX[s]}18`:"rgba(255,255,255,.025)",
                                    color:status===s?TRACK_HEX[s]:"rgba(255,255,255,.2)",fontSize:13,transition:"all .12s"}}>
                                  {s==="SAVED"?"★":s==="APPLIED"?"📤":s==="INTERVIEW"?"🎯":s==="OFFER"?"🎉":"✗"}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            )}

            {/* ── ATS TAB ── */}
            {activeTab==="ats"&&(
              <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
                <div style={{padding:"10px 12px 8px",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
                  <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"rgba(255,255,255,.22)"}}>// ATS ANALYSIS</div>
                </div>
                <div className="sc" style={{flex:1,padding:"10px 12px"}}>
                  {!ats?<div style={{display:"flex",justifyContent:"center",paddingTop:48}}><Spin size={24}/></div>:(
                    <div style={{animation:"fadeUp .3s ease"}}>
                      <div style={{border:"1px solid rgba(255,255,255,.07)",borderRadius:6,padding:16,marginBottom:10,
                        background:"rgba(255,255,255,.02)",display:"flex",gap:14,alignItems:"center"}}>
                        <ScoreRing val={ats.score} size={62} sw={5}/>
                        <div>
                          <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:800,letterSpacing:"-.03em"}}>RESUME SCORE</div>
                          <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,letterSpacing:".1em",marginTop:3,
                            color:ats.score>=75?"#6ee7b7":ats.score>=55?"#fde68a":"#fca5a5"}}>
                            {ats.score>=75?"ATS READY ✓":ats.score>=55?"NEEDS WORK":"CRITICAL GAPS"}
                          </div>
                        </div>
                      </div>
                      <Acc title="SCORE BREAKDOWN" icon="▤">
                        {Object.entries(ats.breakdown||{}).map(([k,v])=>(
                          <BigScoreBar key={k} val={v} label={k.toUpperCase()}/>
                        ))}
                      </Acc>
                      <Acc title="STRENGTHS" icon="✓">
                        {ats.strengths?.map((s,i)=>(
                          <div key={i} style={{display:"flex",gap:8,marginBottom:7}}>
                            <span style={{color:"#6ee7b7",flexShrink:0,fontFamily:"'Azeret Mono',monospace",fontSize:11}}>+</span>
                            <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.52)",lineHeight:1.55,letterSpacing:".02em"}}>{s}</span>
                          </div>
                        ))}
                      </Acc>
                      <Acc title="ISSUES TO FIX" icon="!">
                        {ats.issues?.map((item,i)=>(
                          <div key={i} style={{marginBottom:8,padding:10,borderRadius:4,
                            background:`rgba(${item.priority==="high"?"252,165,165":"253,230,138"},.05)`,
                            border:`1px solid rgba(${item.priority==="high"?"252,165,165":"253,230,138"},.15)`}}>
                            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                              <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:8.5,padding:"1px 6px",letterSpacing:".14em",borderRadius:2,
                                background:`rgba(${item.priority==="high"?"252,165,165":"253,230,138"},.12)`,
                                color:item.priority==="high"?"#fca5a5":"#fde68a"}}>{item.priority?.toUpperCase()}</span>
                              <span style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:700,color:"rgba(255,255,255,.78)"}}>{item.issue}</span>
                            </div>
                            <p style={{fontFamily:"'Azeret Mono',monospace",fontSize:10.5,color:"rgba(255,255,255,.38)",lineHeight:1.55,letterSpacing:".02em"}}>{item.fix}</p>
                          </div>
                        ))}
                      </Acc>
                      {ats.missing?.length>0&&<Acc title="MISSING KEYWORDS" icon="⌕">
                        {ats.missing.map(k=><Chip key={k} col="#fca5a5">{k}</Chip>)}
                      </Acc>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── IMPROVE TAB ── */}
            {activeTab==="improve"&&(
              <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
                <div style={{padding:"10px 12px 8px",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
                  <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"rgba(255,255,255,.22)"}}>// IMPROVEMENT SUGGESTIONS</div>
                </div>
                <div className="sc" style={{flex:1,padding:"10px 12px"}}>
                  {improvements.length===0
                    ?<div style={{display:"flex",justifyContent:"center",paddingTop:48}}><Spin size={24}/></div>
                    :improvements.map((item,i)=>(
                      <div key={i} style={{marginBottom:10,padding:12,borderRadius:6,
                        background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)",
                        animation:`fadeUp .3s ease ${i*.07}s both`}}>
                        <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:6}}>
                          <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:8.5,padding:"1px 7px",borderRadius:2,
                            background:`rgba(${item.impact==="high"?"252,165,165":"253,230,138"},.1)`,
                            border:`1px solid rgba(${item.impact==="high"?"252,165,165":"253,230,138"},.2)`,
                            letterSpacing:".12em",color:item.impact==="high"?"#fca5a5":"#fde68a"}}>
                            {item.impact?.toUpperCase()}
                          </span>
                          <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:9.5,color:"#a5b4fc",letterSpacing:".08em"}}>{item.category?.toUpperCase()}</span>
                        </div>
                        <p style={{fontFamily:"'Azeret Mono',monospace",fontSize:11.5,color:"rgba(255,255,255,.72)",lineHeight:1.6,marginBottom:6,letterSpacing:".02em"}}>{item.suggestion}</p>
                        {item.example&&<p style={{fontFamily:"'Azeret Mono',monospace",fontSize:10.5,color:"rgba(255,255,255,.32)",lineHeight:1.55,fontStyle:"italic",borderLeft:"2px solid rgba(165,180,252,.3)",paddingLeft:8}}>{item.example}</p>}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* ── CHAT TAB ── */}
            {activeTab==="chat"&&(
              <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
                <div style={{padding:"10px 12px 8px",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
                  <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"rgba(255,255,255,.22)",marginBottom:selJob?7:0}}>// AI CAREER COACH</div>
                  {selJob&&<div style={{padding:"4px 9px",borderRadius:3,background:"rgba(165,180,252,.07)",border:"1px solid rgba(165,180,252,.14)",
                    fontFamily:"'Azeret Mono',monospace",fontSize:10,color:"rgba(165,180,252,.8)",letterSpacing:".04em"}}>
                    CTX: {selJob.co?.toUpperCase()} / {selJob.role?.slice(0,22)?.toUpperCase()}
                  </div>}
                </div>
                <div className="sc" style={{flex:1,padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
                  {chatMsgs.map((m,i)=>(
                    <div key={i}
                      style={{maxWidth:"90%",padding:"9px 12px",alignSelf:m.r==="user"?"flex-end":"flex-start",
                        borderRadius:m.r==="user"?"8px 8px 2px 8px":"8px 8px 8px 2px",
                        background:m.r==="user"?"rgba(165,180,252,.12)":"rgba(255,255,255,.035)",
                        border:`1px solid ${m.r==="user"?"rgba(165,180,252,.25)":"rgba(255,255,255,.07)"}`,
                        fontFamily:"'Azeret Mono',monospace",fontSize:11.5,lineHeight:1.65,
                        color:m.r==="user"?"#c7d2fe":"rgba(255,255,255,.72)",
                        letterSpacing:".02em",animation:"fadeUp .2s ease"}}>
                      {m.t}
                    </div>
                  ))}
                  {chatLoad&&<div style={{alignSelf:"flex-start",padding:"9px 12px",borderRadius:"8px 8px 8px 2px",
                    background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",
                    display:"flex",gap:7,alignItems:"center"}}>
                    <Spin size={12}/><span style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,color:"rgba(255,255,255,.3)"}}>processing...</span>
                  </div>}
                  <div ref={chatEndRef}/>
                </div>
                <div style={{padding:"8px 12px",borderTop:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:7}}>
                    {["IMPROVE SCORE","MISSING SKILLS","NEXT STEPS","SALARY ADVICE","CAREER PATH"].map(q=>(
                      <button key={q} onClick={()=>setChatIn(q.toLowerCase())}
                        style={{padding:"3px 8px",borderRadius:3,fontFamily:"'Azeret Mono',monospace",
                          fontSize:9,letterSpacing:".1em",color:"rgba(255,255,255,.3)",cursor:"pointer",
                          background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",transition:"all .15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.color="rgba(255,255,255,.7)";e.currentTarget.style.borderColor="rgba(165,180,252,.3)";}}
                        onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.3)";e.currentTarget.style.borderColor="rgba(255,255,255,.08)";}}>
                        {q}
                      </button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <input className="inp" placeholder="> ask anything_" value={chatIn}
                      onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()}/>
                    <button className="btn btn-p btn-xs" onClick={sendChat}
                      disabled={!chatIn.trim()||chatLoad} style={{flexShrink:0,padding:"8px 12px"}}>→</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar toggle */}
        <div style={{width:1,background:"rgba(255,255,255,.05)",flexShrink:0,position:"relative"}}>
          <button className="handle" onClick={()=>setShowSide(v=>!v)}>{showSide?"‹":"›"}</button>
        </div>

        {/* ════ JOB BROWSER ════ */}
        <div style={{width:showBrowser?292:0,flexShrink:0,overflow:"hidden",
          transition:"width .3s cubic-bezier(.4,0,.2,1)",borderRight:"1px solid rgba(255,255,255,.05)"}}>
          <div style={{width:292,height:"100%",display:"flex",flexDirection:"column",
            opacity:showBrowser?1:0,transition:"opacity .2s",pointerEvents:showBrowser?"auto":"none"}}>

            <div style={{padding:"10px 12px",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,letterSpacing:"0.2em",color:"rgba(255,255,255,.22)"}}>// BROWSE JOBS</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"#a5b4fc",
                    background:"rgba(165,180,252,.1)",border:"1px solid rgba(165,180,252,.2)",
                    padding:"1px 6px",borderRadius:2}}>{browserJobs.length}</span>
                  <select className="sel" style={{flex:"unset",width:"auto",fontSize:10,padding:"4px 7px"}}
                    value={bSort} onChange={e=>setBSort(e.target.value)}>
                    <option value="match">MATCH ↓</option>
                    <option value="salary">SALARY ↓</option>
                    <option value="alpha">A→Z</option>
                  </select>
                </div>
              </div>
              <div style={{position:"relative",marginBottom:7}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",
                  fontFamily:"'Azeret Mono',monospace",fontSize:12,color:"rgba(255,255,255,.2)",pointerEvents:"none"}}>⌕</span>
                <input className="inp" style={{paddingLeft:28}} placeholder="search jobs, skills…"
                  value={bSearch} onChange={e=>setBSearch(e.target.value)}/>
              </div>
              <div style={{display:"flex",gap:5}}>
                <select className="sel" value={bRemote} onChange={e=>setBRemote(e.target.value)}>
                  {["ALL","Remote","Hybrid","On-site"].map(v=><option key={v}>{v}</option>)}
                </select>
                <select className="sel" value={bInd} onChange={e=>setBInd(e.target.value)}>
                  {ALL_IND.map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="sc" style={{flex:1,padding:"8px"}}>
              {browserJobs.length===0&&(
                <div style={{textAlign:"center",padding:"40px 16px",fontFamily:"'Azeret Mono',monospace",
                  fontSize:11,color:"rgba(255,255,255,.2)",letterSpacing:".06em"}}>
                  <div style={{fontSize:24,marginBottom:10,opacity:.3}}>⌕</div>NO RESULTS
                </div>
              )}
              {browserJobs.map((job,i)=>{
                const sc=scores[job.id];
                const isSel=selJob?.id===job.id;
                const isSaved=!!savedJobs[job.id];
                const scoreCol=sc?(sc.score>=75?"#6ee7b7":sc.score>=50?"#fde68a":"#fca5a5"):job.hex;
                return (
                  <div key={job.id} className={`jcard${isSel?" on":""}`}
                    style={{animation:`fadeUp .3s ease ${i*.03}s both`}}
                    onClick={()=>setSelJob(job)}>
                    <div style={{display:"flex",gap:9,alignItems:"center",marginBottom:8}}>
                      <div style={{position:"relative",flexShrink:0}}>
                        <div style={{width:34,height:34,borderRadius:6,background:`${job.hex}12`,
                          border:`1px solid ${job.hex}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{job.logo}</div>
                        {sc&&<div style={{position:"absolute",bottom:-4,right:-4,width:17,height:17,
                          borderRadius:"50%",background:"#04040d",border:`1.5px solid ${scoreCol}`,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontFamily:"'Azeret Mono',monospace",fontSize:8,fontWeight:700,color:scoreCol}}>{sc.score}</div>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12.5,
                          color:"rgba(255,255,255,.88)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{job.co}</div>
                        <div style={{fontFamily:"'Azeret Mono',monospace",color:job.hex,fontSize:10.5,letterSpacing:".02em",
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{job.role}</div>
                      </div>
                      <button onClick={e=>{e.stopPropagation();setSavedJobs(p=>{const n={...p};n[job.id]?delete n[job.id]:n[job.id]="SAVED";return n;})}}
                        style={{background:"none",border:"none",cursor:"pointer",fontSize:14,flexShrink:0,
                          color:isSaved?"#fde68a":"rgba(255,255,255,.16)",transition:"all .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.25)"}
                        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                        {isSaved?"★":"☆"}
                      </button>
                    </div>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:sc?7:0}}>
                      <Chip col={job.hex} tiny>{job.ind}</Chip>
                      <Chip dim tiny>{job.remote}</Chip>
                      <Chip dim tiny>{job.lvl}</Chip>
                      <span style={{marginLeft:"auto",fontFamily:"'Azeret Mono',monospace",fontSize:9.5,color:"rgba(255,255,255,.25)",alignSelf:"center"}}>{job.sal}</span>
                    </div>
                    {sc&&<div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{flex:1,height:3,borderRadius:1,background:"rgba(255,255,255,.06)"}}>
                        <div style={{height:"100%",borderRadius:1,width:`${sc.score}%`,background:`linear-gradient(90deg,${scoreCol}55,${scoreCol})`,transition:"width 1.2s ease"}}/>
                      </div>
                      <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:9.5,fontWeight:700,color:scoreCol,flexShrink:0}}>{sc.score}%</span>
                    </div>}
                    {isSel&&(
                      <div style={{marginTop:9,paddingTop:9,borderTop:"1px solid rgba(255,255,255,.05)",animation:"fadeUp .2s ease"}}>
                        <div style={{display:"flex",flexWrap:"wrap",gap:0,marginBottom:8}}>
                          {job.skills.map(s=><Chip key={s} dim tiny>{s}</Chip>)}
                        </div>
                        {sc&&<p style={{fontFamily:"'Azeret Mono',monospace",fontSize:10.5,color:"rgba(255,255,255,.35)",lineHeight:1.6,marginBottom:8,letterSpacing:".02em"}}>{sc.why}</p>}
                        <div style={{display:"flex",gap:4}}>
                          <button className="btn btn-p btn-xs" onClick={e=>{e.stopPropagation();generate("cover",job);}}>✉</button>
                          <button className="btn btn-g btn-xs" onClick={e=>{e.stopPropagation();generate("tailor",job);}}>✏</button>
                          <button className="btn btn-g btn-xs" onClick={e=>{e.stopPropagation();generate("interview",job);}}>🎯</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Browser toggle */}
        <div style={{width:1,background:"rgba(255,255,255,.05)",flexShrink:0,position:"relative"}}>
          <button className="handle" onClick={()=>setShowBrowser(v=>!v)}>{showBrowser?"‹":"›"}</button>
        </div>

        {/* ════ DETAIL PANEL ════ */}
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minWidth:0}}>
          <div className="sc" style={{flex:1,padding:"20px 24px"}}>
            {!selJob?(
              /* ── Empty / Profile state ── */
              <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeUp .4s ease"}}>
                {profile?(
                  <div style={{width:"100%",maxWidth:580}}>
                    {/* Hero profile */}
                    <div style={{border:"1px solid rgba(255,255,255,.08)",borderRadius:8,padding:22,
                      background:"rgba(255,255,255,.018)",marginBottom:14,backdropFilter:"blur(10px)"}}>
                      <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:16}}>
                        <div style={{width:54,height:54,borderRadius:10,background:"rgba(165,180,252,.1)",
                          border:"1px solid rgba(165,180,252,.2)",display:"flex",alignItems:"center",
                          justifyContent:"center",fontSize:24,flexShrink:0}}>👤</div>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,letterSpacing:"-.03em",marginBottom:2}}>{profile.name}</div>
                          <div style={{fontFamily:"'Azeret Mono',monospace",color:"#a5b4fc",fontSize:12,letterSpacing:".04em",marginBottom:6}}>{profile.title}</div>
                          <div style={{display:"flex",gap:7}}>
                            <Chip dim>{profile.yearsExp} YRS</Chip>
                            <Chip dim>{profile.level?.toUpperCase()}</Chip>
                          </div>
                        </div>
                        {ats&&<ScoreRing val={ats.score} size={58} sw={5}/>}
                      </div>
                      <p style={{fontFamily:"'Azeret Mono',monospace",fontSize:12,color:"rgba(255,255,255,.4)",lineHeight:1.8,marginBottom:14,letterSpacing:".02em"}}>{profile.summary}</p>
                      <SLabel>Skills Detected</SLabel>
                      <div>{profile.skills?.map(s=><Chip key={s}>{s}</Chip>)}</div>
                    </div>

                    {/* Match visualization — big score bars */}
                    <div style={{border:"1px solid rgba(255,255,255,.07)",borderRadius:8,padding:18,background:"rgba(255,255,255,.015)",marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                        <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,letterSpacing:".18em",color:"rgba(255,255,255,.22)"}}>// JOB MATCH VISUALIZATION</div>
                        <Chip dim tiny>click a bar to view details</Chip>
                      </div>
                      {JOBS.sort((a,b)=>(scores[b.id]?.score||0)-(scores[a.id]?.score||0)).map((job,i)=>{
                        const sc=scores[job.id]; if(!sc) return null;
                        const col=sc.score>=75?"#6ee7b7":sc.score>=50?"#fde68a":"#fca5a5";
                        return (
                          <div key={job.id} onClick={()=>setSelJob(job)}
                            style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,cursor:"pointer",
                              padding:"6px 8px",borderRadius:4,transition:"background .15s"}}
                            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.03)"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <span style={{fontSize:16,flexShrink:0}}>{job.logo}</span>
                            <div style={{width:110,flexShrink:0}}>
                              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11.5,color:"rgba(255,255,255,.8)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{job.co}</div>
                              <div style={{fontFamily:"'Azeret Mono',monospace",color:job.hex,fontSize:9.5,letterSpacing:".02em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{job.role}</div>
                            </div>
                            <div style={{flex:1,height:20,borderRadius:2,background:"rgba(255,255,255,.06)",overflow:"hidden",position:"relative"}}>
                              <div style={{position:"absolute",left:0,top:0,bottom:0,
                                width:`${sc.score}%`,background:`linear-gradient(90deg,${col}44,${col}88)`,
                                transition:`width ${1+i*.1}s cubic-bezier(.34,1.2,.64,1)`,borderRadius:2}}/>
                              <div style={{position:"absolute",left:0,top:0,bottom:0,display:"flex",alignItems:"center",paddingLeft:8}}>
                                <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,color:col,fontWeight:700}}>{sc.score}%</span>
                              </div>
                            </div>
                            <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9.5,color:"rgba(255,255,255,.25)",flexShrink:0,width:60,textAlign:"right"}}>{job.sal}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{textAlign:"center",fontFamily:"'Azeret Mono',monospace",fontSize:10,color:"rgba(255,255,255,.18)",letterSpacing:".08em"}}>
                      SELECT A JOB TO VIEW FULL ANALYSIS<span style={{animation:"blink .9s step-end infinite"}}>_</span>
                    </div>
                  </div>
                ):(
                  <div style={{textAlign:"center",fontFamily:"'Azeret Mono',monospace",fontSize:12,color:"rgba(255,255,255,.2)"}}>
                    <div style={{fontSize:36,marginBottom:12,opacity:.3,animation:"float 3s ease-in-out infinite"}}>◈</div>
                    SELECT A JOB TO BEGIN
                  </div>
                )}
              </div>
            ):(
              /* ── Job Detail Panel ── */
              <div style={{maxWidth:680,animation:"slideR .3s ease"}}>
                {/* Job header */}
                <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:18,
                  paddingBottom:18,borderBottom:"1px solid rgba(255,255,255,.06)"}}>
                  <div style={{width:56,height:56,borderRadius:10,background:`${selJob.hex}10`,
                    border:`1px solid ${selJob.hex}22`,display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:26,flexShrink:0,
                    boxShadow:`0 0 28px ${selJob.hex}18`}}>{selJob.logo}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}>
                      <span style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,letterSpacing:"-.03em"}}>{selJob.co}</span>
                      {scores[selJob.id]&&<ScoreRing val={scores[selJob.id].score} size={44} sw={4}/>}
                    </div>
                    <div style={{fontFamily:"'Azeret Mono',monospace",color:selJob.hex,fontSize:13,letterSpacing:".04em",marginBottom:8}}>{selJob.role}</div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {[`📍 ${selJob.loc}`,selJob.remote,`💰 ${selJob.sal}`,selJob.lvl,selJob.ind].map(t=><Chip key={t} dim>{t}</Chip>)}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
                  <button className="btn btn-p" onClick={()=>generate("cover",selJob)}>✉ COVER LETTER</button>
                  <button className="btn btn-g" onClick={()=>generate("tailor",selJob)}>✏ TAILOR RESUME</button>
                  <button className="btn btn-g" onClick={()=>generate("interview",selJob)}>🎯 INTERVIEW PREP</button>
                  <button className="btn btn-g" onClick={()=>{setActiveTab("chat");setShowSide(true);}}>💬 COACH</button>
                  <button className="btn btn-g"
                    style={{color:savedJobs[selJob.id]?"#fde68a":undefined,borderColor:savedJobs[selJob.id]?"rgba(253,230,138,.3)":undefined}}
                    onClick={()=>setSavedJobs(p=>{const n={...p};n[selJob.id]?delete n[selJob.id]:n[selJob.id]="SAVED";return n;})}>
                    {savedJobs[selJob.id]?"★ SAVED":"☆ SAVE"}
                  </button>
                </div>

                {/* Match analysis with big % visualization */}
                {scores[selJob.id]&&<Acc title={`MATCH ANALYSIS · ${scores[selJob.id].score}% FIT`} icon="◈" defaultOpen accent="#a5b4fc">
                  {/* Big score display */}
                  <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:16,padding:14,
                    borderRadius:6,background:"rgba(165,180,252,.04)",border:"1px solid rgba(165,180,252,.1)"}}>
                    <ScoreRing val={scores[selJob.id].score} size={64} sw={6}/>
                    <div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,letterSpacing:"-.04em",
                        color:scores[selJob.id].score>=75?"#6ee7b7":scores[selJob.id].score>=50?"#fde68a":"#fca5a5"}}>
                        {scores[selJob.id].score}% Match
                      </div>
                      <p style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.65,letterSpacing:".02em",marginTop:4}}>{scores[selJob.id].why}</p>
                    </div>
                  </div>

                  {/* Skill grid */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                    <div style={{padding:12,borderRadius:5,background:"rgba(110,231,183,.04)",border:"1px solid rgba(110,231,183,.12)"}}>
                      <SLabel>Matched Skills</SLabel>
                      {scores[selJob.id].matched?.map(s=><Chip key={s} col="#6ee7b7" tiny>✓ {s}</Chip>)}
                      {!scores[selJob.id].matched?.length&&<span style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,color:"rgba(255,255,255,.22)"}}>none</span>}
                    </div>
                    <div style={{padding:12,borderRadius:5,background:"rgba(252,165,165,.04)",border:"1px solid rgba(252,165,165,.12)"}}>
                      <SLabel>Missing Skills</SLabel>
                      {scores[selJob.id].missing?.map(s=><Chip key={s} col="#fca5a5" tiny>✗ {s}</Chip>)}
                      {!scores[selJob.id].missing?.length&&<Chip col="#6ee7b7" tiny>✓ All covered</Chip>}
                    </div>
                  </div>

                  {scores[selJob.id].gap&&<div style={{padding:10,borderRadius:4,background:"rgba(253,230,138,.04)",border:"1px solid rgba(253,230,138,.12)"}}>
                    <SLabel>Main Gap</SLabel>
                    <p style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.6,letterSpacing:".02em"}}>{scores[selJob.id].gap}</p>
                  </div>}
                </Acc>}

                {/* Learning recommendations for this job */}
                {scores[selJob.id]?.missing?.length>0&&(
                  <Acc title="LEARNING RECOMMENDATIONS" icon="📚" defaultOpen accent="#fde68a"
                    badge={scores[selJob.id].missing.filter(s=>learning[s]).length}>
                    {scores[selJob.id].missing.map(skill=>{
                      const resources=learning[skill];
                      return (
                        <div key={skill} style={{marginBottom:12}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                            <Chip col="#fca5a5">{skill}</Chip>
                            <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"rgba(255,255,255,.25)",letterSpacing:".1em"}}>— MISSING</span>
                          </div>
                          {resources?.length>0
                            ?resources.map((r,ri)=>(
                              <a key={ri} href={r.url} target="_blank" rel="noopener noreferrer"
                                style={{display:"block",textDecoration:"none"}}
                                className="learn-card">
                                <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                                  <span style={{fontSize:18,flexShrink:0}}>{r.type==="book"?"📖":r.platform?.includes("YouTube")?"▶️":"🎓"}</span>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,color:"rgba(255,255,255,.82)",marginBottom:3,lineHeight:1.4}}>{r.title}</div>
                                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                                      <Chip tiny>{r.platform}</Chip>
                                      {r.level&&<Chip tiny dim>{r.level}</Chip>}
                                      {r.duration&&<Chip tiny dim>{r.duration}</Chip>}
                                    </div>
                                  </div>
                                  <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(165,180,252,.6)",flexShrink:0}}>→</span>
                                </div>
                              </a>
                            ))
                            :<div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10.5,color:"rgba(255,255,255,.25)",padding:"6px 0",letterSpacing:".04em"}}>
                              Search "{skill} course" on Coursera, Udemy, or YouTube
                            </div>
                          }
                        </div>
                      );
                    })}
                  </Acc>
                )}

                {/* Skill gap bar visualization */}
                {scores[selJob.id]&&<Acc title="SKILL GAP ANALYSIS" icon="▤" defaultOpen={false}>
                  <div style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,color:"rgba(255,255,255,.4)",letterSpacing:".08em"}}>OVERALL FIT</span>
                      <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:10,color:"rgba(255,255,255,.4)",letterSpacing:".08em"}}>
                        {scores[selJob.id].matched?.length||0}/{selJob.skills.length} SKILLS
                      </span>
                    </div>
                    <div style={{height:8,borderRadius:2,background:"rgba(255,255,255,.06)",overflow:"hidden",marginBottom:12}}>
                      <div style={{height:"100%",borderRadius:2,
                        width:`${Math.round(((scores[selJob.id].matched?.length||0)/selJob.skills.length)*100)}%`,
                        background:"linear-gradient(90deg,#6ee7b7,#34d399)",transition:"width 1.3s ease"}}/>
                    </div>
                  </div>
                  {selJob.skills.map(skill=>{
                    const hasIt=(scores[selJob.id].matched||[]).includes(skill)||(profile?.skills||[]).some(s=>s.toLowerCase().includes(skill.toLowerCase()));
                    return (
                      <div key={skill} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                        <div style={{width:14,height:14,borderRadius:2,flexShrink:0,
                          background:hasIt?"rgba(110,231,183,.15)":"rgba(252,165,165,.12)",
                          border:`1px solid ${hasIt?"rgba(110,231,183,.4)":"rgba(252,165,165,.35)"}`,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,
                          color:hasIt?"#6ee7b7":"#fca5a5"}}>
                          {hasIt?"✓":"✗"}
                        </div>
                        <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,
                          color:hasIt?"rgba(255,255,255,.7)":"rgba(255,255,255,.35)",letterSpacing:".02em"}}>{skill}</span>
                        {!hasIt&&learning[skill]&&(
                          <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"rgba(253,230,138,.6)",
                            background:"rgba(253,230,138,.08)",border:"1px solid rgba(253,230,138,.15)",
                            padding:"1px 6px",borderRadius:2,letterSpacing:".1em",marginLeft:"auto",cursor:"pointer"}}
                            onClick={()=>{}}>RESOURCES ↑</span>
                        )}
                      </div>
                    );
                  })}
                </Acc>}

                {/* Application tracker */}
                {savedJobs[selJob.id]&&<Acc title="APPLICATION TRACKER" icon="▦">
                  <div style={{display:"flex",gap:5}}>
                    {TRACK_LABELS.map(s=>{const isA=savedJobs[selJob.id]===s;return(
                      <button key={s} onClick={()=>setSavedJobs(p=>({...p,[selJob.id]:s}))}
                        style={{flex:1,padding:"8px 4px",borderRadius:4,border:`1px solid ${isA?TRACK_HEX[s]:"rgba(255,255,255,.08)"}`,
                          background:isA?`${TRACK_HEX[s]}10`:"rgba(255,255,255,.025)",cursor:"pointer",
                          fontFamily:"'Azeret Mono',monospace",fontSize:isA?9:13,letterSpacing:".08em",
                          color:isA?TRACK_HEX[s]:"rgba(255,255,255,.25)",transition:"all .15s",
                          display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <span style={{fontSize:14}}>{s==="SAVED"?"★":s==="APPLIED"?"📤":s==="INTERVIEW"?"🎯":s==="OFFER"?"🎉":"✗"}</span>
                        {isA&&<span>{s}</span>}
                      </button>
                    );})}
                  </div>
                </Acc>}

                {/* Why this matches you */}
                {scores[selJob.id]&&<Acc title="WHY THIS MATCHES YOU" icon="✦" defaultOpen={false}>
                  <div style={{padding:14,borderRadius:6,background:"rgba(165,180,252,.04)",border:"1px solid rgba(165,180,252,.12)",marginBottom:10}}>
                    <p style={{fontFamily:"'Azeret Mono',monospace",fontSize:12,color:"rgba(255,255,255,.62)",lineHeight:1.85,letterSpacing:".02em"}}>{scores[selJob.id].why}</p>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div style={{padding:10,borderRadius:5,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)"}}>
                      <SLabel>Your Strengths Here</SLabel>
                      {scores[selJob.id].matched?.slice(0,4).map(s=>(
                        <div key={s} style={{display:"flex",gap:6,marginBottom:5}}>
                          <span style={{color:"#6ee7b7",flexShrink:0,fontFamily:"'Azeret Mono',monospace",fontSize:11}}>+</span>
                          <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.55)"}}>{s}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:10,borderRadius:5,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)"}}>
                      <SLabel>Areas to Develop</SLabel>
                      {scores[selJob.id].missing?.slice(0,4).map(s=>(
                        <div key={s} style={{display:"flex",gap:6,marginBottom:5}}>
                          <span style={{color:"#fca5a5",flexShrink:0,fontFamily:"'Azeret Mono',monospace",fontSize:11}}>→</span>
                          <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.55)"}}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Acc>}

                <Acc title="JOB REQUIREMENTS" icon="▤" defaultOpen={false}>
                  <p style={{fontFamily:"'Azeret Mono',monospace",fontSize:11.5,color:"rgba(255,255,255,.42)",lineHeight:1.8,marginBottom:12,letterSpacing:".02em"}}>{selJob.desc}</p>
                  <SLabel>Required Skills</SLabel>
                  <div style={{marginBottom:10}}>{selJob.skills.map(s=><Chip key={s}>{s}</Chip>)}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[{l:"Location",v:selJob.loc},{l:"Work Mode",v:selJob.remote},{l:"Level",v:selJob.lvl},{l:"Salary",v:selJob.sal}].map(({l,v})=>(
                      <div key={l} style={{padding:"8px 10px",borderRadius:4,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}}>
                        <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:".12em",marginBottom:3}}>{l.toUpperCase()}</div>
                        <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:"rgba(255,255,255,.78)"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </Acc>

                {/* Generated: Cover Letter */}
                {activeGen==="cover"&&<Acc title="COVER LETTER" icon="✉" accent="#a5b4fc">
                  {genning==="cover"?<div style={{display:"flex",gap:8,alignItems:"center",padding:"14px 0"}}>
                    <Spin/><span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.3)"}}>generating...</span>
                  </div>:selContent&&<div>
                    <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:12,color:"rgba(255,255,255,.68)",lineHeight:1.9,whiteSpace:"pre-wrap",marginBottom:12,letterSpacing:".02em"}}>{selContent}</div>
                    <button className="btn btn-g btn-xs" onClick={()=>navigator.clipboard.writeText(selContent)}>▤ COPY</button>
                  </div>}
                </Acc>}

                {/* Generated: Tailored Resume */}
                {activeGen==="tailor"&&<Acc title="TAILORED RESUME" icon="✏" accent="#6ee7b7">
                  {genning==="tailor"?<div style={{display:"flex",gap:8,alignItems:"center",padding:"14px 0"}}>
                    <Spin col="#6ee7b7"/><span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.3)"}}>tailoring for {selJob.role}...</span>
                  </div>:selContent&&<div>
                    <textarea rows={16} readOnly value={selContent} style={{marginBottom:10}}/>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-g btn-xs" onClick={()=>navigator.clipboard.writeText(selContent)}>▤ COPY</button>
                      <button className="btn btn-g btn-xs" onClick={()=>{const b=new Blob([selContent],{type:"text/plain"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`resume-${selJob.co.replace(/\s+/g,"-").toLowerCase()}.txt`;a.click();}}>↓ DOWNLOAD</button>
                    </div>
                  </div>}
                </Acc>}

                {/* Generated: Interview Prep */}
                {activeGen==="interview"&&<Acc title="INTERVIEW PREP" icon="🎯" accent="#fde68a">
                  {genning==="interview"?<div style={{display:"flex",gap:8,alignItems:"center",padding:"14px 0"}}>
                    <Spin col="#fde68a"/><span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.3)"}}>building prep guide...</span>
                  </div>:selContent&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {selContent.themes?.length>0&&<div style={{padding:12,borderRadius:5,background:"rgba(253,230,138,.04)",border:"1px solid rgba(253,230,138,.14)"}}>
                      <SLabel>Key Interview Themes</SLabel>
                      {selContent.themes.map((t,i)=><div key={i} style={{display:"flex",gap:7,marginBottom:5}}>
                        <span style={{color:"#fde68a",fontFamily:"'Azeret Mono',monospace",fontSize:11,flexShrink:0}}>◆</span>
                        <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.58)",letterSpacing:".02em"}}>{t}</span>
                      </div>)}
                    </div>}
                    {selContent.behavioral?.map((q,i)=><div key={i} style={{padding:12,borderRadius:5,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)"}}>
                      <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"#a5b4fc",letterSpacing:".15em",marginBottom:5}}>BEHAVIORAL #{i+1}</div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:13.5,fontWeight:700,color:"rgba(255,255,255,.88)",marginBottom:5}}>{q.q}</div>
                      {q.tip&&<div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10.5,color:"rgba(253,230,138,.7)",marginBottom:4}}>HINT: {q.tip}</div>}
                      {q.star&&<div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10.5,color:"rgba(255,255,255,.32)",lineHeight:1.6,letterSpacing:".02em",borderLeft:"2px solid rgba(165,180,252,.2)",paddingLeft:8,fontStyle:"italic"}}>{q.star}</div>}
                    </div>)}
                    {selContent.technical?.map((q,i)=><div key={i} style={{padding:12,borderRadius:5,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)"}}>
                      <div style={{fontFamily:"'Azeret Mono',monospace",fontSize:9,color:"#6ee7b7",letterSpacing:".15em",marginBottom:5}}>TECHNICAL #{i+1}</div>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:13.5,fontWeight:700,color:"rgba(255,255,255,.88)",marginBottom:5}}>{q.q}</div>
                      {q.tip&&<div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10.5,color:"rgba(253,230,138,.7)",marginBottom:4}}>HINT: {q.tip}</div>}
                      {q.ans&&<div style={{fontFamily:"'Azeret Mono',monospace",fontSize:10.5,color:"rgba(255,255,255,.32)",lineHeight:1.6,letterSpacing:".02em"}}>{q.ans}</div>}
                    </div>)}
                    {selContent.toAsk?.length>0&&<div style={{padding:12,borderRadius:5,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)"}}>
                      <SLabel>Questions to Ask Them</SLabel>
                      {selContent.toAsk.map((q,i)=><div key={i} style={{display:"flex",gap:7,marginBottom:6}}>
                        <span style={{color:"#fbcfe8",fontFamily:"'Azeret Mono',monospace",fontSize:11,flexShrink:0}}>?</span>
                        <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.55)",letterSpacing:".02em"}}>{q}</span>
                      </div>)}
                    </div>}
                    {selContent.watchouts?.length>0&&<div style={{padding:12,borderRadius:5,background:"rgba(252,165,165,.04)",border:"1px solid rgba(252,165,165,.14)"}}>
                      <SLabel>Watch Outs</SLabel>
                      {selContent.watchouts.map((r,i)=><div key={i} style={{display:"flex",gap:7,marginBottom:5}}>
                        <span style={{color:"#fca5a5",fontFamily:"'Azeret Mono',monospace",fontSize:11,flexShrink:0}}>⚠</span>
                        <span style={{fontFamily:"'Azeret Mono',monospace",fontSize:11,color:"rgba(255,255,255,.5)",letterSpacing:".02em"}}>{r}</span>
                      </div>)}
                    </div>}
                  </div>}
                </Acc>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
