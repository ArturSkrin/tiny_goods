import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useGetProduct, getGetProductQueryKey, type ProductOption } from '@workspace/api-client-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Minus, Plus, Check, ShieldCheck, Truck, ChevronDown, Gift } from 'lucide-react';
import { StoreLayout } from '../components/layout/StoreLayout';
import { RichText } from '../components/store/RichText';
import { useRecordView } from '../hooks/use-me';
import { useCart, variantImage, variantPrice } from '../context/cart';
import { cn, formatPrice } from '../lib/utils';

function OptionPicker({ label, options, value, onChange }: {
  label: string;
  options: ProductOption[];
  value?: string;
  onChange: (name: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="text-sm text-foreground/70">
        {label}: <span className="font-bold text-foreground">{value}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.name === value;
          return (
            <button
              key={o.name}
              type="button"
              onClick={() => onChange(o.name)}
              className={cn(
                'relative h-10 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 ring-1 transition active:scale-95',
                active ? 'ring-2 ring-primary bg-primary/10 text-foreground' : 'ring-foreground/15 text-foreground/75 hover:ring-foreground/30',
              )}
            >
              {o.imageUrl ? (
                <img src={o.imageUrl} alt="" className="w-7 h-7 -ml-2 rounded-lg object-cover" />
              ) : (
                o.hex && <span className="w-4 h-4 rounded-full ring-1 ring-foreground/20" style={{ background: o.hex }} />
              )}
              {o.name}
              {o.priceDelta !== 0 && (
                <span className="text-xs text-muted-foreground">
                  {o.priceDelta > 0 ? '+' : '−'}{formatPrice(Math.abs(o.priceDelta))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Long descriptions start collapsed with a fade and a "show all" toggle. */
function Description({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    setLong((ref.current?.scrollHeight ?? 0) > 360);
  }, [text]);

  return (
    <section className="liquid-glass rounded-[28px] p-5 md:p-8">
      <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-4">Опис</h2>
      <div
        ref={ref}
        className={cn(
          'text-[15px] text-foreground/75 overflow-hidden transition-[max-height] duration-500',
          long && !open ? 'max-h-[320px] [mask-image:linear-gradient(to_bottom,black_65%,transparent)]' : 'max-h-[4000px]',
        )}
      >
        <RichText text={text} />
      </div>
      {long && (
        <button onClick={() => setOpen((o) => !o)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          {open ? 'Згорнути' : 'Показати повністю'}
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        </button>
      )}
    </section>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const id = params?.id ? parseInt(params.id, 10) : 0;

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id) },
  });

  const { addToCart } = useCart();
  useRecordView(product?.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [size, setSize] = useState<string>();
  const [color, setColor] = useState<string>();

  // Preselect the colour picked on the catalog card (?color=…), else the first options.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('color');
    setSize(product?.sizes?.[0]?.name);
    setColor(product?.colors?.find((c) => c.name === wanted)?.name ?? product?.colors?.[0]?.name);
  }, [product?.id]);

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </StoreLayout>
    );
  }

  if (!product) {
    return (
      <StoreLayout>
        <div className="py-20 text-center text-foreground/50 liquid-glass rounded-3xl">Товар не знайдено</div>
      </StoreLayout>
    );
  }

  const price = variantPrice(product, { size, color });
  const image = variantImage(product, color);
  const optionDelta = price - product.price;
  const hasDiscount = product.oldPrice != null && product.oldPrice > product.price;
  const soldOut = product.stock === 0;

  const handleAdd = () => {
    addToCart(product, quantity, { size, color });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const addLabel = added ? (
    <><Check className="w-5 h-5" /> Додано</>
  ) : soldOut ? (
    'Немає в наявності'
  ) : (
    <><ShoppingBag className="w-5 h-5" /> Додати в кошик</>
  );

  return (
    <StoreLayout>
      <div className="max-w-6xl mx-auto space-y-5 md:space-y-8 pb-24 md:pb-12">
        <Link href="/" className="inline-flex items-center text-sm font-semibold text-foreground/60 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Назад до каталогу
        </Link>

        <div className="grid md:grid-cols-2 gap-5 md:gap-10 items-start">
          {/* Image stays in view while the right column scrolls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:sticky md:top-28 liquid-glass rounded-[28px] p-2"
          >
            <div className="relative aspect-square rounded-[22px] overflow-hidden bg-white/60 dark:bg-white/5">
              {image ? (
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.img key={image} src={image} alt={product.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 w-full h-full object-cover" />
                </AnimatePresence>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-foreground/20"><Gift className="w-16 h-16" /></div>
              )}
              {hasDiscount && (
                <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                  −{Math.round((1 - product.price / product.oldPrice!) * 100)}%
                </div>
              )}
              {product.stock > 0 && product.stock <= 5 && (
                <div className="absolute top-3 right-3 liquid-glass text-foreground text-xs font-bold px-3 py-1.5 rounded-full">
                  Залишилось {product.stock} шт
                </div>
              )}
            </div>
          </motion.div>

          <div className="space-y-5">
            {/* Buy box: everything needed to order, without scrolling */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="liquid-glass rounded-[28px] p-5 md:p-7 space-y-5">
              <h1 className="font-display text-2xl md:text-[32px] leading-tight font-semibold text-foreground">{product.name}</h1>

              <div className="flex items-end gap-3">
                <motion.div key={price} initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-4xl font-extrabold text-foreground">
                  {formatPrice(price)}
                </motion.div>
                {hasDiscount && <div className="text-lg text-muted-foreground line-through mb-1">{formatPrice(product.oldPrice! + optionDelta)}</div>}
              </div>

              {product.sizes.length > 0 && <OptionPicker label="Розмір" options={product.sizes} value={size} onChange={setSize} />}
              {product.colors.length > 0 && <OptionPicker label="Колір" options={product.colors} value={color} onChange={setColor} />}

              <div className="flex gap-3">
                <div className="flex items-center gap-1 rounded-2xl ring-1 ring-foreground/15 p-1">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Менше" className="w-10 h-10 rounded-xl hover:bg-foreground/10 flex items-center justify-center text-foreground/70">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-foreground">{quantity}</span>
                  <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} aria-label="Більше" className="w-10 h-10 rounded-xl hover:bg-foreground/10 flex items-center justify-center text-foreground/70">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={soldOut}
                  className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-[0_12px_28px_-12px_hsl(var(--primary))] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition"
                >
                  {addLabel}
                </button>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> Безпечна онлайн-оплата</span>
                <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-primary" /> Нова Пошта по Україні</span>
                {product.sku && <span>Артикул: {product.sku}</span>}
              </div>
            </motion.div>

            {product.description && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
                <Description text={product.description} />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Phones: price + add-to-cart always at hand, above the tab bar */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="md:hidden fixed inset-x-3 z-30 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+76px)]"
        >
          <div className="liquid-glass rounded-[22px] p-2 pl-4 flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground truncate">{[size, color].filter(Boolean).join(' · ') || 'Ціна'}</div>
              <div className="font-extrabold text-foreground leading-tight">{formatPrice(price * quantity)}</div>
            </div>
            <button
              onClick={handleAdd}
              disabled={soldOut}
              className="ml-auto h-11 px-5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 active:scale-95 disabled:opacity-50 transition"
            >
              {addLabel}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </StoreLayout>
  );
}
