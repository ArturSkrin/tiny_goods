import React from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingBag, Home, Info, User } from 'lucide-react';
import { useCart } from '../../context/cart';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import CartDrawer from '../store/CartDrawer';

export function StoreLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { cartCount, setIsCartOpen } = useCart();

  const navItems = [
    { href: '/', icon: Home, label: 'Головна' },
    { href: '/about', icon: Info, label: 'Про нас' },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col pb-20 md:pb-0 relative">
      {/* Desktop Header */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-40 p-4">
        <div className="max-w-6xl mx-auto glass-panel rounded-2xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </span>
            TinyGoods UA
          </Link>

          <nav className="flex items-center gap-8">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  location === item.href ? "text-primary" : "text-white/70"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 rounded-full glass hover:bg-white/10 transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-white" />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center rounded-full"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 p-4">
        <div className="glass rounded-full px-5 py-3 flex items-center justify-center">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            TinyGoods UA
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-24 md:pt-32 px-4 max-w-6xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 z-40">
        <div className="glass-panel rounded-full p-2 flex items-center justify-around pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="flex-1 flex justify-center py-2">
                <div className={cn(
                  "flex flex-col items-center gap-1 transition-colors",
                  isActive ? "text-primary" : "text-white/50 hover:text-white"
                )}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="flex-1 flex justify-center py-2 relative"
          >
            <div className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition-colors">
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">Кошик</span>
            </div>
          </button>
        </div>
      </nav>

      <CartDrawer />
    </div>
  );
}
