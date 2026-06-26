import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Palette, Sparkles, Loader2, X } from "lucide-react";

const REMOVEBG_KEY = "dx2dhWT2m31UEp3NvgxYMivt";
async function removeBackground(imageUrl) {
  const formData = new FormData();
  formData.append("image_url", imageUrl);
  formData.append("size", "auto");
  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": REMOVEBG_KEY },
    body: formData,
  });
  if (!res.ok) throw new Error("remove.bg failed");
  return res.blob();
}
import ClothingCard from "@/components/wardrobe/ClothingCard";
import AddClothingModal from "@/components/wardrobe/AddClothingModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import WeatherFilter from "@/components/wardrobe/WeatherFilter";

const CATEGORIES = ["all", "top", "bottom", "dress", "outerwear", "shoes", "accessory", "underwear", "bag"];

// Display order and friendly labels for grouped category sections.
const CATEGORY_ORDER = ["dress", "top", "bottom", "outerwear", "shoes", "bag", "accessory", "underwear"];
const CATEGORY_LABELS = {
  top: "Tops",
  bottom: "Bottoms",
  dress: "Dresses",
  outerwear: "Outerwear",
  shoes: "Shoes",
  accessory: "Accessories",
  underwear: "Underwear",
  bag: "Bags",
};
const categoryLabel = (c) => CATEGORY_LABELS[c] || (c ? c.charAt(0).toUpperCase() + c.slice(1) : "Other");

export default function Wardrobe() {
  const [user, setUser]       = useState(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch]   = useState("");
  const [color, setColor]     = useState("all");
  const [hiddenWeatherCategories, setHiddenWeatherCategories] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState("");
  const [generationQueue, setGenerationQueue] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin(window.location.href));
  }, []);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wardrobe", user?.email],
    queryFn: () => base44.entities.ClothingItem.filter({ user_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClothingItem.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["wardrobe", user?.email] });
      const prev = queryClient.getQueryData(["wardrobe", user?.email]);
      queryClient.setQueryData(["wardrobe", user?.email], old => (old || []).filter(i => i.id !== id));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData(["wardrobe", user?.email], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["wardrobe", user?.email] }),
  });

  const handleAdded = (item) => {
    queryClient.setQueryData(["wardrobe", user?.email], old => [item, ...(old || [])]);
    setShowAdd(false);
  };

  const handleGenerateSimilar = async (item) => {
    setGeneratingFor(item);
    setShowGenerateModal(true);
  };

  const generateVariations = async (prompt) => {
    if (!generatingFor) return;
    const itemName = generatingFor.name;
    setIsGenerating(true);
    setGeneratingLabel(itemName);
    setGenerationQueue(q => q + 1);
    setShowGenerateModal(false);
    setGeneratingFor(null);
    try {
      const imgSrc = generatingFor.processed_image_url || generatingFor.original_image_url;
      const { url: generatedUrl } = await base44.integrations.Core.GenerateImage({
        prompt: `${prompt}. Based on this clothing item: ${generatingFor.name}. Keep the same category (${generatingFor.category}) but create a new variation. Show as a clean product photo on white background, ghost mannequin style, no person, no artifacts.`,
        existing_image_urls: [imgSrc],
      });
      
      // Remove background from the generated image
      let processedBlob;
      try {
        processedBlob = await removeBackground(generatedUrl);
      } catch {
        const response = await fetch(generatedUrl);
        processedBlob = await response.blob();
      }
      const file = new File([processedBlob], "generated.png", { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create new clothing item
      const newItem = await base44.entities.ClothingItem.create({
        user_email: user.email,
        name: `${generatingFor.name} (Variation)`,
        category: generatingFor.category,
        color: generatingFor.color,
        brand: generatingFor.brand,
        original_image_url: file_url,
        processed_image_url: file_url,
        source: "upload",
        source_url: file_url,
      });
      
      queryClient.setQueryData(["wardrobe", user?.email], old => [newItem, ...(old || [])]);
    } catch (error) {
      console.error("Failed to generate:", error);
    } finally {
      setGenerationQueue(q => {
        const next = q - 1;
        if (next <= 0) setIsGenerating(false);
        return Math.max(0, next);
      });
    }
  };

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["wardrobe", user?.email] });
  }, [queryClient, user?.email]);

  // Extract unique colors from wardrobe
  const uniqueColors = Array.from(new Set(items.map(i => i.color).filter(Boolean))).sort();

  const filtered = items.filter(i =>
    (category === "all" || i.category === category) &&
    (color === "all" || !i.color || i.color.toLowerCase() === color.toLowerCase()) &&
    (!search || i.name.toLowerCase().includes(search.toLowerCase())) &&
    (!hiddenWeatherCategories || !hiddenWeatherCategories.includes(i.category))
  );

  // Group the filtered items by category so the wardrobe is organised into
  // clear sections (Dresses, Tops, Bottoms, ...) instead of one mixed grid.
  // Sections only render when the user is viewing "all" categories; selecting a
  // specific category keeps the simple single-grid view.
  const groupedCategories = (() => {
    const known = CATEGORY_ORDER.filter(c => filtered.some(i => i.category === c));
    const extras = Array.from(new Set(filtered.map(i => i.category)))
      .filter(c => c && !CATEGORY_ORDER.includes(c));
    return [...known, ...extras];
  })();

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-heading font-bold text-2xl text-white tracking-tight">My wardrobe</h1>
              <p className="text-white/50 mt-1 font-body">{items.length} items in your closet</p>
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl("OutfitBuilder")}>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                  Try On →
                </Button>
              </Link>
              <Button onClick={() => setShowAdd(true)} className="bg-[#d4a017] hover:bg-[#c09010] text-[#373d47] font-semibold">
                <Plus className="mr-2 w-4 h-4" /> Add Clothing
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <WeatherFilter onWeatherFilter={setHiddenWeatherCategories} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="pl-9 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-yellow-300" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40 bg-white/10 border-white/10 text-white">
                <Filter className="mr-2 w-4 h-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c === "all" ? "All" : categoryLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="w-40 bg-white/10 border-white/10 text-white">
                <Palette className="mr-2 w-4 h-4" />
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colors</SelectItem>
                {uniqueColors.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array(10).fill(0).map((_, i) => (
                <div key={i} className="bg-white/10 rounded-2xl h-52 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">👗</p>
              <p className="text-white/60 text-lg">Your wardrobe is empty</p>
              <p className="text-white/30 text-sm mb-6">Add your first clothing item to get started</p>
              <Button onClick={() => setShowAdd(true)} className="bg-[#d4a017] hover:bg-[#c09010] text-[#373d47] font-semibold">
                <Plus className="mr-2 w-4 h-4" /> Add Clothing
              </Button>
            </div>
          ) : category === "all" ? (
            <div className="space-y-10">
              {groupedCategories.map(cat => {
                const group = filtered.filter(i => i.category === cat);
                if (group.length === 0) return null;
                return (
                  <section key={cat}>
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="font-heading font-semibold text-lg text-white tracking-tight">
                        {categoryLabel(cat)}
                      </h2>
                      <span className="text-xs font-medium text-[#373d47] bg-[#d4a017] rounded-full px-2 py-0.5">
                        {group.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {group.map(item => (
                        <ClothingCard
                          key={item.id}
                          item={item}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onGenerateSimilar={() => handleGenerateSimilar(item)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(item => (
                <ClothingCard 
                  key={item.id} 
                  item={item} 
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onGenerateSimilar={() => handleGenerateSimilar(item)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Persistent generation progress banner */}
        {isGenerating && (
          <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1a1a1a] border border-purple-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-purple-900/30 min-w-[280px]">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white leading-tight">
                Generating variation{generationQueue > 1 ? `s (${generationQueue} in queue)` : ""}…
              </p>
              <p className="text-xs text-white/40 truncate">{generatingLabel}</p>
            </div>
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
        )}

        {showAdd && user && (
          <AddClothingModal userEmail={user.email} onClose={() => setShowAdd(false)} onAdded={handleAdded} />
        )}

        {showGenerateModal && generatingFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowGenerateModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h3 className="text-lg font-bold text-gray-900">Generate Similar Item</h3>
                </div>
                <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">Create a variation of:</p>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <img src={generatingFor.processed_image_url || generatingFor.original_image_url} alt={generatingFor.name} className="w-16 h-16 object-contain bg-white rounded" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{generatingFor.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{generatingFor.category}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-700 font-medium">Choose a variation style:</p>
                <button onClick={() => generateVariations("Same style but in a different color")} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition">
                  <p className="font-medium text-gray-900 text-sm">🎨 Different Color</p>
                  <p className="text-xs text-gray-500 mt-1">Same design, new color palette</p>
                </button>
                <button onClick={() => generateVariations("Similar design with different pattern or texture")} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition">
                  <p className="font-medium text-gray-900 text-sm">✨ New Pattern</p>
                  <p className="text-xs text-gray-500 mt-1">Add stripes, dots, or texture variations</p>
                </button>
                <button onClick={() => generateVariations("Modern updated version with contemporary styling")} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition">
                  <p className="font-medium text-gray-900 text-sm">🔄 Modern Style</p>
                  <p className="text-xs text-gray-500 mt-1">Contemporary take on this piece</p>
                </button>
                <button onClick={() => generateVariations("Luxury designer version with premium details")} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition">
                  <p className="font-medium text-gray-900 text-sm">💎 Luxury Version</p>
                  <p className="text-xs text-gray-500 mt-1">High-end designer interpretation</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}