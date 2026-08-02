import React, { useEffect, useState } from 'react';
import { StoreLayout } from '../components/layout/StoreLayout';
import { Button } from '../components/ui/button';
import { Link, useSearch } from 'wouter';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react';

interface PaymentStatusData {
  orderId: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  status: string;
}

async function fetchPaymentStatus(token: string): Promise<PaymentStatusData | null> {
  try {
    const res = await fetch(`/api/orders/payment-status?token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    return res.json() as Promise<PaymentStatusData>;
  } catch {
    return null;
  }
}

function parseToken(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get('token');
}

export default function PaymentSuccess() {
  const search = useSearch();
  const token = parseToken(search);

  const [data, setData] = useState<PaymentStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (!token) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const result = await fetchPaymentStatus(token);
    setData(result);
    if (isRefresh) setRefreshing(false); else setLoading(false);
  };

  useEffect(() => { void load(); }, [token]);

  // Poll every 5 s while still pending
  useEffect(() => {
    if (!token || data?.paymentStatus !== 'pending') return;
    const timer = setInterval(() => { void load(true); }, 5000);
    return () => clearInterval(timer);
  }, [token, data?.paymentStatus]);

  const paymentStatus = data?.paymentStatus ?? 'pending';
  const isPaid = paymentStatus === 'paid';
  const isFailed = paymentStatus === 'failed';
  const isPending = paymentStatus === 'pending';

  if (!token) {
    return (
      <StoreLayout>
        <div className="max-w-md mx-auto py-20 text-center">
          <div className="glass-panel p-10 rounded-[3rem]">
            <h1 className="text-2xl font-bold text-white mb-4">Замовлення не знайдено</h1>
            <Link href="/"><Button size="lg" className="rounded-2xl">На головну</Button></Link>
          </div>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="max-w-md mx-auto py-20">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel p-10 text-center rounded-[3rem] space-y-6"
        >
          {loading ? (
            <div className="py-6 flex justify-center">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <>
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-white/40" />
              </div>
              <h1 className="text-2xl font-bold text-white">Замовлення не знайдено</h1>
              <Link href="/"><Button size="lg" className="w-full rounded-2xl">На головну</Button></Link>
            </>
          ) : (
            <>
              {isPaid && (
                <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              )}
              {isPending && (
                <div className="w-20 h-20 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-10 h-10" />
                </div>
              )}
              {isFailed && (
                <div className="w-20 h-20 bg-destructive/20 text-destructive-foreground rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10" />
                </div>
              )}

              <h1 className="text-3xl font-bold text-white">
                {isPaid && 'Оплата успішна!'}
                {isPending && 'Очікуємо оплату'}
                {isFailed && 'Оплата не пройшла'}
              </h1>

              <p className="text-white/70">
                {isPaid && <>Ваше замовлення №{data.orderId} оплачено та підтверджено.<br />Менеджер зв'яжеться з вами найближчим часом.</>}
                {isPending && <>Статус оплати ще уточнюється.<br />Сторінка оновлюється автоматично кожні 5 секунд.</>}
                {isFailed && <>Оплату не підтверджено.<br />Спробуйте ще раз або зверніться до менеджера.</>}
              </p>

              {isPending && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => load(true)}
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Оновити статус
                </Button>
              )}

              <div className="pt-4">
                <Link href="/"><Button size="lg" className="w-full rounded-2xl">На головну</Button></Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </StoreLayout>
  );
}
