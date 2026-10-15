import React from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useGetAdminStats } from '@workspace/api-client-react';
import { formatPrice } from '../lib/utils';
import { Package, ShoppingCart, DollarSign, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Всього доходу", value: formatPrice(stats.totalRevenue), icon: DollarSign, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Нових замовлень", value: stats.newOrders, icon: ShoppingCart, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Товарів у каталозі", value: stats.activeProducts, icon: Package, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Мало на складі", value: stats.lowStockProducts, icon: AlertCircle, color: "text-orange-400", bg: "bg-orange-400/10" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-white">Дашборд</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-panel p-6 rounded-3xl flex items-center gap-4"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${card.bg} ${card.color}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-white/60 text-sm font-medium mb-1">{card.label}</div>
                  <div className="text-2xl font-bold text-white">{card.value}</div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel p-6 rounded-3xl"
          >
            <h2 className="text-xl font-semibold text-white mb-6">Останні замовлення</h2>
            <div className="space-y-4">
              {stats.recentOrders.length === 0 ? (
                <div className="text-white/50 text-sm">Немає замовлень</div>
              ) : (
                stats.recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div>
                      <div className="text-white font-medium">Замовлення #{order.id}</div>
                      <div className="text-white/50 text-sm">{order.customerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary font-bold">{formatPrice(order.total)}</div>
                      <div className="text-white/50 text-xs">{new Date(order.createdAt).toLocaleDateString('uk-UA')}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-panel p-6 rounded-3xl"
          >
            <h2 className="text-xl font-semibold text-white mb-6">Популярні товари</h2>
            <div className="space-y-4">
              {stats.topProducts.length === 0 ? (
                <div className="text-white/50 text-sm">Немає даних</div>
              ) : (
                stats.topProducts.map(tp => (
                  <div key={tp.productId ?? tp.productName} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex-1 pr-4">
                      <div className="text-white font-medium line-clamp-1">{tp.productName}</div>
                      <div className="text-white/50 text-sm">{tp.unitsSold} продано</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-primary font-bold">{formatPrice(tp.revenue)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
