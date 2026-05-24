import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay } from "date-fns";

export default function WardrobeCalendar() {
  const [user, setUser] = useState(null);
  const [outfits, setOutfits] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dragOutfit, setDragOutfit] = useState(null);
  const [draggingScheduled, setDraggingScheduled] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const [all, sched] = await Promise.all([
        base44.entities.Outfit.filter({ user_email: u.email }, "-created_date"),
        base44.entities.ScheduledOutfit.filter({ user_email: u.email }),
      ]);
      setOutfits(all);
      setScheduled(sched);
      setLoading(false);
    }).catch(() => base44.auth.redirectToLogin(window.location.href));
  }, []);

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
  });

  const getOutfitForDay = (day) => {
    const s = scheduled.find(s => isSameDay(new Date(s.date), day));
    if (!s) return null;
    return { scheduled: s, outfit: outfits.find(o => o.id === s.outfit_id) };
  };

  const handleDropOnDay = async (day) => {
    if (!dragOutfit && !draggingScheduled) return;
    const dateStr = format(day, "yyyy-MM-dd");

    // If dragging an already-scheduled item to a new date
    if (draggingScheduled) {
      const updated = await base44.entities.ScheduledOutfit.update(draggingScheduled.id, { date: dateStr });
      setScheduled(prev => prev.map(s => s.id === draggingScheduled.id ? { ...s, date: dateStr } : s));
      setDraggingScheduled(null);
      return;
    }

    // Check if there's already something on this day
    const existing = scheduled.find(s => isSameDay(new Date(s.date), day));
    if (existing) {
      // Replace it
      await base44.entities.ScheduledOutfit.update(existing.id, { outfit_id: dragOutfit.id });
      setScheduled(prev => prev.map(s => s.id === existing.id ? { ...s, outfit_id: dragOutfit.id } : s));
    } else {
      const created = await base44.entities.ScheduledOutfit.create({
        user_email: user.email,
        outfit_id: dragOutfit.id,
        date: dateStr,
      });
      setScheduled(prev => [...prev, created]);
    }
    setDragOutfit(null);
  };

  const handleRemove = async (scheduledId) => {
    await base44.entities.ScheduledOutfit.delete(scheduledId);
    setScheduled(prev => prev.filter(s => s.id !== scheduledId));
  };

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col md:flex-row gap-0">
      {/* Sidebar: outfit list */}
      <aside className="w-full md:w-56 bg-[#111] border-b md:border-b-0 md:border-r border-white/10 p-4 flex flex-col gap-3">
        <h2 className="font-heading font-bold text-white text-lg mb-1">Your Outfits</h2>
        <p className="text-white/30 text-xs mb-2">Drag onto a date to plan</p>
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="h-16 bg-white/10 rounded-xl animate-pulse" />)
        ) : (
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto pb-1">
            {outfits.map(outfit => (
              <div
                key={outfit.id}
                draggable
                onDragStart={() => setDragOutfit(outfit)}
                onDragEnd={() => setDragOutfit(null)}
                className="flex-shrink-0 w-20 md:w-full flex md:flex-row items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2 cursor-grab active:cursor-grabbing transition"
              >
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                  {outfit.magazine_url || outfit.outfit_snapshot_url ? (
                    <img src={outfit.magazine_url || outfit.outfit_snapshot_url} className="w-full h-full object-cover" alt={outfit.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">👗</div>
                  )}
                </div>
                <p className="hidden md:block text-white/70 text-xs truncate font-body">{outfit.name}</p>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Calendar */}
      <main className="flex-1 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-heading font-bold text-white text-2xl tracking-tight">
            {format(currentMonth, "MMMM yyyy")}
          </h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))} className="text-white/50 hover:text-white hover:bg-white/10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-white/50 hover:text-white hover:bg-white/10 text-xs">
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))} className="text-white/50 hover:text-white hover:bg-white/10">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-white/30 font-body py-1">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const entry = getOutfitForDay(day);
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={i}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnDay(day)}
                className={`
                  min-h-[80px] md:min-h-[100px] rounded-xl border p-1.5 transition relative
                  ${inMonth ? "bg-white/5 border-white/10 hover:border-yellow-300/40" : "bg-transparent border-transparent opacity-30"}
                  ${today ? "border-yellow-300/60 bg-yellow-300/5" : ""}
                  ${dragOutfit || draggingScheduled ? "hover:bg-white/10" : ""}
                `}
              >
                <span className={`text-xs font-body ${today ? "text-yellow-300 font-bold" : "text-white/40"}`}>
                  {format(day, "d")}
                </span>

                {entry && inMonth && (
                  <div
                    draggable
                    onDragStart={() => setDraggingScheduled(entry.scheduled)}
                    onDragEnd={() => setDraggingScheduled(null)}
                    className="mt-1 relative group cursor-grab"
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-white/10">
                      {entry.outfit?.magazine_url || entry.outfit?.outfit_snapshot_url ? (
                        <img
                          src={entry.outfit.magazine_url || entry.outfit.outfit_snapshot_url}
                          className="w-full h-full object-cover"
                          alt={entry.outfit?.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-base">👗</div>
                      )}
                    </div>
                    <p className="text-[9px] text-white/50 truncate mt-0.5 font-body">{entry.outfit?.name}</p>
                    <button
                      onClick={() => handleRemove(entry.scheduled.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}