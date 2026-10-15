import type { ProductOption } from '@workspace/api-client-react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '../ui/input';
import { ImageThumbUpload } from './ImageUpload';

/** Edits a product's sizes or colours: name, price surcharge and (for colours) a swatch. */
export function OptionsEditor({
  label,
  placeholder,
  withColor,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  withColor?: boolean;
  value: ProductOption[];
  onChange: (v: ProductOption[]) => void;
}) {
  const set = (i: number, patch: Partial<ProductOption>) => onChange(value.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-white/60">{label}</label>
        <button
          type="button"
          onClick={() => onChange([...value, { name: '', priceDelta: 0, hex: withColor ? '#c21f4f' : null }])}
          className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Додати
        </button>
      </div>
      {value.length === 0 && <div className="text-xs text-white/35">Немає — товар без вибору</div>}
      {value.map((o, i) => (
        <div key={i} className="flex gap-2 items-center">
          {withColor && (
            <>
              <ImageThumbUpload value={o.imageUrl} onChange={(imageUrl) => set(i, { imageUrl })} title="Фото товару в цьому кольорі" />
              <input
                type="color"
                value={o.hex ?? '#000000'}
                onChange={(e) => set(i, { hex: e.target.value })}
                title="Колір кружечка, якщо фото немає"
                className="w-12 h-12 shrink-0 rounded-xl bg-transparent border border-white/10 cursor-pointer"
              />
            </>
          )}
          <Input value={o.name} onChange={(e) => set(i, { name: e.target.value })} placeholder={placeholder} />
          <div className="relative w-36 shrink-0">
            <Input
              type="number"
              value={o.priceDelta}
              onChange={(e) => set(i, { priceDelta: Number(e.target.value) })}
              className="pr-10"
              title="Надбавка до ціни, грн (може бути 0 або від'ємна)"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">+грн</span>
          </div>
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="p-2 text-white/40 hover:text-destructive" aria-label="Видалити">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
