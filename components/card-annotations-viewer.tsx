"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";

interface Annotation {
  _id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  order: number;
}

interface CardAnnotationsViewerProps {
  image: string;
  aspectRatio: string;
  annotations: Annotation[];
}

/**
 * Public viewer for card annotations.
 * Desktop: image with dots, titles on left/right connected by SVG lines.
 * Mobile: image with numbered circles, tap to show detail panel.
 */
export function CardAnnotationsViewer({
  image,
  aspectRatio,
  annotations,
}: CardAnnotationsViewerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{
    containerWidth: number;
    containerHeight: number;
    imageLeft: number;
    imageTop: number;
    imageWidth: number;
    imageHeight: number;
  } | null>(null);

  // Measure container and image for SVG line calculations
  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const img = imageRef.current;
      if (!container || !img) return;

      const cRect = container.getBoundingClientRect();
      const iRect = img.getBoundingClientRect();

      setDimensions({
        containerWidth: cRect.width,
        containerHeight: cRect.height,
        imageLeft: iRect.left - cRect.left,
        imageTop: iRect.top - cRect.top,
        imageWidth: iRect.width,
        imageHeight: iRect.height,
      });
    };

    const raf = requestAnimationFrame(measure);

    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);

    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [annotations]);

  const getDotPosition = useCallback(
    (annotation: Annotation) => {
      if (!dimensions) return { x: 0, y: 0 };
      return {
        x: dimensions.imageLeft + (annotation.x / 100) * dimensions.imageWidth,
        y: dimensions.imageTop + (annotation.y / 100) * dimensions.imageHeight,
      };
    },
    [dimensions]
  );

  // Distribute titles vertically to avoid overlap
  const distributeVertically = useCallback(
    (anns: Annotation[]) => {
      if (!dimensions) return anns.map(() => 50);

      const minGap = 40; // minimum px between title centers
      const positions = anns.map((a) => {
        return dimensions.imageTop + (a.y / 100) * dimensions.imageHeight;
      });

      // Sort by target position, spread if overlapping
      const indexed = positions.map((p, i) => ({ p, i }));
      indexed.sort((a, b) => a.p - b.p);

      const spread: number[] = new Array(anns.length);
      let lastY = -Infinity;
      for (const item of indexed) {
        const y = Math.max(item.p, lastY + minGap);
        spread[item.i] = y;
        lastY = y;
      }

      return spread;
    },
    [dimensions]
  );

  // Calculate title endpoint for SVG line (by annotation _id)
  const getTitleSvgPosition = useCallback(
    (ann: Annotation, side: "left" | "right", topPx: number) => {
      if (!dimensions) return null;
      // Title column is 140px wide. Left titles are right-aligned, right titles are left-aligned.
      // Image area starts at 150px from each side (mx-[150px]).
      const titleColumnWidth = 140;
      const margin = 150; // matches mx-[150px]
      const x = side === "left"
        ? titleColumnWidth // right edge of left column
        : dimensions.containerWidth - titleColumnWidth; // left edge of right column
      const y = topPx;
      return { x, y };
    },
    [dimensions]
  );

  if (annotations.length === 0) return null;

  const sorted = [...annotations].sort((a, b) => a.order - b.order);
  const leftAnnotations = sorted.filter((a) => a.x <= 50);
  const rightAnnotations = sorted.filter((a) => a.x > 50);

  const leftPositions = distributeVertically(leftAnnotations);
  const rightPositions = distributeVertically(rightAnnotations);

  // Build a map of annotation _id → SVG title endpoint
  const titleSvgEndpoints = new Map<string, { x: number; y: number }>();
  leftAnnotations.forEach((ann, i) => {
    const pos = getTitleSvgPosition(ann, "left", leftPositions[i]);
    if (pos) titleSvgEndpoints.set(ann._id, pos);
  });
  rightAnnotations.forEach((ann, i) => {
    const pos = getTitleSvgPosition(ann, "right", rightPositions[i]);
    if (pos) titleSvgEndpoints.set(ann._id, pos);
  });

  return (
    <>
      {/* ===== DESKTOP VIEW ===== */}
      <div className="hidden md:block">
        <div
          ref={containerRef}
          className="relative mx-auto"
          style={{ maxWidth: "700px" }}
        >
          {/* Left titles column */}
          <div
            className="absolute top-0 left-0 w-[140px]"
            style={{ height: dimensions?.containerHeight ?? "100%" }}
          >
            {leftAnnotations.map((ann, i) => {
              const topPx = leftPositions[i];
              return (
                <button
                  key={ann._id}
                  type="button"
                  className={`absolute right-0 max-w-[130px] cursor-pointer rounded px-2 py-1 text-right text-xs font-medium transition-colors ${
                    activeId === ann._id
                      ? "bg-foreground text-background"
                      : "text-foreground/80 hover:text-foreground"
                  }`}
                  style={{
                    top: `${topPx}px`,
                    transform: "translateY(-50%)",
                  }}
                  onClick={() =>
                    setActiveId(activeId === ann._id ? null : ann._id)
                  }
                  onMouseEnter={() => setActiveId(ann._id)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  {ann.title}
                  {activeId === ann._id && ann.description && (
                    <span className="mt-1 block rounded bg-gray-900 px-2 py-1 text-left text-[11px] font-normal leading-snug text-white shadow-lg">
                      <RichTextViewer content={ann.description} className="[&_p]:mb-1 [&_p:last-child]:mb-0" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Center image */}
          <div className="mx-[150px]">
            <div
              ref={imageRef}
              className="relative overflow-hidden rounded-lg bg-muted shadow-md"
              style={{ aspectRatio }}
            >
              <img
                src={image}
                alt=""
                className="h-full w-full object-contain"
              />
              {/* Red dots on image */}
              {sorted.map((ann) => (
                <div
                  key={ann._id}
                  className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform ${
                    activeId === ann._id
                      ? "scale-150 bg-red-400"
                      : "bg-red-500"
                  }`}
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right titles column */}
          <div
            className="absolute top-0 right-0 w-[140px]"
            style={{ height: dimensions?.containerHeight ?? "100%" }}
          >
            {rightAnnotations.map((ann, i) => {
              const topPx = rightPositions[i];
              return (
                <button
                  key={ann._id}
                  type="button"
                  className={`absolute left-0 max-w-[130px] cursor-pointer rounded px-2 py-1 text-left text-xs font-medium transition-colors ${
                    activeId === ann._id
                      ? "bg-foreground text-background"
                      : "text-foreground/80 hover:text-foreground"
                  }`}
                  style={{
                    top: `${topPx}px`,
                    transform: "translateY(-50%)",
                  }}
                  onClick={() =>
                    setActiveId(activeId === ann._id ? null : ann._id)
                  }
                  onMouseEnter={() => setActiveId(ann._id)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  {ann.title}
                  {activeId === ann._id && ann.description && (
                    <span className="mt-1 block rounded bg-gray-900 px-2 py-1 text-left text-[11px] font-normal leading-snug text-white shadow-lg">
                      <RichTextViewer content={ann.description} className="[&_p]:mb-1 [&_p:last-child]:mb-0" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* SVG lines connecting dots to titles */}
          {dimensions && (
            <svg
              className="pointer-events-none absolute inset-0"
              width={dimensions.containerWidth}
              height={dimensions.containerHeight}
              style={{ overflow: "visible" }}
            >
              {sorted.map((ann) => {
                const dot = getDotPosition(ann);
                const title = titleSvgEndpoints.get(ann._id);
                if (!title) return null;
                const isActive = activeId === ann._id;
                return (
                  <line
                    key={ann._id}
                    x1={dot.x}
                    y1={dot.y}
                    x2={title.x}
                    y2={title.y}
                    stroke={isActive ? "rgb(239 68 68)" : "rgb(239 68 68 / 0.4)"}
                    strokeWidth={isActive ? 2 : 1}
                    strokeDasharray={isActive ? "none" : "4 3"}
                  />
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* ===== MOBILE VIEW ===== */}
      <div className="md:hidden">
        <div
          className="relative overflow-hidden rounded-lg bg-muted shadow-md"
          style={{ aspectRatio }}
        >
          <img
            src={image}
            alt=""
            className="h-full w-full object-contain"
          />
          {/* Numbered circles */}
          {sorted.map((ann, i) => {
            const isActive = activeId === ann._id;
            return (
              <button
                key={ann._id}
                type="button"
                className={`absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white transition-transform ${
                  isActive
                    ? "scale-125 bg-blue-500 ring-2 ring-white"
                    : "bg-red-500/90"
                }`}
                style={{
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                }}
                onClick={() =>
                  setActiveId(isActive ? null : ann._id)
                }
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Active annotation panel */}
        {activeId && (() => {
          const ann = sorted.find((a) => a._id === activeId);
          if (!ann) return null;
          const idx = sorted.indexOf(ann);
          return (
            <div className="mt-3 rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500/90 text-[10px] font-bold text-white">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{ann.title}</h3>
                    {ann.description && (
                      <RichTextViewer content={ann.description} className="mt-1 text-sm text-muted-foreground" />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="flex-shrink-0 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setActiveId(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
