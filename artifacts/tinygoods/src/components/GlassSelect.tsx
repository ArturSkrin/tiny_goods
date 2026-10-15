import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export type GlassOption<V> = { value: V; label: string };

/** Site-styled replacement for <select>: native dropdowns ignore the theme on Windows. */
export function GlassSelect<V>({
  value,
  options,
  onChange,
  className,
}: {
  value: V;
  options: GlassOption<V>[];
  onChange: (v: V) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const pick = (o: GlassOption<V>) => {
    onChange(o.value);
    setOpen(false);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) return setOpen(true);
            setActive((a) => Math.min(options.length - 1, Math.max(0, a + (e.key === 'ArrowDown' ? 1 : -1))));
          } else if (e.key === 'Enter' && open) {
            e.preventDefault();
            pick(options[active]!);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={cn('w-full flex items-center justify-between gap-2 text-left', className)}
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-foreground/50 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-40 left-0 right-0 top-full mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-foreground/10 bg-background shadow-[0_20px_50px_-20px_hsl(var(--glass-shadow)/0.6)] p-1.5"
          >
            {options.map((o, i) => (
              <li
                key={String(o.value)}
                role="option"
                aria-selected={o.value === value}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o)}
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-medium text-popover-foreground',
                  i === active && 'bg-primary/10',
                )}
              >
                {o.label}
                {o.value === value && <Check className="w-4 h-4 text-primary" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
