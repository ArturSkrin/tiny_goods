import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { Reveal } from './Reveal';

const POINTS = [
  { icon: '🎁', text: 'подарункова упаковка' },
  { icon: '🎀', text: 'декоративні стрічки' },
  { icon: '📦', text: 'паперовий наповнювач' },
  { icon: '🛍️', text: 'подарункові пакети' },
];

// Deterministic "random" petals so the layout is stable between renders.
const PETALS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i * 1.7) % 9}s`,
  duration: `${9 + ((i * 13) % 7)}s`,
  scale: 0.7 + ((i * 7) % 5) / 10,
}));

function Photo({ src, className, y, rotate, delay }: {
  src: string;
  className: string;
  y: MotionValue<number>;
  rotate: number;
  delay: number;
}) {
  return (
    <motion.div
      style={{ y, rotate }}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.04, rotate: 0, zIndex: 30 }}
      className={`absolute ${className}`}
    >
      <div className="bob" style={{ animationDelay: `${-delay * 4}s` }}>
        <img
          src={src}
          alt=""
          loading="lazy"
          className="w-full aspect-square object-cover rounded-[22px] ring-[6px] ring-white/90 dark:ring-white/15 shadow-[0_30px_60px_-24px_rgba(90,50,90,0.55)]"
        />
      </div>
    </motion.div>
  );
}

/** Photo collage of real products, floating with a little scroll parallax. */
function Collage() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const slow = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const mid = useTransform(scrollYProgress, [0, 1], [60, -50]);
  const fast = useTransform(scrollYProgress, [0, 1], [90, -70]);

  return (
    <div ref={ref} className="relative w-full aspect-[5/4] md:aspect-square max-w-[560px] mx-auto">
      <Photo src="/products/giftbox.jpg" className="right-0 top-[2%] w-[50%] z-10" y={slow} rotate={7} delay={0} />
      <Photo src="/products/ribbon.jpg" className="left-0 bottom-[4%] w-[50%] z-20" y={mid} rotate={-6} delay={0.15} />
      <Photo src="/products/giftbag.jpg" className="left-[24%] top-[18%] w-[52%] z-20" y={fast} rotate={2} delay={0.3} />
      <Photo src="/products/tissue.jpg" className="right-[2%] bottom-0 w-[30%] z-30" y={mid} rotate={9} delay={0.45} />
    </div>
  );
}

export function BrandBanner() {
  return (
    <Reveal className="relative overflow-hidden rounded-[32px] liquid-glass">
      {/* Soft spring backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,#fdf1f6,transparent_60%),radial-gradient(ellipse_at_90%_20%,#e7f0ff,transparent_55%),radial-gradient(ellipse_at_70%_100%,#e5f7ea,transparent_60%),linear-gradient(160deg,#f3eefc,#eaf6f4)] dark:opacity-25" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PETALS.map((p, i) => (
          <span key={i} className="petal" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, scale: String(p.scale) }} />
        ))}
      </div>

      <div className="relative grid md:grid-cols-2 gap-8 items-center p-6 md:p-12">
        <div className="space-y-4 md:pl-4">
          <h2 className="font-fancy text-[44px] md:text-[64px] leading-none text-[#7b5bb5] dark:text-plum">TinyGoods UA</h2>
          <p className="text-lg md:text-xl font-semibold text-[#4e8f5d] dark:text-[#a8dcb4]">Все для стильного подарункового пакування</p>
          <ul className="space-y-2.5 pt-2">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-lg md:text-xl font-semibold text-[#6d5a8f] dark:text-foreground">
                <span className="w-10 h-10 rounded-xl bg-white/70 dark:bg-white/10 shadow-sm flex items-center justify-center text-xl">{p.icon}</span>
                {p.text}
              </li>
            ))}
          </ul>
          <p className="pt-2 text-muted-foreground font-medium">Створюйте ідеальні подарунки разом з нами</p>
        </div>
        <Collage />
      </div>
    </Reveal>
  );
}
