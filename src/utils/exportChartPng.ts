import html2canvas from 'html2canvas';

export interface ExportChartPngOptions {
  /** The chart element to render. */
  element: HTMLElement;
  /** Title shown at the top of the exported image. */
  title?: string;
  /** Visible time range label, e.g. "2024-01-01 – 2024-01-31". */
  rangeLabel?: string;
  /** Current theme; controls background and text colors. */
  theme?: 'light' | 'dark';
  /** File name for the downloaded image (without extension). */
  fileName?: string;
  /** Pixel ratio for the rendered image. Defaults to window.devicePixelRatio. */
  scale?: number;
}

const PADDING = 16;
const TITLE_FONT = '600 16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
const RANGE_FONT = '400 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
const HEADER_HEIGHT = 56;

interface ThemeColors {
  background: string;
  text: string;
  subtext: string;
  border: string;
}

function getThemeColors(theme: 'light' | 'dark'): ThemeColors {
  if (theme === 'dark') {
    return {
      background: '#0f172a',
      text: '#f8fafc',
      subtext: '#94a3b8',
      border: '#1e293b',
    };
  }
  return {
    background: '#ffffff',
    text: '#0f172a',
    subtext: '#64748b',
    border: '#e2e8f0',
  };
}

function resolveTheme(theme?: 'light' | 'dark'): 'light' | 'dark' {
  if (theme) return theme;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (root.classList.contains('dark') || root.dataset.theme === 'dark') {
      return 'dark';
    }
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  }
  return 'light';
}

/**
 * Renders the given chart element to a canvas, drawing a header with the
 * title and visible range on top of it, using the current theme colors.
 */
async function renderChartCanvas(options: ExportChartPngOptions): Promise<HTMLCanvasElement> {
  const { element, title, rangeLabel } = options;
  const theme = resolveTheme(options.theme);
  const colors = getThemeColors(theme);
  const scale = options.scale ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

  const chartCanvas = await html2canvas(element, {
    backgroundColor: colors.background,
    scale,
    logging: false,
    useCORS: true,
  });

  const hasHeader = Boolean(title || rangeLabel);
  const headerHeight = hasHeader ? HEADER_HEIGHT : 0;

  const output = document.createElement('canvas');
  output.width = chartCanvas.width + PADDING * 2;
  output.height = chartCanvas.height + headerHeight + PADDING * 2;

  const ctx = output.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create canvas context for chart export');
  }

  // Background
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, output.width, output.height);

  // Header (title + range)
  if (hasHeader) {
    let textY = PADDING;
    if (title) {
      ctx.fillStyle = colors.text;
      ctx.font = TITLE_FONT;
      ctx.textBaseline = 'top';
      ctx.fillText(title, PADDING, textY);
      textY += 22;
    }
    if (rangeLabel) {
      ctx.fillStyle = colors.subtext;
      ctx.font = RANGE_FONT;
      ctx.textBaseline = 'top';
      ctx.fillText(rangeLabel, PADDING, textY);
    }

    // Divider line
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const dividerY = PADDING + headerHeight - 8;
    ctx.moveTo(PADDING, dividerY);
    ctx.lineTo(output.width - PADDING, dividerY);
    ctx.stroke();
  }

  // Chart
  ctx.drawImage(chartCanvas, PADDING, PADDING + headerHeight);

  return output;
}

/**
 * Converts a canvas to a PNG blob.
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to export chart to PNG'));
      }
    }, 'image/png');
  });
}

/**
 * Triggers a browser download for the given blob.
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on next tick to ensure the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Renders the chart element with a title and visible range to a PNG blob.
 */
export async function exportChartPngBlob(options: ExportChartPngOptions): Promise<Blob> {
  const canvas = await renderChartCanvas(options);
  return canvasToBlob(canvas);
}

/**
 * Renders the chart element with a title and visible range to a downloadable
 * PNG image. Returns the generated blob.
 */
export async function exportChartPng(options: ExportChartPngOptions): Promise<Blob> {
  const blob = await exportChartPngBlob(options);
  const fileName = options.fileName ?? 'chart';
  downloadBlob(blob, `${fileName}.png`);
  return blob;
}

export default exportChartPng;