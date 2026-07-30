// src/components/EnvelopeBottomFlap.tsx
'use client';

import React from 'react';

interface EnvelopeBottomFlapProps {
  opacity?: number;
  fillColor?: string;
  strokeColor?: string;
}

export default function EnvelopeBottomFlap({
  opacity = 0.35,
  fillColor = '#231f20',
  strokeColor = '#0f172a',
}: EnvelopeBottomFlapProps) {
  return (
    <svg
      id="Layer_Envelope_Flap"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 685.92 424.8"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 888, // Sits above stacked inserts, beneath window outline
      }}
    >
      {/* Standard Commercial Deep V Flap Path */}
      <path
        d="M469.953186,178.1503003s-9.203125,2.1228638-14.1101074,11.3442383h-225.7661133c-4.9069824-9.2213745-14.1101074-11.3442383-14.1101074-11.3442383L.960022,126.5400098v297h684V126.5400098l-215.0068359,51.6102905Z"
        fill={fillColor}
        fillOpacity={opacity}
        stroke={strokeColor}
        strokeOpacity={Math.min(1, opacity + 0.3)}
        strokeWidth="1.5"
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}