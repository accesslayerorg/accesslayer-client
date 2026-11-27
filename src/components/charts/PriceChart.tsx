import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useChartAnnotations } from '../../hooks/useChartAnnotations';
import { exportChartPng } from '../../utils/exportChartPng';

export interface PricePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceChartProps {
  data: PricePoint[];
  title?: string;
  symbol?: string;
  chartKey?: string;
  height?: number;
  className?: string;
}

interface CrosshairState {
  x: number;
  y: number;
  index: number;
}

interface DragState {
  startX: number;
  currentX: number;
  active: boolean;
}

const PADDING = { top: 24, right: 64, bottom: 32, left: 8 };
const MIN_ZOOM_POINTS = 2;

function formatTime(time: number): string {
  const d = new Date(time);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '-';
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

function formatVolume(volume: number): string {
  if (!Number.isFinite(volume)) return '-';
  return volume.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  title,
  symbol,
  chartKey,
  height = 360,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = useState(800);
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);
  const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    time: number;
    price: number;
  } | null>(null);
  const [annotationText, setAnnotationText] = useState('');

  const { address, isConnected } = useWallet();
  const annotationsKey = chartKey ?? symbol ?? 'default';
  const { annotations, addAnnotation, removeAnnotation } = useChartAnnotations(
    annotationsKey,
    address,
  );

  // Track container width for responsive rendering.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 800);
    update();
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(update)
        : null;
    observer?.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Reset zoom when the underlying data changes identity.
  useEffect(() => {
    setZoomRange(null);
    setCrosshair(null);
  }, [data]);

  const visibleData = useMemo(() => {
    if (!zoomRange) return data;
    const [start, end] = zoomRange;
    return data.slice(start, end + 1);
  }, [data, zoomRange]);

  const plotWidth = Math.max(1, width - PADDING.left - PADDING.right);
  const plotHeight = Math.max(1, height - PADDING.top - PADDING.bottom);

  const priceBounds = useMemo(() => {
    if (visibleData.length === 0) return { min: 0, max: 1 };
    let min = Infinity;
    let max = -Infinity;
    for (const p of visibleData) {
      if (p.low < min) min = p.low;
      if (p.high > max) max = p.high;
    }
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.05;
    return { min: min - pad, max: max + pad };
  }, [visibleData]);

  const maxVolume = useMemo(() => {
    let m = 0;
    for (const p of visibleData) if (p.volume > m) m = p.volume;
    return m || 1;
  }, [visibleData]);

  const xForIndex = useCallback(
    (index: number) => {
      if (visibleData.length <= 1) return PADDING.left + plotWidth / 2;
      return PADDING.left + (index / (visibleData.length - 1)) * plotWidth;
    },
    [visibleData.length, plotWidth],
  );

  const yForPrice = useCallback(
    (price: number) => {
      const { min, max } = priceBounds;
      const ratio = (price - min) / (max - min);
      return PADDING.top + (1 - ratio) * plotHeight;
    },
    [priceBounds, plotHeight],
  );

  const indexForX = useCallback(
    (x: number) => {
      if (visibleData.length <= 1) return 0;
      const ratio = (x - PADDING.left) / plotWidth;
      const idx = Math.round(ratio * (visibleData.length - 1));
      return Math.max(0, Math.min(visibleData.length - 1, idx));
    },
    [visibleData.length, plotWidth],
  );

  const priceForY = useCallback(
    (y: number) => {
      const { min, max } = priceBounds;
      const ratio = 1 - (y - PADDING.top) / plotHeight;
      return min + ratio * (max - min);
    },
    [priceBounds, plotHeight],
  );

  // Draw the chart onto the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const styles = getComputedStyle(canvas);
    const bg = styles.getPropertyValue('--chart-bg').trim() || '#0f172a';
    const grid = styles.getPropertyValue('--chart-grid').trim() || '#1e293b';
    const up = styles.getPropertyValue('--chart-up').trim() || '#22c55e';
    const down = styles.getPropertyValue('--chart-down').trim() || '#ef4444';
    const text = styles.getPropertyValue('--chart-text').trim() || '#94a3b8';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PADDING.top + (i / 4) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left + plotWidth, y);
      ctx.stroke();
    }

    if (visibleData.length === 0) {
      ctx.fillStyle = text;
      ctx.font = '14px sans-serif';
      ctx.fillText('No data', PADDING.left + 8, PADDING.top + 20);
      return;
    }

    // Volume bars
    const barWidth = Math.max(1, plotWidth / visibleData.length - 1);
    for (let i = 0; i < visibleData.length; i++) {
      const p = visibleData[i];
      const x = xForIndex(i);
      const vh = (p.volume / maxVolume) * (plotHeight * 0.2);
      ctx.fillStyle = p.close >= p.open ? `${up}55` : `${down}55`;
      ctx.fillRect(x - barWidth / 2, PADDING.top + plotHeight - vh, barWidth, vh);
    }

    // Price line
    ctx.strokeStyle = up;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < visibleData.length; i++) {
      const p = visibleData[i];
      const x = xForIndex(i);
      const y = yForPrice(p.close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Annotations
    ctx.font = '12px sans-serif';
    for (const a of annotations) {
      const idx = visibleData.findIndex((p) => p.time === a.time);
      if (idx < 0) continue;
      const x = xForIndex(idx);
      const y = yForPrice(a.price);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = text;
      ctx.fillText(a.text, x + 8, y - 6);
    }

    // Crosshair
    if (crosshair) {
      ctx.strokeStyle = text;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(crosshair.x, PADDING.top);
      ctx.lineTo(crosshair.x, PADDING.top + plotHeight);
      ctx.moveTo(PADDING.left, crosshair.y);
      ctx.lineTo(PADDING.left + plotWidth, crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Drag selection overlay
    if (drag && drag.active) {
      const x0 = Math.min(drag.startX, drag.currentX);
      const x1 = Math.max(drag.startX, drag.currentX);
      ctx.fillStyle = 'rgba(59,130,246,0.2)';
      ctx.fillRect(x0, PADDING.top, x1 - x0, plotHeight);
      ctx.strokeStyle = '#3b82f6';
      ctx.strokeRect(x0, PADDING.top, x1 - x0, plotHeight);
    }
  }, [
    width,
    height,
    visibleData,
    priceBounds,
    maxVolume,
    crosshair,
    drag,
    annotations,
    plotWidth,
    plotHeight,
    xForIndex,
    yForPrice,
  ]);

  const getRelativePos = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    [],
  );

  const updateCrosshair = useCallback(
    (x: number, y: number) => {
      if (visibleData.length === 0) return;
      const clampedX = Math.max(
        PADDING.left,
        Math.min(PADDING.left + plotWidth, x),
      );
      const clampedY = Math.max(
        PADDING.top,
        Math.min(PADDING.top + plotHeight, y),
      );
      const index = indexForX(clampedX);
      setCrosshair({ x: clampedX, y: clampedY, index });
    },
    [visibleData.length, plotWidth, plotHeight, indexForX],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const { x, y } = getRelativePos(e);
      if (annotationMode) {
        if (!isConnected) return;
        const index = indexForX(x);
        const point = visibleData[index];
        if (!point) return;
        setPendingAnnotation({ time: point.time, price: priceForY(y) });
        setAnnotationText('');
        return;
      }
      setDrag({ startX: x, currentX: x, active: true });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [
      annotationMode,
      isConnected,
      getRelativePos,
      indexForX,
      visibleData,
      priceForY,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const { x, y } = getRelativePos(e);
      updateCrosshair(x, y);
      if (drag && drag.active) {
        setDrag({ ...drag, currentX: x });
      }
    },
    [getRelativePos, updateCrosshair, drag],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || !drag.active) return;
      const { x } = getRelativePos(e);
      const x0 = Math.min(drag.startX, x);
      const x1 = Math.max(drag.startX, x);
      setDrag(null);
      if (x1 - x0 < 8) return;
      const startIdx = indexForX(x0);
      const endIdx = indexForX(x1);
      if (endIdx - startIdx + 1 < MIN_ZOOM_POINTS) return;
      const offset = zoomRange ? zoomRange[0] : 0;
      setZoomRange([offset + startIdx, offset + endIdx]);
    },
    [drag, getRelativePos, indexForX, zoomRange],
  );

  const handlePointerLeave = useCallback(() => {
    setCrosshair(null);
    if (drag) setDrag(null);
  }, [drag]);

  const resetZoom = useCallback(() => {
    setZoomRange(null);
  }, []);

  const zoomIn = useCallback(() => {
    if (data.length === 0) return;
    const [start, end] = zoomRange ?? [0, data.length - 1];
    const span = end - start;
    if (span <= MIN_ZOOM_POINTS) return;
    const shrink = Math.max(1, Math.floor(span * 0.2));
    setZoomRange([start + shrink, end - shrink]);
  }, [data.length, zoomRange]);

  const zoomOut = useCallback(() => {
    if (!zoomRange) return;
    const [start, end] = zoomRange;
    const span = end - start;
    const grow = Math.max(1, Math.floor(span * 0.25));
    const newStart = Math.max(0, start - grow);
    const newEnd = Math.min(data.length - 1, end + grow);
    if (newStart === 0 && newEnd === data.length - 1) {
      setZoomRange(null);
    } else {
      setZoomRange([newStart, newEnd]);
    }
  }, [zoomRange, data.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (visibleData.length === 0) return;
      const currentIndex = crosshair ? crosshair.index : 0;
      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          const idx = Math.max(0, currentIndex - 1);
          updateCrosshair(xForIndex(idx), crosshair?.y ?? PADDING.top);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const idx = Math.min(visibleData.length - 1, currentIndex + 1);
          updateCrosshair(xForIndex(idx), crosshair?.y ?? PADDING.top);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const y = Math.max(
            PADDING.top,
            (crosshair?.y ?? PADDING.top + plotHeight) - 10,
          );
          updateCrosshair(crosshair?.x ?? PADDING.left, y);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const y = Math.min(
            PADDING.top + plotHeight,
            (crosshair?.y ?? PADDING.top) + 10,
          );
          updateCrosshair(crosshair?.x ?? PADDING.left, y);
          break;
        }
        case '+':
        case '=': {
          e.preventDefault();
          zoomIn();
          break;
        }
        case '-':
        case '_': {
          e.preventDefault();
          zoomOut();
          break;
        }
        case '0': {
          e.preventDefault();
          resetZoom();
          break;
        }
        case 'Escape': {
          setCrosshair(null);
          setPendingAnnotation(null);
          break;
        }
        default:
          break;
      }
    },
    [
      visibleData.length,
      crosshair,
      updateCrosshair,
      xForIndex,
      plotHeight,
      zoomIn,
      zoomOut,
      resetZoom,
    ],
  );

  const handleExport = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    const rangeLabel =
      visibleData.length > 0
        ? `${formatTime(visibleData[0].time)} - ${formatTime(
            visibleData[visibleData.length - 1].time,
          )}`
        : 'No data';
    await exportChartPng({
      element: container,
      title: title ?? symbol ?? 'Price Chart',
      rangeLabel,
      fileName: `${(symbol ?? 'chart').toLowerCase()}-${Date.now()}`,
    });
  }, [visibleData, title, symbol]);

  const submitAnnotation = useCallback(() => {
    if (!pendingAnnotation || !annotationText.trim()) {
      setPendingAnnotation(null);
      setAnnotationText('');
      return;
    }
    addAnnotation(
      pendingAnnotation.time,
      pendingAnnotation.price,
      annotationText.trim(),
    );
    setPendingAnnotation(null);
    setAnnotationText('');
  }, [pendingAnnotation, annotationText, addAnnotation]);

  const crosshairPoint =
    crosshair && visibleData[crosshair.index]
      ? visibleData[crosshair.index]
      : null;
  const crosshairPrice = crosshair ? priceForY(crosshair.y) : null;
  const crosshairChange =
    crosshairPoint && visibleData.length > 0
      ? ((crosshairPoint.close - visibleData[0].open) / visibleData[0].open) *
        100
      : null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontWeight: 600 }}>{title ?? symbol ?? 'Price Chart'}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={zoomIn} aria-label="Zoom in">
            Zoom in
          </button>
          <button type="button" onClick={zoomOut} aria-label="Zoom out">
            Zoom out
          </button>
          <button
            type="button"
            onClick={resetZoom}
            disabled={!zoomRange}
            aria-label="Reset zoom"
          >
            Reset zoom
          </button>
          <button type="button" onClick={handleExport} aria-label="Export PNG">
            Export PNG
          </button>
          <button
            type="button"
            onClick={() => setAnnotationMode((v) => !v)}
            aria-pressed={annotationMode}
            aria-label="Toggle annotation mode"
            disabled={!isConnected}
            title={
              isConnected
                ? 'Place text annotations on the chart'
                : 'Sign in to add annotations'
            }
          >
            {annotationMode ? 'Annotating…' : 'Annotate'}
          </button>
        </div>
      </div>

      {!isConnected && (
        <div
          role="note"
          style={{
            fontSize: 12,
            color: '#f59e0b',
            marginBottom: 8,
          }}
        >
          Annotations are disabled. Connect your wallet to add and save
          annotations.
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`${title ?? symbol ?? 'Price'} chart`}
          style={{
            display: 'block',
            cursor: annotationMode ? 'crosshair' : 'crosshair',
            touchAction: 'none',
            outline: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onKeyDown={handleKeyDown}
        />

        {crosshair && crosshairPoint && crosshairPrice !== null && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(crosshair.x + 12, width - 180),
              top: Math.max(PADDING.top, crosshair.y - 80),
              background: 'rgba(15,23,42,0.95)',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 2,
            }}
          >
            <div>Time: {formatTime(crosshairPoint.time)}</div>
            <div>Price: {formatPrice(crosshairPrice)}</div>
            <div>Close: {formatPrice(crosshairPoint.close)}</div>
            <div>Volume: {formatVolume(crosshairPoint.volume)}</div>
            <div>
              Change:{' '}
              {crosshairChange !== null
                ? `${crosshairChange >= 0 ? '+' : ''}${crosshairChange.toFixed(
                    2,
                  )}%`
                : '-'}
            </div>
          </div>
        )}

        {pendingAnnotation && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              top: 12,
              background: 'rgba(15,23,42,0.95)',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: 8,
              zIndex: 3,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <input
              autoFocus
              type="text"
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitAnnotation();
                if (e.key === 'Escape') {
                  setPendingAnnotation(null);
                  setAnnotationText('');
                }
              }}
              placeholder="Annotation text"
              aria-label="Annotation text"
            />
            <button type="button" onClick={submitAnnotation}>
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingAnnotation(null);
                setAnnotationText('');
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {annotations.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '8px 0 0',
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          {annotations.map((a) => (
            <li
              key={a.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                padding: '2px 0',
              }}
            >
              <span>
                {formatTime(a.time)} · {formatPrice(a.price)} · {a.text}
              </span>
              <button
                type="button"
                onClick={() => removeAnnotation(a.id)}
                aria-label={`Remove annotation ${a.text}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PriceChart;