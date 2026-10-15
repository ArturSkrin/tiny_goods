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

const FLOWERS: [number, number, number][] = [
  [70, 40, 1], [130, 22, 0.8], [190, 58, 1.1], [250, 30, 0.75], [40, 95, 0.85], [300, 70, 0.9], [105, 110, 0.7],
];

function Flower({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="0" cy="-11" rx="8" ry="11" fill="#fff" stroke="#f6c7d6" strokeWidth="1" transform={`rotate(${r})`} />
      ))}
      <circle r="4.5" fill="#f7d36b" />
      <circle r="2" fill="#e9a93b" />
    </g>
  );
}

/** Spring illustration of the brand: blossoms, gift box, bag, ribbons and paper shred. */
function Scene() {
  return (
    <svg viewBox="0 0 560 400" className="w-full h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="bb-box" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fbd3df" />
          <stop offset="1" stopColor="#f1b3c6" />
        </linearGradient>
        <linearGradient id="bb-bag" x1="0" x2="1">
          <stop offset="0" stopColor="#b9ecd2" />
          <stop offset="1" stopColor="#97dcbb" />
        </linearGradient>
        <radialGradient id="bb-shadow">
          <stop offset="0" stopColor="#7a5aa6" stopOpacity=".25" />
          <stop offset="1" stopColor="#7a5aa6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="290" cy="372" rx="250" ry="26" fill="url(#bb-shadow)" />

      {/* Gift bag */}
      <g className="bob" style={{ animationDelay: '-1.5s' }}>
        <path d="M335 140 C335 70, 425 70, 425 140" fill="none" stroke="#f5f1e8" strokeWidth="7" strokeLinecap="round" />
        <path d="M352 140 C352 92, 408 92, 408 140" fill="none" stroke="#e7e1d3" strokeWidth="4" strokeLinecap="round" />
        <polygon points="300,130 460,130 470,360 292,360" fill="url(#bb-bag)" />
        <polygon points="460,130 500,148 505,350 470,360" fill="#83cfaa" />
        <polygon points="300,130 460,130 500,148 340,148" fill="#c9f2dd" />
        <circle cx="345" cy="152" r="4" fill="#5fae8a" />
        <circle cx="415" cy="152" r="4" fill="#5fae8a" />
      </g>

      {/* Paper shred */}
      <g stroke="#a8d85a" strokeWidth="3" fill="none" strokeLinecap="round">
        {Array.from({ length: 34 }, (_, i) => {
          const x = 250 + ((i * 23) % 110);
          const y = 300 + ((i * 17) % 60);
          const d = (i % 2 ? 1 : -1) * 6;
          return <path key={i} d={`M${x} ${y} q5 ${d} 10 0 t10 0 t10 0`} stroke={i % 3 ? '#a8d85a' : '#c3e87f'} />;
        })}
      </g>

      {/* Gift box */}
      <g className="bob">
        <polygon points="120,215 300,215 300,365 120,365" fill="url(#bb-box)" />
        <polygon points="300,215 335,198 335,345 300,365" fill="#e9a6bb" />
        <rect x="108" y="190" width="205" height="34" rx="6" fill="#fcdce6" />
        <polygon points="313,190 348,174 348,206 313,224" fill="#f0bccc" />
        <polygon points="108,190 143,174 348,174 313,190" fill="#fde9ef" />
        <rect x="196" y="190" width="26" height="175" fill="#ec8fab" />
        <polygon points="183,174 208,174 330,190 305,190" fill="#f29db7" opacity=".9" />
        <path d="M209 178 C170 130, 120 150, 160 182 Z" fill="#f4a3bd" stroke="#e17f9f" strokeWidth="2" />
        <path d="M211 178 C250 130, 300 150, 260 182 Z" fill="#f4a3bd" stroke="#e17f9f" strokeWidth="2" />
        <path d="M205 182 L185 228 M215 182 L238 226" stroke="#ec8fab" strokeWidth="9" strokeLinecap="round" />
        <circle cx="210" cy="180" r="10" fill="#e98aa7" />
      </g>

      {/* Ribbon spools */}
      {[
        [62, 330, '#bcd5f5'], [62, 302, '#f6c6d6'], [62, 274, '#f7d27a'],
        [150, 346, '#f6c6d6'], [182, 356, '#f7e59a'],
      ].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-34" y="-12" width="68" height="26" fill={c as string} />
          <ellipse cy="14" rx="34" ry="11" fill={c as string} />
          <ellipse cy="-12" rx="34" ry="11" fill="#fff" opacity=".9" />
          <ellipse cy="-12" rx="12" ry="4" fill="#e8e2ef" />
        </g>
      ))}
    </svg>
  );
}

export function BrandBanner() {
  return (
    <Reveal className="relative overflow-hidden rounded-[32px] liquid-glass">
      {/* Spring watercolour backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,#fdf1f6,transparent_60%),radial-gradient(ellipse_at_90%_20%,#e7f0ff,transparent_55%),radial-gradient(ellipse_at_70%_100%,#e5f7ea,transparent_60%),linear-gradient(160deg,#f3eefc,#eaf6f4)] dark:opacity-25" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PETALS.map((p, i) => (
          <span key={i} className="petal" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, scale: String(p.scale) }} />
        ))}
      </div>

      {/* Blossom branch */}
      <svg viewBox="0 0 340 160" className="sway absolute -top-2 -left-4 w-[55%] max-w-[380px] pointer-events-none" aria-hidden="true">
        <path d="M-10 20 C60 40, 120 30, 200 60 S300 90, 340 80" stroke="#8b6b5a" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M90 36 C110 70, 100 100, 120 120 M200 60 C215 40, 240 30, 260 34" stroke="#8b6b5a" strokeWidth="3" fill="none" strokeLinecap="round" />
        {[[150, 45], [230, 70], [60, 70], [280, 92]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="10" ry="5" fill="#9ccf7c" transform={`rotate(${i * 40 - 30} ${x} ${y})`} />
        ))}
        {FLOWERS.map(([x, y, s], i) => <Flower key={i} x={x} y={y} s={s} />)}
      </svg>

      <div className="relative grid md:grid-cols-2 gap-4 items-center p-6 pt-24 md:p-12 md:pt-14">
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
        <Scene />
      </div>
    </Reveal>
  );
}
