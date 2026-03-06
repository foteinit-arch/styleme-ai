import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Shirt, User, Sparkles, Globe, LogOut, Menu, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { label: "Wardrobe", page: "Wardrobe", icon: Shirt },
  { label: "Builder", page: "OutfitBuilder", icon: Sparkles },
  { label: "My Outfits", page: "MyOutfits", icon: BookOpen },
  { label: "Explore", page: "Explore", icon: Globe },
  { label: "My Avatar", page: "Avatar", icon: User },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (currentPageName === "Home") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-rose-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to={createPageUrl("Home")} className="flex items-center gap-2">
            <Shirt className="w-6 h-6 text-rose-500" />
            <span className="text-xl font-bold text-rose-500">DressMe</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV.map(({ label, page, icon: Icon }) => (
              <Link key={page} to={createPageUrl(page)}>
                <Button
                  variant={currentPageName === page ? "default" : "ghost"}
                  size="sm"
                  className={currentPageName === page ? "bg-rose-500 hover:bg-rose-600 text-white" : "text-gray-600 hover:text-rose-500"}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-gray-600">{user.full_name || user.email}</span>
                <Button variant="ghost" size="sm" onClick={() => base44.auth.logout(createPageUrl("Home"))} className="text-gray-500">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white"
                onClick={() => base44.auth.redirectToLogin(window.location.href)}>
                Sign In
              </Button>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-rose-100 bg-white px-4 py-3 flex flex-col gap-1">
            {NAV.map(({ label, page, icon: Icon }) => (
              <Link key={page} to={createPageUrl(page)} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={currentPageName === page ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-start ${currentPageName === page ? "bg-rose-500 text-white" : "text-gray-600"}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Button>
              </Link>
            ))}
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => base44.auth.logout(createPageUrl("Home"))} className="w-full justify-start text-gray-500">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            ) : (
              <Button size="sm" className="bg-rose-500 text-white w-full"
                onClick={() => base44.auth.redirectToLogin(window.location.href)}>
                Sign In
              </Button>
            )}
          </div>
        )}
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}