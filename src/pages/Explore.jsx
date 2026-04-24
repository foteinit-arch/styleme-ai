import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";

const OCCASIONS = ["all","casual","formal","wedding","party","sport","work","beach","other"];

export default function Explore() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [occasion, setOccasion] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  const { data: outfits = [], isLoading } = useQuery({
    queryKey: ["explore-outfits"],
    queryFn: () => base44.entities.Outfit.filter({ is_public: true }, "-created_date", 50),
  });

  // Track which outfits the current user has liked (local session state)
  const [likedIds, setLikedIds] = useState({});

  const likeMutation = useMutation({
    mutationFn: async ({ outfit }) => {
      await base44.entities.OutfitLike.create({ outfit_id: outfit.id, user_email: user.email });
      await base44.entities.Outfit.update(outfit.id, { likes_count: (outfit.likes_count || 0) + 1 });
    },
    onMutate: async ({ outfit }) => {
      if (!user) { base44.auth.redirectToLogin(window.location.href); return; }
      if (likedIds[outfit.id]) return;

      await queryClient.cancelQueries({ queryKey: ["explore-outfits"] });
      const prev = queryClient.getQueryData(["explore-outfits"]);

      // Optimistic update
      setLikedIds(l => ({ ...l, [outfit.id]: true }));
      queryClient.setQueryData(["explore-outfits"], old =>
        (old || []).map(o => o.id === outfit.id ? { ...o, likes_count: (o.likes_count || 0) + 1 } : o)
      );
      return { prev };
    },
    onError: (_err, { outfit }, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["explore-outfits"], ctx.prev);
      setLikedIds(l => { const n = { ...l }; delete n[outfit.id]; return n; });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["explore-outfits"] }),
  });

  const handleLike = (outfit) => {
    if (!user) { base44.auth.redirectToLogin(window.location.href); return; }
    if (likedIds[outfit.id]) return;
    likeMutation.mutate({ outfit });
  };

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["explore-outfits"] });
  }, [queryClient]);

  const filtered = outfits.filter(o =>
    (occasion === "all" || o.occasion === occasion) &&
    (!search || o.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="font-heading font-bold text-2xl text-white tracking-tight">Explore outfits</h1>
            <p className="text-white/50 mt-1 font-body">Discover and get inspired by outfits from the community</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search outfits..." className="pl-9 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-yellow-300" />
            </div>
            <Select value={occasion} onValueChange={setOccasion}>
              <SelectTrigger className="w-44 bg-white/10 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OCCASIONS.map(o => <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array(12).fill(0).map((_, i) => (
                <div key={i} className="bg-white/10 rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-white/60 text-lg">No outfits found</p>
              <p className="text-white/30 text-sm">Be the first to share your outfit!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filtered.map(outfit => (
                <div key={outfit.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-yellow-300/40 transition">
                  <div className="h-44 bg-white/5 flex items-center justify-center">
                    {outfit.outfit_snapshot_url ? (
                      <img src={outfit.outfit_snapshot_url} className="h-full w-full object-cover" alt={outfit.name} />
                    ) : (
                      <span className="text-5xl">👗</span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-heading font-bold text-white text-base uppercase truncate">{outfit.name}</h3>
                    {outfit.occasion && (
                      <Badge className="bg-[#d4a017] text-[#373d47] font-semibold border-0 text-xs capitalize mt-1">{outfit.occasion}</Badge>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-white/30">{format(new Date(outfit.created_date), "MMM d")}</p>
                      <button
                        onClick={() => handleLike(outfit)}
                        className={`flex items-center gap-1 text-xs transition ${likedIds[outfit.id] ? "text-yellow-300" : "text-white/30 hover:text-yellow-300"}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${likedIds[outfit.id] ? "fill-yellow-300 text-yellow-300" : ""}`} />
                        {outfit.likes_count || 0}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}