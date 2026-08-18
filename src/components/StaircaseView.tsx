// src/components/StaircaseView.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import * as htmlToImage from 'html-to-image';

export interface LoadedPdfDocument {
  id: string;
  name: string;
  frontImageUrl: string;
  backImageUrl?: string;
  pageCount?: number;
  widthPt: number;
  heightPt: number;
  componentType?: string;
  trimMarginX?: number;
  trimMarginY?: number;
  selectedPanel?: string;
  fullWidth?: number;
  fullHeight?: number;
  rotation?: number;
}

export interface StaircaseViewProps {
  documents: LoadedPdfDocument[];
  onRemoveDocument?: (id: string) => void;
  stageRef?: React.RefObject<HTMLDivElement | null>;
  stackRef?: React.RefObject<HTMLDivElement | null>;
}

// Balance resolution and viewport scaling in 3D perspective
const PX_PER_INCH = 48;

function classifyPdfFormat(widthPt: number, heightPt: number) {
  const widthInches = widthPt / 72;
  const heightInches = heightPt / 72;
  const numericRatio = widthPt / heightPt;

  const minDim = Math.min(widthInches, heightInches);
  const maxDim = Math.max(widthInches, heightInches);

  let label = 'Custom Size';

  if (minDim >= 3.2 && minDim <= 4.2 && maxDim >= 8.0 && maxDim <= 9.2) {
    label = 'Buckslip / Rack Card';
  } else if (minDim >= 3.5 && minDim <= 4.5 && maxDim >= 8.5 && maxDim <= 10.0) {
    label = '#9 / #10 Remit Envelope';
  } else if (minDim >= 5.0 && minDim <= 6.5 && maxDim >= 8.5 && maxDim <= 10.0) {
    label = '#6.5 Remit Panel';
  } else if (minDim >= 8.0 && minDim <= 9.0 && maxDim >= 10.5 && maxDim <= 12.0) {
    label = 'Letter Size';
  } else if (minDim >= 8.0 && minDim <= 9.0 && maxDim >= 13.5 && maxDim <= 14.5) {
    label = 'Legal Size';
  } else if (numericRatio >= 0.6 && numericRatio <= 0.7) {
    label = 'Letter Tri-Fold';
  } else if (numericRatio >= 0.71 && numericRatio <= 0.85) {
    label = 'Letter Bi-Fold';
  }

  return {
    label,
    dims: `${widthInches.toFixed(2)}" × ${heightInches.toFixed(2)}"`,
    aspectRatioStr: `Ratio ${numericRatio.toFixed(2)}`,
    calculatedWidthPx: Math.round(widthInches * PX_PER_INCH),
    calculatedHeightPx: Math.round(heightInches * PX_PER_INCH),
  };
}

// Proportional texture cropper & renderer
function TrimmedImageTexture({ doc }: { doc: LoadedPdfDocument }) {
  const [trimmedUrl, setTrimmedUrl] = useState<string>(doc.frontImageUrl);

  useEffect(() => {
    if (!doc.frontImageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = doc.frontImageUrl;

    img.onload = () => {
      const fullW = doc.fullWidth || doc.widthPt / 72;
      const fullH = doc.fullHeight || doc.heightPt / 72;
      const mX = doc.trimMarginX || 0;
      const mY = doc.trimMarginY || 0;

      const cleanW = Math.max(0.1, fullW - 2 * mX);
      const cleanH = Math.max(0.1, fullH - 2 * mY);

      let cropX = mX;
      let cropY = mY;
      let cropW = cleanW;
      let cropH = cleanH;

      if (doc.componentType === 'remit_6_5') {
        cropW = 6.25;
        cropH = 3.3641;
      } else if (doc.componentType === 'letter' && doc.selectedPanel && doc.selectedPanel !== 'none') {
        const panelH = cleanH / 3;
        cropH = panelH;
        if (doc.selectedPanel === 'top') cropY = mY;
        else if (doc.selectedPanel === 'middle') cropY = mY + panelH;
        else if (doc.selectedPanel === 'bottom') cropY = mY + panelH * 2;
      } else if (doc.componentType === 'letter_bifold' && doc.selectedPanel && doc.selectedPanel !== 'none') {
        const panelH = cleanH / 2;
        cropH = panelH;
        if (doc.selectedPanel === 'half_top') cropY = mY;
        else if (doc.selectedPanel === 'half_bottom') cropY = mY + panelH;
      }

      // Convert inches to exact pixel space based on natural image resolution
      const pxPerInchX = img.naturalWidth / fullW;
      const pxPerInchY = img.naturalHeight / fullH;

      const srcX = cropX * pxPerInchX;
      const srcY = cropY * pxPerInchY;
      const srcW = cropW * pxPerInchX;
      const srcH = cropH * pxPerInchY;

      const rotation = doc.rotation || 0;
      const is90or270 = rotation === 90 || rotation === 270;

      const renderW = Math.max(1, Math.round(srcW));
      const renderH = Math.max(1, Math.round(srcH));

      const canvas = document.createElement('canvas');
      canvas.width = is90or270 ? renderH : renderW;
      canvas.height = is90or270 ? renderW : renderH;

      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcW,
          srcH,
          -renderW / 2,
          -renderH / 2,
          renderW,
          renderH
        );

        ctx.restore();
        setTrimmedUrl(canvas.toDataURL('image/png'));
      }
    };
  }, [
    doc.frontImageUrl,
    doc.widthPt,
    doc.heightPt,
    doc.fullWidth,
    doc.fullHeight,
    doc.trimMarginX,
    doc.trimMarginY,
    doc.componentType,
    doc.selectedPanel,
    doc.rotation,
  ]);

  return (
    <img
      src={trimmedUrl}
      alt={`${doc.name} (Front)`}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
}

export function StaircaseView({ documents, onRemoveDocument, stageRef, stackRef }: StaircaseViewProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const internalStageViewportRef = useRef<HTMLDivElement | null>(null);
  const activeStageRef = stageRef || internalStageViewportRef;

  const internalStackContainerRef = useRef<HTMLDivElement | null>(null);
  const activeStackRef = stackRef || internalStackContainerRef;

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Positioning & Auto-fit Layout Engine
  const updateStaircasePositions = () => {
    if (!documents.length || !activeStackRef.current) return;

    const total = documents.length;
    const cardGap = 30;
    const stepY = total > 1 ? Math.min(40, 180 / (total - 1)) : 0;
    const cos38 = Math.cos(38 * (Math.PI / 180));

    const paddingLeft = 40;
    const paddingTop = 50;

    // Calculate total layout width across all documents in sequence
    let totalSpanX = 0;
    documents.forEach((doc) => {
      const formatInfo = classifyPdfFormat(doc.widthPt, doc.heightPt);
      totalSpanX += formatInfo.calculatedWidthPx * cos38 + cardGap;
    });

    let accumX = paddingLeft;

    documents.forEach((doc, i) => {
      const cardEl = cardRefs.current.get(doc.id);
      if (!cardEl) return;

      const formatInfo = classifyPdfFormat(doc.widthPt, doc.heightPt);
      const rawWidth = formatInfo.calculatedWidthPx;
      const projectedWidth = rawWidth * cos38;
      const wrapper = cardEl.querySelector('.stacked-card__inner-wrapper');

      const revIndex = total - 1 - i;
      const posX = paddingLeft + (totalSpanX - accumX - projectedWidth);
      const posY = paddingTop + revIndex * stepY;

      const topStackZIndex = i + 1;
      const isFlipped = !!flippedCards[doc.id];
      const targetZIndex = isFlipped ? 1000 : topStackZIndex;

      cardEl.dataset.posX = String(posX);
      cardEl.dataset.posY = String(posY);
      cardEl.dataset.baseZIndex = String(topStackZIndex);

      gsap.to(cardEl, {
        x: posX,
        y: posY,
        zIndex: targetZIndex,
        duration: 0.4,
        ease: 'power3.out',
      });

      if (wrapper && !isFlipped && activeCardId !== doc.id) {
        gsap.to(wrapper, {
          rotationY: -38,
          rotationX: 12,
          scale: 1,
          duration: 0.4,
          ease: 'power3.out',
        });
      }

      accumX += projectedWidth + cardGap;
    });

    // Auto-fit scale to keep all cards within stage view
    if (activeStageRef.current) {
      const availableWidth = activeStageRef.current.clientWidth - 80;
      const availableHeight = activeStageRef.current.clientHeight - 80;

      let maxCardWidth = 0;
      let maxCardHeight = 0;

      documents.forEach((doc) => {
        const info = classifyPdfFormat(doc.widthPt, doc.heightPt);
        if (info.calculatedWidthPx > maxCardWidth) maxCardWidth = info.calculatedWidthPx;
        if (info.calculatedHeightPx > maxCardHeight) maxCardHeight = info.calculatedHeightPx;
      });

      const totalRenderWidth = totalSpanX + maxCardWidth;
      const totalRenderHeight = paddingTop + (total - 1) * stepY + maxCardHeight;

      const scaleX = availableWidth / totalRenderWidth;
      const scaleY = availableHeight / totalRenderHeight;
      const finalScale = Math.min(Math.min(scaleX, scaleY), 1.0);

      gsap.to(activeStackRef.current, {
        scale: Math.max(finalScale, 0.35),
        transformOrigin: 'top left',
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  };

  useEffect(() => {
    updateStaircasePositions();
  }, [documents, flippedCards]);

  useEffect(() => {
    const handleResize = () => updateStaircasePositions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [documents]);

  const handleCardMouseEnter = (docId: string) => {
    if (flippedCards[docId]) return;
    setActiveCardId(docId);

    const cardEl = cardRefs.current.get(docId);
    if (!cardEl) return;

    const wrapper = cardEl.querySelector('.stacked-card__inner-wrapper');
    const curY = parseFloat(cardEl.dataset.posY || '0');

    gsap.to(cardEl, {
      y: curY - 20,
      zIndex: 500,
      duration: 0.3,
      ease: 'power2.out',
    });

    if (wrapper) {
      gsap.to(wrapper, {
        rotationY: -15,
        rotationX: 4,
        scale: 1.04,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  };

  const handleCardMouseLeave = (docId: string) => {
    if (flippedCards[docId]) return;
    setActiveCardId(null);

    const cardEl = cardRefs.current.get(docId);
    if (!cardEl) return;

    const wrapper = cardEl.querySelector('.stacked-card__inner-wrapper');

    gsap.to(cardEl, {
      x: parseFloat(cardEl.dataset.posX || '0'),
      y: parseFloat(cardEl.dataset.posY || '0'),
      zIndex: parseInt(cardEl.dataset.baseZIndex || '1', 10),
      duration: 0.3,
      ease: 'power2.out',
    });

    if (wrapper) {
      gsap.to(wrapper, {
        rotationY: -38,
        rotationX: 12,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  };

  const handleCardClick = (docId: string) => {
    const isFlipped = !!flippedCards[docId];
    const cardEl = cardRefs.current.get(docId);
    if (!cardEl) return;

    const inner = cardEl.querySelector('.stacked-card__inner');
    const wrapper = cardEl.querySelector('.stacked-card__inner-wrapper');

    if (!isFlipped) {
      setFlippedCards((prev) => ({ ...prev, [docId]: true }));
      setActiveCardId(docId);

      gsap.to(cardEl, { zIndex: 1000, duration: 0.3 });
      if (wrapper) gsap.to(wrapper, { rotationY: 0, rotationX: 0, scale: 1.08, duration: 0.3 });
      if (inner) gsap.to(inner, { rotationY: 180, duration: 0.5, ease: 'back.out(1.1)' });
    } else {
      setFlippedCards((prev) => ({ ...prev, [docId]: false }));
      setActiveCardId(null);

      if (inner) gsap.to(inner, { rotationY: 0, duration: 0.5, ease: 'back.out(1.1)' });
      gsap.to(cardEl, {
        x: parseFloat(cardEl.dataset.posX || '0'),
        y: parseFloat(cardEl.dataset.posY || '0'),
        zIndex: parseInt(cardEl.dataset.baseZIndex || '1', 10),
        duration: 0.4,
      });
      if (wrapper) {
        gsap.to(wrapper, {
          rotationY: -38,
          rotationX: 12,
          scale: 1,
          duration: 0.4,
        });
      }
    }
  };

  const handleExportPng = async () => {
    if (!activeStageRef.current) return;
    setIsExporting(true);

    try {
      const dataUrl = await htmlToImage.toPng(activeStageRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#e8e6e7',
      });

      const link = document.createElement('a');
      link.download = 'pdf-staircase-3d.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('3D Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#e8e6e7' }}>
      {/* LEFT SIDEBAR: DOCUMENT INDEX */}
      <aside
        style={{
          width: '320px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid #ccc',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          zIndex: 100,
          boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#666', margin: 0 }}>
            Document Index ({documents.length})
          </h3>
          <button
            onClick={handleExportPng}
            disabled={isExporting || documents.length === 0}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: isExporting ? '#94a3b8' : '#0066ff',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: isExporting || documents.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isExporting ? '⌛ Exporting...' : '📸 Export PNG'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {documents.length === 0 ? (
            <p style={{ color: '#888', fontSize: '13px', fontStyle: 'italic' }}>No documents loaded. Upload PDFs in the 2D Workbench.</p>
          ) : (
            documents.map((doc, idx) => {
              const formatInfo = classifyPdfFormat(doc.widthPt, doc.heightPt);
              const isActive = activeCardId === doc.id;

              return (
                <div
                  key={doc.id}
                  onMouseEnter={() => handleCardMouseEnter(doc.id)}
                  onMouseLeave={() => handleCardMouseLeave(doc.id)}
                  onClick={() => handleCardClick(doc.id)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid',
                    borderColor: isActive ? '#0066ff' : '#e0e0e0',
                    borderRadius: '6px',
                    padding: '12px',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 4px 12px rgba(0, 102, 255, 0.15)' : 'none',
                    transform: isActive ? 'translateX(4px)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      backgroundColor: '#0066ff',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 7px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }} title={doc.name}>
                      {doc.name}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', background: '#eee', padding: '2px 6px', borderRadius: '3px', fontWeight: 600, textTransform: 'uppercase' }}>
                        {formatInfo.label}
                      </span>
                      <span style={{ fontSize: '10px', background: '#e0e0e0', padding: '2px 6px', borderRadius: '3px', fontWeight: 600, textTransform: 'uppercase' }}>
                        {doc.pageCount || 1} Pg
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      Dim: {formatInfo.dims} • {formatInfo.aspectRatioStr}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT STAGE: 3D STAIRCASE VIEWPORT */}
      <main
        ref={activeStageRef}
        style={{
          flex: 1,
          position: 'relative',
          perspective: '1200px',
          padding: '40px',
          overflow: 'auto',
          backgroundColor: '#e8e6e7',
        }}
      >
        {documents.length === 0 && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#777', fontSize: '16px', textAlign: 'center' }}>
            Upload PDF files in the 2D Workbench to view them in the 3D Staircase stack.
          </div>
        )}

        <div ref={activeStackRef} style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left' }}>
          {documents.map((doc, idx) => {
            const formatInfo = classifyPdfFormat(doc.widthPt, doc.heightPt);

            return (
              <div
                key={doc.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(doc.id, el);
                  else cardRefs.current.delete(doc.id);
                }}
                onMouseEnter={() => handleCardMouseEnter(doc.id)}
                onMouseLeave={() => handleCardMouseLeave(doc.id)}
                onClick={(e) => {
                  if ((e.target as HTMLElement).classList.contains('remove-btn')) return;
                  handleCardClick(doc.id);
                }}
                className="stacked-card"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${formatInfo.calculatedWidthPx}px`,
                  height: `${formatInfo.calculatedHeightPx}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  transformStyle: 'preserve-3d',
                  cursor: 'pointer',
                }}
              >
                {/* LARGER CENTERED 2D OVERLAY BADGE WITH EXTREME Z-INDEX */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10000,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'table',
                      height: '28px',
                      backgroundColor: '#0066ff',
                      borderRadius: '6px',
                      padding: '0 14px',
                      boxSizing: 'border-box',
                      boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
                    }}
                  >
                    <span
                      style={{
                        display: 'table-cell',
                        verticalAlign: 'top',
                        paddingTop: '4px',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        lineHeight: 1,
                        letterSpacing: '0.02em',
                      }}
                    >
                      #{idx + 1}
                    </span>
                  </div>
                </div>

                {/* 3D WRAPPER HIERARCHY */}
                <div className="stacked-card__inner-wrapper" style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}>
                  <div className="stacked-card__inner" style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    
                    {/* Front Face with Trim & Crop Logic Applied */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', background: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 2 }}>
                      <TrimmedImageTexture doc={doc} />
                    </div>

                    {/* Back Face */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f9f9f9', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                      {doc.backImageUrl ? (
                        <div style={{ width: '100%', height: 'calc(100% - 48px)', overflow: 'hidden' }}>
                          <img src={doc.backImageUrl} alt={`${doc.name} (Back)`} style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px' }}>
                          Single Sided Document
                        </div>
                      )}
                      
                      <div style={{ padding: '10px', display: 'flex', justifyContent: 'center', backgroundColor: '#ffffff', borderTop: '1px solid #eee' }}>
                        <button
                          className="remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRemoveDocument) onRemoveDocument(doc.id);
                          }}
                          style={{ backgroundColor: '#ff3b30', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}