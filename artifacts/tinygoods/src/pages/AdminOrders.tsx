import React, { useState } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useListOrders, useUpdateOrder, getListOrdersQueryKey } from '@workspace/api-client-react';
import { formatPrice } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useQueryClient } from '@tanstack/react-query';

const statusLabels: Record<string, string> = {
  new: 'Нове',
  confirmed: 'Підтверджено',
  shipped: 'Відправлено',
  completed: 'Виконано',
  cancelled: 'Скасовано'
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Очікує',
  paid: 'Оплачено',
  failed: 'Помилка',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  paid: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-destructive/20 text-destructive-foreground border-destructive/30',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  confirmed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  shipped: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-destructive/20 text-destructive-foreground border-destructive/30'
};

export default function AdminOrders() {
  const [filter, setFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  
  const { data: orders, isLoading } = useListOrders(
    filter === 'all' ? undefined : { status: filter }
  );
  const updateOrder = useUpdateOrder();

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateOrder.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-white">Замовлення</h1>
          
          <div className="w-full sm:w-64">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Всі статуси" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі статуси</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !orders?.length ? (
          <div className="glass-panel p-12 text-center text-white/50 rounded-3xl">
            Замовлень не знайдено
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <div className="text-lg font-bold text-white mb-1">
                        #{order.id} • {formatPrice(order.total)}
                      </div>
                      <div className="text-sm text-white/50">
                        {new Date(order.createdAt).toLocaleString('uk-UA')}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <div className={`px-3 py-1.5 rounded-xl border text-sm font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status] || order.status}
                      </div>
                      {order.paymentMethod === 'liqpay' && (
                        <div className={`px-3 py-1.5 rounded-xl border text-sm font-medium ${paymentStatusColors[order.paymentStatus] ?? 'bg-white/10 text-white/60 border-white/10'}`}>
                          💳 {paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4 text-sm text-white/80">
                    <div>
                      <div className="text-white/40 mb-1">Клієнт</div>
                      <div>{order.customerName}</div>
                      <div>{order.phone} · {({ viber: 'Viber', telegram: 'Telegram', whatsapp: 'WhatsApp', phone: 'Подзвонити' } as Record<string, string>)[order.contactMethod] ?? order.contactMethod}</div>
                      {order.email && <div className="text-white/60">{order.email}</div>}
                    </div>
                    <div>
                      <div className="text-white/40 mb-1">Доставка</div>
                      <div>{order.city}</div>
                      <div>НП: {order.novaPoshtaBranch}</div>
                    </div>
                    {order.comment && (
                      <div className="sm:col-span-2 p-3 bg-white/5 rounded-xl text-white/70 italic border border-white/10">
                        "{order.comment}"
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-2">
                    <div className="text-white/40 mb-2 text-sm">Товари:</div>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white/5 rounded-lg">
                          <span className="text-white/90">{item.quantity} × {item.productName}{item.variant && <span className="text-white/50"> — {item.variant}</span>}</span>
                          <span className="text-white/60">{formatPrice(item.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-48 shrink-0 flex flex-col justify-end space-y-2">
                  <div className="text-xs text-white/40 mb-1">Змінити статус</div>
                  <Select value={order.status} onValueChange={(val) => handleStatusChange(order.id, val)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
