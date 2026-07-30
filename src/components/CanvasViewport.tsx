'use client';

import React from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import { EnvelopeSpec, PlacedInsert, ViewMode, inchesToPixels } from '@/lib/envelopeSpecs';

interface CanvasViewportProps {
  envelope: EnvelopeSpec;
  inserts: PlacedInsert[];
  viewMode: ViewMode;
  onDragInsert: (id: string, xInches: number, yInches: number) => void;
}

export default function CanvasViewport({ envelope, inserts, viewMode, onDragInsert }: CanvasViewportProps) {
  const dpi = 96; // Screen Preview DPI
  const envW = inchesToPixels(envelope.dimensions.width, dpi);
  const envH = inchesToPixels(envelope.dimensions.height, dpi);

  const stageW = envW + 160;
  const stageH = envH + 160;
  const originX = 80;
  const originY = 80;

  const sortedInserts = [...inserts].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="flex justify-center items-center bg-slate-900 p-6 rounded-xl shadow-inner border border-slate-800 overflow-auto">
      <Stage width={stageW} height={stageH}>
        <Layer>
          {/* Envelope Base (When Fan Out view is active) */}
          {viewMode === 'fan_out' && (
            <Group x={originX} y={originY}>
              <Rect width={envW} height={envH} fill="#ffffff" stroke="#94a3b8" strokeWidth={2} cornerRadius={4} />
              <Text text={envelope.name} x={15} y={15} fontSize={14} fill="#64748b" />
            </Group>
          )}

          {/* Inserts Layer */}
          {sortedInserts.map((item, idx) => {
            const insW = inchesToPixels(item.insertSpec.foldedDimensions.width, dpi);
            const insH = inchesToPixels(item.insertSpec.foldedDimensions.height, dpi);

            let posX = originX + inchesToPixels(item.offsetInches.x, dpi);
            let posY = originY + inchesToPixels(item.offsetInches.y, dpi);

            if (viewMode === 'fan_out') {
              posX += 30 * (idx + 1);
              posY -= 20 * (idx + 1);
            }

            return (
              <Group
                key={item.id}
                x={posX}
                y={posY}
                draggable
                onDragEnd={(e) => {
                  const newX = (e.target.x() - originX) / dpi;
                  const newY = (e.target.y() - originY) / dpi;
                  onDragInsert(item.id, Number(newX.toFixed(2)), Number(newY.toFixed(2)));
                }}
              >
                <Rect
                  width={insW}
                  height={insH}
                  fill={item.insertSpec.color}
                  stroke="#475569"
                  strokeWidth={1.5}
                  cornerRadius={2}
                  shadowBlur={4}
                  shadowOpacity={0.2}
                />
                <Text text={item.insertSpec.name} x={10} y={10} fontSize={12} fontStyle="bold" fill="#0f172a" />

                {/* Render Address Block area if present */}
                {item.insertSpec.hasAddressBlock && item.insertSpec.addressBlockPosition && item.insertSpec.addressBlockDimensions && (
                  <Group
                    x={inchesToPixels(item.insertSpec.addressBlockPosition.x, dpi)}
                    y={inchesToPixels(item.insertSpec.addressBlockPosition.y, dpi)}
                  >
                    <Rect
                      width={inchesToPixels(item.insertSpec.addressBlockDimensions.width, dpi)}
                      height={inchesToPixels(item.insertSpec.addressBlockDimensions.height, dpi)}
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth={1}
                      dash={[4, 4]}
                    />
                    <Text text="ADDRESS BLOCK" x={5} y={5} fontSize={9} fill="#2563eb" />
                  </Group>
                )}
              </Group>
            );
          })}

          {/* Envelope Front Overlay (Stuffed or X-Ray) */}
          {(viewMode === 'stuffed' || viewMode === 'x_ray') && (
            <Group x={originX} y={originY}>
              <Rect
                width={envW}
                height={envH}
                fill={viewMode === 'x_ray' ? 'rgba(255, 255, 255, 0.45)' : '#ffffff'}
                stroke="#64748b"
                strokeWidth={2}
                cornerRadius={4}
              />
              {/* Windows Cutouts */}
              {envelope.windows?.map((w) => {
                const wW = inchesToPixels(w.dimensions.width, dpi);
                const wH = inchesToPixels(w.dimensions.height, dpi);
                const wX = inchesToPixels(w.position.x, dpi);
                const wY =
                  w.positionFrom === 'bottom-left'
                    ? envH - inchesToPixels(w.position.y, dpi) - wH
                    : inchesToPixels(w.position.y, dpi);

                return (
                  <Group key={w.id} x={wX} y={wY}>
                    <Rect
                      width={wW}
                      height={wH}
                      fill={viewMode === 'x_ray' ? 'rgba(239, 246, 255, 0.3)' : '#f8fafc'}
                      stroke="#0284c7"
                      strokeWidth={1.5}
                      dash={[3, 3]}
                    />
                    <Text text={w.label} x={5} y={5} fontSize={10} fill="#0284c7" />
                  </Group>
                );
              })}
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  );
}