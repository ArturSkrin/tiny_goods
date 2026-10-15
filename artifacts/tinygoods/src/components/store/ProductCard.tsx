import React from 'react';
import { Link } from 'wouter';
import { Product } from '@workspace/api-client-react';
import { formatPrice } from '../../lib/utils';
import { useCart } from '../../context/cart';
import { Plus, Gift } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const hasDiscount = product.oldPrice != null && product.oldPrice > product.price;

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

  // Products with sizes/colours need a choice first, so the button opens the product page.
  const hasOptions = (product.sizes?.length ?? 0) + (product.colors?.length ?? 0) > 0;
  const minDelta = (list: Product['sizes']) => Math.min(0, ...(list ?? []).map((o) => o.priceDelta));
  const fromPrice = product.price + minDelta(product.sizes) + minDelta(product.colors);

  const handleAdd = (e: React.MouseEvent) => {
    if (hasOptions) return;
    e.preventDefault();
    addToCart(product, 1);
  };

  return (
    <Link href={`/product/${product.id}`}>
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        whileTap={{ scale: 0.97 }}
        className="liquid-glass group rounded-[24px] flex flex-col h-full cursor-pointer"
      >
        <div className="m-2 mb-0 aspect-square rounded-[18px] bg-foreground/5 relative overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/20">
              <Gift className="w-10 h-10" />
            </div>
          )}
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
          <h3 className="text-foreground text-sm md:text-[15px] font-semibold leading-snug line-clamp-2">
            {product.name}
          </h3>

          <div className="mt-auto flex items-end justify-between gap-2">
            <div>
              {hasDiscount && (
                <div className="text-muted-foreground text-xs line-through">{formatPrice(product.oldPrice!)}</div>
              )}
              <div className="text-base md:text-lg font-extrabold text-foreground">
                {hasOptions && <span className="text-xs font-semibold text-muted-foreground mr-1">від</span>}
                {formatPrice(hasOptions ? fromPrice : product.price)}
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              aria-label={hasOptions ? 'Обрати варіант' : 'Додати в кошик'}
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
