import { useRef } from 'react';
import { Link } from 'wouter';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Ruler, Palette, Truck, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Reveal } from './Reveal';
import type { SiteContacts } from '@workspace/api-client-react';
import { contactLinks } from '../../hooks/use-settings';
import { ContactButtons } from '../ContactButtons';

const STEPS = [
  { icon: Ruler, title: 'Розмір під ваш продукт', text: 'Підберемо форму й розмір або зробимо під ваші габарити.' },
  { icon: Palette, title: 'Дизайн і логотип', text: 'Колір, друк, тиснення — щоб пакування впізнавали.' },
  { icon: Truck, title: 'Виготовлення та доставка', text: 'Відправимо Новою Поштою у будь-яке місто України.' },
];

/** Box dieline that draws itself when scrolled into view. */
function Dieline() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const paths = [
    'M140 60h120v120H140z',
    'M140 60l-40-40h120l40 40',
    'M140 180v100h120V180',
    'M260 60h90v120h-90',
    'M140 60H50v120h90',
    'M50 60l20-30h50',
    'M350 60l-20-30h-50',
    'M140 280l20 30h80l20-30',
  ];
  return (
    <svg ref={ref} viewBox="0 0 400 330" className={cn('w-full h-auto', inView && 'in-view')} fill="none">
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          pathLength={1}
          className="draw-path stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
          style={{ transitionDelay: `${i * 0.18}s` }}
        />
      ))}
      <path d="M140 200h120" className="stroke-gold" strokeWidth={1.5} strokeDasharray="4 6" />
      <text x="200" y="125" textAnchor="middle" className="fill-muted-foreground text-[11px] font-semibold">120 × 120</text>
    </svg>
  );
}

export function CustomOrder({ contacts }: { contacts: SiteContacts }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bagY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const bagRotate = useTransform(scrollYProgress, [0, 1], [-8, 6]);

  return (
    <section id="custom" ref={ref} className="scroll-mt-28">
      <Reveal className="liquid-glass rounded-[32px] p-5 md:p-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full ring-1 ring-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-primary" />
            </span>
            Індивідуальне виготовлення
          </div>
          <h2 className="mt-4 font-display text-[28px] leading-[1.1] md:text-[44px] font-semibold tracking-tight text-foreground">
            Не знайшли серед готових? <span className="text-primary">Створимо пакування</span> під ваш продукт
          </h2>

          <ol className="mt-6 space-y-3">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.12 }}
                className="flex gap-3 items-start rounded-2xl p-3 bg-background/50 dark:bg-white/[0.04] ring-1 ring-foreground/10"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm">{i + 1}. {s.title}</div>
                  <div className="text-muted-foreground text-sm">{s.text}</div>
                </div>
              </motion.li>
            ))}
          </ol>

          <div className="mt-6 space-y-3">
            <div className="text-sm font-bold text-foreground">Обговорити замовлення:</div>
            {Object.values(contactLinks(contacts)).some(Boolean) ? (
              <ContactButtons contacts={contacts} />
            ) : (
              <Link
                href="/about"
                className="inline-flex h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold items-center gap-2 shadow-[0_10px_24px_-10px_hsl(var(--primary))] hover:brightness-110 active:scale-[0.98] transition"
              >
                Звʼязатися з нами <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        <div className="relative">
          <Dieline />
          <motion.img
            src="/products/giftbag.jpg"
            alt=""
            loading="lazy"
            style={{ y: bagY, rotate: bagRotate }}
            className="absolute -bottom-4 right-0 w-[42%] aspect-[3/4] object-cover rounded-[22px] shadow-[0_24px_50px_-20px_hsl(var(--glass-shadow)/0.8)] ring-4 ring-background/70"
          />
        </div>
      </Reveal>
    </section>
  );
}
