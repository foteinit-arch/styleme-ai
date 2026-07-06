import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Shirt, User, Sparkles, Globe, LogOut, BookOpen, ChevronLeft, CalendarDays, BarChart2, Luggage } from "lucide-react";
import { Button } from "@/components/ui/button";
import useSystemDarkMode from "@/hooks/useSystemDarkMode";
import { TAB_PATHS } from "@/components/PreservedTabs";

const NAV = [
  { label: "Wardrobe", page: "Wardrobe", icon: Shirt },
  { label: "Builder", page: "OutfitBuilder", icon: Sparkles },
  { label: "My Outfits", page: "MyOutfits", icon: BookOpen },
  { label: "Planner", page: "WardrobeCalendar", icon: CalendarDays },
  { label: "Insights", page: "WardrobeStats", icon: BarChart2 },
  { label: "Packing", page: "PackingLists", icon: Luggage },
  { label: "Explore", page: "Explore", icon: Globe },
  { label: "My Avatar", page: "Avatar", icon: User },
];

const ROOT_PAGES = ["Home", "Wardrobe", "OutfitBuilder", "MyOutfits", "Explore", "Avatar", "WardrobeCalendar", "WardrobeStats", "PackingLists"];

// Module-level scroll position store — survives Layout unmount/remount on route change
const tabScrollPositions = {};

export default function Layout({ children, currentPageName }) {
  useSystemDarkMode();
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Preserve scroll position per page across navigation
  // (Tab pages handle their own scroll inside PreservedTabs)
  useEffect(() => {
    const path = location.pathname;
    if (TAB_PATHS.includes(path)) return;
    const saved = tabScrollPositions[path];
    if (saved !== undefined && saved > 0) {
      requestAnimationFrame(() => window.scrollTo(0, saved));
    }
    return () => {
      tabScrollPositions[path] = window.scrollY;
    };
  }, [location.pathname]);

  const isRootPage = ROOT_PAGES.includes(currentPageName);

  if (currentPageName === "Home") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#373d47]">
      {/* Top header — safe area aware */}
      <nav className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-transparent sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Logo or back button */}
          {isRootPage ? (
            <Link to={createPageUrl("Home")} className="flex items-center gap-2">
              <Shirt className="w-5 h-5 text-white" />
              <span className="font-heading font-bold uppercase text-gray-900 dark:text-white text-lg tracking-tight">Virtually Dressed</span>
            </Link>
          ) : (
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white p-2 -ml-2">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-body">Back</span>
            </button>
          )}

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV.map(({ label, page, icon: Icon }) => (
              <Link key={page} to={createPageUrl(page)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={currentPageName === page ? "text-[#e8b820]" : "text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-gray-500 dark:text-white/50 font-body">{user.full_name || user.email}</span>
                <Button variant="ghost" size="sm" onClick={() => base44.auth.logout(createPageUrl("Home"))} className="text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="bg-[#e8b820] hover:bg-[#d4a017] text-black font-semibold"
                  onClick={() => base44.auth.redirectToLogin(window.location.href)}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Page content — bottom padded for bottom nav on mobile */}
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-white/10 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV.map(({ label, page, icon: Icon }) => {
          const isActive = currentPageName === page;
          const dest = createPageUrl(page);
          return (
            <Link
              key={page}
              to={dest}
              replace={isActive}
              className="flex-1 flex flex-col items-center justify-center py-2 min-h-[44px]"
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#e8b820]" : "text-gray-400 dark:text-white/40"}`} />
              <span className={`text-[10px] mt-0.5 font-body ${isActive ? "text-[#e8b820]" : "text-gray-400 dark:text-white/40"}`}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}