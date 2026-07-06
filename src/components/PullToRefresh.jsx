import { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 100;
const RESISTANCE = 0.5;

/**
 * Pull-to-refresh with native passive:false touch listeners for smooth,
 * jank-free dragging on iOS. Uses refs for drag state and rAF-batched
 * state updates so the drag never blocks the main thread.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const containerRef = useRef(null);
  const startYRef = useRef(null);
  const pullYRef = useRef(0);
  const rafRef = useRef(null);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (refreshingRef.current) return;
      if (el.scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
      } else {
        startYRef.current = null;
      }
    };

    const onTouchMove = (e) => {
      if (startYRef.current === null || refreshingRef.current) return;
      const delta = e.touches[0].clientY - startYRef.current;
      // Only intercept when pulling down at the top of the scroll area
      if (delta > 0 && el.scrollTop <= 0) {
        e.cancelable && e.preventDefault();
        const next = Math.min(delta * RESISTANCE, MAX_PULL);
        pullYRef.current = next;
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            setPullY(pullYRef.current);
            rafRef.current = null;
          });
        }
      }
    };

    const onTouchEnd = async () => {
      if (startYRef.current === null) return;
      const reached = pullYRef.current;
      startYRef.current = null;
      pullYRef.current = 0;

      if (reached >= THRESHOLD) {
        setRefreshing(true);
        setPullY(THRESHOLD);
        try {
          await onRefreshRef.current();
        } finally {
          setRefreshing(false);
          setPullY(0);
        }
      } else {
        setPullY(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto h-full"
      style={{ overscrollBehavior: "none", touchAction: "pan-y" }}
    >
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none overflow-hidden"
        style={{
          height: pullY > 0 || refreshing ? (refreshing ? THRESHOLD : pullY) : 0,
          transition: pullY === 0 && !refreshing ? "height 0.3s ease" : "none",
        }}
      >
        <RefreshCw
          className={`w-5 h-5 text-[#e8b820] transition-opacity ${progress > 0.3 ? "opacity-100" : "opacity-0"} ${refreshing ? "animate-spin" : ""}`}
          style={{
            transform: `rotate(${progress * 270}deg)`,
            transition: refreshing ? "none" : "transform 0.1s",
          }}
        />
      </div>

      {/* Content shifted down while pulling */}
      <div
        style={{
          transform: `translateY(${refreshing ? THRESHOLD : pullY}px)`,
          transition: pullY === 0 ? "transform 0.3s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}