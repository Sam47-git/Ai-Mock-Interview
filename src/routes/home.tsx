import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

// ── Safe Marquee: inline CSS animation ────────────
const InfiniteMarquee = ({ children }: { children: React.ReactNode }) => (
  <div style={{ overflow: "hidden", flex: 1, padding: "0 2rem" }}>
    <div style={{ display: "flex", width: "max-content", animation: "ai-marquee 30s linear infinite" }}>
      {children}{children}
    </div>
  </div>
);

// ── Animation keyframes ───────────────────────────────────────────────────────
const STYLES = `
  @keyframes ai-marquee   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes ai-pulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
  @keyframes ai-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes ai-wave      { 0%,100%{transform:scaleY(.4);opacity:.4} 50%{transform:scaleY(1);opacity:1} }
  .ai-live-dot  { width:7px;height:7px;background:#c8502a;border-radius:50%;display:inline-block;animation:ai-pulse 2s ease-in-out infinite; }
  .ai-float-1   { animation:ai-float 4s ease-in-out infinite; }
  .ai-float-2   { animation:ai-float 4s ease-in-out 2s infinite; }
  .ai-wave-bar  { width:3px;background:rgba(255,255,255,0.85);border-radius:3px;animation:ai-wave 1.1s ease-in-out infinite; }
  .ai-wave-bar:nth-child(1){height:10px;animation-delay:0s}
  .ai-wave-bar:nth-child(2){height:18px;animation-delay:.1s}
  .ai-wave-bar:nth-child(3){height:26px;animation-delay:.2s}
  .ai-wave-bar:nth-child(4){height:14px;animation-delay:.3s}
  .ai-wave-bar:nth-child(5){height:22px;animation-delay:.4s}
  .ai-wave-bar:nth-child(6){height:10px;animation-delay:.5s}
  .ai-wave-bar:nth-child(7){height:18px;animation-delay:.6s}
  .ai-btn-pri:hover { background:#c8502a!important;transform:translateY(-2px);box-shadow:0 8px 24px rgba(200,80,42,.3); }
  .ai-step:hover  { transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.08); }
  .ai-testi:hover { transform:translateY(-2px); }
  @media(max-width:900px){
    .ai-hero-g  { grid-template-columns:1fr!important; }
    .ai-vis     { order:-1; }
    .ai-badge   { display:none!important; }
    .ai-split   { grid-template-columns:1fr!important;gap:2rem!important; }
    .ai-steps   { grid-template-columns:1fr!important; }
    .ai-testis  { grid-template-columns:1fr!important; }
  }
`;

const companies = ["Google","Microsoft","Amazon","Meta","Apple","Stripe","Netflix","Airbnb","Spotify","Salesforce","Adobe","Atlassian"];

const steps = [
  { num:"01", icon:"🎯", title:"Set your target role",       desc:"Tell us the job title, job description, year of experience, and teck stack. Our AI tailors every question to match real-world expectations precisely." },
  { num:"02", icon:"🎙️", title:"Practice out loud",          desc:"Answer via voice — just like a real interview. The AI scores clarity, structure, and confidence in real time." },
  { num:"03", icon:"📈", title:"Get actionable feedback",    desc:"Get a detailed breakdown of strengths and specific improvements so every session makes you noticeably better." },
];

// ── Main component ────────────────────────────────────────────────────────────
const HomePage = () => (
  <div
    style={{ fontFamily:"var(--ai-sans,'Outfit',sans-serif)", background:"var(--ai-surface,#f5f2ee)", color:"var(--ai-ink,#0d0d0d)" }}
    className="w-full"
  >
    <style>{STYLES}</style>

    {/* ════════ HERO ════════════════════════════════════════════════════════ */}
    <div style={{ maxWidth:"1200px", margin:"0 auto" }}>
      <div
        className="ai-hero-g"
        style={{ padding:"clamp(3rem,8vh,5.5rem) clamp(1.5rem,5vw,4rem)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3.5rem", alignItems:"center" }}
      >
        {/* Left: text */}
        <div>
          {/* Pill label */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:"7px", background:"var(--ai-accent-lt,#f5e8e3)", color:"var(--ai-accent,#c8502a)", fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", padding:"5px 14px", borderRadius:"100px", marginBottom:"1.5rem" }}>
            <span className="ai-live-dot" />
            AI-Powered Interview Prep
          </div>

          {/* H1 */}
          <h1 style={{ fontFamily:"var(--ai-serif,'DM Serif Display',Georgia,serif)", fontSize:"clamp(3rem,5.5vw,4.6rem)", lineHeight:1.04, letterSpacing:"-0.03em", marginBottom:"1.5rem" }}>
            Ace your next<br />interview with{" "}
            <em style={{ fontStyle:"italic", color:"var(--ai-accent,#c8502a)" }}>confidence</em>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize:"1.05rem", color:"var(--ai-ink-2,#3d3d3d)", lineHeight:1.72, marginBottom:"2.5rem", maxWidth:"430px" }}>
            Practice with an AI that gives real-time feedback on your answers, tone, and delivery — so you walk into interviews ready to impress.
          </p>

          {/* CTAs */}
          <div style={{ display:"flex", alignItems:"center", gap:"1.25rem", flexWrap:"wrap" }}>
            <Link
              to="/generate"
              className="ai-btn-pri"
              style={{ background:"#0d0d0d", color:"#fff", padding:"14px 28px", borderRadius:"100px", fontFamily:"inherit", fontSize:"0.95rem", fontWeight:600, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"8px", transition:"background .2s,transform .15s,box-shadow .2s" }}
            >
              <Sparkles size={16} />
              Generate Interview
            </Link>
            <a href="#how-it-works" style={{ color:"var(--ai-ink-2,#3d3d3d)", fontSize:"0.9rem", textDecoration:"none" }}>
              See how it works →
            </a>
          </div>

          {/* Stats row */}
          <div style={{ display:"flex", gap:"2.5rem", marginTop:"3rem", paddingTop:"2rem", borderTop:"1px solid var(--ai-surface-3,#e3ddd5)" }}>
            {[["🎤"," Mock Interviews",""],["⚡"," Instant Feedback",""],["📈"," Progress Tracking",""]].map(([n,l]) => (
              <div key={l}>
                <div style={{ fontFamily:"var(--ai-serif,'DM Serif Display',Georgia,serif)", fontSize:"1.9rem", lineHeight:1 }}>{n}</div>
                <div style={{ fontSize:"0.78rem", color:"var(--ai-ink-3,#7a7a7a)", marginTop:"3px" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: gradient card (Image 2 style) */}
        <div className="ai-vis" style={{ position:"relative" }}>
          {/* Main gradient card */}
          <div style={{ borderRadius:"20px", overflow:"hidden", boxShadow:"0 24px 64px rgba(13,13,13,0.14)", aspectRatio:"4/3", background:"linear-gradient(135deg,#7b6ef6 0%,#c8502a 55%,#f093fb 100%)", position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {/* Dot grid overlay */}
            <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.18) 1px,transparent 1px)", backgroundSize:"28px 28px" }} />

            {/* Interview UI card */}
            <div style={{ position:"relative", zIndex:1, background:"rgba(255,255,255,0.14)", backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:"16px", padding:"1.4rem 1.6rem", width:"78%", color:"white" }}>
              {/* AI header */}
              <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"0.9rem" }}>
                <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:"rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>🤖</div>
                <div>
                  <div style={{ fontSize:"0.88rem", fontWeight:700, opacity:.97 }}>InterviewAI</div>
                  <div style={{ fontSize:"0.71rem", opacity:.6, display:"flex", alignItems:"center", gap:"5px" }}>
                    <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#4cff8f", display:"inline-block" }} />
                    Live session · 04:32
                  </div>
                </div>
              </div>
              {/* Question */}
              <p style={{ fontSize:"0.87rem", lineHeight:1.58, opacity:.93, fontStyle:"italic", margin:0, marginBottom:"1rem" }}>
                "Tell me about a time you led a cross-functional team through a challenging technical project. What was your approach?"
              </p>
              {/* Waveform */}
              <div style={{ display:"flex", alignItems:"center", gap:"3px", height:"26px" }}>
                {[1,2,3,4,5,6,7].map(i => <div key={i} className="ai-wave-bar" />)}
              </div>
            </div>
          </div>

          {/* Floating badge: Answer scored */}
          <div className="ai-badge ai-float-1" style={{ position:"absolute", top:"-18px", right:"-18px", background:"#fff", borderRadius:"14px", padding:"10px 16px", boxShadow:"0 8px 32px rgba(0,0,0,0.13)", display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#e8f5e9", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#2e7d32" }}>✓</div>
            <div>
              <div style={{ fontWeight:700, color:"#0d0d0d", fontSize:"0.82rem" }}>Answer scored</div>
              <div style={{ color:"#7a7a7a", fontSize:"0.72rem" }}>Confidence: 92%</div>
            </div>
          </div>

          {/* Floating badge: Feedback ready */}
          <div className="ai-badge ai-float-2" style={{ position:"absolute", bottom:"-18px", left:"-10px", background:"#fff", borderRadius:"14px", padding:"10px 16px", boxShadow:"0 8px 32px rgba(0,0,0,0.13)", display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:"30px", height:"30px", borderRadius:"8px", background:"#fff3e0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem" }}>📊</div>
            <div>
              <div style={{ fontWeight:700, color:"#0d0d0d", fontSize:"0.82rem" }}>Feedback ready</div>
              <div style={{ color:"#7a7a7a", fontSize:"0.72rem" }}>3 improvements found</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ════════ MARQUEE ═════════════════════════════════════════════════════ */}
    <div style={{ background:"var(--ai-surface-2,#ede9e3)", borderTop:"1px solid var(--ai-surface-3,#e3ddd5)", borderBottom:"1px solid var(--ai-surface-3,#e3ddd5)", padding:"1.1rem 0", display:"flex", alignItems:"center" }}>
      <div style={{ flexShrink:0, padding:"0 2rem", fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--ai-ink-3,#7a7a7a)", borderRight:"1px solid var(--ai-surface-3,#e3ddd5)", whiteSpace:"nowrap", minWidth:"150px" }}>
        Prepare for roles at
      </div>
      <InfiniteMarquee>
        {companies.map(c => (
          <div key={c} style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"0.84rem", fontWeight:500, color:"var(--ai-ink-2,#3d3d3d)", whiteSpace:"nowrap", marginRight:"3rem" }}>
            <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:"var(--ai-surface-3,#e3ddd5)", display:"inline-block" }} />
            {c}
          </div>
        ))}
      </InfiniteMarquee>
    </div>

    {/* ════════ HOW IT WORKS ════════════════════════════════════════════════ */}
    <section id="how-it-works" style={{ maxWidth:"1200px", margin:"0 auto", padding:"clamp(3rem,7vh,5rem) clamp(1.5rem,5vw,4rem)" }}>
      <div style={{ fontSize:"0.73rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--ai-accent,#c8502a)", marginBottom:"0.75rem" }}>Process</div>
      <h2 style={{ fontFamily:"var(--ai-serif,'DM Serif Display',Georgia,serif)", fontSize:"clamp(2rem,4vw,3rem)", lineHeight:1.1, letterSpacing:"-0.02em", maxWidth:"600px" }}>
        Three steps to interview{" "}
        <em style={{ fontStyle:"italic", color:"var(--ai-accent,#c8502a)" }}>mastery</em>
      </h2>
      <div className="ai-steps" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1.5rem", marginTop:"3rem" }}>
        {steps.map(s => (
          <div key={s.num} className="ai-step" style={{ background:"#fff", borderRadius:"16px", padding:"2rem", border:"1px solid var(--ai-surface-3,#e3ddd5)", transition:"transform .25s,box-shadow .25s" }}>
            <span style={{ fontFamily:"var(--ai-serif,'DM Serif Display',Georgia,serif)", fontSize:"3rem", color:"var(--ai-surface-2,#ede9e3)", lineHeight:1, marginBottom:"1.2rem", display:"block" }}>{s.num}</span>
            <div style={{ width:"44px", height:"44px", borderRadius:"10px", background:"var(--ai-accent-lt,#f5e8e3)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"1rem", fontSize:"1.2rem" }}>{s.icon}</div>
            <div style={{ fontSize:"1.05rem", fontWeight:600, marginBottom:"0.5rem" }}>{s.title}</div>
            <p style={{ fontSize:"0.88rem", color:"var(--ai-ink-2,#3d3d3d)", lineHeight:1.65, margin:0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ════════ FEATURE SPLIT (dark) ════════════════════════════════════════ */}
    <section style={{ background:"#0d0d0d", padding:"clamp(3rem,7vh,5rem) clamp(1.5rem,5vw,4rem)" }}>
      <div className="ai-split" style={{ maxWidth:"1200px", margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"5rem", alignItems:"center" }}>
        {/* Score card */}
        <div style={{ background:"#1a1a1a", borderRadius:"16px", padding:"1.5rem", border:"1px solid #2a2a2a" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.5rem" }}>
            <span style={{ fontSize:"0.8rem", fontWeight:700, color:"rgba(255,255,255,0.45)", letterSpacing:"0.07em", textTransform:"uppercase" }}>Session Report</span>
            <span style={{ fontFamily:"var(--ai-serif,'DM Serif Display',Georgia,serif)", fontSize:"1.9rem", color:"#f0a882" }}>87</span>
          </div>
          {[["Communication clarity","88%","88%","#4caf7d"],["Technical accuracy","74%","74%","#f0a882"],["Structured reasoning","61%","61%","#c8502a"]].map(([label,pct,w,color]) => (
            <div key={label} style={{ marginBottom:"1rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.77rem", color:"rgba(255,255,255,0.45)", marginBottom:"6px" }}>
                <span>{label}</span><span>{pct}</span>
              </div>
              <div style={{ height:"6px", background:"#2a2a2a", borderRadius:"4px", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:"4px", background:color, width:w }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop:"1.5rem", padding:"1rem", background:"rgba(200,80,42,0.12)", borderRadius:"10px", border:"1px solid rgba(200,80,42,0.2)", fontSize:"0.82rem", color:"rgba(255,255,255,0.7)", lineHeight:1.6 }}>
            <strong style={{ color:"#f0a882" }}>Top suggestion:</strong> Use the STAR method more consistently — your "Situation" was strong but "Result" was vague.
          </div>
        </div>
        {/* Text */}
        <div>
          <div style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.73rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.75rem" }}>AI Feedback Engine</div>
          <h2 style={{ fontFamily:"var(--ai-serif,'DM Serif Display',Georgia,serif)", fontSize:"clamp(1.8rem,3.5vw,2.6rem)", color:"#fff", lineHeight:1.1, letterSpacing:"-0.02em", marginBottom:"1.5rem" }}>
            Feedback that actually{" "}
            <em style={{ fontStyle:"italic", color:"#f0a882" }}>moves the needle</em>
          </h2>
          <p style={{ fontSize:"0.95rem", color:"rgba(255,255,255,0.55)", lineHeight:1.78, marginBottom:"2rem" }}>
            Most mock interviews give a thumbs up or down. Ours dissects every answer across multiple dimensions and shows exactly where to improve.
          </p>
          {["Scores answers on clarity, depth, and relevance","Detects filler words, hesitations, and pacing issues","Suggests stronger examples from your experience","Tracks your improvement across sessions over time"].map(f => (
            <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:"12px", fontSize:"0.9rem", color:"rgba(255,255,255,0.78)", marginBottom:"1rem" }}>
              <span style={{ width:"20px", height:"20px", borderRadius:"50%", background:"rgba(200,80,42,0.28)", color:"#f0a882", fontSize:"0.65rem", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>
    </section>

  
    {/* ════════ CTA ════════════════════════════════════════════════════════ */}
    <section style={{ background:"var(--ai-accent,#c8502a)", padding:"clamp(3rem,7vh,5rem) clamp(1.5rem,5vw,4rem)", textAlign:"center" }}>
      <div style={{ maxWidth:"600px", margin:"0 auto" }}>
        <h2 style={{ fontFamily:"var(--ai-serif,'DM Serif Display',Georgia,serif)", fontSize:"clamp(2rem,4vw,3rem)", color:"#fff", lineHeight:1.1, marginBottom:"1rem", letterSpacing:"-0.02em" }}>
          Your dream job is one interview away
        </h2>
        <p style={{ fontSize:"1rem", color:"rgba(255,255,255,0.75)", marginBottom:"2.5rem" }}>
          Start practicing today — it's free. No credit card required.
        </p>
        <Link to="/generate" style={{ background:"#fff", color:"var(--ai-accent,#c8502a)", padding:"14px 32px", borderRadius:"100px", fontFamily:"inherit", fontSize:"0.95rem", fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"8px" }}>
          <Sparkles size={16} /> Begin your first session →
        </Link>
      </div>
    </section>
  </div>
);

export default HomePage;