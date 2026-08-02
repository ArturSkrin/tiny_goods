import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Package, Tag, ShoppingCart, LogOut, Settings, LogIn, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useGetAdminSession, useAdminLogin, useSetupAdmin, useAdminLogout, getGetAdminSessionQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: session, isLoading } = useGetAdminSession();
  const login = useAdminLogin();
  const setup = useSetupAdmin();
  const logout = useAdminLogout();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState('');

  const navItems = [
    { href: '/tiny-admin', icon: LayoutDashboard, label: 'Дашборд' },
    { href: '/tiny-admin/orders', icon: ShoppingCart, label: 'Замовлення' },
    { href: '/tiny-admin/products', icon: Package, label: 'Товари' },
    { href: '/tiny-admin/categories', icon: Tag, label: 'Категорії' },
    { href: '/tiny-admin/settings', icon: Settings, label: 'Налаштування' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await login.mutateAsync({ data: { password, totpCode: totpCode || undefined } });
      if ((res as any).status === 'totp_required') {
        setTotpRequired(true);
      } else {
        queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
      }
    } catch (err: any) {
      setError(err.response?.status === 401 ? 'Невірний пароль або код' : 'Помилка авторизації');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Пароль має містити щонайменше 8 символів');
      return;
    }
    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }
    try {
      await setup.mutateAsync({ data: { password } });
      queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
    } catch (err) {
      setError('Помилка при створенні пароля');
    }
  };

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
      setLocation('/tiny-admin');
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated flows
  if (!session?.authenticated) {
    if (session?.setupRequired) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
          <div className="glass-panel p-8 w-full max-w-md rounded-3xl space-y-6">
            <div className="flex justify-center text-primary mb-4">
              <Lock className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-white text-center">Створення пароля</h1>
            <p className="text-white/60 text-center text-sm">
              Це перший запуск. Створіть пароль адміністратора.
            </p>
            <form onSubmit={handleSetup} className="space-y-4">
              <Input 
                type="password" 
                placeholder="Новий пароль (мін. 8 символів)" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Input 
                type="password" 
                placeholder="Підтвердження пароля" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              {error && <div className="text-destructive text-sm text-center">{error}</div>}
              <Button type="submit" className="w-full" disabled={setup.isPending}>
                Зберегти та увійти
              </Button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="glass-panel p-8 w-full max-w-md rounded-3xl space-y-6">
          <div className="flex justify-center text-primary mb-4">
            <LogIn className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">Вхід в адмін-панель</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            {!totpRequired ? (
              <Input 
                type="password" 
                placeholder="Пароль" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            ) : (
              <Input 
                type="text" 
                placeholder="6-значний 2FA код" 
                value={totpCode}
                onChange={e => setTotpCode(e.target.value)}
                required
                maxLength={6}
              />
            )}
            {error && <div className="text-destructive text-sm text-center">{error}</div>}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {totpRequired ? 'Підтвердити код' : 'Увійти'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated layout
  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass-panel md:rounded-none md:border-y-0 md:border-l-0 border-white/10 flex flex-col shrink-0 relative z-20">
        <div className="p-6">
          <Link href="/tiny-admin" className="text-xl font-bold text-white flex items-center gap-2">
            TinyGoods Admin
          </Link>
        </div>
        
        <nav className="flex-1 px-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== '/tiny-admin');
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

        <div className="p-4 mt-auto space-y-2">
          <button 
            onClick={handleLogout}
            disabled={logout.isPending}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-destructive hover:bg-destructive/10 transition-all text-left"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="font-medium">Вихід</span>
          </button>
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
            <ShoppingCart className="w-5 h-5 shrink-0" />
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
