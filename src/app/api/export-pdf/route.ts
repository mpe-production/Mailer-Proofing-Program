// src/app/api/export-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateProofPdfBuffer } from '@/lib/compositeRenderer';
import sharp from 'sharp';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { envelope, inserts = [], viewMode, jobName } = body;

    // Process uploaded inserts with Sharp to extract exact trim box
    const processedInserts = await Promise.all(
      inserts.map(async (insert: any) => {
        let imageBuffer: Buffer | undefined = undefined;

        if (insert.previewUrl && insert.previewUrl.startsWith('data:image')) {
          const base64Data = insert.previewUrl.replace(/^data:image\/\w+;base64,/, '');
          const rawBuffer = Buffer.from(base64Data, 'base64');

          // Extract pixel bounds based on 300 DPI pre-press resolution
          const metadata = await sharp(rawBuffer).metadata();
          const imgWidth = metadata.width || 2550;
          const imgHeight = metadata.height || 3300;

          const origInchesW = insert.originalWidth || insert.width || 8.5;
          const origInchesH = insert.originalHeight || insert.height || 11.0;

          // Convert inch crop offsets into pixel extractions
          const scaleX = imgWidth / origInchesW;
          const scaleY = imgHeight / origInchesH;

          const extractLeft = Math.round((insert.cropX || 0) * scaleX);
          const extractTop = Math.round((insert.cropY || 0) * scaleY);
          const extractW = Math.min(Math.round((insert.width || 8.5) * scaleX), imgWidth - extractLeft);
          const extractH = Math.min(Math.round((insert.height || 3.5) * scaleY), imgHeight - extractTop);

          imageBuffer = await sharp(rawBuffer)
            .extract({
              left: Math.max(0, extractLeft),
              top: Math.max(0, extractTop),
              width: Math.max(1, extractW),
              height: Math.max(1, extractH),
            })
            .png()
            .toBuffer();
        }

        return {
          ...insert,
          imageBuffer,
        };
      })
    );

    // Generate production PDF proof
    const pdfBuffer = await generateProofPdfBuffer({
      envelope,
      inserts: processedInserts,
      viewMode,
      jobName,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
    'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${jobName || 'proof'}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF Export Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate PDF proof.' },
      { status: 500 }
    );
  }
}