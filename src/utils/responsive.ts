/**
 * Responsive utilities for D3 charts
 * Adapts margins, font sizes, and interactions based on container/viewport width
 */

export interface ResponsiveMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ResponsiveFontSizes {
  axis: number;
  label: number;
  title: number;
}

/**
 * Get responsive margins for horizontal bar charts (CategoryBreakdown, TopSpenders)
 * These charts need larger left margins for labels
 */
export function getHorizontalBarMargins(containerWidth: number): ResponsiveMargins {
  if (containerWidth < 360) {
    return { top: 15, right: 35, bottom: 20, left: 85 };
  }
  if (containerWidth < 480) {
    return { top: 18, right: 45, bottom: 25, left: 110 };
  }
  if (containerWidth < 640) {
    return { top: 20, right: 50, bottom: 28, left: 140 };
  }
  return { top: 25, right: 60, bottom: 30, left: 180 };
}

/**
 * Get responsive margins for standard charts (histograms, line charts, scatter plots)
 */
export function getStandardMargins(containerWidth: number): ResponsiveMargins {
  if (containerWidth < 360) {
    return { top: 20, right: 15, bottom: 45, left: 45 };
  }
  if (containerWidth < 480) {
    return { top: 25, right: 20, bottom: 50, left: 55 };
  }
  if (containerWidth < 640) {
    return { top: 28, right: 25, bottom: 55, left: 60 };
  }
  return { top: 30, right: 30, bottom: 60, left: 70 };
}

/**
 * Get responsive font sizes for chart elements
 */
export function getResponsiveFontSizes(containerWidth: number): ResponsiveFontSizes {
  if (containerWidth < 360) {
    return { axis: 8, label: 9, title: 10 };
  }
  if (containerWidth < 480) {
    return { axis: 9, label: 10, title: 11 };
  }
  if (containerWidth < 640) {
    return { axis: 10, label: 11, title: 12 };
  }
  return { axis: 11, label: 12, title: 13 };
}

/**
 * Check if the current device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get appropriate point radius for scatter plots based on touch capability
 */
export function getPointRadius(isHovered: boolean = false): number {
  const baseRadius = isTouchDevice() ? 8 : 5;
  return isHovered ? baseRadius + 3 : baseRadius;
}

/**
 * Truncate text to fit within a given pixel width (approximate)
 * Uses a rough estimate of 7px per character for 12px font
 */
export function truncateText(text: string, maxWidth: number, fontSize: number = 12): string {
  const charWidth = fontSize * 0.6; // Approximate character width
  const maxChars = Math.floor(maxWidth / charWidth);

  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return text.slice(0, maxChars);

  return text.slice(0, maxChars - 2) + '…';
}

/**
 * Get the maximum label width for horizontal bar charts
 */
export function getMaxLabelWidth(containerWidth: number): number {
  const margins = getHorizontalBarMargins(containerWidth);
  return margins.left - 10; // Leave some padding
}
