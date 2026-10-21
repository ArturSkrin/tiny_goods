import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import type { ProductOption, SizeOrder } from '@workspace/api-client-react';
import { cn, formatPrice } from '../../lib/utils';

export type Dims = { w: number; h: number; d?: number; unit: string };

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const SEP = String.raw`\s*[*xх×]\s*`;
const DIMS_RE = new RegExp(`${NUM}${SEP}${NUM}(?:${SEP}${NUM})?`, 'i');

/** Per product: what the numbers in a size name mean, in order. */
export const SIZE_ORDERS: { value: SizeOrder; label: string }[] = [
  { value: 'whd', label: 'Ширина × Висота × Глибина' },
  { value: 'hwd', label: 'Висота × Ширина × Глибина' },
  { value: 'wdh', label: 'Довжина × Ширина × Висота (коробка)' },
];

/**
 * "23*18*10 см", "23x18", "30 × 20 × 12 мм" → width/height/depth by the product's number order;
 * null if the name has no dimensions. Two numbers are always width × height of a flat item.
 */
export function parseDims(text: string, order: SizeOrder = 'whd'): Dims | null {
  const m = DIMS_RE.exec(text);
  if (!m) return null;
  const nums = [m[1], m[2], m[3]].filter(Boolean).map((s) => parseFloat(s!.replace(',', '.')));
  const unit = /(мм|см|м)(?![а-яіїєґ])/i.exec(text.slice(m.index + m[0].length))?.[1]?.toLowerCase() ?? '';
  if (nums.length === 2) return { w: nums[0]!, h: nums[1]!, unit };
  const at = (k: 'w' | 'h' | 'd') => nums[order.indexOf(k)]!;
  return { w: at('w'), h: at('h'), d: at('d'), unit };
}

/** All sizes parsed, or null when any of them is a plain label like "M" (then the text chips are used). */
export function parseAllDims(sizes: ProductOption[], order?: SizeOrder): Dims[] | null {
  if (sizes.length === 0) return null;
  const all = sizes.map((s) => parseDims(s.name, order));
  return all.every(Boolean) ? (all as Dims[]) : null;
}

const fmt = (n: number) => String(n).replace('.', ',');
const unitOf = (all: Dims[]) => all.find((d) => d.unit)?.unit;

// Oblique projection: depth goes up-right at 30°, drawn at half length.
const K = 0.5;
const CX = Math.cos(Math.PI / 6);
const CY = Math.sin(Math.PI / 6);

const LABELED = { vw: 170, vh: 104, ml: 20, mr: 26, mt: 6, mb: 20 };
const ICON = { vw: 40, vh: 36, ml: 4, mr: 4, mt: 4, mb: 4 };

function fitScale(d: Dims, box: typeof LABELED) {
  const depth = d.d ?? 0;
  return Math.min((box.vw - box.ml - box.mr) / (d.w + depth * K * CX), (box.vh - box.mt - box.mb) / (d.h + depth * K * CY));
}

/** Dimension line with arrowheads at both ends, like on a technical drawing. */
function DimLine({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const a = Math.min(4, len / 3);
  const head = (x: number, y: number, dir: number) =>
    `M${x},${y} L${x + dir * a * ux - 1.8 * uy},${y + dir * a * uy + 1.8 * ux} L${x + dir * a * ux + 1.8 * uy},${y + dir * a * uy - 1.8 * ux}Z`;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={0.8} />
      <path d={head(x1, y1, 1) + head(x2, y2, -1)} fill="currentColor" />
    </g>
  );
}

/**
 * A box (or a flat sheet for two dimensions) drawn to the real proportions.
 * `labels` adds the measured sides; `group` scales it against the other sizes so a smaller size looks smaller.
 */
export function BoxDiagram({ dims, group, labels = false, className }: { dims: Dims; group?: Dims[]; labels?: boolean; className?: string }) {
  const box = labels ? LABELED : ICON;
  const s = Math.min(...(group ?? [dims]).map((d) => fitScale(d, box)));
  const w = dims.w * s;
  const h = dims.h * s;
  const dx = (dims.d ?? 0) * s * K * CX;
  const dy = -(dims.d ?? 0) * s * K * CY;
  const x0 = box.ml + (box.vw - box.ml - box.mr - (w + dx)) / 2;
  const y0 = box.vh - box.mb; // stands on the floor
  const top = y0 - h;
  const stroke = 'hsl(var(--primary))';
  const sw = labels ? 1.2 : 1.4;

  return (
    <svg viewBox={`0 0 ${box.vw} ${box.vh}`} className={className} aria-hidden="true">
      {dims.d != null && (
        <>
          <path d={`M${x0},${top} L${x0 + w},${top} L${x0 + w + dx},${top + dy} L${x0 + dx},${top + dy}Z`} fill="hsl(var(--primary) / 0.06)" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d={`M${x0 + w},${y0} L${x0 + w + dx},${y0 + dy} L${x0 + w + dx},${top + dy} L${x0 + w},${top}Z`} fill="hsl(var(--primary) / 0.24)" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </>
      )}
      <rect x={x0} y={top} width={w} height={h} fill="hsl(var(--primary) / 0.13)" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />

      {labels && (
        <g className="text-foreground/55" fontSize={11} fontWeight={700}>
          {/* width under the front */}
          <line x1={x0} y1={y0 + 2} x2={x0} y2={y0 + 9} stroke="currentColor" strokeWidth={0.6} />
          <line x1={x0 + w} y1={y0 + 2} x2={x0 + w} y2={y0 + 9} stroke="currentColor" strokeWidth={0.6} />
          <DimLine x1={x0} y1={y0 + 7} x2={x0 + w} y2={y0 + 7} />
          <text x={x0 + w / 2} y={y0 + 18} textAnchor="middle" className="fill-foreground">{fmt(dims.w)}</text>

          {/* height on the left */}
          <line x1={x0 - 2} y1={top} x2={x0 - 9} y2={top} stroke="currentColor" strokeWidth={0.6} />
          <line x1={x0 - 2} y1={y0} x2={x0 - 9} y2={y0} stroke="currentColor" strokeWidth={0.6} />
          <DimLine x1={x0 - 7} y1={y0} x2={x0 - 7} y2={top} />
          <text x={x0 - 11} y={(y0 + top) / 2} textAnchor="middle" transform={`rotate(-90 ${x0 - 11} ${(y0 + top) / 2})`} className="fill-foreground">{fmt(dims.h)}</text>

          {/* depth along the bottom-right edge */}
          {dims.d != null && (
            <>
              <DimLine x1={x0 + w + 6 * CY} y1={y0 + 6 * CX} x2={x0 + w + dx + 6 * CY} y2={y0 + dy + 6 * CX} />
              <text x={x0 + w + dx / 2 + 10} y={y0 + dy / 2 + 14} className="fill-foreground">{fmt(dims.d)}</text>
            </>
          )}
        </g>
      )}
    </svg>
  );
}

/** Drawing of the chosen size with its measurements, plus a box icon per size to switch between them. */
export function SizePicker({
  sizes,
  dims,
  value,
  onChange,
  compact,
}: {
  sizes: ProductOption[];
  dims: Dims[];
  value?: string;
  onChange: (name: string) => void;
  compact?: boolean;
}) {
  const i = Math.max(0, sizes.findIndex((s) => s.name === value));
  const unit = unitOf(dims);
  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Розмір{unit && `, ${unit}`}</div>
        <motion.div key={sizes[i]?.name} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} className="rounded-xl bg-foreground/[0.04] ring-1 ring-foreground/10 px-1 py-1.5">
          <BoxDiagram dims={dims[i]!} labels className="w-full h-[78px]" />
        </motion.div>
        {sizes.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((s, n) => (
              <button
                key={s.name}
                type="button"
                title={s.name}
                aria-label={s.name}
                aria-pressed={n === i}
                onClick={(e) => {
                  stop(e);
                  onChange(s.name);
                }}
                className={cn(
                  'w-9 h-9 md:w-10 md:h-10 rounded-xl ring-1 transition active:scale-90',
                  n === i ? 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5' : 'ring-foreground/15 hover:ring-foreground/40',
                )}
              >
                <BoxDiagram dims={dims[n]!} group={dims} className="w-full h-full" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="text-sm text-foreground/70">
        Розмір: <span className="font-bold text-foreground">{sizes[i]?.name}</span>
      </div>
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-stretch">
        <motion.div key={sizes[i]?.name} initial={{ opacity: 0.3, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-foreground/[0.04] ring-1 ring-foreground/10 p-2 flex items-center justify-center">
          <BoxDiagram dims={dims[i]!} labels className="w-full max-w-[300px] h-[150px]" />
        </motion.div>
        {sizes.length > 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 content-start">
            {sizes.map((s, n) => (
              <button
                key={s.name}
                type="button"
                onClick={() => onChange(s.name)}
                className={cn(
                  'h-14 pl-1.5 pr-3 rounded-xl flex items-center gap-2 text-left ring-1 transition active:scale-95',
                  n === i ? 'ring-2 ring-primary bg-primary/10' : 'ring-foreground/15 hover:ring-foreground/30',
                )}
              >
                <BoxDiagram dims={dims[n]!} group={dims} className="w-11 h-10 shrink-0" />
                <span className="leading-tight">
                  <span className="block text-sm font-semibold text-foreground whitespace-nowrap">{s.name}</span>
                  {s.priceDelta !== 0 && (
                    <span className="block text-xs text-muted-foreground">
                      {s.priceDelta > 0 ? '+' : '−'}
                      {formatPrice(Math.abs(s.priceDelta))}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
