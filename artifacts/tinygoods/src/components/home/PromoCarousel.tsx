import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// shortcut: static promos with seed photos, move to admin-managed banners when needed
const PROMOS = [
  { title: 'Шукаєте бонбоньєрки на весілля?', note: 'найкращі коробки тут', img: '/products/giftbox.jpg', head: 'from-[#f6a5b3] to-[#ec8aa0]', query: 'коробк' },
  { title: 'Потрібна стрічка до подарунка?', note: 'фінальний акцент', img: '/products/ribbon.jpg', head: 'from-[#9b6fd1] to-[#7c52b8]', query: 'стрічк' },
  { title: 'Пакети для подарунків', note: 'на будь-яку подію', img: '/products/giftbag.jpg', head: 'from-[#d9a65a] to-[#bf8a3e]', query: 'пакет' },
  { title: 'Затишне світло вдома', note: 'нічники та лампи', img: '/products/nightlight.jpg', head: 'from-[#7fa36b] to-[#5f8a4c]', query: 'нічник' },
  { title: 'Тішʼю для пакування', note: 'ніжно та охайно', img: '/products/tissue.jpg', head: 'from-[#e98f7d] to-[#d0705f]', query: 'тіш' },
  { title: 'Корисні гаджети', note: 'павербанки й ліхтарики', img: '/products/powerbank.jpg', head: 'from-[#6b7f9e] to-[#4f6283]', query: 'павербанк' },
];

export function PromoCarousel({ onPick }: { onPick: (query: string) => void }) {
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
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar h-full -mx-4 px-4 lg:mx-0 lg:px-0 rounded-[32px]"
      >
        {PROMOS.map((p, i) => (
          <motion.button
            key={p.title}
            onClick={() => onPick(p.query)}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.97 }}
            className="snap-start shrink-0 w-[68%] sm:w-[42%] lg:w-[calc((100%-24px)/2.15)] min-h-[340px] lg:min-h-full rounded-[28px] overflow-hidden relative flex flex-col text-left shadow-[0_18px_40px_-20px_hsl(var(--glass-shadow)/0.6)] group"
          >
            <div className={cn('bg-gradient-to-br px-4 pt-4 pb-3 text-white', p.head)}>
              <div className="font-script text-[26px] leading-[1.05] drop-shadow-sm">{p.title}</div>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <img
                src={p.img}
                alt=""
                loading={i > 2 ? 'lazy' : 'eager'}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
              <div className="absolute bottom-4 inset-x-4 font-script text-white text-2xl drop-shadow">{p.note}</div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 liquid-glass rounded-full px-2.5 py-1.5 flex gap-1.5">
        {PROMOS.map((_, i) => (
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
