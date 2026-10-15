import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Plus, Package, Truck, Wallet, MessageCircle, Ruler } from 'lucide-react';
import type { FaqItem } from '@workspace/api-client-react';
import { Reveal, SectionTitle } from './Reveal';

const ICONS = [Package, Truck, Wallet, Ruler, MessageCircle];

export function Faq({ items }: { items: FaqItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  if (items.length === 0) return null;
  return (
    <section ref={ref} className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
      <Reveal className="hidden lg:block lg:col-span-5 rounded-[32px] overflow-hidden relative min-h-[460px] shadow-[0_24px_50px_-28px_hsl(var(--glass-shadow)/0.8)]">
        <motion.img src="/products/giftbox.jpg" alt="" loading="lazy" style={{ y: imgY }} className="absolute -inset-y-[10%] inset-x-0 w-full h-[120%] object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 font-script text-white text-3xl drop-shadow">Подарунок починається з пакування</div>
      </Reveal>

      <Reveal delay={0.1} className="lg:col-span-7 liquid-glass rounded-[32px] p-5 md:p-10">
        <SectionTitle eyebrow="FAQ" title="Відповіді на основні питання" />
        <AccordionPrimitive.Root type="single" collapsible defaultValue="0" className="mt-6 space-y-2.5">
          {items.map((f, i) => {
            const Icon = ICONS[i % ICONS.length]!;
            return (
            <AccordionPrimitive.Item
              key={i}
              value={String(i)}
              className="rounded-2xl bg-background/60 dark:bg-white/[0.05] ring-1 ring-foreground/10 overflow-hidden data-[state=open]:ring-primary/30 data-[state=open]:shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.6)] transition-shadow"
            >
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="group w-full flex items-center gap-3 p-4 text-left">
                  <span className="w-8 h-8 shrink-0 rounded-full ring-1 ring-gold/50 text-gold flex items-center justify-center transition-all duration-300 group-data-[state=open]:bg-gold group-data-[state=open]:text-white group-data-[state=open]:rotate-45">
                    <Plus className="w-4 h-4" />
                  </span>
                  <span className="flex-1 font-bold text-sm md:text-[15px] text-foreground">{f.q}</span>
                  <Icon className="w-5 h-5 text-gold shrink-0 hidden sm:block" />
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p className="px-4 pb-4 pl-[60px] text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{f.a}</p>
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
            );
          })}
        </AccordionPrimitive.Root>
      </Reveal>
    </section>
  );
}
