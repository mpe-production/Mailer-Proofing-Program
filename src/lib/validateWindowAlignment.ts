import { EnvelopeSpec, InsertSpec, CoordinatesInches, WindowSpec } from './envelopeSpecs';

export interface WindowValidationResult {
  valid: boolean;
  windowLabel: string;
  clearance: { top: number; bottom: number; left: number; right: number };
  messages: string[];
}

export function validateWindowAlignment(
  envelope: EnvelopeSpec,
  windowId: string,
  insert: InsertSpec,
  offset: CoordinatesInches = { x: 0, y: 0 }
): WindowValidationResult {
  const windowSpec = envelope.windows?.find((w) => w.id === windowId);
  const messages: string[] = [];

  if (!windowSpec || !insert.hasAddressBlock || !insert.addressBlockPosition || !insert.addressBlockDimensions) {
    return {
      valid: false,
      windowLabel: windowSpec?.label || 'Unknown',
      clearance: { top: 0, bottom: 0, left: 0, right: 0 },
      messages: ['No address block or window configured.'],
    };
  }

  // Window position relative to top-left of envelope
  const windowTopLeftY =
    windowSpec.positionFrom === 'bottom-left'
      ? envelope.dimensions.height - windowSpec.position.y - windowSpec.dimensions.height
      : windowSpec.position.y;

  // Address block position relative to envelope
  const addressX = offset.x + insert.addressBlockPosition.x;
  const addressY = offset.y + insert.addressBlockPosition.y;

  const leftGap = addressX - windowSpec.position.x;
  const rightGap = windowSpec.position.x + windowSpec.dimensions.width - (addressX + insert.addressBlockDimensions.width);
  const topGap = addressY - windowTopLeftY;
  const bottomGap = windowTopLeftY + windowSpec.dimensions.height - (addressY + insert.addressBlockDimensions.height);

  const minClearance = 0.125; // 1/8 inch USPS standard
  let isValid = true;

  if (leftGap < 0 || rightGap < 0 || topGap < 0 || bottomGap < 0) {
    isValid = false;
    messages.push('ERROR: Address block spills outside window boundaries!');
  } else {
    if (leftGap < minClearance) messages.push(`WARN: Left clearance (${leftGap.toFixed(2)}") is under 0.125"`);
    if (rightGap < minClearance) messages.push(`WARN: Right clearance (${rightGap.toFixed(2)}") is under 0.125"`);
    if (topGap < minClearance) messages.push(`WARN: Top clearance (${topGap.toFixed(2)}") is under 0.125"`);
    if (bottomGap < minClearance) messages.push(`WARN: Bottom clearance (${bottomGap.toFixed(2)}") is under 0.125"`);
  }

  if (isValid && messages.length === 0) {
    messages.push('SUCCESS: Address block is safely centered in window cutout.');
  }

  return {
    valid: isValid,
    windowLabel: windowSpec.label,
    clearance: {
      left: Number(leftGap.toFixed(2)),
      right: Number(rightGap.toFixed(2)),
      top: Number(topGap.toFixed(2)),
      bottom: Number(bottomGap.toFixed(2)),
    },
    messages,
  };
}