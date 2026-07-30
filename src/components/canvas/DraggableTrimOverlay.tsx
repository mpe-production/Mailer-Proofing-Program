// src/components/canvas/DraggableTrimOverlay.tsx
'use client';

import React from 'react';
import { Group, Rect, Line, Text } from 'react-konva';

export interface TrimOverlayInsert {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  cropX: number;
  cropY: number;
}

interface DraggableTrimOverlayProps {
  insert: TrimOverlayInsert;
  dpi?: number;
  scale?: number;
  onCropChange: (newCrop: { cropX: number; cropY: number }) => void;
}

export default function DraggableTrimOverlay({
  insert,
  dpi = 300,
  scale = 1.0,
  onCropChange,
}: DraggableTrimOverlayProps) {
  const pointsPerInch = (dpi / 300) * 72 * scale;

  const fullW = insert.originalWidth * pointsPerInch;
  const fullH = insert.originalHeight * pointsPerInch;

  const trimW = insert.width * pointsPerInch;
  const trimH = insert.height * pointsPerInch;

  const cropPxX = insert.cropX * pointsPerInch;
  const cropPxY = insert.cropY * pointsPerInch;

  return (
    <Group>
      {/* 1. Darken outer Bleed/Slug area */}
      <Rect
        x={0}
        y={0}
        width={fullW}
        height={fullH}
        fill="rgba(0, 0, 0, 0.45)"
      />

      {/* 2. Punch clear viewport window for active trim box */}
      <Rect
        x={cropPxX}
        y={cropPxY}
        width={trimW}
        height={trimH}
        fill="#ffffff"
        globalCompositeOperation="destination-out"
      />

      {/* 3. Draggable Red Trim Frame */}
      <Group
        x={cropPxX}
        y={cropPxY}
        draggable
        dragBoundFunc={(pos) => {
          const maxX = fullW - trimW;
          const maxY = fullH - trimH;
          return {
            x: Math.max(0, Math.min(pos.x, maxX)),
            y: Math.max(0, Math.min(pos.y, maxY)),
          };
        }}
        onDragMove={(e) => {
          const newCropX = e.target.x() / pointsPerInch;
          const newCropY = e.target.y() / pointsPerInch;
          onCropChange({ cropX: newCropX, cropY: newCropY });
        }}
      >
        {/* Active Die-Cut Dashed Border */}
        <Rect
          width={trimW}
          height={trimH}
          stroke="#ff0055"
          strokeWidth={2 / scale}
          dash={[8, 4]}
        />

        {/* Outer Corner Crop Marks */}
        <Line points={[-12, 0, 0, 0]} stroke="#ff0055" strokeWidth={2 / scale} />
        <Line points={[0, -12, 0, 0]} stroke="#ff0055" strokeWidth={2 / scale} />

        <Line points={[trimW, 0, trimW + 12, 0]} stroke="#ff0055" strokeWidth={2 / scale} />
        <Line points={[trimW, -12, trimW, 0]} stroke="#ff0055" strokeWidth={2 / scale} />

        <Line points={[-12, trimH, 0, trimH]} stroke="#ff0055" strokeWidth={2 / scale} />
        <Line points={[0, trimH, 0, trimH + 12]} stroke="#ff0055" strokeWidth={2 / scale} />

        <Line points={[trimW, trimH, trimW + 12, trimH]} stroke="#ff0055" strokeWidth={2 / scale} />
        <Line points={[trimW, trimH, trimW, trimH + 12]} stroke="#ff0055" strokeWidth={2 / scale} />

        {/* Readout Badge */}
        <Rect x={8} y={8} width={190} height={22} fill="#ff0055" cornerRadius={3} />
        <Text
          x={14}
          y={14}
          text={`Crop: +${insert.cropX.toFixed(3)}" X, +${insert.cropY.toFixed(3)}" Y`}
          fill="#ffffff"
          fontSize={10}
          fontStyle="bold"
        />
      </Group>
    </Group>
  );
}