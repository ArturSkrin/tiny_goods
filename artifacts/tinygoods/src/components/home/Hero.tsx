import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Search, PackageOpen, Send, Truck, Wallet, Sparkles } from 'lucide-react';
import type { Category } from '@workspace/api-client-react';
import { PromoCarousel } from './PromoCarousel';

const fieldCls =
  'w-full h-12 rounded-2xl bg-background/70 dark:bg-white/5 border border-foreground/10 px-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition';

export function Hero({
  categories,
  onFind,
}: {
  categories: Category[];
  onFind: (query: string, categoryId: number | null) => void;
}) {
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
        className="lg:col-span-7 liquid-glass rounded-[32px] p-5 md:p-9 flex flex-col"
      >
        <motion.div variants={item} className="inline-flex self-start items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" /> Пакування · Подарунки · Дім
        </motion.div>

        <motion.h1 variants={item} className="mt-4 font-display text-[30px] leading-[1.08] md:text-[52px] font-semibold tracking-tight text-foreground">
          Пакування, яке <span className="text-gradient-brand">хочеться відкривати</span>
        </motion.h1>
        <motion.p variants={item} className="mt-3 text-muted-foreground md:text-lg max-w-xl">
          Коробки, пакети, стрічки та тішʼю зі складу, а ще затишне світло й корисні дрібниці для дому.
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
          <label className="space-y-1.5">
            <span className="text-xs font-bold text-foreground/70 ml-1">Що шукаєте?</span>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              className={fieldCls}
            >
              <option value="">Усі категорії</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
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

        <motion.div variants={item} className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() => onFind('', null)}
            className="h-12 rounded-2xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] hover:opacity-90 transition"
          >
            <PackageOpen className="w-4 h-4" /> Обрати готове
          </button>
          <a
            href="#custom"
            className="h-12 rounded-2xl ring-1 ring-primary/40 text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 active:scale-[0.98] transition"
          >
            <Send className="w-4 h-4" /> Замовити своє
          </a>
        </motion.div>

        <motion.ul variants={item} className="mt-6 pt-5 border-t border-foreground/10 grid grid-cols-3 gap-2 text-[11px] md:text-xs text-muted-foreground font-semibold">
          <li className="flex flex-col md:flex-row md:items-center gap-1.5"><Truck className="w-4 h-4 text-primary" /> Нова Пошта по Україні</li>
          <li className="flex flex-col md:flex-row md:items-center gap-1.5"><Wallet className="w-4 h-4 text-primary" /> Оплата при отриманні або онлайн</li>
          <li className="flex flex-col md:flex-row md:items-center gap-1.5"><PackageOpen className="w-4 h-4 text-primary" /> Замовлення від 300 ₴</li>
        </motion.ul>
      </motion.div>

      <div className="lg:col-span-5 min-w-0">
        <PromoCarousel onPick={(q) => onFind(q, null)} />
      </div>
    </section>
  );
}
