import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Hero - full bleed fashion photo */}
      <div className="relative w-full h-screen overflow-hidden">
        <img
          src="https://media.base44.com/images/public/69aadeecce5a4e6de9d10643/0d3ac3524_VirtuallyDressed.jpeg"
          alt="Fashion hero"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        {/* Subtle dark overlay for text legibility */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Nav */}
        <div className="absolute top-0 left-0 right-0 px-8 py-6 flex items-center justify-between z-10">
          <span className="text-white text-sm font-body tracking-widest uppercase font-medium">Virtually Dressed</span>
          <div className="flex gap-6">
            <Link to={createPageUrl("Explore")} className="text-white/80 text-sm font-body tracking-wider uppercase hover:text-white transition-colors">Explore</Link>
            {user ? (
              <Link to={createPageUrl("Wardrobe")} className="text-white/80 text-sm font-body tracking-wider uppercase hover:text-white transition-colors">Wardrobe</Link>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin(createPageUrl("Wardrobe"))}
                className="text-white/80 text-sm font-body tracking-wider uppercase hover:text-white transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Hero text */}
        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 z-10">
          <h1
            className="font-heading font-bold uppercase leading-none text-white"
            style={{ fontSize: "clamp(3.2rem, 11.2vw, 10.4rem)", letterSpacing: "-0.02em" }}
          >
            Virtually<br />Dressed
          </h1>
          <p className="text-white/90 font-body text-lg md:text-xl mt-4 max-w-sm tracking-wide">
            Virtual wardrobe styling and shopping tool in the palm of your hand
          </p>
          <button
            onClick={() => user ? window.location.href = createPageUrl("Wardrobe") : base44.auth.redirectToLogin(createPageUrl("Wardrobe"))}
            className="mt-8 w-fit text-white font-body text-base tracking-widest uppercase underline underline-offset-4 hover:text-white/70 transition-colors"
          >
            Start Styling →
          </button>
        </div>
      </div>

      {/* Feature strip */}
      <div className="bg-white py-20 px-8 md:px-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: "📸", title: "Upload Your Photo", desc: "Enter your measurements and create an accurate avatar." },
            { icon: "👗", title: "Build Your Wardrobe", desc: "Upload clothes or paste URLs. AI removes backgrounds instantly." },
            { icon: "✨", title: "Mix & Match", desc: "Drag clothing onto your avatar, save and share your outfits." },
          ].map((f) => (
            <div key={f.title}>
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-heading font-bold text-gray-900 text-2xl mb-2 uppercase tracking-tight">{f.title}</h3>
              <p className="text-gray-500 font-body text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}