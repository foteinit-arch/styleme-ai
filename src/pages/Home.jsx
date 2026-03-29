import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Shirt, Sparkles, Users, ArrowRight } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Shirt className="w-7 h-7 text-orange-500" />
          <span className="text-2xl font-bold text-gray-900 tracking-tight">StyleMe</span>
        </div>
        <div className="flex gap-3">
          {user ? (
            <Link to={createPageUrl("Wardrobe")}>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">My Wardrobe</Button>
            </Link>
          ) : (
            <Button onClick={() => base44.auth.redirectToLogin(createPageUrl("Wardrobe"))} className="bg-orange-500 hover:bg-orange-600 text-white">
              Get Started
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> Virtual Try-On, Reimagined
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold text-gray-900 leading-tight mb-6 font-heading uppercase tracking-widest">
            Try on any outfit <span className="text-orange-500">before you wear it</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Build your perfect avatar, upload your clothes or pull them from the web, and drag & drop to create stunning outfits — no fitting room needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8"
              onClick={() => user ? window.location.href = createPageUrl("Wardrobe") : base44.auth.redirectToLogin(createPageUrl("Wardrobe"))}
            >
              Start Styling <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Link to={createPageUrl("Explore")}>
              <Button size="lg" variant="outline" className="text-lg px-8 border-gray-200 text-gray-700 hover:bg-gray-50">
                <Users className="mr-2 w-5 h-5" /> Explore Community
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
          {[
            { icon: "📸", title: "Upload Your Photo", desc: "Take a full-body photo and enter your measurements to create an accurate avatar." },
            { icon: "👗", title: "Build Your Wardrobe", desc: "Upload clothes, paste image URLs, or import from anywhere. AI removes backgrounds instantly." },
            { icon: "✨", title: "Mix & Match", desc: "Drag clothing onto your avatar, resize, rotate. Save your favourite outfits & share them." },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-left">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}