// src/components/canvas/WorkbenchCanvas.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Stage, Layer, Rect, Group, Text, Image as KonvaImage } from 'react-konva';
import DraggableTrimOverlay from './DraggableTrimOverlay';

export interface EnvelopeState {
  dimensions: {
    width: number;  // inches
    height: number; // inches
  };
  window: {
    x: number;      // inches
    y: number;      // inches
    width: number;  // inches
    height: number; // inches
  };
}

export interface InsertState {
  id: string;
  name: string;
  previewUrl: string;
  width: number;           // Target trim width (inches)
  height: number;          // Target trim height (inches)
  originalWidth: number;   // Source PDF width incl. bleeds (inches)
  originalHeight: number;  // Source PDF height incl. bleeds (inches)
  hasBleeds: boolean;
  xOffset: number;         // Placement X inside envelope (inches)
  yOffset: number;         // Placement Y inside envelope (inches)
  cropX: number;           // Crop offset X (inches)
  cropY: number;           // Crop offset Y (inches)
  isCalibratingCrop: boolean;
  isStandardLetter?: boolean;
  selectedPanel?: 'none' | 'top' | 'middle' | 'bottom';
}

interface WorkbenchCanvasProps {
  envelope: EnvelopeState;
  inserts: InsertState[];
  viewMode?: 'composite' | 'fan_out';
  onUpdateInsert: (id: string, updates: Partial<InsertState>) => void;
}

// Safely loads image previews into Konva Canvas
function CanvasImageOverlay({ url, width, height }: { url: string; width: number; height: number }) {
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) return;
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => setImageObj(img);
  }, [url]);

  if (!imageObj) return null;

  return (
    <KonvaImage
      image={imageObj}
      width={width}
      height={height}
    />
  );
}

export default function WorkbenchCanvas({
  envelope,
  inserts,
  viewMode = 'composite',
  onUpdateInsert,
}: WorkbenchCanvasProps) {
  const dpi = 300;
  // Convert 1 inch into 72 screen pixels for display
  const scale = 72; 

  const envWidthPx = envelope.dimensions.width * scale;
  const envHeightPx = envelope.dimensions.height * scale;

  const winXPx = envelope.window.x * scale;
  const winYPx = envelope.window.y * scale;
  const winWPx = envelope.window.width * scale;
  const winHPx = envelope.window.height * scale;

  return (
    <div
      style={{
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        border: '1px solid #d1d5db',
      }}
    >
      <Stage width={envWidthPx + 40} height={envHeightPx + 40}>
        <Layer x={20} y={20}>
          {/* 1. Envelope Stock Background */}
          <Rect
            width={envWidthPx}
            height={envHeightPx}
            fill="#ffffff"
            stroke="#9ca3af"
            strokeWidth={1.5}
            cornerRadius={4}
            shadowColor="black"
            shadowBlur={10}
            shadowOpacity={0.08}
            shadowOffsetX={0}
            shadowOffsetY={4}
          />

          {/* 2. Inserts Layer */}
          {inserts.map((insert, idx) => {
            const insWPx = insert.width * scale;
            const insHPx = insert.height * scale;

            const fullWPx = (insert.originalWidth || insert.width) * scale;
            const fullHPx = (insert.originalHeight || insert.height) * scale;

            let posX = insert.xOffset * scale;
            let posY = insert.yOffset * scale;

            if (viewMode === 'fan_out') {
              posX += idx * 16;
              posY += idx * 16;
            }

            const panelLabel = insert.isStandardLetter && insert.selectedPanel !== 'none'
              ? ` (${insert.selectedPanel?.toUpperCase()} PANEL)`
              : '';

            return (
              <Group
                key={insert.id}
                x={posX}
                y={posY}
                draggable={!insert.isCalibratingCrop}
                onDragEnd={(e) => {
                  const newXInches = e.target.x() / scale;
                  const newYInches = e.target.y() / scale;
                  onUpdateInsert(insert.id, {
                    xOffset: Math.max(0, newXInches),
                    yOffset: Math.max(0, newYInches),
                  });
                }}
              >
                {/* Insert Background Container */}
                <Rect
                  width={insWPx}
                  height={insHPx}
                  fill="#fff7ed"
                  stroke="#f97316"
                  strokeWidth={1}
                />

                {/* Render Artwork Preview Image */}
                {insert.previewUrl && (
                  <Group
                    clipFunc={(ctx) => {
                      ctx.rect(0, 0, insWPx, insHPx);
                    }}
                  >
                    <Group x={-insert.cropX * scale} y={-insert.cropY * scale}>
                      <CanvasImageOverlay
                        url={insert.previewUrl}
                        width={fullWPx}
                        height={fullHPx}
                      />
                    </Group>
                  </Group>
                )}

                {/* Draggable Red Trim Guidelines */}
                {insert.isCalibratingCrop && (
                  <Group x={-insert.cropX * scale} y={-insert.cropY * scale}>
                    <DraggableTrimOverlay
                      insert={insert}
                      dpi={dpi}
                      scale={scale / 72}
                      onCropChange={({ cropX, cropY }) => {
                        onUpdateInsert(insert.id, { cropX, cropY });
                      }}
                    />
                  </Group>
                )}

                {/* Component Label Badge */}
                {!insert.isCalibratingCrop && (
                  <Group x={4} y={4}>
                    <Rect
                      width={180}
                      height={18}
                      fill="rgba(249, 115, 22, 0.9)"
                      cornerRadius={3}
                    />
                    <Text
                      x={6}
                      y={8}
                      text={`#${idx + 1}: ${insert.name}${panelLabel}`}
                      fill="#ffffff"
                      fontSize={9}
                      fontStyle="bold"
                    />
                  </Group>
                )}
              </Group>
            );
          })}

          {/* 3. USPS Window Clear Zone Frame */}
          <Group x={winXPx} y={winYPx}>
            <Rect
              width={winWPx}
              height={winHPx}
              fill="rgba(219, 234, 254, 0.35)"
              stroke="#2563eb"
              strokeWidth={1.5}
              dash={[4, 2]}
            />
            <Rect x={4} y={4} width={115} height={16} fill="#2563eb" cornerRadius={3} />
            <Text
              x={8}
              y={8}
              text="USPS Window Clear Zone"
              fill="#ffffff"
              fontSize={9}
              fontStyle="bold"
            />
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}