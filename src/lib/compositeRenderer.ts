// src/lib/compositeRenderer.ts
import PDFDocument from 'pdfkit';

export function inchesToPixels(inches: number, dpi: number = 300): number {
  return (inches || 0) * dpi;
}

export interface EnvelopeSpec {
  width?: number;
  height?: number;
  dimensions?: { width: number; height: number };
  window?: { x: number; y: number; width: number; height: number };
}

export interface InsertSpec {
  id: string;
  name: string;
  width?: number;
  height?: number;
  dimensions?: { width: number; height: number };
  xOffset?: number;
  yOffset?: number;
  hasBleeds?: boolean;
  imageBuffer?: Buffer;
}

export interface RenderOptions {
  envelope?: EnvelopeSpec;
  inserts?: InsertSpec[];
  viewMode?: 'composite' | 'fan_out' | 'clearance';
  jobName?: string;
}

export async function generateProofPdfBuffer(data: RenderOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { envelope, inserts = [], viewMode = 'composite', jobName = 'proof' } = data;
      const pointsPerInch = 72;

      // 1. Envelope Specs (#10 standard fallback: 9.5" x 4.125")
      const envWidth = envelope?.dimensions?.width ?? envelope?.width ?? 9.5;
      const envHeight = envelope?.dimensions?.height ?? envelope?.height ?? 4.125;

      const pdfWidth = envWidth * pointsPerInch;
      const pdfHeight = envHeight * pointsPerInch;

      const doc = new PDFDocument({
        size: [pdfWidth, pdfHeight],
        margin: 0,
        info: {
          Title: `Direct Mail Proof - ${jobName}`,
          Author: 'Proofing Engine',
        },
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // 2. Render Envelope Border & Background
      doc
        .rect(0, 0, pdfWidth, pdfHeight)
        .lineWidth(1)
        .strokeColor('#cccccc')
        .fillAndStroke('#ffffff', '#333333');

      // 3. Render USPS Clear Window Frame
      if (envelope?.window) {
        const winX = envelope.window.x * pointsPerInch;
        const winY = envelope.window.y * pointsPerInch;
        const winW = envelope.window.width * pointsPerInch;
        const winH = envelope.window.height * pointsPerInch;

        doc
          .rect(winX, winY, winW, winH)
          .lineWidth(1.5)
          .strokeColor('#0066cc')
          .fillColor('#e6f2ff', 0.4)
          .fillAndStroke();

        doc
          .fillColor('#0066cc')
          .fontSize(8)
          .text('USPS Window Clear Zone', winX + 4, winY + 4);
      }

      // 4. Render Inserts
      inserts.forEach((insert, idx) => {
        const insW = (insert.dimensions?.width ?? insert.width ?? 8.5) * pointsPerInch;
        const insH = (insert.dimensions?.height ?? insert.height ?? 3.5) * pointsPerInch;

        let insX = (insert.xOffset ?? 0.25) * pointsPerInch;
        let insY = (insert.yOffset ?? 0.25) * pointsPerInch;

        if (viewMode === 'fan_out') {
          insX += idx * 18;
          insY += idx * 18;
        }

        // Draw Insert Frame
        doc
          .rect(insX, insY, insW, insH)
          .lineWidth(1)
          .strokeColor('#ff6600')
          .fillColor('#ffffff')
          .fillAndStroke();

        // Draw Cropped Image Overlay
        if (insert.imageBuffer) {
          try {
            doc.image(insert.imageBuffer, insX, insY, {
              fit: [insW, insH],
              align: 'center',
              valign: 'center',
            });
          } catch (imgErr) {
            console.warn(`Could not overlay image for ${insert.name}:`, imgErr);
          }
        }

        // Insert Badge
        const badge = insert.hasBleeds
          ? `Insert #${idx + 1}: ${insert.name || 'Artwork'} (Calibrated)`
          : `Insert #${idx + 1}: ${insert.name || 'Artwork'}`;

        doc.fillColor('#cc5200').fontSize(7).text(badge, insX + 4, insY + 4);
      });

      // 5. Job Detail Footer
      doc
        .fillColor('#666666')
        .fontSize(7)
        .text(`Job: ${jobName} | View: ${viewMode.toUpperCase()}`, 10, pdfHeight - 12);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}