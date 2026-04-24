import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      e.preventDefault();
      setPullY(Math.min(delta * 0.5, THRESHOLD + 20));
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (pullY >= THRESHOLD) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPullY(0);
    startY.current = null;
  }, [pullY, onRefresh]);

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto h-full"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overscrollBehavior: "none" }}
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none overflow-hidden transition-[height] duration-150"
        style={{ height: pullY > 0 || refreshing ? (refreshing ? THRESHOLD : pullY) : 0 }}
      >
        <RefreshCw
          className={`w-5 h-5 text-[#e8b820] transition-opacity ${progress > 0.3 ? "opacity-100" : "opacity-0"} ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: `rotate(${progress * 270}deg)`, transition: refreshing ? "none" : "transform 0.1s" }}
        />
      </div>

      {/* Content shifted down while pulling */}
      <div style={{ transform: `translateY(${refreshing ? THRESHOLD : pullY}px)`, transition: pullY === 0 ? "transform 0.3s ease" : "none" }}>
        {children}
      </div>
    </div>
  );
}