import { useState, useEffect } from "react";
import { Thermometer, Loader2 } from "lucide-react";

// Map temperature ranges to labels, emojis, and matching clothing categories
const WEATHER_BANDS = [
  { key: "freezing",  label: "Freezing",  emoji: "🥶", max: 5,  categories: ["outerwear", "top", "bottom"] },
  { key: "cold",      label: "Cold",      emoji: "🧥", max: 12, categories: ["outerwear", "top", "bottom"] },
  { key: "cool",      label: "Cool",      emoji: "🌤",  max: 18, categories: ["top", "bottom", "outerwear"] },
  { key: "mild",      label: "Mild",      emoji: "🌥",  max: 23, categories: ["top", "bottom", "dress"] },
  { key: "warm",      label: "Warm",      emoji: "☀️",  max: 29, categories: ["top", "bottom", "dress", "shoes"] },
  { key: "hot",       label: "Hot",       emoji: "🔥",  max: Infinity, categories: ["top", "dress", "shoes", "accessory"] },
];

// Which categories to HIDE for each band (i.e., filter out heavy layers when hot)
const HIDDEN_FOR_BAND = {
  freezing: [],
  cold:     [],
  cool:     ["bag"],
  mild:     ["outerwear"],
  warm:     ["outerwear"],
  hot:      ["outerwear", "bottom"],
};

function getBand(tempC) {
  return WEATHER_BANDS.find(b => tempC <= b.max) || WEATHER_BANDS[WEATHER_BANDS.length - 1];
}

export default function WeatherFilter({ onWeatherFilter }) {
  const [temp, setTemp] = useState(null);
  const [band, setBand] = useState(null);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); setError(true); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m&timezone=auto`
          );
          const data = await res.json();
          const t = Math.round(data.current.temperature_2m);
          const b = getBand(t);
          setTemp(t);
          setBand(b);
        } catch {
          setError(true);
        }
        setLoading(false);
      },
      () => { setLoading(false); setError(true); }
    );
  }, []);

  const toggle = () => {
    const next = !active;
    setActive(next);
    onWeatherFilter(next ? (HIDDEN_FOR_BAND[band?.key] || []) : null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/30 text-sm">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="font-body">Getting weather…</span>
      </div>
    );
  }

  if (error || !band) return null;

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-body transition-all ${
        active
          ? "bg-[#e8b820]/20 border-[#e8b820]/60 text-[#e8b820]"
          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span>{band.emoji}</span>
      <span>{temp}°C — {band.label}</span>
      <Thermometer className="w-3.5 h-3.5" />
      {active && <span className="text-xs opacity-70 ml-1">filtered</span>}
    </button>
  );
}