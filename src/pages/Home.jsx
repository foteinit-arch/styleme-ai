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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f5f0eb" }}>
      {/* Hero - split layout like reference */}
      <div className="relative w-full min-h-screen flex flex-col">

        {/* Nav */}
        <div className="px-8 py-6 flex items-center justify-between z-10">
          <span className="text-gray-900 text-sm font-body tracking-widest uppercase font-medium">Virtually Dressed</span>
          <div className="flex gap-6">
            <Link to={createPageUrl("Explore")} className="text-gray-600 text-sm font-body tracking-wider uppercase hover:text-gray-900 transition-colors">Explore</Link>
            {user ? (
              <Link to={createPageUrl("Wardrobe")} className="text-gray-600 text-sm font-body tracking-wider uppercase hover:text-gray-900 transition-colors">Wardrobe</Link>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin(createPageUrl("Wardrobe"))}
                className="text-gray-600 text-sm font-body tracking-wider uppercase hover:text-gray-900 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Hero content — text left, image right */}
        <div className="flex-1 flex flex-col md:flex-row items-center px-8 md:px-16 py-8 md:py-0 gap-8 md:gap-0">
          {/* Left: Text */}
          <div className="flex-1 flex flex-col justify-center">
            <h1
              className="font-heading font-bold leading-none text-gray-900"
              style={{ fontSize: "clamp(3rem, 8vw, 7rem)", letterSpacing: "-0.02em" }}
            >
              Virtually<br />Dressed
            </h1>
            <p className="text-gray-500 font-body text-lg md:text-xl mt-6 max-w-sm leading-relaxed">
              Virtual wardrobe styling and shopping tool in the palm of your hand
            </p>
            <button
              onClick={() => user ? window.location.href = createPageUrl("Wardrobe") : base44.auth.redirectToLogin(createPageUrl("Wardrobe"))}
              className="mt-8 w-fit px-8 py-3 bg-gray-900 text-white font-body text-sm tracking-widest uppercase hover:bg-gray-700 transition-colors"
            >
              Start Styling →
            </button>
          </div>

          {/* Right: Haute couture illustration */}
          <div className="flex-1 flex items-center justify-center">
            <img
              src="https://media.base44.com/images/public/69aadeecce5a4e6de9d10643/621031ecf_generated_image.png"
              alt="Virtual wardrobe illustration"
              className="w-full max-w-lg object-contain"
            />
          </div>
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