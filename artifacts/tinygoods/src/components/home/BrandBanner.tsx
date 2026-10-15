import type { CSSProperties } from 'react';
import { Reveal } from './Reveal';

type Season = 'spring' | 'newyear';

/** Colours and copy per seasonal look. */
const THEMES = {
  spring: {
    title: '#7b5bb5',
    subtitle: 'Все для стильного подарункового пакування',
    subtitleColor: '#4e8f5d',
    outro: 'Створюйте ідеальні подарунки разом з нами',
    backdrop:
      'bg-[radial-gradient(ellipse_at_20%_10%,#fdf1f6,transparent_60%),radial-gradient(ellipse_at_90%_20%,#e7f0ff,transparent_55%),radial-gradient(ellipse_at_70%_100%,#e5f7ea,transparent_60%),linear-gradient(160deg,#f3eefc,#eaf6f4)]',
    box: { front: ['#fbd5e0', '#f0b0c4'], side: '#e5a0b6', lidFront: '#fcdde7', lidSide: '#eeb6c8', lidTop: '#fdeaf0' },
    satin: ['#c95c80', '#ea8eab', '#fbd0dd'],
    bag: { front: ['#c4f0d9', '#97d9b9'], side: '#86cfab', sideDark: '#6fbd96', inner: ['#4f9f79', '#7cc6a2'], rope: ['#f6f1e6', '#d6ccb7'], metal: ['#ffffff', '#b9bec6', '#7d838c'], tissue: ['#ffffff', '#f7e3ea'] },
    spools: [
      ['#e8a7bb', '#f9d8e2', '#c47d94'],
      ['#f3c96a', '#fde9b5', '#c99a35'],
      ['#a9c8ef', '#dfeafc', '#7d9fca'],
      ['#c9b2ea', '#ece2fa', '#9a80c2'],
      ['#f6c9a4', '#fde6d4', '#cf9a72'],
    ],
    shred: ['#a8d85a', '#c3e87f', '#8cc63f'],
  },
  newyear: {
    title: '#b3233d',
    subtitle: 'Новорічне пакування для ваших подарунків',
    subtitleColor: '#2f6b4f',
    outro: 'Створюйте святкові подарунки разом з нами',
    backdrop:
      'bg-[radial-gradient(ellipse_at_15%_0%,#ffffff,transparent_55%),radial-gradient(ellipse_at_85%_15%,#fff3d6,transparent_45%),radial-gradient(ellipse_at_60%_100%,#e3eef8,transparent_60%),linear-gradient(170deg,#eef4fb,#f7f3ee)]',
    box: { front: ['#d23447', '#9e1a2d'], side: '#8a1526', lidFront: '#dc4255', lidSide: '#9f1c2f', lidTop: '#e85a6a' },
    satin: ['#a87a1c', '#e2b64c', '#fbe9a8'],
    bag: { front: ['#2f7356', '#1f5540'], side: '#1d4a36', sideDark: '#163a2a', inner: ['#0f2a1e', '#245c45'], rope: ['#f1d58a', '#b8902e'], metal: ['#fff6d6', '#d9b45a', '#8a6a1e'], tissue: ['#ffffff', '#f3d6da'] },
    spools: [
      ['#c8283c', '#f2a0aa', '#8e1526'],
      ['#e2b64c', '#fbeab0', '#a87a1c'],
      ['#2f7356', '#a6d8bf', '#1d4a36'],
      ['#f4f1ec', '#ffffff', '#c9c3b8'],
      ['#c8283c', '#f2a0aa', '#8e1526'],
    ],
    shred: ['#e2b64c', '#f3d27a', '#c8283c'],
  },
} as const;

const POINTS = [
  { icon: '🎁', text: 'подарункова упаковка' },
  { icon: '🎀', text: 'декоративні стрічки' },
  { icon: '📦', text: 'паперовий наповнювач' },
  { icon: '🛍️', text: 'подарункові пакети' },
];

// Deterministic "random" particles so the layout is stable between renders.
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${-((i * 1.7) % 11)}s`,
  duration: `${9 + ((i * 13) % 8)}s`,
  size: 4 + ((i * 7) % 6),
}));

/* ── Falling snow ────────────────────────────────────────────────────── */

// One arm of each crystal design (drawn pointing up from the centre, repeated 6×).
const SNOW_ARMS = [
  'M0 0V-10 M0 -4 L-3 -7 M0 -4 L3 -7 M0 -7 L-2 -9 M0 -7 L2 -9',
  'M0 0V-10 M0 -5 L-4 -8 M0 -5 L4 -8 M-1.5 -10 L1.5 -10',
  'M0 0V-10 M0 -3 L-2.5 -5 M0 -3 L2.5 -5 M0 -6 L-3.5 -9 M0 -6 L3.5 -9',
  'M0 -2V-10 M-2 -8 L0 -10 L2 -8 M0 -5 L-3 -5.5 M0 -5 L3 -5.5',
];

function FallingSnowflake({ variant, size, style }: { variant: number; size: number; style: CSSProperties }) {
  const arm = SNOW_ARMS[variant % SNOW_ARMS.length];
  return (
    <svg viewBox="-12 -12 24 24" width={size} height={size} className="snowflake" style={style} aria-hidden="true">
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* bluish outline so white flakes read on a light backdrop */}
        <g stroke="#8fb0d9" strokeWidth="2.6" opacity=".55">
          {[0, 60, 120, 180, 240, 300].map((r) => <path key={r} d={arm} transform={`rotate(${r})`} />)}
        </g>
        <g stroke="#fff" strokeWidth="1.4">
          {[0, 60, 120, 180, 240, 300].map((r) => <path key={r} d={arm} transform={`rotate(${r})`} />)}
        </g>
        {variant % 2 === 0 && <circle r="1.6" fill="#fff" stroke="#8fb0d9" strokeWidth=".6" />}
      </g>
    </svg>
  );
}

/* ── Branches ─────────────────────────────────────────────────────────── */

function Flower({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="0" cy="-11" rx="8" ry="11" fill="url(#bb-petal)" stroke="#f3bfd0" strokeWidth="0.8" transform={`rotate(${r})`} />
      ))}
      <circle r="4.5" fill="#f7d36b" />
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <circle key={r} cx="0" cy="-6.5" r="0.9" fill="#d4892b" transform={`rotate(${r})`} />
      ))}
    </g>
  );
}

function BlossomBranch() {
  const flowers: [number, number, number][] = [[70, 40, 1], [130, 22, 0.8], [190, 58, 1.1], [250, 30, 0.75], [40, 95, 0.85], [300, 70, 0.9], [105, 110, 0.7]];
  return (
    <>
      <path d="M-10 20 C60 40, 120 30, 200 60 S300 90, 340 80" stroke="#7d5f4e" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M90 36 C110 70, 100 100, 120 120 M200 60 C215 40, 240 30, 260 34" stroke="#7d5f4e" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[[150, 45], [230, 70], [60, 70], [280, 92]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="10" ry="5" fill="#9ccf7c" transform={`rotate(${i * 40 - 30} ${x} ${y})`} />
      ))}
      {flowers.map(([x, y, s], i) => <Flower key={i} x={x} y={y} s={s} />)}
    </>
  );
}

/** Needles fanned along a quadratic curve. */
function needles(p0: number[], p1: number[], p2: number[], count: number, len: number) {
  const out: { x1: number; y1: number; x2: number; y2: number; c: string }[] = [];
  const greens = ['#1f4d33', '#2b6343', '#357a52', '#24573a'];
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const x = (1 - t) ** 2 * p0[0]! + 2 * (1 - t) * t * p1[0]! + t * t * p2[0]!;
    const y = (1 - t) ** 2 * p0[1]! + 2 * (1 - t) * t * p1[1]! + t * t * p2[1]!;
    const dx = 2 * (1 - t) * (p1[0]! - p0[0]!) + 2 * t * (p2[0]! - p1[0]!);
    const dy = 2 * (1 - t) * (p1[1]! - p0[1]!) + 2 * t * (p2[1]! - p1[1]!);
    const a = Math.atan2(dy, dx);
    for (let k = 0; k < 7; k++) {
      const side = k % 2 ? 1 : -1;
      const spread = (0.55 + (k % 3) * 0.25) * side;
      const l = len * (0.75 + ((i + k) % 4) * 0.1) * (1 - t * 0.35);
      out.push({ x1: x, y1: y, x2: x + Math.cos(a + spread) * l, y2: y + Math.sin(a + spread) * l, c: greens[(i + k) % greens.length]! });
    }
  }
  return out;
}

function PineCone({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <ellipse rx="9" ry="15" fill="url(#bb-cone)" />
      {[-9, -3, 3, 9].map((cy) => (
        <path key={cy} d={`M-8 ${cy} Q0 ${cy + 5} 8 ${cy}`} stroke="#5a3a22" strokeWidth="1.2" fill="none" opacity=".8" />
      ))}
      <path d="M0 -15 L0 -22" stroke="#5a3a22" strokeWidth="2" />
    </g>
  );
}

function PineBranch() {
  const main = needles([-10, 22], [150, 4], [345, 72], 26, 24);
  const twig = needles([170, 30], [190, 70], [215, 110], 8, 18);
  const twig2 = needles([80, 22], [95, 50], [92, 78], 6, 16);
  return (
    <>
      <path d="M-10 22 Q150 4 345 72" stroke="#5b3d2a" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M170 30 Q190 70 215 110 M80 22 Q95 50 92 78" stroke="#5b3d2a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <g strokeWidth="1.6" strokeLinecap="round">
        {[...main, ...twig, ...twig2].map((n, i) => (
          <line key={i} x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2} stroke={n.c} />
        ))}
      </g>
      {/* Snow resting on top of the branch */}
      <g fill="#fff" stroke="#b9cde6" strokeWidth="1" style={{ filter: 'drop-shadow(0 1px 1.5px rgba(90,120,170,.35))' }}>
        <path d="M10 14 q25 -10 50 -6 q12 2 16 8 q-30 -2 -66 -2Z" />
        <path d="M120 2 q30 -8 60 0 q8 3 10 8 q-35 -6 -70 -8Z" />
        <path d="M240 26 q28 0 50 12 q6 4 6 8 q-30 -14 -56 -20Z" />
        <ellipse cx="205" cy="98" rx="10" ry="3" />
      </g>
      <PineCone x={150} y={34} r={8} />
      <PineCone x={262} y={66} r={-14} />
      {[[205, 48], [213, 44], [209, 54], [60, 34], [67, 39]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="url(#bb-berry)" />
      ))}
    </>
  );
}

/* ── Scene objects ───────────────────────────────────────────────────── */

function Rope({ d, colors }: { d: string; colors: readonly [string, string] }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={colors[1]} strokeWidth="7" />
      <path d={d} stroke={colors[0]} strokeWidth="5.5" />
      {/* Twisted-strand look */}
      <path d={d} stroke={colors[1]} strokeWidth="5.5" strokeDasharray="1.6 3.2" opacity=".8" />
      <path d={d} stroke="#fff" strokeWidth="1.2" opacity=".45" transform="translate(-1 -1)" />
    </g>
  );
}

function Grommet({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="5.5" fill="url(#bb-metal)" />
      <circle cx={x} cy={y} r="2.6" fill="#2b2b2b" opacity=".75" />
    </g>
  );
}

function Snowflake({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#e9c76a" strokeWidth="1.4" strokeLinecap="round" opacity=".85">
      {[0, 60, 120].map((r) => (
        <g key={r} transform={`rotate(${r})`}>
          <line x1="-9" y1="0" x2="9" y2="0" />
          <path d="M5 0 l3 -3 M5 0 l3 3 M-5 0 l-3 -3 M-5 0 l-3 3" />
        </g>
      ))}
    </g>
  );
}

function Bag({ t, season }: { t: (typeof THEMES)[Season]; season: Season }) {
  const b = t.bag;
  return (
    <g className="bob" style={{ animationDelay: '-2s' }}>
      {/* opening: inner back wall seen from slightly above */}
      <polygon points="300,130 460,130 500,114 340,114" fill="url(#bb-bag-inner)" />
      {/* back handle */}
      <Rope d="M356 116 C354 64, 448 60, 450 116" colors={[b.rope[1], b.rope[1]]} />
      {/* tissue paper puffing out */}
      <g>
        <path d="M314 132 C306 104, 332 88, 348 104 C350 78, 384 72, 394 96 C404 74, 438 78, 440 104 C456 92, 482 104, 478 128 Z" fill="url(#bb-tissue)" stroke="#e7d9df" strokeWidth="1" />
        <path d="M348 104 C354 114, 350 124, 344 132 M394 96 C398 110, 396 122, 390 132 M440 104 C444 116, 442 124, 436 132" stroke="#e3d3da" strokeWidth="1.2" fill="none" />
      </g>
      {/* front face + side gusset with its V fold */}
      <g filter="url(#bb-paper)">
        <polygon points="300,130 460,130 468,360 294,360" fill="url(#bb-bag-front)" />
        <polygon points="460,130 500,114 503,300 484,312 466,300" fill={b.side} />
        <polygon points="466,300 484,312 468,360" fill={b.sideDark} />
        <polygon points="484,312 503,300 505,340 468,360" fill={b.sideDark} opacity=".85" />
        <line x1="480" y1="122" x2="484" y2="312" stroke="#000" strokeOpacity=".08" />
      </g>
      {/* embossed logo */}
      {season === 'spring' && (
        <text x="381" y="270" textAnchor="middle" fontFamily="Lobster, cursive" fontSize="26" fill="#fff" fillOpacity=".55">TinyGoods</text>
      )}
      {/* folded rim + creases */}
      <polygon points="300,130 460,130 461,146 299,146" fill="#fff" opacity=".14" />
      <line x1="299" y1="146" x2="461" y2="146" stroke="#000" strokeOpacity=".12" />
      <line x1="296" y1="318" x2="467" y2="318" stroke="#000" strokeOpacity=".08" />
      <path d="M300 130 L294 360" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
      {season === 'newyear' && (
        <g>
          {[[330, 200, 1], [410, 180, 0.8], [372, 250, 1.2], [440, 290, 0.9], [320, 300, 0.7], [436, 225, 0.6]].map(([x, y, s], i) => (
            <Snowflake key={i} x={x!} y={y!} s={s!} />
          ))}
        </g>
      )}
      {/* front handle through grommets */}
      <Rope d="M335 152 C333 74, 427 74, 425 152" colors={b.rope} />
      <Grommet x={335} y={152} />
      <Grommet x={425} y={152} />
      {/* hang tag */}
      <path d="M335 156 Q348 180 362 186" stroke={b.rope[1]} strokeWidth="1.5" fill="none" />
      <g transform="translate(370 200) rotate(-8)">
        <circle r="22" fill="#d8b98c" stroke="#b8956a" strokeWidth="1" />
        <circle r="22" fill="url(#bb-tag-shade)" />
        <circle cy="-15" r="2" fill="#8a6a48" />
        <text y="4" textAnchor="middle" fontFamily="Marck Script, cursive" fontSize="9" fill="#5b4330">
          {season === 'newyear' ? 'З Новим' : 'з любовʼю'}
        </text>
      </g>
    </g>
  );
}

function Box({ t }: { t: (typeof THEMES)[Season] }) {
  const b = t.box;
  return (
    <g className="bob">
      <polygon points="120,215 300,215 300,365 120,365" fill="url(#bb-box-front)" />
      <polygon points="300,215 335,198 335,345 300,365" fill={b.side} />
      <polygon points="120,224 300,224 300,236 120,236" fill="#000" opacity=".08" />
      <rect x="108" y="190" width="205" height="34" rx="5" fill={b.lidFront} />
      <rect x="108" y="190" width="205" height="34" rx="5" fill="url(#bb-lid-shade)" />
      <polygon points="313,190 348,174 348,206 313,224" fill={b.lidSide} />
      <polygon points="108,190 143,174 348,174 313,190" fill={b.lidTop} />
      {/* satin ribbon */}
      <rect x="196" y="190" width="26" height="175" fill="url(#bb-satin-v)" />
      <polygon points="186,174 211,174 333,190 308,190" fill="url(#bb-satin-h)" />
      {/* bow */}
      <path d="M209 178 C166 124, 112 150, 158 184 C176 192, 196 186, 209 178 Z" fill="url(#bb-satin-loop)" />
      <path d="M209 178 C178 150, 146 156, 160 178" fill="none" stroke={t.satin[0]} strokeOpacity=".45" strokeWidth="3" />
      <path d="M211 178 C254 124, 308 150, 262 184 C244 192, 224 186, 211 178 Z" fill="url(#bb-satin-loop)" />
      <path d="M211 178 C242 150, 274 156, 260 178" fill="none" stroke={t.satin[0]} strokeOpacity=".45" strokeWidth="3" />
      <path d="M204 186 C196 206, 188 220, 178 236 L190 240 C198 224, 206 206, 210 190 Z" fill="url(#bb-satin-v)" />
      <path d="M216 186 C226 206, 236 220, 246 234 L234 240 C226 224, 216 206, 212 190 Z" fill="url(#bb-satin-v)" />
      <ellipse cx="210" cy="181" rx="11" ry="9" fill="url(#bb-satin-loop)" />
      <ellipse cx="207" cy="178" rx="4" ry="2.5" fill="#fff" opacity=".55" />
    </g>
  );
}

function Spool({ x, y, c, i }: { x: number; y: number; c: readonly [string, string, string]; i: number }) {
  const rx = 34, ry = 11, h = 26;
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cy={h + 1} rx={rx + 4} ry={ry + 1.5} fill="#b48f63" />
      <path d={`M${-rx} 0 L${-rx} ${h} A${rx} ${ry} 0 0 0 ${rx} ${h} L${rx} 0 Z`} fill={`url(#bb-spool-${i})`} />
      <path d={`M${-rx} ${h * 0.45} A${rx} ${ry} 0 0 0 ${rx} ${h * 0.45}`} fill="none" stroke={c[2]} strokeOpacity=".35" />
      <ellipse rx={rx + 4} ry={ry + 1.5} fill="url(#bb-kraft)" />
      <ellipse rx={rx - 4} ry={ry - 3} fill="none" stroke="#9c7a52" strokeOpacity=".35" />
      <ellipse rx="7" ry="2.4" fill="#4a3627" />
    </g>
  );
}

function Scene({ season }: { season: Season }) {
  const t = THEMES[season];
  const spoolPos: [number, number][] = [[62, 330], [62, 300], [62, 270], [150, 346], [196, 356]];
  return (
    <svg viewBox="0 0 560 400" className="w-full h-auto" aria-hidden="true">
      <defs>
        <filter id="bb-paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0" result="grain" />
          <feComposite in="grain" in2="SourceGraphic" operator="in" result="g" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="g" /></feMerge>
        </filter>
        <filter id="bb-blur"><feGaussianBlur stdDeviation="8" /></filter>
        <linearGradient id="bb-box-front" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={t.box.front[0]} /><stop offset="1" stopColor={t.box.front[1]} /></linearGradient>
        <linearGradient id="bb-lid-shade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity=".08" /></linearGradient>
        <linearGradient id="bb-satin-v" x1="0" x2="1"><stop offset="0" stopColor={t.satin[0]} /><stop offset=".45" stopColor={t.satin[1]} /><stop offset=".55" stopColor={t.satin[2]} /><stop offset="1" stopColor={t.satin[0]} /></linearGradient>
        <linearGradient id="bb-satin-h" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={t.satin[2]} /><stop offset="1" stopColor={t.satin[1]} /></linearGradient>
        <radialGradient id="bb-satin-loop" cx=".35" cy=".35" r=".8"><stop offset="0" stopColor={t.satin[2]} /><stop offset=".55" stopColor={t.satin[1]} /><stop offset="1" stopColor={t.satin[0]} /></radialGradient>
        <linearGradient id="bb-bag-front" x1="0" x2="1"><stop offset="0" stopColor={t.bag.front[0]} /><stop offset="1" stopColor={t.bag.front[1]} /></linearGradient>
        <linearGradient id="bb-bag-inner" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={t.bag.inner[0]} /><stop offset="1" stopColor={t.bag.inner[1]} /></linearGradient>
        <linearGradient id="bb-tissue" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={t.bag.tissue[0]} /><stop offset="1" stopColor={t.bag.tissue[1]} /></linearGradient>
        <radialGradient id="bb-metal" cx=".35" cy=".35"><stop offset="0" stopColor={t.bag.metal[0]} /><stop offset=".6" stopColor={t.bag.metal[1]} /><stop offset="1" stopColor={t.bag.metal[2]} /></radialGradient>
        <radialGradient id="bb-tag-shade" cx=".3" cy=".3"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity=".12" /></radialGradient>
        <radialGradient id="bb-kraft" cx=".4" cy=".35"><stop offset="0" stopColor="#e6cda6" /><stop offset="1" stopColor="#c5a274" /></radialGradient>
        <radialGradient id="bb-shadow"><stop offset="0" stopColor="#5a4070" stopOpacity=".3" /><stop offset="1" stopColor="#5a4070" stopOpacity="0" /></radialGradient>
        {t.spools.map((c, i) => (
          <linearGradient key={i} id={`bb-spool-${i}`} x1="0" x2="1">
            <stop offset="0" stopColor={c[2]} />
            <stop offset=".2" stopColor={c[0]} />
            <stop offset=".42" stopColor={c[1]} />
            <stop offset=".5" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".58" stopColor={c[1]} />
            <stop offset=".82" stopColor={c[0]} />
            <stop offset="1" stopColor={c[2]} />
          </linearGradient>
        ))}
        <linearGradient id="bb-tail" x1="0" x2="1"><stop offset="0" stopColor={t.spools[3][2]} /><stop offset=".5" stopColor={t.spools[3][1]} /><stop offset="1" stopColor={t.spools[3][0]} /></linearGradient>
      </defs>

      <ellipse cx="290" cy="372" rx="250" ry="24" fill="url(#bb-shadow)" />

      <Bag t={t} season={season} />

      {/* paper shred */}
      <g fill="none" strokeLinecap="round" strokeWidth="2.6">
        {Array.from({ length: 40 }, (_, i) => {
          const x = 248 + ((i * 23) % 118);
          const y = 296 + ((i * 17) % 64);
          const d = (i % 2 ? 1 : -1) * (4 + (i % 3) * 2);
          return <path key={i} d={`M${x} ${y} q5 ${d} 10 0 t10 0 t10 0`} stroke={t.shred[i % 3]} />;
        })}
      </g>

      <Box t={t} />

      {/* loose ribbon tail curling on the floor */}
      <path d="M190 362 C230 372, 250 392, 300 380 S360 372, 392 388" fill="none" stroke="url(#bb-tail)" strokeWidth="11" strokeLinecap="round" />
      <path d="M190 360 C230 370, 250 390, 300 378 S360 370, 392 386" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2" />

      {spoolPos.map(([x, y], i) => <Spool key={i} x={x} y={y} c={t.spools[i % t.spools.length]!} i={i % t.spools.length} />)}
    </svg>
  );
}

export function BrandBanner({ season = 'spring' }: { season?: Season }) {
  const t = THEMES[season];
  const winter = season === 'newyear';
  return (
    <Reveal className="relative overflow-hidden rounded-[32px] liquid-glass">
      <div className={`absolute inset-0 ${t.backdrop} dark:opacity-25`} />
      {winter && (
        <div className="absolute inset-0 pointer-events-none">
          {[[18, 30, 90], [72, 18, 120], [88, 62, 70], [45, 80, 100]].map(([l, tp, s], i) => (
            <span key={i} className="absolute rounded-full bg-[radial-gradient(circle,rgba(255,214,120,.45),transparent_70%)]" style={{ left: `${l}%`, top: `${tp}%`, width: s, height: s }} />
          ))}
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {winter
          ? PARTICLES.map((p, i) => (
              <FallingSnowflake
                key={i}
                variant={i}
                size={10 + p.size * 2.2}
                style={{ left: p.left, animationDelay: p.delay, animationDuration: `${parseFloat(p.duration) + 4}s` }}
              />
            ))
          : PARTICLES.slice(0, 14).map((p, i) => (
              <span key={i} className="petal" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration }} />
            ))}
      </div>

      <svg viewBox="0 0 340 160" className="absolute -top-2 -left-4 w-[55%] max-w-[380px] pointer-events-none" aria-hidden="true">
        <defs>
          <radialGradient id="bb-petal" cx=".5" cy=".8"><stop offset="0" stopColor="#ffe6ef" /><stop offset="1" stopColor="#ffffff" /></radialGradient>
          <radialGradient id="bb-cone" cx=".4" cy=".3"><stop offset="0" stopColor="#a5703f" /><stop offset="1" stopColor="#5a3a22" /></radialGradient>
          <radialGradient id="bb-berry" cx=".35" cy=".35"><stop offset="0" stopColor="#ff8a8a" /><stop offset="1" stopColor="#b3122a" /></radialGradient>
        </defs>
        {winter ? <PineBranch /> : <BlossomBranch />}
      </svg>

      <div className="relative grid md:grid-cols-2 gap-4 items-center p-6 pt-24 md:p-12 md:pt-14">
        <div className="space-y-4 md:pl-4">
          <h2 className="font-fancy text-[44px] md:text-[64px] leading-none dark:!text-plum" style={{ color: t.title }}>TinyGoods UA</h2>
          <p className="text-lg md:text-xl font-semibold dark:!text-[#a8dcb4]" style={{ color: t.subtitleColor }}>{t.subtitle}</p>
          <ul className="space-y-2.5 pt-2">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-lg md:text-xl font-semibold text-[#6d5a8f] dark:text-foreground">
                <span className="w-10 h-10 rounded-xl bg-white/70 dark:bg-white/10 shadow-sm flex items-center justify-center text-xl">{p.icon}</span>
                {p.text}
              </li>
            ))}
          </ul>
          <p className="pt-2 text-muted-foreground font-medium">{t.outro}</p>
        </div>
        <Scene season={season} />
      </div>
    </Reveal>
  );
}
