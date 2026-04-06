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
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col overflow-x-hidden">

      {/* NAV */}
      <nav className="absolute top-0 left-0 right-0 z-20 px-6 md:px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Shirt className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Virtually Dressed</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Explore")} className="text-white/60 text-sm hover:text-white transition-colors hidden md:block">
            Explore
          </Link>
          {user ? (
            <Link to={createPageUrl("Wardrobe")} className="text-white/60 text-sm hover:text-white transition-colors hidden md:block">
              My Wardrobe
            </Link>
          ) : null}
          <button
            onClick={handleCTA}
            className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            {user ? "Open App" : "Get Started"}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden">

        {/* Purple glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-900/10 blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm mb-6">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          AI-Powered Virtual Try-On
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight max-w-4xl">
          Discover Your{" "}
          <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Perfect Style
          </span>
          <br />Before You Wear It
        </h1>

        <p className="text-white/50 text-lg md:text-xl mt-6 max-w-xl leading-relaxed">
          Upload your photo, browse outfits, and see exactly how clothes look on <em>you</em> — powered by AI.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-10">
          <button
            onClick={handleCTA}
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-lg hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-900/40"
          >
            <Sparkles className="w-5 h-5" />
            Try On Outfits
          </button>
          <Link
            to={createPageUrl("Explore")}
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-medium text-lg hover:bg-white/10 transition-all"
          >
            Browse Looks <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Phone mockups */}
        <div className="relative mt-16 flex items-end justify-center gap-4 md:gap-8 max-w-3xl mx-auto">

          {/* Left phone - slightly tilted */}
          <div className="relative hidden md:block" style={{ transform: "rotate(-6deg) translateY(20px)" }}>
            <PhoneMockup
              bgColor="bg-gradient-to-b from-pink-100 to-pink-200"
              imageUrl="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=300&q=80"
              label="Inspired by iconic looks"
              accent="from-pink-400 to-rose-400"
            />
          </div>

          {/* Center phone - front and center */}
          <div className="relative z-10" style={{ transform: "scale(1.08)" }}>
            <PhoneMockup
              bgColor="bg-gradient-to-b from-purple-100 to-indigo-200"
              imageUrl="https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=300&q=80"
              label="Generate your look"
              accent="from-purple-500 to-indigo-500"
              showBadge
            />
          </div>

          {/* Right phone - slightly tilted */}
          <div className="relative hidden md:block" style={{ transform: "rotate(6deg) translateY(20px)" }}>
            <PhoneMockup
              bgColor="bg-gradient-to-b from-amber-100 to-orange-200"
              imageUrl="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80"
              label="Discover new styles"
              accent="from-amber-400 to-orange-400"
            />
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="bg-[#0f0f1f] py-20 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Your AI Stylist, Always On
          </h2>
          <p className="text-white/40 text-center mb-14 max-w-xl mx-auto">
            Everything you need to experiment with fashion without spending a cent.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Camera className="w-6 h-6" />,
                color: "from-purple-500 to-indigo-500",
                title: "AI Virtual Try-On",
                desc: "Upload your photo and watch AI place any outfit on your exact body — realistic and instant.",
              },
              {
                icon: <Shirt className="w-6 h-6" />,
                color: "from-pink-500 to-rose-500",
                title: "Digital Wardrobe",
                desc: "Upload your clothes or add from URLs. AI removes backgrounds automatically.",
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                color: "from-amber-400 to-orange-500",
                title: "Mix & Match Builder",
                desc: "Drag clothes onto your avatar, layer pieces, and save unlimited outfits.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/8 rounded-2xl p-6 hover:bg-white/8 transition-colors">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4`}>
                  {f.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div className="bg-[#0d0d1a] py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start Styling for Free
          </h2>
          <p className="text-white/40 mb-8">
            No credit card needed. Build your digital wardrobe and try on outfits instantly.
          </p>
          <button
            onClick={handleCTA}
            className="flex items-center gap-2 px-10 py-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-lg hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-900/40 mx-auto"
          >
            <Zap className="w-5 h-5" />
            {user ? "Go to Builder" : "Get Started Free"}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#0a0a14] border-t border-white/5 py-6 px-6 text-center">
        <p className="text-white/20 text-sm">© 2025 Virtually Dressed. All rights reserved.</p>
      </div>
    </div>
  );
}

function PhoneMockup({ bgColor, imageUrl, label, accent, showBadge }) {
  return (
    <div className="w-36 md:w-44 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 bg-black">
      {/* Phone screen */}
      <div className={`${bgColor} relative aspect-[9/18]`}>
        <img
          src={imageUrl}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {showBadge && (
          <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 text-white text-xs font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI
          </div>
        )}

        {/* Bottom label */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-bold text-xs leading-tight mb-2">{label}</p>
          <div className={`w-full py-2 rounded-xl bg-gradient-to-r ${accent} text-white text-xs font-semibold text-center`}>
            Generate outfit
          </div>
        </div>
      </div>
    </div>
  );
}