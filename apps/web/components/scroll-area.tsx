"use client";

import { cn } from "@annona/ui";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * Custom vertical scroll container with a branded overlay scrollbar (thin,
 * rounded, verdant thumb) plus soft top/bottom fade masks that signal more
 * content. Replaces the native browser scrollbar wherever we cap a list to a
 * fixed height (activity feed, saprotan catalog). Content-only, no horizontal
 * scroll. Pointer + drag on the thumb, click on the track to page, wheel/touch
 * pass through natively.
 */
export function ScrollArea({
  children,
  className,
  viewportClassName,
  maxHeight,
  fade = true,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  /** cap height; number => px, string => raw CSS (e.g. "24rem") */
  maxHeight?: number | string;
  fade?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ height: 0, top: 0, visible: false });
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const drag = useRef<{ startY: number; startScroll: number } | null>(null);

  const recompute = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    const visible = scrollHeight > clientHeight + 1;
    const trackH = clientHeight;
    const height = visible ? Math.max((clientHeight / scrollHeight) * trackH, 28) : 0;
    const maxTop = trackH - height;
    const top = visible ? (scrollTop / (scrollHeight - clientHeight)) * maxTop : 0;
    setThumb({ height, top, visible });
    setAtTop(scrollTop <= 1);
    setAtBottom(scrollTop >= scrollHeight - clientHeight - 1);
  }, []);

  useLayoutEffect(() => {
    recompute();
  }, [recompute]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [recompute]);

  useEffect(() => {
    if (!drag.current) return;
    const onMove = (e: PointerEvent) => {
      const el = viewportRef.current;
      const d = drag.current;
      if (!el || !d) return;
      const { scrollHeight, clientHeight } = el;
      const trackH = clientHeight;
      const thumbH = Math.max((clientHeight / scrollHeight) * trackH, 28);
      const maxTop = trackH - thumbH;
      const deltaY = e.clientY - d.startY;
      const scrollRatio = (scrollHeight - clientHeight) / maxTop;
      el.scrollTop = d.startScroll + deltaY * scrollRatio;
    };
    const onUp = () => {
      drag.current = null;
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  });

  const onThumbDown = (e: React.PointerEvent) => {
    const el = viewportRef.current;
    if (!el) return;
    e.preventDefault();
    drag.current = { startY: e.clientY, startScroll: el.scrollTop };
    document.body.style.userSelect = "none";
  };

  const style =
    maxHeight === undefined
      ? undefined
      : { maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={viewportRef}
        onScroll={recompute}
        style={style}
        className={cn(
          "overflow-y-auto overflow-x-hidden pr-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          viewportClassName,
        )}
      >
        {children}
      </div>

      {/* custom overlay scrollbar */}
      {thumb.visible ? (
        <div className="pointer-events-none absolute top-0 right-0.5 bottom-0 w-2">
          <div
            ref={thumbRef}
            onPointerDown={onThumbDown}
            className="pointer-events-auto absolute right-0 w-1.5 cursor-grab rounded-full bg-ink-300/70 transition-colors hover:bg-verdant-400 active:cursor-grabbing active:bg-verdant-500"
            style={{ height: `${thumb.height}px`, transform: `translateY(${thumb.top}px)` }}
          />
        </div>
      ) : null}

      {/* fade masks */}
      {fade && thumb.visible ? (
        <>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-surface to-transparent transition-opacity",
              atTop ? "opacity-0" : "opacity-100",
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface to-transparent transition-opacity",
              atBottom ? "opacity-0" : "opacity-100",
            )}
          />
        </>
      ) : null}
    </div>
  );
}
