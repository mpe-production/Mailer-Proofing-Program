"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { toCanvas } from "html-to-image";

export interface LoadedPdfDocument {
  id: string;
  name: string;
  frontImageUrl: string;
  backImageUrl?: string;
  pageCount: number;
  widthPt: number;
  heightPt: number;
}

interface StaircaseViewProps {
  documents: LoadedPdfDocument[];
  onRemoveDocument?: (id: string) => void;
}

const PX_PER_INCH = 24;

function classifyPdfFormat(widthPt: number, heightPt: number) {
  const widthInches = widthPt / 72;
  const heightInches = heightPt / 72;
  const numericRatio = widthPt / heightPt;

  const minDim = Math.min(widthInches, heightInches);
  const maxDim = Math.max(widthInches, heightInches);

  let label = "Custom Size";

  if (minDim >= 3.2 && minDim <= 4.2 && maxDim >= 8.0 && maxDim <= 9.2) {
    label = "Buckslip / Rack Card";
  } else if (minDim >= 3.5 && minDim <= 4.5 && maxDim >= 8.5 && maxDim <= 10.0) {
    label = "#9 / #10 Remit Envelope";
  } else if (minDim >= 5.0 && minDim <= 6.5 && maxDim >= 8.5 && maxDim <= 10.0) {
    label = "#6.5 Remit Panel";
  } else if (minDim >= 8.0 && minDim <= 9.0 && maxDim >= 10.5 && maxDim <= 12.0) {
    label = "Letter Size";
  } else if (minDim >= 8.0 && minDim <= 9.0 && maxDim >= 13.5 && maxDim <= 14.5) {
    label = "Legal Size";
  } else if (numericRatio >= 0.6 && numericRatio <= 0.7) {
    label = "Letter Tri-Fold";
  } else if (numericRatio >= 0.71 && numericRatio <= 0.85) {
    label = "Letter Bi-Fold";
  }

  return {
    format: label.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    label,
    dims: `${widthInches.toFixed(2)}" × ${heightInches.toFixed(2)}"`,
    aspectRatioStr: `Ratio ${numericRatio.toFixed(2)}`,
    calculatedWidthPx: Math.round(widthInches * PX_PER_INCH),
    calculatedHeightPx: Math.round(heightInches * PX_PER_INCH),
  };
}

export const StaircaseView: React.FC<StaircaseViewProps> = ({
  documents,
  onRemoveDocument,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardStackRef = useRef<HTMLDivElement>(null);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!cardStackRef.current || !stageRef.current) return;

    const cards = Array.from(
      cardStackRef.current.querySelectorAll<HTMLDivElement>(".stacked-card")
    );
    const total = cards.length;
    if (total === 0) return;

    const cardGap = 30;
    const stepY = total > 1 ? Math.min(40, 180 / (total - 1)) : 0;
    const cos38 = Math.cos(38 * (Math.PI / 180));

    const paddingLeft = 40;
    const paddingTop = 50;

    let currentX = paddingLeft;
    let maxCardWidth = 0;
    let maxCardHeight = 0;

    cards.forEach((card, i) => {
      const cardId = card.dataset.id;
      const topStackZIndex = total - i;
      const rawWidth = parseFloat(card.dataset.widthPx || "200");
      const rawHeight = parseFloat(card.dataset.heightPx || "280");

      if (rawWidth > maxCardWidth) maxCardWidth = rawWidth;
      if (rawHeight > maxCardHeight) maxCardHeight = rawHeight;

      const projectedWidth = rawWidth * cos38;
      const posY = paddingTop + i * stepY;
      const isFlipped = cardId ? flippedCards[cardId] : false;

      card.dataset.posX = String(currentX);
      card.dataset.posY = String(posY);
      card.dataset.baseZIndex = String(topStackZIndex);

      const targetZIndex = isFlipped ? 1000 : topStackZIndex;
      const wrapper = card.querySelector<HTMLDivElement>(".stacked-card__inner-wrapper");

      gsap.to(card, {
        x: currentX,
        y: posY,
        zIndex: targetZIndex,
        duration: 0.4,
        ease: "power3.out",
      });

      if (wrapper && !isFlipped) {
        gsap.to(wrapper, {
          rotationY: -38,
          rotationX: 12,
          duration: 0.4,
          ease: "power3.out",
        });
      }

      currentX += projectedWidth + cardGap;
    });

    const availableWidth = stageRef.current.clientWidth - 80;
    const availableHeight = stageRef.current.clientHeight - 80;

    const totalRenderWidth = currentX + maxCardWidth;
    const totalRenderHeight = paddingTop + (total - 1) * stepY + maxCardHeight;

    const scaleX = availableWidth / totalRenderWidth;
    const scaleY = availableHeight / totalRenderHeight;
    const finalScale = Math.min(Math.min(scaleX, scaleY), 1.0);

    gsap.to(cardStackRef.current, {
      scale: Math.max(finalScale, 0.25),
      transformOrigin: "top left",
      duration: 0.4,
      ease: "power2.out",
    });
  }, [documents, flippedCards]);

  const handleCardHover = (id: string, isHovering: boolean) => {
    if (flippedCards[id]) return;
    const cardEl = document.getElementById(`card-${id}`);
    if (!cardEl) return;

    const wrapper = cardEl.querySelector<HTMLDivElement>(".stacked-card__inner-wrapper");
    if (isHovering) {
      setActiveCardId(id);
      const curY = parseFloat(cardEl.dataset.posY || "0");
      gsap.to(cardEl, { y: curY - 20, zIndex: 500, duration: 0.3, ease: "power2.out" });
      if (wrapper) {
        gsap.to(wrapper, { rotationY: -15, rotationX: 4, scale: 1.04, duration: 0.3, ease: "power2.out" });
      }
    } else {
      setActiveCardId(null);
      gsap.to(cardEl, {
        x: parseFloat(cardEl.dataset.posX || "0"),
        y: parseFloat(cardEl.dataset.posY || "0"),
        zIndex: parseInt(cardEl.dataset.baseZIndex || "1", 10),
        duration: 0.3,
        ease: "power2.out",
      });
      if (wrapper) {
        gsap.to(wrapper, { rotationY: -38, rotationX: 12, scale: 1, duration: 0.3, ease: "power2.out" });
      }
    }
  };

  const handleCardClick = (id: string) => {
    const cardEl = document.getElementById(`card-${id}`);
    if (!cardEl) return;

    const inner = cardEl.querySelector<HTMLDivElement>(".stacked-card__inner");
    const wrapper = cardEl.querySelector<HTMLDivElement>(".stacked-card__inner-wrapper");
    const isCurrentlyFlipped = !!flippedCards[id];

    if (!isCurrentlyFlipped) {
      setFlippedCards((prev) => ({ ...prev, [id]: true }));
      gsap.to(cardEl, { zIndex: 1000, duration: 0.3 });
      if (wrapper) gsap.to(wrapper, { rotationY: 0, rotationX: 0, scale: 1.08, duration: 0.3 });
      if (inner) gsap.to(inner, { rotationY: 180, duration: 0.5, ease: "back.out(1.1)" });
    } else {
      setFlippedCards((prev) => ({ ...prev, [id]: false }));
      if (inner) gsap.to(inner, { rotationY: 0, duration: 0.5, ease: "back.out(1.1)" });
      gsap.to(cardEl, {
        x: parseFloat(cardEl.dataset.posX || "0"),
        y: parseFloat(cardEl.dataset.posY || "0"),
        zIndex: parseInt(cardEl.dataset.baseZIndex || "1", 10),
        duration: 0.4,
      });
      if (wrapper) {
        gsap.to(wrapper, { rotationY: -38, rotationX: 12, scale: 1, duration: 0.4 });
      }
    }
  };

  const exportPng = async () => {
    if (!stageRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await toCanvas(stageRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#e8e6e7",
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "pdf-staircase-3d.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#e8e6e7] text-[#222]">
      <div className="flex justify-between items-center px-6 py-4 bg-white/85 backdrop-blur-md border-b border-gray-300 z-50">
        <h2 className="text-sm font-semibold tracking-wide text-gray-700 uppercase">
          3D Staircase Proofing View
        </h2>
        <button
          onClick={exportPng}
          disabled={isExporting || documents.length === 0}
          className="px-4 py-2 text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isExporting ? "⌛ Exporting..." : "📸 Export Rendering (PNG)"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-80 bg-white/90 backdrop-blur-md border-r border-gray-300 p-5 z-40 flex flex-col shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 pb-2 border-b border-gray-200">
            Document Index
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3">
            {documents.length === 0 ? (
              <p className="text-xs italic text-gray-500">No documents loaded.</p>
            ) : (
              documents.map((doc, idx) => {
                const formatInfo = classifyPdfFormat(doc.widthPt, doc.heightPt);
                const isActive = activeCardId === doc.id || flippedCards[doc.id];

                return (
                  <div
                    key={doc.id}
                    className={`p-3 bg-white border rounded-md flex gap-2.5 items-start cursor-pointer transition-all ${
                      isActive
                        ? "border-blue-600 shadow-md translate-x-1"
                        : "border-gray-200 hover:border-blue-500"
                    }`}
                    onMouseEnter={() => handleCardHover(doc.id, true)}
                    onMouseLeave={() => handleCardHover(doc.id, false)}
                    onClick={() => handleCardClick(doc.id)}
                  >
                    <span className="bg-blue-600 text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate" title={doc.name}>
                        {doc.name}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-semibold uppercase text-gray-700">
                          {formatInfo.label}
                        </span>
                        <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded font-semibold uppercase text-gray-700">
                          {doc.pageCount} {doc.pageCount === 1 ? "Pg" : "Pgs"}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Dim: {formatInfo.dims} • {formatInfo.aspectRatioStr}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <main ref={stageRef} className="flex-1 relative p-10 overflow-auto perspective-[1200px]">
          {documents.length === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500 text-base text-center">
              Upload PDF files to view them in the 3D Staircase stack.
            </div>
          )}

          <div ref={cardStackRef} className="absolute top-0 left-0 origin-top-left">
            {documents.map((doc, idx) => {
              const formatInfo = classifyPdfFormat(doc.widthPt, doc.heightPt);
              const markerLabel = `#${idx + 1}`;

              return (
                <div
                  key={doc.id}
                  id={`card-${doc.id}`}
                  data-id={doc.id}
                  data-width-px={formatInfo.calculatedWidthPx}
                  data-height-px={formatInfo.calculatedHeightPx}
                  className="stacked-card absolute top-0 left-0 flex flex-col cursor-pointer transition-none [transform-style:preserve-3d]"
                  style={{
                    width: `${formatInfo.calculatedWidthPx}px`,
                    height: `${formatInfo.calculatedHeightPx}px`,
                  }}
                  onMouseEnter={() => handleCardHover(doc.id, true)}
                  onMouseLeave={() => handleCardHover(doc.id, false)}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest(".remove-btn")) return;
                    handleCardClick(doc.id);
                  }}
                >
                  <div className="absolute top-2 left-2 z-10 pointer-events-none">
                    <span className="bg-blue-600 text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded shadow">
                      {markerLabel}
                    </span>
                  </div>

                  <div className="stacked-card__inner-wrapper relative w-full h-full [transform-style:preserve-3d]">
                    <div className="stacked-card__inner relative w-full h-full [transform-style:preserve-3d]">
                      <div className="stacked-card__face absolute inset-0 bg-white shadow-xl overflow-hidden [backface-visibility:hidden] z-10">
                        <img
                          src={doc.frontImageUrl}
                          alt={`${doc.name} (Front)`}
                          className="w-full h-full object-fill block"
                        />
                      </div>

                      <div className="stacked-card__face absolute inset-0 bg-gray-50 shadow-xl overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between">
                        {doc.backImageUrl ? (
                          <div className="w-full h-full">
                            <img
                              src={doc.backImageUrl}
                              alt={`${doc.name} (Back)`}
                              className="w-full h-full object-fill block"
                            />
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-xs text-gray-400 italic">
                            No page 2 preview
                          </div>
                        )}

                        {onRemoveDocument && (
                          <div className="p-3 flex justify-center bg-white/80">
                            <button
                              className="remove-btn bg-red-600 text-white text-xs px-3 py-1.5 rounded font-semibold hover:bg-red-700 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveDocument(doc.id);
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};