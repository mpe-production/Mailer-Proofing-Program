// src/app/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import EnvelopeBottomFlap from '@/components/EnvelopeBottomFlap';
import type { UploadedInsertData, MailerComponentType } from '@/components/PdfDropzone';

const PdfDropzone = dynamic(() => import('@/components/PdfDropzone'), { ssr: false });

export type LetterPanelType = 
  | 'top' 
  | 'middle' 
  | 'bottom' 
  | 'half_top' 
  | 'half_bottom' 
  | 'front_panel' 
  | 'none';

export type StaggerPresetType = 'custom' | 'diagonal' | 'top_cascade';
export type EnvelopePresetType = 'no10_commercial' | 'no9_commercial' | 'booklet_6x9' | 'booklet_9x12' | 'booklet_10x13' | 'custom';

export interface InsertState {
  id: string;
  name: string;
  previewUrl: string;
  componentType: MailerComponentType;
  fullWidth: number;
  fullHeight: number;
  trimMarginX: number;
  trimMarginY: number;
  hasBleeds: boolean;
  xOffset: number;
  yOffset: number;
  selectedPanel: LetterPanelType;
  rotation: 0 | 90 | 180 | 270;
  isLandscape: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#0f172a',
  backgroundColor: '#ffffff',
  border: '1px solid #94a3b8',
  borderRadius: '4px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#334155',
  display: 'block',
  marginBottom: '4px',
};

function CanvasTrimRenderer({
  insert,
  ppi,
  targetWidth,
  targetHeight,
}: {
  insert: InsertState;
  ppi: number;
  targetWidth: number;
  targetHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const is90or270 = insert.rotation === 90 || insert.rotation === 270;
  const canvasW = Math.round((is90or270 ? targetHeight : targetWidth) * ppi);
  const canvasH = Math.round((is90or270 ? targetWidth : targetHeight) * ppi);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = insert.previewUrl;

    img.onload = () => {
      ctx.clearRect(0, 0, canvasW, canvasH);

      const scaleX = img.naturalWidth / insert.fullWidth;
      const scaleY = img.naturalHeight / insert.fullHeight;

      let srcX = insert.trimMarginX * scaleX;
      let srcY = insert.trimMarginY * scaleY;
      let srcW = (insert.fullWidth - 2 * insert.trimMarginX) * scaleX;
      let srcH = (insert.fullHeight - 2 * insert.trimMarginY) * scaleY;

      if (insert.componentType === 'remit_6_5') {
        const panelHeightInches = 3.3641;
        srcH = panelHeightInches * scaleY;
        srcY = insert.trimMarginY * scaleY;
      } else if (insert.componentType === 'letter' && insert.selectedPanel !== 'none') {
        // Tri-fold calculation (1/3 of sheet)
        const fullCleanHeight = insert.fullHeight - 2 * insert.trimMarginY;
        const panelHeightInches = fullCleanHeight / 3;
        srcH = panelHeightInches * scaleY;

        if (insert.selectedPanel === 'top') {
          srcY = insert.trimMarginY * scaleY;
        } else if (insert.selectedPanel === 'middle') {
          srcY = (insert.trimMarginY + panelHeightInches) * scaleY;
        } else if (insert.selectedPanel === 'bottom') {
          srcY = (insert.trimMarginY + panelHeightInches * 2) * scaleY;
        }
      } else if (insert.componentType === 'letter_bifold' && insert.selectedPanel !== 'none') {
        // Bi-fold calculation (1/2 of sheet = 5.5")
        const fullCleanHeight = insert.fullHeight - 2 * insert.trimMarginY;
        const panelHeightInches = fullCleanHeight / 2;
        srcH = panelHeightInches * scaleY;

        if (insert.selectedPanel === 'half_top') {
          srcY = insert.trimMarginY * scaleY;
        } else if (insert.selectedPanel === 'half_bottom') {
          srcY = (insert.trimMarginY + panelHeightInches) * scaleY;
        }
      }

      ctx.save();
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate((insert.rotation * Math.PI) / 180);

      const drawW = Math.round(targetWidth * ppi);
      const drawH = Math.round(targetHeight * ppi);

      ctx.drawImage(
        img,
        srcX, srcY, srcW, srcH,
        -drawW / 2, -drawH / 2, drawW, drawH
      );

      ctx.restore();
    };
  }, [
    insert.previewUrl,
    insert.rotation,
    insert.trimMarginX,
    insert.trimMarginY,
    insert.fullWidth,
    insert.fullHeight,
    insert.selectedPanel,
    insert.componentType,
    canvasW,
    canvasH,
    targetWidth,
    targetHeight,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

function DynamicInsertView({
  insert,
  ppi,
  isSelected,
  zIndex,
}: {
  insert: InsertState;
  ppi: number;
  isSelected: boolean;
  zIndex: number;
}) {
  const isRemit65 = insert.componentType === 'remit_6_5';
  const isLetter = insert.componentType === 'letter';
  const isBiFold = insert.componentType === 'letter_bifold';

  const cleanWidth = Math.max(0.1, insert.fullWidth - 2 * insert.trimMarginX);
  const cleanHeight = Math.max(0.1, insert.fullHeight - 2 * insert.trimMarginY);

  let displayW = cleanWidth;
  let displayH = cleanHeight;

  if (isRemit65) {
    displayW = 6.25;
    displayH = 3.3641;
  } else if (isLetter && insert.selectedPanel !== 'none') {
    displayH = cleanHeight / 3;
  } else if (isBiFold && insert.selectedPanel !== 'none') {
    displayH = cleanHeight / 2; // 5.5" folded height
  }

  const is90or270 = insert.rotation === 90 || insert.rotation === 270;
  const containerW = is90or270 ? displayH : displayW;
  const containerH = is90or270 ? displayW : displayH;

  const getLabelText = () => {
    switch (insert.componentType) {
      case 'letter':
        return insert.selectedPanel !== 'none'
          ? `TRI-FOLD (${insert.selectedPanel.toUpperCase()})`
          : 'LETTER (FULL)';
      case 'letter_bifold':
        return insert.selectedPanel !== 'none'
          ? `BI-FOLD (${insert.selectedPanel === 'half_top' ? 'TOP HALF' : 'BOTTOM HALF'})`
          : 'BI-FOLD (FULL)';
      case 'remit_6_5':
        return '#6.5 REMIT';
      case 'remit_9':
        return '#9 REMIT';
      case 'postcard':
        return 'POSTCARD';
      case 'insert':
      default:
        return 'INSERT';
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${insert.xOffset * ppi}px`,
        top: `${insert.yOffset * ppi}px`,
        width: `${containerW * ppi}px`,
        height: `${containerH * ppi}px`,
        outline: isSelected ? '2px dashed #2563eb' : '1px solid rgba(0,0,0,0.15)',
        zIndex: zIndex,
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          backgroundColor: isSelected ? '#2563eb' : 'rgba(15, 23, 42, 0.82)',
          color: '#ffffff',
          fontSize: '0.60rem',
          fontWeight: 700,
          letterSpacing: '0.03em',
          padding: '2px 6px',
          borderRadius: '3px',
          zIndex: 10,
          pointerEvents: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          textTransform: 'uppercase',
          backdropFilter: 'blur(2px)',
        }}
      >
        {getLabelText()}
      </div>

      <CanvasTrimRenderer
        insert={insert}
        ppi={ppi}
        targetWidth={displayW}
        targetHeight={displayH}
      />
    </div>
  );
}

export default function DirectMailWorkbench() {
  // Envelope Presets
  const [envelopePreset, setEnvelopePreset] = useState<EnvelopePresetType>('no10_commercial');

  const [envelopeWidth, setEnvelopeWidth] = useState<number>(9.5);
  const [envelopeHeight, setEnvelopeHeight] = useState<number>(4.125);
  const [windowX, setWindowX] = useState<number>(0.875);
  const [windowY, setWindowY] = useState<number>(0.625);
  const [windowW, setWindowW] = useState<number>(4.5);
  const [windowH, setWindowH] = useState<number>(1.125);
  const [showWindow, setShowWindow] = useState<boolean>(true);

  // Envelope Flap Overlay Controls
  const [showBottomFlap, setShowBottomFlap] = useState<boolean>(true);
  const [flapOpacity, setFlapOpacity] = useState<number>(0.35);

  const [selectedUploadType, setSelectedUploadType] = useState<MailerComponentType>('letter');
  const [inserts, setInserts] = useState<InsertState[]>([]);
  const [selectedInsertId, setSelectedInsertId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Stagger / Fan-out State
  const [isStaggerEnabled, setIsStaggerEnabled] = useState<boolean>(false);
  const [staggerPreset, setStaggerPreset] = useState<StaggerPresetType>('diagonal');
  const [staggerStepX, setStaggerStepX] = useState<number>(0.25);
  const [staggerStepY, setStaggerStepY] = useState<number>(0.25);

  const envelopeRef = useRef<HTMLDivElement>(null);
  const activeInsertIndex = inserts.findIndex((i) => i.id === selectedInsertId);
  const activeInsert = inserts[activeInsertIndex];

  // Handle Envelope Preset selection
  const handleEnvelopePresetChange = (preset: EnvelopePresetType) => {
    setEnvelopePreset(preset);
    switch (preset) {
      case 'no10_commercial':
        setEnvelopeWidth(9.5);
        setEnvelopeHeight(4.125);
        setWindowX(0.875);
        setWindowY(0.625);
        setWindowW(4.5);
        setWindowH(1.125);
        break;
      case 'no9_commercial':
        setEnvelopeWidth(8.875);
        setEnvelopeHeight(3.875);
        setWindowX(0.875);
        setWindowY(0.5);
        setWindowW(4.5);
        setWindowH(1.125);
        break;
      case 'booklet_6x9':
        setEnvelopeWidth(9.0);
        setEnvelopeHeight(6.0);
        setWindowX(1.0);
        setWindowY(1.0);
        setWindowW(4.5);
        setWindowH(1.125);
        break;
      case 'booklet_9x12':
        setEnvelopeWidth(12.0);
        setEnvelopeHeight(9.0);
        setWindowX(1.0);
        setWindowY(1.5);
        setWindowW(4.5);
        setWindowH(1.125);
        break;
      case 'booklet_10x13':
        setEnvelopeWidth(13.0);
        setEnvelopeHeight(10.0);
        setWindowX(1.0);
        setWindowY(1.5);
        setWindowW(4.5);
        setWindowH(1.125);
        break;
      case 'custom':
      default:
        break;
    }
  };

  const handlePresetChange = (preset: StaggerPresetType) => {
    setStaggerPreset(preset);
    if (preset === 'diagonal') {
      setStaggerStepX(0.25);
      setStaggerStepY(0.25);
    } else if (preset === 'top_cascade') {
      setStaggerStepX(0.0);
      setStaggerStepY(0.375);
    }
  };

  useEffect(() => {
    if (!isStaggerEnabled) return;

    setInserts((prev) =>
      prev.map((insert, index) => ({
        ...insert,
        xOffset: 0.25 + index * staggerStepX,
        yOffset: 0.25 + index * staggerStepY,
      }))
    );
  }, [isStaggerEnabled, staggerStepX, staggerStepY, inserts.length]);

  const handleInsertUploaded = (data: UploadedInsertData) => {
    const isRemit = selectedUploadType === 'remit_6_5' || selectedUploadType === 'remit_9';
    const isLetterType = selectedUploadType === 'letter';
    const isBiFold = selectedUploadType === 'letter_bifold';

    const newInsert: InsertState = {
      id: `insert-${Date.now()}`,
      name: data.name,
      previewUrl: data.previewUrl,
      componentType: selectedUploadType,
      fullWidth: data.width || (isLetterType || isBiFold ? 8.5 : 6.25),
      fullHeight: data.height || (isLetterType || isBiFold ? 11.0 : 7.0),
      trimMarginX: data.trimMarginX || 0,
      trimMarginY: data.trimMarginY || 0,
      hasBleeds: data.hasBleeds,
      xOffset: isStaggerEnabled ? 0.25 + inserts.length * staggerStepX : 0.25,
      yOffset: isStaggerEnabled ? 0.25 + inserts.length * staggerStepY : 0.25,
      selectedPanel: isLetterType ? 'top' : isBiFold ? 'half_top' : isRemit ? 'front_panel' : 'none',
      rotation: 0,
      isLandscape: data.isLandscape,
    };

    setInserts((prev) => [...prev, newInsert]);
    setSelectedInsertId(newInsert.id);
  };

  const updateActiveInsert = (updates: Partial<InsertState>) => {
    if (!selectedInsertId) return;
    setInserts((prev) =>
      prev.map((item) => (item.id === selectedInsertId ? { ...item, ...updates } : item))
    );
  };

  const removeActiveInsert = () => {
    if (!selectedInsertId) return;
    setInserts((prev) => prev.filter((item) => item.id !== selectedInsertId));
    setSelectedInsertId(null);
  };

  const moveInsertLayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= inserts.length) return;

    setInserts((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;

      if (isStaggerEnabled) {
        return next.map((item, idx) => ({
          ...item,
          xOffset: 0.25 + idx * staggerStepX,
          yOffset: 0.25 + idx * staggerStepY,
        }));
      }

      return next;
    });
  };

  const handleExportPdf = async () => {
    if (!envelopeRef.current) return;
    setIsExporting(true);

    const currentSelection = selectedInsertId;
    setSelectedInsertId(null);

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const element = envelopeRef.current;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const orientation = envelopeWidth >= envelopeHeight ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'in',
        format: [envelopeWidth, envelopeHeight],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, envelopeWidth, envelopeHeight);
      pdf.save(`envelope-proof-${envelopeWidth}x${envelopeHeight}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF download:', err);
    } finally {
      setSelectedInsertId(currentSelection);
      setIsExporting(false);
    }
  };

  const ppi = 96;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      {/* SIDEBAR */}
      <aside style={{ width: '380px', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>📬 Mailer Proofing</h1>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Position, crop, and proof inserts.</p>
          </div>
          
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            style={{
              backgroundColor: isExporting ? '#94a3b8' : '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              whiteSpace: 'nowrap'
            }}
          >
            {isExporting ? 'Generating...' : '📄 Export PDF'}
          </button>
        </div>

        {/* UPLOADER */}
        <section style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>Upload Component</h2>
          <label style={labelStyle}>Component Type Preset:</label>
          <select
            value={selectedUploadType}
            onChange={(e) => setSelectedUploadType(e.target.value as MailerComponentType)}
            style={{ ...inputStyle, marginBottom: '12px' }}
          >
            <option value="letter">Letter (8.5" × 11" Tri-Fold)</option>
            <option value="letter_bifold">Letter (8.5" × 11" Bi-Fold / Half-Fold)</option>
            <option value="remit_6_5">#6.5 Remit (6.25" × 7.0" Flat → 3.3641" Panel)</option>
            <option value="remit_9">#9 Remit Envelope (8.875" × 3.875")</option>
            <option value="insert">Insert / Flier</option>
            <option value="postcard">Postcard</option>
          </select>

          <PdfDropzone onInsertUploaded={handleInsertUploaded} defaultComponentType={selectedUploadType} />
        </section>

        {/* ENVELOPE CONTROLS */}
        <section style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a' }}>Outer Envelope Settings</h2>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Envelope Size Preset:</label>
            <select
              value={envelopePreset}
              onChange={(e) => handleEnvelopePresetChange(e.target.value as EnvelopePresetType)}
              style={inputStyle}
            >
              <option value="no10_commercial">#10 Commercial (9.5" × 4.125")</option>
              <option value="no9_commercial">#9 Commercial (8.875" × 3.875")</option>
              <option value="booklet_6x9">6" × 9" Booklet Envelope</option>
              <option value="booklet_9x12">9" × 12" Booklet Envelope</option>
              <option value="booklet_10x13">10" × 13" Booklet Envelope</option>
              <option value="custom">Custom Dimensions</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Width (in)</label>
              <input
                type="number"
                step="0.125"
                value={envelopeWidth}
                onChange={(e) => {
                  setEnvelopePreset('custom');
                  setEnvelopeWidth(parseFloat(e.target.value) || 0);
                }}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Height (in)</label>
              <input
                type="number"
                step="0.125"
                value={envelopeHeight}
                onChange={(e) => {
                  setEnvelopePreset('custom');
                  setEnvelopeHeight(parseFloat(e.target.value) || 0);
                }}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                ✉️ Bottom Flap Overlay
              </h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={showBottomFlap}
                  onChange={(e) => setShowBottomFlap(e.target.checked)}
                  style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#2563eb' }}
                />
                Show Overlay
              </label>
            </div>

            {showBottomFlap && (
              <div>
                <label style={labelStyle}>Flap Opacity ({Math.round(flapOpacity * 100)}%)</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={flapOpacity}
                  onChange={(e) => setFlapOpacity(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 8px 0', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Window Specs</h3>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showWindow}
                onChange={(e) => setShowWindow(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
              Show Window
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', opacity: showWindow ? 1 : 0.5, transition: 'opacity 0.2s' }}>
            <div>
              <label style={labelStyle}>Left Offset (X)</label>
              <input type="number" step="0.0625" disabled={!showWindow} value={windowX} onChange={(e) => setWindowX(parseFloat(e.target.value) || 0)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Bottom/Top (Y)</label>
              <input type="number" step="0.0625" disabled={!showWindow} value={windowY} onChange={(e) => setWindowY(parseFloat(e.target.value) || 0)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Window Width</label>
              <input type="number" step="0.0625" disabled={!showWindow} value={windowW} onChange={(e) => setWindowW(parseFloat(e.target.value) || 0)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Window Height</label>
              <input type="number" step="0.0625" disabled={!showWindow} value={windowH} onChange={(e) => setWindowH(parseFloat(e.target.value) || 0)} style={inputStyle} />
            </div>
          </div>
        </section>

        {/* AUTO-STAGGER CONTROLLER PANEL */}
        <section style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #86efac' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: '#166534' }}>
              🎴 Fan-Out / Stagger Mode
            </h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#15803d', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isStaggerEnabled}
                onChange={(e) => setIsStaggerEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
              />
              Enable
            </label>
          </div>

          <p style={{ margin: '0 0 12px 0', fontSize: '0.72rem', color: '#166534' }}>
            Offsets stacked inserts so clients can view top edges or side flaps.
          </p>

          {isStaggerEnabled && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ ...labelStyle, color: '#166534' }}>Preset Style:</label>
                <select
                  value={staggerPreset}
                  onChange={(e) => handlePresetChange(e.target.value as StaggerPresetType)}
                  style={{ ...inputStyle, borderColor: '#86efac' }}
                >
                  <option value="diagonal">Diagonal Fan (0.25" X / 0.25" Y)</option>
                  <option value="top_cascade">Top Cascade (0.0" X / 0.375" Y)</option>
                  <option value="custom">Custom Steps</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ ...labelStyle, color: '#166534' }}>X Step (in)</label>
                  <input
                    type="number"
                    step="0.0625"
                    value={staggerStepX}
                    onChange={(e) => {
                      setStaggerPreset('custom');
                      setStaggerStepX(parseFloat(e.target.value) || 0);
                    }}
                    style={{ ...inputStyle, borderColor: '#86efac' }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: '#166534' }}>Y Step (in)</label>
                  <input
                    type="number"
                    step="0.0625"
                    value={staggerStepY}
                    onChange={(e) => {
                      setStaggerPreset('custom');
                      setStaggerStepY(parseFloat(e.target.value) || 0);
                    }}
                    style={{ ...inputStyle, borderColor: '#86efac' }}
                  />
                </div>
              </div>
            </>
          )}
        </section>

        {/* ACTIVE INSERT EDIT PANEL */}
        {activeInsert ? (
          <section style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #93c5fd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: '#1e3a8a' }}>Active Insert Properties</h2>
              <button onClick={removeActiveInsert} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                Remove
              </button>
            </div>

            <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#dbeafe', borderRadius: '6px' }}>
              <label style={{ ...labelStyle, color: '#1e40af' }}>
                Stacking Layer Order: {activeInsertIndex + 1} of {inserts.length} {activeInsertIndex === inserts.length - 1 ? '(Top)' : activeInsertIndex === 0 ? '(Bottom)' : ''}
              </label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => moveInsertLayer(activeInsertIndex, 'up')}
                  disabled={activeInsertIndex === inserts.length - 1}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: activeInsertIndex === inserts.length - 1 ? '#cbd5e1' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: activeInsertIndex === inserts.length - 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Bring Forward ⬆️
                </button>
                <button
                  type="button"
                  onClick={() => moveInsertLayer(activeInsertIndex, 'down')}
                  disabled={activeInsertIndex === 0}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: activeInsertIndex === 0 ? '#cbd5e1' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: activeInsertIndex === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Send Backward ⬇️
                </button>
              </div>
            </div>

            {/* PANEL SELECTOR: TRI-FOLD */}
            {activeInsert.componentType === 'letter' && (
              <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#dbeafe', borderRadius: '6px' }}>
                <label style={{ ...labelStyle, color: '#1e40af' }}>Facing Panel (Client Facing Fold):</label>
                <select
                  value={activeInsert.selectedPanel}
                  onChange={(e) => updateActiveInsert({ selectedPanel: e.target.value as LetterPanelType })}
                  style={{ ...inputStyle, borderColor: '#3b82f6' }}
                >
                  <option value="top">Top Panel (1/3)</option>
                  <option value="middle">Middle Panel (1/3)</option>
                  <option value="bottom">Bottom Panel (1/3)</option>
                  <option value="none">Full Flat View (Unfolded)</option>
                </select>
              </div>
            )}

            {/* PANEL SELECTOR: BI-FOLD */}
            {activeInsert.componentType === 'letter_bifold' && (
              <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#dbeafe', borderRadius: '6px' }}>
                <label style={{ ...labelStyle, color: '#1e40af' }}>Facing Fold Panel:</label>
                <select
                  value={activeInsert.selectedPanel}
                  onChange={(e) => updateActiveInsert({ selectedPanel: e.target.value as LetterPanelType })}
                  style={{ ...inputStyle, borderColor: '#3b82f6' }}
                >
                  <option value="half_top">Top Half Panel (8.5" × 5.5")</option>
                  <option value="half_bottom">Bottom Half Panel (8.5" × 5.5")</option>
                  <option value="none">Full Flat View (Unfolded 8.5" × 11")</option>
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Position X (in)</label>
                <input
                  type="number"
                  step="0.0625"
                  disabled={isStaggerEnabled}
                  value={activeInsert.xOffset}
                  onChange={(e) => updateActiveInsert({ xOffset: parseFloat(e.target.value) || 0 })}
                  style={{ ...inputStyle, backgroundColor: isStaggerEnabled ? '#f1f5f9' : '#ffffff' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Position Y (in)</label>
                <input
                  type="number"
                  step="0.0625"
                  disabled={isStaggerEnabled}
                  value={activeInsert.yOffset}
                  onChange={(e) => updateActiveInsert({ yOffset: parseFloat(e.target.value) || 0 })}
                  style={{ ...inputStyle, backgroundColor: isStaggerEnabled ? '#f1f5f9' : '#ffffff' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Rotation</label>
              <select
                value={activeInsert.rotation}
                onChange={(e) => updateActiveInsert({ rotation: parseInt(e.target.value) as any })}
                style={inputStyle}
              >
                <option value={0}>0°</option>
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </div>
          </section>
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '0.75rem', color: '#64748b' }}>
            Select an insert below to edit positions.
          </div>
        )}

        {/* INSERTS LIST */}
        <section>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
            Loaded Components ({inserts.length})
          </h2>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.68rem', color: '#64748b' }}>
            Items at the bottom of this list render on top (closest to the envelope window).
          </p>
          {[...inserts].reverse().map((insert, reverseIdx) => {
            const originalIndex = inserts.length - 1 - reverseIdx;
            return (
              <div
                key={insert.id}
                onClick={() => setSelectedInsertId(insert.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: insert.id === selectedInsertId ? '#2563eb' : '#cbd5e1',
                  backgroundColor: insert.id === selectedInsertId ? '#eff6ff' : '#ffffff',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#0f172a' }}>{insert.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '2px' }}>
                    Type: {insert.componentType}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveInsertLayer(originalIndex, 'up');
                    }}
                    disabled={originalIndex === inserts.length - 1}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      backgroundColor: originalIndex === inserts.length - 1 ? '#e2e8f0' : '#dbeafe',
                      color: originalIndex === inserts.length - 1 ? '#94a3b8' : '#1e40af',
                      border: '1px solid',
                      borderColor: originalIndex === inserts.length - 1 ? '#cbd5e1' : '#93c5fd',
                      borderRadius: '4px',
                      cursor: originalIndex === inserts.length - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveInsertLayer(originalIndex, 'down');
                    }}
                    disabled={originalIndex === 0}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      backgroundColor: originalIndex === 0 ? '#e2e8f0' : '#dbeafe',
                      color: originalIndex === 0 ? '#94a3b8' : '#1e40af',
                      border: '1px solid',
                      borderColor: originalIndex === 0 ? '#cbd5e1' : '#93c5fd',
                      borderRadius: '4px',
                      cursor: originalIndex === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ▼
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </aside>

      {/* CANVAS MAIN VIEW */}
      <main style={{ flex: 1, padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
        <div
          ref={envelopeRef}
          style={{
            width: `${envelopeWidth * ppi}px`,
            height: `${envelopeHeight * ppi}px`,
            backgroundColor: '#ffffff',
            border: '2px solid #334155',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* WINDOW OVERLAY */}
          {showWindow && (
            <div
              style={{
                position: 'absolute',
                left: `${windowX * ppi}px`,
                top: `${windowY * ppi}px`,
                width: `${windowW * ppi}px`,
                height: `${windowH * ppi}px`,
                border: '1px dashed #ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                zIndex: 999,
                pointerEvents: 'none',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontSize: '0.62rem', color: '#dc2626', fontWeight: 700, padding: '2px 4px', display: 'block' }}>Window Area</span>
            </div>
          )}

          {/* STACKED INSERTS */}
          {inserts.map((insert, idx) => (
            <DynamicInsertView
              key={insert.id}
              insert={insert}
              ppi={ppi}
              isSelected={insert.id === selectedInsertId}
              zIndex={idx + 1}
            />
          ))}

          {/* DIE-CUT SVG OVERLAY */}
          {showBottomFlap && (
            <EnvelopeBottomFlap
              opacity={flapOpacity}
              fillColor="#231f20"
              strokeColor="#0f172a"
            />
          )}
        </div>
      </main>
    </div>
  );
}
