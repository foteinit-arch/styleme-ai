import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Sparkles, ArrowRight, Star, Zap, Shirt, Camera } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleCTA = () => {
    if (user) {
      window.location.href = createPageUrl("OutfitBuilder");
    } else {
      base44.auth.redirectToLogin(createPageUrl("OutfitBuilder"));
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0d0d1a", display: "flex", flexDirection: "column", overflowX: "hidden" }}>

      {/* NAV */}
      <nav style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #a855f7, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shirt style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>Virtually Dressed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to={createPageUrl("Explore")} style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textDecoration: "none" }}>Explore</Link>
          {user && (
            <Link to={createPageUrl("Wardrobe")} style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textDecoration: "none" }}>My Wardrobe</Link>
          )}
          <button onClick={handleCTA} style={{ padding: "8px 18px", borderRadius: 999, background: "#fff", color: "#000", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}>
            {user ? "Open App" : "Get Started"}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "112px 24px 64px", position: "relative", overflow: "hidden" }}>
        {/* Glow blobs */}
        <div style={{ position: "absolute", top: "25%", left: "25%", width: 384, height: 384, borderRadius: "50%", background: "rgba(147,51,234,0.15)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "25%", right: "25%", width: 320, height: 320, borderRadius: "50%", background: "rgba(79,70,229,0.15)", filter: "blur(80px)", pointerEvents: "none" }} />

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 24 }}>
          <Sparkles style={{ width: 14, height: 14, color: "#c084fc" }} />
          AI-Powered Virtual Try-On
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", fontWeight: 800, color: "#fff", lineHeight: 1.1, maxWidth: 800, margin: "0 auto" }}>
          Discover Your{" "}
          <span style={{ background: "linear-gradient(90deg, #c084fc, #818cf8, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Perfect Style
          </span>
          <br />Before You Wear It
        </h1>

        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, marginTop: 24, maxWidth: 480, lineHeight: 1.6 }}>
          Upload your photo, pick outfits, and see exactly how clothes look on <em>you</em> — powered by AI.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 40 }}>
          <button
            onClick={handleCTA}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 32px", borderRadius: 999, background: "linear-gradient(90deg, #9333ea, #4f46e5)", color: "#fff", fontWeight: 600, fontSize: 17, border: "none", cursor: "pointer", boxShadow: "0 10px 40px rgba(147,51,234,0.4)" }}
          >
            <Sparkles style={{ width: 20, height: 20 }} />
            Try On Outfits
          </button>
          <Link
            to={createPageUrl("Explore")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 32px", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontWeight: 500, fontSize: 17, textDecoration: "none" }}
          >
            Browse Looks <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
        </div>

        {/* Phone mockups */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 24, marginTop: 64, maxWidth: 700, width: "100%" }}>
          <div style={{ transform: "rotate(-6deg) translateY(20px)" }} className="hidden md:block">
            <PhoneMockup imageUrl="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=300&q=80" label="Inspired by iconic looks" btnColor="linear-gradient(90deg,#f472b6,#fb7185)" />
          </div>
          <div style={{ transform: "scale(1.08)", zIndex: 10, position: "relative" }}>
            <PhoneMockup imageUrl="https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=300&q=80" label="Generate your look" btnColor="linear-gradient(90deg,#9333ea,#4f46e5)" showBadge />
          </div>
          <div style={{ transform: "rotate(6deg) translateY(20px)" }} className="hidden md:block">
            <PhoneMockup imageUrl="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80" label="Discover new styles" btnColor="linear-gradient(90deg,#f59e0b,#f97316)" />
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ backgroundColor: "#0f0f1f", padding: "80px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 12 }}>Your AI Stylist, Always On</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 56, maxWidth: 480, margin: "0 auto 56px" }}>Everything you need to experiment with fashion without spending a cent.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              { icon: <Camera style={{ width: 24, height: 24, color: "#fff" }} />, from: "#9333ea", to: "#4f46e5", title: "AI Virtual Try-On", desc: "Upload your photo and watch AI place any outfit on your body — realistic and instant." },
              { icon: <Shirt style={{ width: 24, height: 24, color: "#fff" }} />, from: "#ec4899", to: "#f43f5e", title: "Digital Wardrobe", desc: "Upload your clothes or add from URLs. AI removes backgrounds automatically." },
              { icon: <Sparkles style={{ width: 24, height: 24, color: "#fff" }} />, from: "#f59e0b", to: "#f97316", title: "Mix & Match Builder", desc: "Drag clothes onto your avatar, layer pieces, and save unlimited outfits." },
            ].map((f) => (
              <div key={f.title} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${f.from},${f.to})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div style={{ backgroundColor: "#0d0d1a", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16 }}>
            {[...Array(5)].map((_, i) => <Star key={i} style={{ width: 20, height: 20, fill: "#fbbf24", color: "#fbbf24" }} />)}
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 800, color: "#fff", marginBottom: 12 }}>Start Styling for Free</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>No credit card needed. Build your digital wardrobe and try on outfits instantly.</p>
          <button onClick={handleCTA} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px", borderRadius: 999, background: "linear-gradient(90deg,#9333ea,#4f46e5)", color: "#fff", fontWeight: 600, fontSize: 17, border: "none", cursor: "pointer", boxShadow: "0 10px 40px rgba(147,51,234,0.4)" }}>
            <Zap style={{ width: 20, height: 20 }} />
            {user ? "Go to Builder" : "Get Started Free"}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: "#0a0a14", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "24px", textAlign: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>© 2025 Virtually Dressed. All rights reserved.</p>
      </div>
    </div>
  );
}

function PhoneMockup({ imageUrl, label, btnColor, showBadge }) {
  return (
    <div style={{ width: 150, borderRadius: 28, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", border: "3px solid rgba(255,255,255,0.15)", backgroundColor: "#000" }}>
      <div style={{ position: "relative", aspectRatio: "9/18" }}>
        <img src={imageUrl} alt={label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)" }} />
        {showBadge && (
          <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", borderRadius: 999, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4, color: "#fff", fontSize: 11, fontWeight: 600 }}>
            <Sparkles style={{ width: 10, height: 10 }} /> AI
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 12 }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 11, marginBottom: 8, lineHeight: 1.3 }}>{label}</p>
          <div style={{ background: btnColor, borderRadius: 10, padding: "7px 0", color: "#fff", fontSize: 11, fontWeight: 700, textAlign: "center" }}>Generate outfit</div>
        </div>
      </div>
    </div>
  );
}