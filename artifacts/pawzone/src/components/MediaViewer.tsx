import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Play, ZoomIn, ZoomOut } from "lucide-react";
import { PawPrint } from "lucide-react";

export type MediaItem = { kind: "image" | "video"; url: string; label?: string };

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

export function MediaViewer({ items, initialIndex = 0, onClose }: MediaViewerProps) {
  const [idx, setIdx] = useState(Math.min(initialIndex, items.length - 1));
  const [zoomed, setZoomed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const current = items[idx];
  const hasPrev = idx > 0;
  const hasNext = idx < items.length - 1;

  const prev = useCallback(() => { if (hasPrev) { setIdx(i => i - 1); setZoomed(false); setImgLoaded(false); setImgError(false); } }, [hasPrev]);
  const next = useCallback(() => { if (hasNext) { setIdx(i => i + 1); setZoomed(false); setImgLoaded(false); setImgError(false); } }, [hasNext]);
  const goTo = (i: number) => { setIdx(i); setZoomed(false); setImgLoaded(false); setImgError(false); };

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
    setZoomed(false);
  }, [idx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current ?? 0));
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      if (dx < 0) next(); else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          {current?.label && (
            <span className="text-white/80 text-sm font-medium">{current.label}</span>
          )}
          {items.length > 1 && (
            <span className="text-white/50 text-sm">{idx + 1} / {items.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {current?.kind === "image" && (
            <button
              onClick={() => setZoomed(z => !z)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title={zoomed ? "Zoom out" : "Zoom in"}
            >
              {zoomed ? <ZoomOut className="w-4 h-4 text-white" /> : <ZoomIn className="w-4 h-4 text-white" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Media area */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Prev arrow */}
        {hasPrev && (
          <button
            onClick={prev}
            className="absolute left-2 sm:left-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-all border border-white/10"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Active media */}
        <div className={`w-full h-full flex items-center justify-center px-14 sm:px-16 transition-transform duration-200 ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          onClick={() => current?.kind === "image" && setZoomed(z => !z)}
        >
          {current?.kind === "image" ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {!imgLoaded && !imgError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}
              {imgError ? (
                <div className="flex flex-col items-center gap-3 text-white/50">
                  <PawPrint className="w-12 h-12" />
                  <p className="text-sm">Image unavailable</p>
                </div>
              ) : (
                <img
                  key={current.url}
                  src={current.url}
                  alt={current.label ?? "Pet photo"}
                  className={`max-w-full max-h-full rounded-lg transition-all duration-300 select-none ${
                    zoomed ? "object-contain scale-150 cursor-zoom-out" : "object-contain cursor-zoom-in"
                  } ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                  style={{ maxHeight: "calc(100vh - 180px)" }}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => { setImgError(true); setImgLoaded(true); }}
                  draggable={false}
                />
              )}
            </div>
          ) : current?.kind === "video" ? (
            <video
              key={current.url}
              src={current.url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full rounded-lg"
              style={{ maxHeight: "calc(100vh - 180px)" }}
            />
          ) : null}
        </div>

        {/* Next arrow */}
        {hasNext && (
          <button
            onClick={next}
            className="absolute right-2 sm:right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-all border border-white/10"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Bottom: dot indicators + thumbnail strip */}
      <div className="flex-shrink-0 pb-4">
        {/* Dot indicators */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all ${i === idx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/35 hover:bg-white/60"}`}
              />
            ))}
          </div>
        )}
        {/* Thumbnail strip */}
        {items.length > 1 && (
          <div className="flex justify-center gap-2 px-4 overflow-x-auto pb-1">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  i === idx ? "border-white scale-105" : "border-white/20 opacity-60 hover:opacity-90"
                }`}
              >
                {item.kind === "image" ? (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video src={item.url} className="w-full h-full object-cover bg-gray-800" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


interface ClickableImageProps {
  src: string;
  alt?: string;
  className?: string;
  allItems?: MediaItem[];
  itemIndex?: number;
  onOpen?: (index: number) => void;
  lazy?: boolean;
  fallbackIcon?: React.ReactNode;
}

export function ClickableImage({ src, alt, className, allItems, itemIndex = 0, onOpen, lazy = true, fallbackIcon }: ClickableImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full group">
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-inherit" />
      )}
      {error ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-100 text-gray-400">
          {fallbackIcon ?? <PawPrint className="w-8 h-8" />}
          <span className="text-xs">Unavailable</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt ?? ""}
          loading={lazy ? "lazy" : "eager"}
          className={`${className ?? "w-full h-full object-contain"} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          onClick={() => onOpen?.(itemIndex)}
        />
      )}
      {loaded && !error && onOpen && (
        <div
          className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-zoom-in"
          onClick={() => onOpen(itemIndex)}
        >
          <ZoomIn className="w-6 h-6 text-white drop-shadow-lg" />
        </div>
      )}
    </div>
  );
}
