import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Home, Info, LayoutGrid } from 'lucide-react';
import { useCart } from '../../context/cart';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import CartDrawer from '../store/CartDrawer';
import { ThemeToggle } from '../ThemeToggle';

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5 text-foreground', className)}>
      <img src="/favicon.svg" alt="" className="w-9 h-9 rounded-xl shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.7)]" />
      <span className="font-display font-semibold tracking-tight text-[17px] leading-none">
        TinyGoods<span className="text-primary">.</span>
      </span>
    </Link>
  );
}

/** Go to the home catalog section from anywhere. */
export function useGoToCatalog() {
  const [location, setLocation] = useLocation();
  return () => {
    const scroll = () => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (location === '/') scroll();
    else {
      setLocation('/');
      setTimeout(scroll, 350);
    }
  };
}

function CartBadge({ count, className }: { count: number; className?: string }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className={cn(
            'absolute min-w-5 h-5 px-1 bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center rounded-full ring-2 ring-background',
            className,
          )}
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function StoreLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const goToCatalog = useGoToCatalog();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const desktopNav = [
    { label: 'Головна', href: '/' },
    { label: 'Каталог', onClick: goToCatalog },
    { label: 'Про нас', href: '/about' },
  ];

  const tabs = [
    { key: 'home', label: 'Головна', icon: Home, href: '/', active: location === '/' },
    { key: 'catalog', label: 'Каталог', icon: LayoutGrid, onClick: goToCatalog, active: false },
    { key: 'cart', label: 'Кошик', icon: ShoppingBag, onClick: () => setIsCartOpen(true), active: false, badge: cartCount },
    { key: 'about', label: 'Про нас', icon: Info, href: '/about', active: location === '/about' },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col relative">
      {/* Desktop header */}
      <header className="hidden md:block fixed top-0 inset-x-0 z-40 px-4 pt-4">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className={cn(
            'max-w-6xl mx-auto liquid-glass liquid-glass-refract rounded-full pl-4 pr-2 py-2 flex items-center justify-between transition-[padding] duration-300',
            scrolled && 'py-1.5',
          )}
        >
          <Logo />

          <nav className="flex items-center gap-1">
            {desktopNav.map((item) => {
              const active = item.href === location;
              const cls = cn(
                'relative px-4 py-2 rounded-full text-sm font-semibold transition-colors',
                active ? 'text-foreground' : 'text-foreground/60 hover:text-foreground',
              );
              const inner = (
                <>
                  {active && (
                    <motion.span
                      layoutId="desktop-nav-pill"
                      className="absolute inset-0 rounded-full bg-foreground/[0.07] ring-1 ring-foreground/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </>
              );
              return item.href ? (
                <Link key={item.label} href={item.href} className={cls}>{inner}</Link>
              ) : (
                <button key={item.label} onClick={item.onClick} className={cls}>{inner}</button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative h-10 pl-4 pr-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.8)] hover:brightness-110 active:scale-95 transition"
            >
              <ShoppingBag className="w-4 h-4" />
              Кошик
              <CartBadge count={cartCount} className="-top-1.5 -right-1.5" />
            </button>
          </div>
        </motion.div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="liquid-glass rounded-full pl-3 pr-1.5 py-1.5 flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={location}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 pt-[calc(env(safe-area-inset-top)+5.5rem)] md:pt-28 pb-32 md:pb-16 px-4 max-w-6xl mx-auto w-full"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <footer className="hidden md:block pb-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground border-t border-foreground/10 pt-6">
          <Logo />
          <span>© {new Date().getFullYear()} TinyGoods UA · Доставка Новою Поштою по Україні</span>
        </div>
      </footer>

      {/* Mobile tab bar — app-like */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="liquid-glass liquid-glass-refract rounded-[28px] p-1.5 flex items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const content = (
              <span className="relative flex flex-col items-center gap-0.5 py-1.5">
                {tab.active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute -inset-x-3 inset-y-0 rounded-[22px] bg-primary/12 ring-1 ring-primary/20"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="relative">
                  <Icon className={cn('w-[22px] h-[22px] transition-colors', tab.active ? 'text-primary' : 'text-foreground/55')} strokeWidth={tab.active ? 2.4 : 2} />
                  {tab.badge !== undefined && <CartBadge count={tab.badge} className="-top-2 -right-3" />}
                </span>
                <span className={cn('relative text-[10px] font-semibold', tab.active ? 'text-primary' : 'text-foreground/55')}>
                  {tab.label}
                </span>
              </span>
            );
            const cls = 'flex-1 flex justify-center active:scale-90 transition-transform';
            return tab.href ? (
              <Link key={tab.key} href={tab.href} className={cls}>{content}</Link>
            ) : (
              <button key={tab.key} onClick={tab.onClick} className={cls}>{content}</button>
            );
          })}
        </div>
      </nav>

      <CartDrawer />
    </div>
  );
}
