'use client';

import React from 'react';
import {
  EnvelopeSpec,
  PlacedInsert,
  ViewMode,
  STANDARD_ENVELOPES,
  STANDARD_INSERTS,
} from '@/lib/envelopeSpecs';

interface ControlSidebarProps {
  selectedEnvelope: EnvelopeSpec;
  onSelectEnvelope: (env: EnvelopeSpec) => void;
  inserts: PlacedInsert[];
  onAddInsert: (typeKey: string) => void;
  onRemoveInsert: (id: string) => void;
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  onExportPdf: () => void;
}

export default function ControlSidebar({
  selectedEnvelope,
  onSelectEnvelope,
  inserts,
  onAddInsert,
  onRemoveInsert,
  viewMode,
  onSetViewMode,
  onExportPdf,
}: ControlSidebarProps) {
  return (
    <div className="w-80 bg-slate-800 text-slate-100 p-5 flex flex-col gap-6 rounded-xl border border-slate-700">
      <h2 className="text-lg font-bold tracking-wide text-white border-b border-slate-700 pb-3">
        Proof Controls
      </h2>

      {/* View Mode Toggle */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          View Mode
        </label>
        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg">
          {(['stuffed', 'fan_out', 'x_ray'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onSetViewMode(mode)}
              className={`py-1.5 text-xs font-medium rounded-md capitalize transition ${
                viewMode === mode ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Envelope Selector */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Envelope Type
        </label>
        <select
          value={selectedEnvelope.id}
          onChange={(e) => {
            const found = Object.values(STANDARD_ENVELOPES).find((env) => env.id === e.target.value);
            if (found) onSelectEnvelope(found);
          }}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.values(STANDARD_ENVELOPES).map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
      </div>

      {/* Inserts Manager */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Package Inserts
        </label>
        <div className="flex flex-col gap-2 mb-3">
          {inserts.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 text-xs"
            >
              <span className="truncate pr-2">{idx + 1}. {item.insertSpec.name}</span>
              <button
                onClick={() => onRemoveInsert(item.id)}
                className="text-red-400 hover:text-red-300 font-bold px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <select
          onChange={(e) => {
            if (e.target.value) {
              onAddInsert(e.target.value);
              e.target.value = '';
            }
          }}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">+ Add Insert Item...</option>
          {Object.keys(STANDARD_INSERTS).map((key) => (
            <option key={key} value={key}>
              {STANDARD_INSERTS[key].name}
            </option>
          ))}
        </select>
      </div>

      {/* Export Button */}
      <button
        onClick={onExportPdf}
        className="mt-auto w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg transition shadow-lg flex items-center justify-center gap-2 text-sm"
      >
        Export Proof PDF
      </button>
    </div>
  );
}