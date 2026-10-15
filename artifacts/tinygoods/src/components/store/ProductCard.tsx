import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Product } from '@workspace/api-client-react';
import { cn, formatPrice } from '../../lib/utils';
import { useCart, variantImage, variantPrice } from '../../context/cart';
import { Plus, Gift } from 'lucide-react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const MAX_SWATCHES = 4;

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [, setLocation] = useLocation();
  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];
  const [color, setColor] = useState(colors[0]?.name);

  // With sizes, show the price of the cheapest size ("від …"); the size is chosen on the product page.
  const cheapest = [...sizes].sort((a, b) => a.priceDelta - b.priceDelta)[0];
  const price = variantPrice(product, { size: cheapest?.name, color });
  const fromPrice = new Set(sizes.map((s) => s.priceDelta)).size > 1;
  const image = variantImage(product, color);
  const hasDiscount = product.oldPrice != null && product.oldPrice > product.price;
  const needsPage = sizes.length > 0;
  const href = `/product/${product.id}${color ? `?color=${encodeURIComponent(color)}` : ''}`;

  // Subtle 3D tilt following the pointer (mouse only; touch keeps the card flat).
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-6, 6]), { stiffness: 200, damping: 20 });
  const glare = useTransform([px, py], ([x, y]: number[]) =>
    `radial-gradient(circle at ${x * 100}% ${y * 100}%, hsl(0 0% 100% / 0.35), transparent 55%)`,
  );

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (needsPage) setLocation(href);
    else addToCart(product, 1, { color });
  };

  return (
    <Link href={href}>
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        whileTap={{ scale: 0.97 }}
        className="liquid-glass group rounded-[24px] flex flex-col h-full cursor-pointer"
      >
        <div className="m-2 mb-0 aspect-square rounded-[18px] bg-foreground/5 relative overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {image ? (
              <motion.img
                key={image}
                src={image}
                alt={product.name}
                loading="lazy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-foreground/20">
                <Gift className="w-10 h-10" />
              </div>
            )}
          </AnimatePresence>
          <motion.div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: glare }} />
          {hasDiscount && (
            <div className="absolute top-2.5 left-2.5 bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg">
              −{Math.round((1 - product.price / product.oldPrice!) * 100)}%
            </div>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="absolute bottom-2.5 left-2.5 liquid-glass text-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full">
              Залишилось {product.stock}
            </div>
          )}
        </div>

        <div className="p-3.5 md:p-4 flex flex-col flex-1 gap-2">
          <h3 className="text-foreground text-sm md:text-[15px] font-semibold leading-snug line-clamp-2">{product.name}</h3>

          {colors.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Варіанти оформлення</div>
              <div className="flex flex-wrap gap-1.5">
                {colors.slice(0, MAX_SWATCHES).map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={c.name === color}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setColor(c.name);
                    }}
                    className={cn(
                      'w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden ring-1 transition active:scale-90',
                      c.name === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'ring-foreground/15 hover:ring-foreground/40',
                    )}
                  >
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <span className="block w-full h-full" style={{ background: c.hex ?? 'transparent' }} />
                    )}
                  </button>
                ))}
                {colors.length > MAX_SWATCHES && (
                  <span className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    +{colors.length - MAX_SWATCHES}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-auto flex items-end justify-between gap-2">
            <div>
              {hasDiscount && <div className="text-muted-foreground text-xs line-through">{formatPrice(product.oldPrice! + price - product.price)}</div>}
              <div className="text-base md:text-lg font-extrabold text-foreground">
                {fromPrice && <span className="text-xs font-semibold text-muted-foreground mr-1">від</span>}
                {formatPrice(price)}
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              aria-label={needsPage ? 'Обрати розмір' : 'Додати в кошик'}
              className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_8px_18px_-8px_hsl(var(--primary)/0.9)] transition hover:scale-110 hover:rotate-90 active:scale-90 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:rotate-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
