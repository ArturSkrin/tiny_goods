import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Gift } from 'lucide-react';
import type { Category } from '@workspace/api-client-react';
import { Reveal, SectionTitle } from './Reveal';

/** Category cards (image + tagline are edited in the admin «Категорії» page). */
export function Showcase({ categories, onPick }: { categories: Category[]; onPick: (categoryId: number) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const page = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });

  if (categories.length === 0) return null;
  return (
    <Reveal className="liquid-glass rounded-[32px] p-5 md:p-10">
      <div className="flex items-end justify-between gap-4 mb-6">
        <SectionTitle title="Усе для ідеального подарунка" subtitle="Пакування, декор і приємні дрібниці — в одному місці." />
        <div className="hidden md:flex gap-2 shrink-0">
          {([-1, 1] as const).map((d) => (
            <button
              key={d}
              onClick={() => page(d)}
              aria-label={d < 0 ? 'Назад' : 'Далі'}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_10px_24px_-10px_hsl(var(--primary))] hover:scale-105 active:scale-95 transition"
            >
              {d < 0 ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </button>
          ))}
        </div>
      </div>

      <div ref={track} className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-5 px-5 md:mx-0 md:px-0 pb-2">
        {categories.map((c, i) => (
          <motion.button
            key={c.id}
            onClick={() => onPick(c.id)}
            initial={{ opacity: 0, y: 30, rotate: -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 5) * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -8 }}
            whileTap={{ scale: 0.97 }}
            className="snap-start shrink-0 w-[58%] sm:w-[36%] md:w-[calc((100%-64px)/5)] rounded-[22px] overflow-hidden bg-background/80 dark:bg-white/[0.06] ring-1 ring-foreground/10 text-left group shadow-[0_14px_30px_-18px_hsl(var(--glass-shadow)/0.6)]"
          >
            <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/15 to-gold/20 flex items-center justify-center">
              {c.coverUrl ? (
                <img src={c.coverUrl} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <Gift className="w-10 h-10 text-primary/50" />
              )}
            </div>
            <div className="p-3.5 flex items-end justify-between gap-2">
              <div className="min-w-0">
                {c.tagline && <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground truncate">{c.tagline}</div>}
                <div className="font-bold text-foreground truncate">{c.name}</div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-primary shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </motion.button>
        ))}
      </div>
    </Reveal>
  );
}
