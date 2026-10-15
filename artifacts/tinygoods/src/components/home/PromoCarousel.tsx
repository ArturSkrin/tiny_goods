import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { PromoCard } from '@workspace/api-client-react';
import { cn } from '../../lib/utils';

export function PromoCarousel({ promos, onPick }: { promos: PromoCard[]; onPick: (query: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  const scrollTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.children[i] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  };

  // Auto-advance; wraps back to start once the last page is visible.
  useEffect(() => {
    const id = setInterval(() => {
      const el = track.current;
      if (!el || paused.current) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      scrollTo(atEnd ? 0 : index + 1);
    }, 4200);
    return () => clearInterval(id);
  }, [index]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const w = (el.children[0] as HTMLElement)?.offsetWidth ?? 1;
    setIndex(Math.round(el.scrollLeft / (w + 12)));
  };

  if (promos.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="relative h-full"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onTouchStart={() => (paused.current = true)}
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain snap-x snap-mandatory no-scrollbar h-full -mx-3 px-3 md:-mx-6 md:px-6 lg:mx-0 lg:px-0 rounded-[32px]"
      >
        {promos.map((p, i) => (
          <motion.button
            key={i}
            onClick={() => onPick(p.query)}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.97 }}
            className="snap-start shrink-0 w-[68%] sm:w-[42%] lg:w-[calc((100%-24px)/3)] min-h-[360px] lg:min-h-full rounded-[28px] overflow-hidden relative flex flex-col text-left shadow-[0_18px_40px_-20px_hsl(var(--glass-shadow)/0.6)] group"
          >
            <div
              className="px-4 pt-4 pb-3 text-white"
              style={{ background: `linear-gradient(135deg, ${p.color}, color-mix(in srgb, ${p.color} 72%, black))` }}
            >
              <div className="font-script text-[26px] leading-[1.05] drop-shadow-sm">{p.title}</div>
            </div>
            <div className="relative flex-1 overflow-hidden bg-foreground/10">
              {p.image && (
                <img
                  src={p.image}
                  alt=""
                  loading={i > 2 ? 'lazy' : 'eager'}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
              <div className="absolute bottom-10 inset-x-4 font-script text-white text-2xl drop-shadow">{p.note}</div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 liquid-glass rounded-full px-2.5 py-1.5 flex gap-1.5">
        {promos.map((_, i) => (
          <button
            key={i}
            aria-label={`Слайд ${i + 1}`}
            onClick={() => scrollTo(i)}
            className={cn('h-1.5 rounded-full transition-all duration-500', i === index ? 'w-5 bg-primary' : 'w-1.5 bg-foreground/30')}
          />
        ))}
      </div>
    </motion.div>
  );
}
