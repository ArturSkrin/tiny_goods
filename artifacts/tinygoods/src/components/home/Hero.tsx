import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Search, PackageOpen, Truck, Wallet, Sparkles } from 'lucide-react';
import type { Category, SiteSettings } from '@workspace/api-client-react';
import { PromoCarousel } from './PromoCarousel';
import { formatPrice } from '../../lib/utils';
import { GlassSelect } from '../GlassSelect';

const fieldCls =
  'w-full h-12 rounded-2xl bg-background/70 dark:bg-white/5 border border-foreground/10 px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition';

export function Hero({
  settings,
  categories,
  onFind,
}: {
  settings: SiteSettings;
  categories: Category[];
  onFind: (query: string, categoryId: number | null) => void;
}) {
  const { hero } = settings;
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
  const item: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="lg:col-span-5 liquid-glass rounded-[32px] p-5 md:p-8 flex flex-col"
      >
        {hero.eyebrow && (
          <motion.div variants={item} className="inline-flex self-start items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> {hero.eyebrow}
          </motion.div>
        )}

        <motion.h1 variants={item} className="mt-4 font-display text-[30px] leading-[1.08] md:text-[44px] font-semibold tracking-tight text-foreground">
          <span className="font-fancy font-normal text-[1.12em] leading-[1] text-plum">{hero.title}</span>{' '}
          <span className="text-gradient-brand">{hero.titleAccent}</span>
        </motion.h1>
        <motion.p variants={item} className="mt-3 text-muted-foreground md:text-lg max-w-xl">
          {hero.subtitle}
        </motion.p>

        {/* Finder */}
        <motion.form
          variants={item}
          onSubmit={(e) => {
            e.preventDefault();
            onFind(query.trim(), categoryId);
          }}
          className="mt-6 rounded-[24px] bg-background/50 dark:bg-white/[0.04] ring-1 ring-foreground/10 p-3 md:p-4 grid sm:grid-cols-2 gap-3"
        >
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-foreground/70 ml-1">Що шукаєте?</span>
            <GlassSelect<number | null>
              value={categoryId}
              onChange={setCategoryId}
              options={[{ value: null, label: 'Усі категорії' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              className={fieldCls}
            />
          </div>
          <label className="space-y-1.5">
            <span className="text-xs font-bold text-foreground/70 ml-1">Назва або слово</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Коробка, стрічка, нічник…"
              className={fieldCls}
            />
          </label>
          <button
            type="submit"
            className="sm:col-span-2 h-12 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_hsl(var(--primary))] hover:brightness-110 active:scale-[0.98] transition"
          >
            <Search className="w-4 h-4" /> Підібрати
          </button>
        </motion.form>

        <motion.ul variants={item} className="mt-6 pt-5 border-t border-foreground/10 grid grid-cols-3 gap-2 text-[11px] md:text-xs text-muted-foreground font-semibold">
          <li className="flex flex-col md:flex-row md:items-center gap-1.5"><Truck className="w-4 h-4 text-primary" /> Нова Пошта по Україні</li>
          <li className="flex flex-col md:flex-row md:items-center gap-1.5"><Wallet className="w-4 h-4 text-primary" /> Оплата карткою або за реквізитами</li>
          <li className="flex flex-col md:flex-row md:items-center gap-1.5"><PackageOpen className="w-4 h-4 text-primary" /> Замовлення від {formatPrice(settings.minOrderTotal)}</li>
        </motion.ul>
      </motion.div>

      {/* On phones the carousel comes first, above the finder card. */}
      <div className="lg:col-span-7 min-w-0 order-first lg:order-none">
        <PromoCarousel promos={settings.promos} onPick={(q) => onFind(q, null)} />
      </div>
    </section>
  );
}
