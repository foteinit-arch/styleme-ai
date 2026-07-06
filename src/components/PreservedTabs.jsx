import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Wardrobe from "@/pages/Wardrobe";
import OutfitBuilder from "@/pages/OutfitBuilder";
import MyOutfits from "@/pages/MyOutfits";
import Explore from "@/pages/Explore";
import Avatar from "@/pages/Avatar";
import WardrobeCalendar from "@/pages/WardrobeCalendar";
import WardrobeStats from "@/pages/WardrobeStats";
import PackingLists from "@/pages/PackingLists";

export const TAB_PATHS = [
  "/Wardrobe",
  "/OutfitBuilder",
  "/MyOutfits",
  "/Explore",
  "/Avatar",
  "/WardrobeCalendar",
  "/WardrobeStats",
  "/PackingLists",
];

const TAB_PAGES = [
  { name: "Wardrobe", path: "/Wardrobe", Component: Wardrobe },
  { name: "OutfitBuilder", path: "/OutfitBuilder", Component: OutfitBuilder },
  { name: "MyOutfits", path: "/MyOutfits", Component: MyOutfits },
  { name: "Explore", path: "/Explore", Component: Explore },
  { name: "Avatar", path: "/Avatar", Component: Avatar },
  { name: "WardrobeCalendar", path: "/WardrobeCalendar", Component: WardrobeCalendar },
  { name: "WardrobeStats", path: "/WardrobeStats", Component: WardrobeStats },
  { name: "PackingLists", path: "/PackingLists", Component: PackingLists },
];

const PATH_TO_TAB = Object.fromEntries(
  TAB_PAGES.map(({ name, path }) => [path, name])
);

// Module-level scroll store — survives re-renders
const tabScrollPositions = {};

export default function PreservedTabs() {
  const location = useLocation();
  const activeTab = PATH_TO_TAB[location.pathname] || null;
  const [visitedTabs, setVisitedTabs] = useState(
    () => new Set(activeTab ? [activeTab] : [])
  );
  const prevTabRef = useRef(activeTab);

  // Lazy-mount: only add a tab to the render tree once it's been visited
  useEffect(() => {
    if (activeTab && !visitedTabs.has(activeTab)) {
      setVisitedTabs((prev) => new Set([...prev, activeTab]));
    }
  }, [activeTab, visitedTabs]);

  // Save scroll of outgoing tab, restore scroll of incoming tab
  useLayoutEffect(() => {
    const prevTab = prevTabRef.current;

    if (prevTab && prevTab !== activeTab) {
      tabScrollPositions[prevTab] = window.scrollY;
    }

    if (activeTab && prevTab !== activeTab) {
      const saved = tabScrollPositions[activeTab] || 0;
      requestAnimationFrame(() => window.scrollTo(0, saved));
    }

    prevTabRef.current = activeTab;
  }, [activeTab]);

  return (
    <>
      {TAB_PAGES.filter(({ name }) => visitedTabs.has(name)).map(
        ({ name, Component }) => (
          <div
            key={name}
            style={{ display: name === activeTab ? "block" : "none" }}
          >
            <Component />
          </div>
        )
      )}
    </>
  );
}