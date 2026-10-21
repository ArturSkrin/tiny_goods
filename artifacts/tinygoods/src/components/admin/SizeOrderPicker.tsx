import type { ProductOption, SizeOrder } from '@workspace/api-client-react';
import { BoxDiagram, SIZE_ORDERS, parseDims } from '../store/SizeDiagram';
import { cn } from '../../lib/utils';

/** Shows the first size drawn each way, so the admin just picks the picture that matches the product. */
export function SizeOrderPicker({ sizes, value, onChange }: { sizes: ProductOption[]; value: SizeOrder; onChange: (v: SizeOrder) => void }) {
  // Prefer a size whose three numbers differ, so the three drawings actually look different.
  const boxes = sizes.filter((s) => parseDims(s.name)?.d != null);
  const sample = boxes.find((s) => new Set(parseDims(s.name)!.raw).size === 3) ?? boxes[0];
  if (!sample) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm text-white/60">Як читати цифри «{sample.name}»?</label>
      <div className="grid grid-cols-3 gap-2 max-w-xl">
        {SIZE_ORDERS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-xl p-2 text-left ring-1 transition',
              value === o.value ? 'ring-2 ring-primary bg-primary/10' : 'ring-white/10 hover:ring-white/30',
            )}
          >
            <BoxDiagram dims={parseDims(sample.name, o.value)!} labels className="w-full h-20" />
            <span className="block mt-1 text-[11px] leading-tight text-white/70">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
