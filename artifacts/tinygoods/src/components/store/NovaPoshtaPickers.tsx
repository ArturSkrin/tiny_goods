import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Loader2, MapPin, Package, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useSearchNpCities,
  useSearchNpWarehouses,
  getSearchNpCitiesQueryKey,
  getSearchNpWarehousesQueryKey,
  type NpCity,
  type NpWarehouse,
} from '@workspace/api-client-react';
import { cn } from '../../lib/utils';

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Search-as-you-type dropdown with keyboard navigation. */
function Combobox<T>({
  label,
  placeholder,
  disabled,
  invalid,
  icon,
  query,
  onQuery,
  options,
  loading,
  emptyText,
  getKey,
  renderOption,
  onSelect,
}: {
  label: string;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  icon: ReactNode;
  query: string;
  onQuery: (q: string) => void;
  options: T[];
  loading: boolean;
  emptyText: string;
  getKey: (o: T) => string;
  renderOption: (o: T) => ReactNode;
  onSelect: (o: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useEffect(() => setActive(0), [options]);
  useEffect(() => {
    (list.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (o: T) => {
    onSelect(o);
    setOpen(false);
  };

  return (
    <div ref={root} className="relative space-y-2">
      <label className="text-sm text-foreground/70 ml-1">{label}</label>
      <div
        className={cn(
          'flex items-center gap-2 h-12 rounded-xl border bg-foreground/5 px-3 transition-colors',
          open ? 'border-primary ring-2 ring-primary/30' : invalid ? 'border-destructive/50' : 'border-foreground/10',
          disabled && 'opacity-50',
        )}
      >
        <span className="text-foreground/40 shrink-0">{open ? <Search className="w-4 h-4" /> : icon}</span>
        <input
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          onChange={(e) => {
            onQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, options.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && open && options[active]) {
              e.preventDefault();
              pick(options[active]!);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
        />
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-foreground/40" /> : <ChevronDown className={cn('w-4 h-4 text-foreground/40 transition-transform', open && 'rotate-180')} />}
      </div>

      <AnimatePresence>
        {open && !disabled && (
          <motion.ul
            ref={list}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-40 left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-2xl border border-foreground/10 bg-background shadow-2xl p-1.5"
          >
            {options.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">{loading ? 'Завантаження…' : emptyText}</li>
            ) : (
              options.map((o, i) => (
                <li
                  key={getKey(o)}
                  role="option"
                  aria-selected={i === active}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pick(o);
                  }}
                  className={cn('px-3 py-2.5 rounded-xl cursor-pointer text-sm', i === active ? 'bg-primary/10 text-foreground' : 'text-foreground/80')}
                >
                  {renderOption(o)}
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CityPicker({ initial = '', invalid, onChange }: { initial?: string; invalid?: boolean; onChange: (city: NpCity) => void }) {
  const [query, setQuery] = useState(initial);
  const [picked, setPicked] = useState(initial);
  // Reopening after a pick shows the big-city list again rather than a one-item search.
  const q = useDebounced(query.trim() === picked ? '' : query.trim());
  const { data, isFetching } = useSearchNpCities(q ? { q } : {}, {
    query: { queryKey: getSearchNpCitiesQueryKey(q ? { q } : {}), staleTime: 3600_000 },
  });

  return (
    <Combobox
      label="Місто"
      placeholder="Почніть вводити назву міста"
      invalid={invalid}
      icon={<MapPin className="w-4 h-4" />}
      query={query}
      onQuery={setQuery}
      options={data ?? []}
      loading={isFetching}
      emptyText="Місто не знайдено"
      getKey={(c) => c.ref}
      renderOption={(c) => (
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{c.name}</span>
          <span className="text-xs text-muted-foreground truncate">{c.area} обл.</span>
        </span>
      )}
      onSelect={(c) => {
        setQuery(c.name);
        setPicked(c.name);
        onChange(c);
      }}
    />
  );
}

export function WarehousePicker({
  cityRef,
  value,
  invalid,
  onChange,
}: {
  cityRef?: string;
  value: string;
  invalid?: boolean;
  onChange: (w: NpWarehouse) => void;
}) {
  const [query, setQuery] = useState(value);
  useEffect(() => setQuery(value), [value]);
  const q = useDebounced(query.trim() === value ? '' : query.trim());
  const params = { cityRef: cityRef ?? '', ...(q ? { q } : {}) };
  const { data, isFetching } = useSearchNpWarehouses(params, {
    query: { queryKey: getSearchNpWarehousesQueryKey(params), enabled: !!cityRef, staleTime: 3600_000 },
  });

  return (
    <Combobox
      label="Відділення / Поштомат"
      placeholder={cityRef ? 'Номер або адреса' : 'Спершу оберіть місто'}
      disabled={!cityRef}
      invalid={invalid}
      icon={<Package className="w-4 h-4" />}
      query={query}
      onQuery={setQuery}
      options={data ?? []}
      loading={isFetching}
      emptyText="Нічого не знайдено — спробуйте номер відділення"
      getKey={(w) => w.ref}
      renderOption={(w) => <span className="leading-snug">{w.name}</span>}
      onSelect={(w) => {
        setQuery(w.name);
        onChange(w);
      }}
    />
  );
}
