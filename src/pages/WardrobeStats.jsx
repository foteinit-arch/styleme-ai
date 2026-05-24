import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const CATEGORY_EMOJI = {
  top: "👕", bottom: "👖", dress: "👗", outerwear: "🧥",
  shoes: "👟", accessory: "💍", bag: "👜", underwear: "🩲",
};

const COLORS = ["#e8b820","#f97316","#a78bfa","#34d399","#60a5fa","#f472b6","#fb923c","#94a3b8"];

export default function WardrobeStats() {
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState([]);
  const [colorData, setColorData] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [totalOutfits, setTotalOutfits] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      const [outfits, clothes] = await Promise.all([
        base44.entities.Outfit.filter({ user_email: u.email }),
        base44.entities.ClothingItem.filter({ user_email: u.email }),
      ]);

      setTotalOutfits(outfits.length);
      setTotalItems(clothes.length);

      // Count how many times each clothing item appears across all outfits
      const itemUsage = {};
      outfits.forEach(outfit => {
        (outfit.items || []).forEach(item => {
          itemUsage[item.clothing_item_id] = (itemUsage[item.clothing_item_id] || 0) + 1;
        });
      });

      // Category frequency
      const catCount = {};
      clothes.forEach(c => {
        const uses = itemUsage[c.id] || 0;
        catCount[c.category] = (catCount[c.category] || 0) + uses;
      });
      const catArr = Object.entries(catCount)
        .map(([cat, count]) => ({ name: cat, count, emoji: CATEGORY_EMOJI[cat] || "👔" }))
        .sort((a, b) => b.count - a.count);
      setCategoryData(catArr);

      // Color frequency
      const colorCount = {};
      clothes.forEach(c => {
        if (!c.color) return;
        const uses = itemUsage[c.id] || 0;
        const col = c.color.toLowerCase().trim();
        colorCount[col] = (colorCount[col] || 0) + uses;
      });
      const colorArr = Object.entries(colorCount)
        .map(([color, count]) => ({ name: color, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setColorData(colorArr);

      // Top worn items
      const top = clothes
        .map(c => ({ ...c, uses: itemUsage[c.id] || 0 }))
        .filter(c => c.uses > 0)
        .sort((a, b) => b.uses - a.uses)
        .slice(0, 6);
      setTopItems(top);

      setLoading(false);
    }).catch(() => base44.auth.redirectToLogin(window.location.href));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/10 border-t-[#e8b820] rounded-full animate-spin" />
      </div>
    );
  }

  const noData = totalOutfits === 0;

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading font-bold text-3xl text-white tracking-tight mb-1">Wardrobe Insights</h1>
        <p className="text-white/40 font-body text-sm mb-8">What you actually reach for</p>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Saved Outfits", value: totalOutfits },
            { label: "Wardrobe Items", value: totalItems },
            { label: "Top Category", value: categoryData[0] ? `${categoryData[0].emoji} ${categoryData[0].name}` : "—" },
            { label: "Fav Color", value: colorData[0] ? colorData[0].name : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/40 text-xs font-body uppercase tracking-widest mb-1">{label}</p>
              <p className="text-white font-heading font-bold text-xl capitalize">{value}</p>
            </div>
          ))}
        </div>

        {noData ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📊</p>
            <p className="text-white/50 text-lg">Save some outfits first</p>
            <p className="text-white/30 text-sm">Your stats will appear here once you build and save outfits.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Category chart */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="font-heading font-bold text-white text-lg mb-4">Categories You Wear Most</h2>
              {categoryData.length === 0 ? (
                <p className="text-white/30 text-sm">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "var(--font-body)" }} width={80} />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                      formatter={(v) => [`${v} times`, "Worn"]}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Color chart */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="font-heading font-bold text-white text-lg mb-4">Colors You Reach For</h2>
              {colorData.length === 0 ? (
                <p className="text-white/30 text-sm">Add colors to your clothing items to see this</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={colorData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={85} paddingAngle={3}>
                      {colorData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                      formatter={(v, n) => [`${v} times`, n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {colorData.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {colorData.map((c, i) => (
                    <span key={c.name} className="flex items-center gap-1.5 text-xs text-white/60 font-body">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Most worn items */}
            {topItems.length > 0 && (
              <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
                <h2 className="font-heading font-bold text-white text-lg mb-4">Most Worn Items</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {topItems.map(item => (
                    <div key={item.id} className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10">
                        {item.processed_image_url || item.original_image_url ? (
                          <img src={item.processed_image_url || item.original_image_url} className="w-full h-full object-cover" alt={item.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">{CATEGORY_EMOJI[item.category] || "👔"}</div>
                        )}
                      </div>
                      <p className="text-white/70 text-xs text-center font-body truncate w-full">{item.name}</p>
                      <span className="text-[#e8b820] text-xs font-bold">{item.uses}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}