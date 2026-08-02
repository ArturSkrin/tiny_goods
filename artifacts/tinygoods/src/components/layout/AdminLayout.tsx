import React from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Package, Tag, ShoppingCart, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Дашборд' },
    { href: '/admin/orders', icon: ShoppingCart, label: 'Замовлення' },
    { href: '/admin/products', icon: Package, label: 'Товари' },
    { href: '/admin/categories', icon: Tag, label: 'Категорії' },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass-panel md:rounded-none md:border-y-0 md:border-l-0 border-white/10 flex flex-col shrink-0 relative z-20">
        <div className="p-6">
          <Link href="/" className="text-xl font-bold text-white flex items-center gap-2">
            TinyGoods Admin
          </Link>
        </div>
        
        <nav className="flex-1 px-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== '/admin');
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-white/10 text-white shadow-sm border border-white/10" 
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="font-medium">В магазин</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
