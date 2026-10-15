import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

/** Fades/slides children in once when they scroll into view. */
export function Reveal({ delay = 0, y = 28, ...props }: HTMLMotionProps<'div'> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    />
  );
}

export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: ReactNode; subtitle?: string }) {
  return (
    <div className="space-y-2">
      {eyebrow && <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{eyebrow}</div>}
      <h2 className="font-display text-[28px] leading-[1.1] md:text-[44px] font-semibold tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-sm md:text-base">{subtitle}</p>}
    </div>
  );
}
