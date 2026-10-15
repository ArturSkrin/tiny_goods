import React from 'react';
import { StoreLayout } from '../components/layout/StoreLayout';
import { Button } from '../components/ui/button';
import { Link, useSearch } from 'wouter';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react';
import { useGetOrderPaymentStatus, getGetOrderPaymentStatusQueryKey } from '@workspace/api-client-react';

function parseToken(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get('token');
}

export default function PaymentSuccess() {
  const search = useSearch();
  const token = parseToken(search);

  const { data, isLoading, isError, refetch, isRefetching } = useGetOrderPaymentStatus(
    { token: token ?? '' },
    {
      query: {
        queryKey: getGetOrderPaymentStatusQueryKey({ token: token ?? '' }),
        enabled: !!token,
        retry: false,
        // Poll every 5 s while the payment is still pending
        refetchInterval: (query) =>
          query.state.data?.paymentStatus === 'pending' ? 5000 : false,
      },
    },
  );

  const paymentStatus = data?.paymentStatus ?? 'pending';
  const isPaid = paymentStatus === 'paid';
  const isFailed = paymentStatus === 'failed';
  const isPending = paymentStatus === 'pending';

  if (!token) {
    return (
      <StoreLayout>
        <div className="max-w-md mx-auto py-20 text-center">
          <div className="glass-panel p-10 rounded-[3rem]">
            <h1 className="text-2xl font-bold text-foreground mb-4">Замовлення не знайдено</h1>
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
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : isError || !data ? (
            <>
              <div className="w-20 h-20 bg-foreground/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-foreground/40" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Замовлення не знайдено</h1>
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

              <h1 className="text-3xl font-bold text-foreground">
                {isPaid && 'Оплата успішна!'}
                {isPending && 'Очікуємо підтвердження оплати'}
                {isFailed && 'Оплата не вдалася'}
              </h1>

              <p className="text-foreground/70">
                {isPaid && <>Замовлення №{data.orderId} оплачено та підтверджено.<br />Менеджер зв'яжеться з вами найближчим часом.</>}
                {isPending && <>Статус оплати ще уточнюється.<br />Сторінка оновлюється автоматично кожні 5 секунд.</>}
                {isFailed && <>Оплату не підтверджено.<br />Спробуйте оплатити ще раз або зверніться до менеджера.</>}
              </p>

              {isPending && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                  Оновити статус
                </Button>
              )}

              {isFailed && (
                <Link href="/checkout">
                  <Button size="lg" className="w-full rounded-2xl">Спробувати ще раз</Button>
                </Link>
              )}

              <div className="pt-4">
                <Link href="/"><Button size="lg" variant={isFailed ? 'outline' : 'default'} className="w-full rounded-2xl">На головну</Button></Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </StoreLayout>
  );
}
