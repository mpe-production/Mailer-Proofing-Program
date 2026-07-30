export type DPI = 300 | 96;

export interface DimensionsInches {
  width: number;
  height: number;
}

export interface DimensionsPixels {
  width: number;
  height: number;
}

export interface CoordinatesInches {
  x: number;
  y: number;
}

export interface WindowSpec {
  id: string;
  label: string;
  dimensions: DimensionsInches;
  position: CoordinatesInches;
  positionFrom: 'top-left' | 'bottom-left';
}

export type EnvelopeCategory = 'commercial' | 'catalog' | 'announcement' | 'booklet';

export interface EnvelopeSpec {
  id: string;
  name: string;
  category: EnvelopeCategory;
  dimensions: DimensionsInches;
  flapStyle: 'commercial' | 'square' | 'policy' | 'wallet';
  windows?: WindowSpec[];
  maxInsertThicknessInches?: number;
  description: string;
}

export type InsertCategory = 'letter' | 'buck_slip' | 'remit_envelope' | 'card' | 'ticket' | 'reply_card';
export type FoldType = 'flat' | 'tri_fold' | 'z_fold' | 'half_fold' | 'gate_fold';

export interface InsertSpec {
  id: string;
  name: string;
  category: InsertCategory;
  flatDimensions: DimensionsInches;
  foldedDimensions: DimensionsInches;
  foldType: FoldType;
  hasAddressBlock?: boolean;
  addressBlockPosition?: CoordinatesInches;
  addressBlockDimensions?: DimensionsInches;
  description: string;
  color: string; // Background color for canvas rendering
}

export interface PlacedInsert {
  id: string; // Unique instance ID
  insertSpec: InsertSpec;
  zIndex: number;
  offsetInches: CoordinatesInches;
  rotationDeg?: number;
}

export type ViewMode = 'stuffed' | 'fan_out' | 'x_ray';

export const inchesToPixels = (inches: number, dpi: DPI = 300): number => Math.round(inches * dpi);

export const STANDARD_ENVELOPES: Record<string, EnvelopeSpec> = {
  NO_10_DOUBLE_WINDOW: {
    id: 'no_10_double_window',
    name: '#10 Double Window Envelope',
    category: 'commercial',
    dimensions: { width: 9.5, height: 4.125 },
    flapStyle: 'commercial',
    windows: [
      {
        id: 'return_window',
        label: 'Return Address Window',
        dimensions: { width: 3.5, height: 0.875 },
        position: { x: 0.875, y: 2.75 },
        positionFrom: 'bottom-left',
      },
      {
        id: 'recipient_window',
        label: 'Recipient Address Window',
        dimensions: { width: 4.0, height: 1.0 },
        position: { x: 0.875, y: 0.75 },
        positionFrom: 'bottom-left',
      },
    ],
    description: 'Standard #10 commercial envelope with dual window cutouts.',
  },
  NO_10_REGULAR: {
    id: 'no_10_regular',
    name: '#10 Regular (No Window)',
    category: 'commercial',
    dimensions: { width: 9.5, height: 4.125 },
    flapStyle: 'commercial',
    description: 'Standard solid commercial #10 envelope.',
  },
  CATALOG_6X9: {
    id: 'catalog_6x9',
    name: '6 x 9 Catalog Envelope',
    category: 'catalog',
    dimensions: { width: 9.0, height: 6.0 },
    flapStyle: 'wallet',
    description: 'Mid-size catalog envelope for unfolded booklets or cards.',
  },
};

export const STANDARD_INSERTS: Record<string, InsertSpec> = {
  LETTER_TRIFOLD: {
    id: 'letter_trifold',
    name: '8.5 x 11 Letter (Tri-Folded)',
    category: 'letter',
    flatDimensions: { width: 8.5, height: 11.0 },
    foldedDimensions: { width: 8.5, height: 3.66 },
    foldType: 'tri_fold',
    hasAddressBlock: true,
    addressBlockPosition: { x: 0.875, y: 0.75 },
    addressBlockDimensions: { width: 4.0, height: 1.0 },
    color: '#e2e8f0',
    description: 'Standard tri-fold letter with address area block.',
  },
  BUCK_SLIP: {
    id: 'buck_slip',
    name: 'Promotional Buck Slip',
    category: 'buck_slip',
    flatDimensions: { width: 8.5, height: 3.5 },
    foldedDimensions: { width: 8.5, height: 3.5 },
    foldType: 'flat',
    color: '#fde68a',
    description: 'Yellow promotional insert card.',
  },
  REMIT_6_3_4: {
    id: 'remit_6_3_4',
    name: '#6 3/4 Remittance Envelope',
    category: 'remit_envelope',
    flatDimensions: { width: 6.5, height: 3.625 },
    foldedDimensions: { width: 6.5, height: 3.625 },
    foldType: 'flat',
    color: '#a7f3d0',
    description: 'Green donation/reply return envelope.',
  },
};