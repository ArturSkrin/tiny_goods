import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useCart } from '../context/cart';
import { useSettings } from '../hooks/use-settings';

type Variant = 'light' | 'dark' | 'newyear';

const PALETTES: Record<Variant, { bg: [string, string]; box: string; lid: string; ribbon: string; bow: string; ring: string }> = {
  light: { bg: ['#E0456F', '#9E1641'], box: '#ffffff', lid: '#ffffff', ribbon: '#C21F4F', bow: '#ffffff', ring: '#ffffff' },
  dark: { bg: ['#3a1424', '#1a0710'], box: '#f7b6c9', lid: '#ffd3e0', ribbon: '#e0456f', bow: '#ffd3e0', ring: '#1a0710' },
  newyear: { bg: ['#2f7356', '#173d2c'], box: '#d23447', lid: '#e8485a', ribbon: '#f1c75b', bow: '#f6d77d', ring: '#173d2c' },
};

/** Gift-box icon as an SVG string; `badge` adds a cart counter in the corner. */
export function faviconSvg(variant: Variant, badge: number) {
  const p = PALETTES[variant];
  const count = badge > 9 ? '9+' : String(badge);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient></defs>
<rect width="64" height="64" rx="15" fill="url(#g)"/>
<rect x="16" y="28" width="32" height="22" rx="3" fill="${p.box}"/>
<rect x="14" y="21" width="36" height="9" rx="2.5" fill="${p.lid}"/>
<rect x="29.5" y="21" width="5" height="29" fill="${p.ribbon}"/>
<path d="M32 21c-4-8-12-7.5-10.5-2.5 1 3.2 6 3 10.5 2.5Zm0 0c4-8 12-7.5 10.5-2.5-1 3.2-6 3-10.5 2.5Z" fill="${p.bow}" stroke="${p.bow}" stroke-width="1.5" stroke-linejoin="round"/>
${variant === 'dark' ? `<rect x="14" y="21" width="36" height="29" rx="3" fill="none" stroke="#ff8fb0" stroke-opacity=".45" stroke-width="1"/>` : ''}
${variant === 'newyear' ? `<g stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".9"><path d="M53 8v10M48 13h10M49.5 9.5l7 7M56.5 9.5l-7 7"/></g>` : ''}
${badge > 0 ? `<circle cx="49" cy="15" r="13" fill="#ff2d55" stroke="${p.ring}" stroke-width="3"/><text x="49" y="20.5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${count.length > 1 ? 13 : 16}" fill="#fff">${count}</text>` : ''}
</svg>`;
}

/** Keeps the tab icon (and the title while the tab is hidden) in sync with theme, season and cart. */
export function DynamicFavicon() {
  const { resolvedTheme } = useTheme();
  const { cartCount } = useCart();
  const season = useSettings()?.bannerTheme;
  const variant: Variant = season === 'newyear' ? 'newyear' : resolvedTheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = `data:image/svg+xml,${encodeURIComponent(faviconSvg(variant, cartCount))}`;
  }, [variant, cartCount]);

  // Nudge a buyer who switched tabs with something in the cart.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && cartCount > 0) {
        document.documentElement.dataset.title = document.title;
        document.title = '🛍 Ваш кошик чекає…';
      } else if (document.documentElement.dataset.title) {
        document.title = document.documentElement.dataset.title;
        delete document.documentElement.dataset.title;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [cartCount]);

  return null;
}
