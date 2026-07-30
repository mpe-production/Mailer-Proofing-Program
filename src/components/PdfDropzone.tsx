// src/components/PdfDropzone.tsx
'use client';

import React, { useRef, useState } from 'react';

export type MailerComponentType = 
  | 'letter' 
  | 'letter_bifold' 
  | 'postcard' 
  | 'insert' 
  | 'envelope' 
  | 'remit_6_5' 
  | 'remit_9';

export interface UploadedInsertData {
  name: string;
  previewUrl: string;
  componentType: MailerComponentType;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  hasBleeds: boolean;
  trimMarginX: number;
  trimMarginY: number;
  isLandscape: boolean;
}

interface PdfDropzoneProps {
  onInsertUploaded: (data: UploadedInsertData) => void;
  defaultComponentType?: MailerComponentType;
}

export default function PdfDropzone({ onInsertUploaded, defaultComponentType }: PdfDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);

    try {
      let previewUrl = '';
      let width = 8.5;
      let height = 11;
      let hasBleeds = false;
      let trimMarginX = 0;
      let trimMarginY = 0;
      let isLandscape = false;

      const compType = defaultComponentType || 'letter';

      // Define standard target dimensions in inches
      let expectedW = 8.5;
      let expectedH = 11.0;

      if (compType === 'remit_6_5') {
        expectedW = 6.25;
        expectedH = 7.0;
      } else if (compType === 'remit_9') {
        expectedW = 8.875;
        expectedH = 3.875;
      } else if (compType === 'postcard') {
        expectedW = 6.0;
        expectedH = 4.0;
      } else if (compType === 'letter' || compType === 'letter_bifold') {
        expectedW = 8.5;
        expectedH = 11.0;
      }

      if (file.type === 'application/pdf') {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const page = await pdf.getPage(1);

        // Standard PDF points (1 in = 72 pt)
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        width = unscaledViewport.width / 72;
        height = unscaledViewport.height / 72;
        isLandscape = width > height;

        // Check if dimensions exceed expected size by >= 0.125" (bleed / trim mark detection)
        const diffX = width - expectedW;
        const diffY = height - expectedH;

        if (diffX > 0.1 || diffY > 0.1) {
          hasBleeds = true;
          // Calculate automatic margins to crop down to expected trim box
          trimMarginX = diffX > 0 ? diffX / 2 : 0;
          trimMarginY = diffY > 0 ? diffY / 2 : 0;
        }

        // Render crisp high-res preview (scale 2.0)
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          previewUrl = canvas.toDataURL('image/png');
        } else {
          throw new Error('Canvas rendering failed');
        }
      } else {
        // Image files (PNG / JPG)
        previewUrl = URL.createObjectURL(file);
        width = expectedW;
        height = expectedH;
      }

      onInsertUploaded({
        name: file.name,
        previewUrl,
        componentType: compType,
        width,
        height,
        originalWidth: width * 72,
        originalHeight: height * 72,
        hasBleeds,
        trimMarginX,
        trimMarginY,
        isLandscape,
      });
    } catch (err: any) {
      console.error('File load error:', err);
      alert('Error reading file or calculating trim margins.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      style={{
        border: '2px dashed #94a3b8',
        borderRadius: '8px',
        padding: '18px 12px',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        cursor: isProcessing ? 'wait' : 'pointer',
        transition: 'border-color 0.2s',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
        }}
        style={{ display: 'none' }}
      />
      <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>
        {isProcessing ? '⚙️' : '📄'}
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
        {isProcessing ? 'Analyzing PDF Bleeds...' : 'Click to Add Artwork Here'}
      </p>
    </div>
  );
}