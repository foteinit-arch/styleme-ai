import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Thermometer, Loader2, Shirt, X } from "lucide-react";

// Weather bands matching WeatherFilter component
const WEATHER_BANDS = [
  { key: "freezing", max: 5,  categories: ["outerwear", "top", "bottom", "shoes"] },
  { key: "cold",     max: 12, categories: ["outerwear", "top", "bottom", "shoes"] },
  { key: "cool",     max: 18, categories: ["top", "bottom", "outerwear", "shoes"] },
  { key: "mild",     max: 23, categories: ["top", "bottom", "dress", "shoes"] },
  { key: "warm",     max: 29, categories: ["top", "bottom", "dress", "shoes", "accessory"] },
  { key: "hot",      max: Infinity, categories: ["top", "dress", "shoes", "accessory"] },
];

function getBand(tempC) {
  return WEATHER_BANDS.find(b => tempC <= b.max) || WEATHER_BANDS[WEATHER_BANDS.length - 1];
}

const CATEGORY_ICONS = {
  top: Shirt,
  bottom: Shirt,
  dress: Shirt,
  outerwear: Shirt,
  shoes: Shirt,
  accessory: Shirt,
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [wardrobeItems, setWardrobeItems] = useState([]);
  const [weatherSuggestion, setWeatherSuggestion] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch user's wardrobe when logged in
  useEffect(() => {
    if (!user?.email) return;
    base44.entities.ClothingItem.filter({ user_email: user.email }, "-created_date")
      .then(setWardrobeItems)
      .catch(() => {});
  }, [user]);

  // Generate weather-based outfit suggestion
  const generateWeatherSuggestion = async () => {
    if (!navigator.geolocation) {
      setWeatherError("Geolocation not supported");
      return;
    }

    setWeatherLoading(true);
    setWeatherError(null);

    try {
      // Get current location
      const { coords } = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Fetch weather
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m&timezone=auto`
      );
      const data = await res.json();
      const temp = Math.round(data.current.temperature_2m);
      const band = getBand(temp);

      // Filter wardrobe by weather-appropriate categories
      const suitableItems = wardrobeItems.filter(item =>
        band.categories.includes(item.category)
      );

      // Build outfit: one item per category (prioritize by recency)
      const outfit = {};
      const categoriesNeeded = ["top", "bottom", "dress", "outerwear", "shoes"];

      categoriesNeeded.forEach(cat => {
        const itemsInCat = suitableItems.filter(i => i.category === cat);
        if (itemsInCat.length > 0) {
          // For bottom, skip if we already have a dress
          if (cat === "bottom" && outfit.dress) return;
          // For top, skip if we have a dress
          if (cat === "top" && outfit.dress) return;
          outfit[cat] = itemsInCat[0]; // Take most recent
        }
      });

      // If we have at least 2 items, show suggestion
      const outfitItems = Object.values(outfit).filter(Boolean);
      if (outfitItems.length >= 2) {
        setWeatherSuggestion({
          temperature: temp,
          band: band,
          outfit: outfitItems,
        });
      } else {
        setWeatherError("Not enough suitable items in wardrobe");
      }
    } catch {
      setWeatherError("Unable to fetch weather data");
    } finally {
      setWeatherLoading(false);
    }
  };

  const closeSuggestion = () => {
    setWeatherSuggestion(null);
    setWeatherError(null);
  };

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
              className="h1"
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

          {/* Right: Weather suggestion + illustration */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {/* Weather-based outfit suggestion */}
            {user && wardrobeItems.length > 0 && (
              <div className="w-full max-w-md">
                {!weatherSuggestion && !weatherLoading && !weatherError && (
                  <Button
                    onClick={generateWeatherSuggestion}
                    className="w-full bg-[#e8b820] hover:bg-[#d4a017] text-black font-semibold py-6 text-lg shadow-lg"
                  >
                    <Sparkles className="mr-2 w-5 h-5" />
                    Suggest Outfit for Today's Weather
                  </Button>
                )}

                {weatherLoading && (
                  <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#e8b820]" />
                    <p className="text-gray-700 font-body">Checking weather & finding perfect items...</p>
                  </div>
                )}

                {weatherError && (
                  <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
                    <p className="text-gray-500 font-body mb-3">{weatherError}</p>
                    <Button variant="outline" onClick={generateWeatherSuggestion}>Try Again</Button>
                  </div>
                )}

                {weatherSuggestion && (
                  <div className="bg-white rounded-2xl shadow-xl p-6 relative">
                    <button onClick={closeSuggestion} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 mb-4">
                      <Thermometer className="w-5 h-5 text-[#e8b820]" />
                      <span className="font-heading font-bold text-xl text-gray-900">
                        {weatherSuggestion.temperature}°C — {weatherSuggestion.band.label} {weatherSuggestion.band.emoji}
                      </span>
                    </div>
                    <p className="text-gray-600 font-body text-sm mb-4">Based on your wardrobe:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {weatherSuggestion.outfit.map(item => {
                        const Icon = CATEGORY_ICONS[item.category] || Shirt;
                        return (
                          <div key={item.id} className="border border-gray-100 rounded-xl p-3 hover:shadow-md transition">
                            <img src={item.processed_image_url || item.original_image_url} alt={item.name} className="w-full h-24 object-contain mb-2" />
                            <p className="text-xs text-gray-700 font-body truncate">{item.name}</p>
                            <p className="text-[10px] text-gray-400 uppercase">{item.category}</p>
                          </div>
                        );
                      })}
                    </div>
                    <Link to={createPageUrl("OutfitBuilder")}>
                      <Button className="w-full mt-4 bg-[#e8b820] hover:bg-[#d4a017] text-black">
                        Try On This Outfit →
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Illustration */}
            <img
              src="https://media.base44.com/images/public/69aadeecce5a4e6de9d10643/9feb11269_WhatsAppImage2026-05-01at125723.jpg"
              alt="Virtual wardrobe illustration"
              className="w-full max-w-lg object-contain"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#f5f0eb] py-6 px-8 border-t border-gray-200 flex justify-center">
        <a href="/privacy-policy" className="text-gray-400 font-body text-xs tracking-widest uppercase hover:text-gray-700 transition-colors">Privacy Policy</a>
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