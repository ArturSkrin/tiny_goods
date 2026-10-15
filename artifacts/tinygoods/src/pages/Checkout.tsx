import React, { useRef, useState } from 'react';
import { StoreLayout } from '../components/layout/StoreLayout';
import { useCart } from '../context/cart';
import { formatPrice } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useCreateOrder, useCreateLiqpayCheckout } from '@workspace/api-client-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ArrowRight, CreditCard, Banknote } from 'lucide-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

const LIQPAY_URL = 'https://www.liqpay.ua/api/3/checkout';

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Введіть ім'я"),
  phone: z.string().min(10, "Введіть номер телефону"),
  contactMethod: z.enum(['viber', 'telegram']),
  city: z.string().min(2, "Введіть місто"),
  novaPoshtaBranch: z.string().min(1, "Введіть відділення"),
  comment: z.string().optional(),
  paymentMethod: z.enum(['cash', 'liqpay']),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const createOrder = useCreateOrder();
  const createLiqpayCheckout = useCreateLiqpayCheckout();
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null);

  // Hidden form used to auto-submit to LiqPay
  const liqpayFormRef = useRef<HTMLFormElement>(null);
  const liqpayDataRef = useRef<HTMLInputElement>(null);
  const liqpaySigRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      contactMethod: 'viber',
      paymentMethod: 'cash',
    }
  });

  const paymentMethod = watch('paymentMethod');

  const onSubmit = async (data: CheckoutForm) => {
    if (cartTotal < 300) return;

    try {
      const order = await createOrder.mutateAsync({
        data: {
          customerName: data.customerName,
          phone: data.phone,
          contactMethod: data.contactMethod,
          city: data.city,
          novaPoshtaBranch: data.novaPoshtaBranch,
          comment: data.comment,
          paymentMethod: data.paymentMethod,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        }
      });

      clearCart();

      if (data.paymentMethod === 'liqpay') {
        // Get LiqPay checkout params and redirect
        const checkout = await createLiqpayCheckout.mutateAsync({
          id: order.id,
        });

        if (liqpayDataRef.current && liqpaySigRef.current && liqpayFormRef.current) {
          liqpayDataRef.current.value = checkout.data;
          liqpaySigRef.current.value = checkout.signature;
          liqpayFormRef.current.submit();
        }
      } else {
        setSuccessOrderId(order.id);
      }
    } catch (err) {
      console.error(err);
      alert('Помилка при створенні замовлення. Спробуйте пізніше.');
    }
  };

  const isPending = createOrder.isPending || createLiqpayCheckout.isPending;

  if (successOrderId) {
    return (
      <StoreLayout>
        <div className="max-w-md mx-auto py-20">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel p-10 text-center rounded-[3rem] space-y-6"
          >
            <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Дякуємо!</h1>
            <p className="text-foreground/70">
              Ваше замовлення #{successOrderId} прийнято.<br />
              Наш менеджер зв'яжеться з вами найближчим часом.
            </p>
            <div className="pt-6">
              <Link href="/">
                <Button size="lg" className="w-full rounded-2xl">Повернутися на головну</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </StoreLayout>
    );
  }

  if (items.length === 0) {
    return (
      <StoreLayout>
        <div className="max-w-md mx-auto py-20 text-center">
          <div className="glass-panel p-10 rounded-[3rem]">
            <h1 className="text-2xl font-bold text-foreground mb-4">Кошик порожній</h1>
            <Link href="/">
              <Button size="lg" className="rounded-2xl">До каталогу</Button>
            </Link>
          </div>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      {/* Hidden LiqPay auto-submit form */}
      <form
        ref={liqpayFormRef}
        action={LIQPAY_URL}
        method="POST"
        style={{ display: 'none' }}
      >
        <input ref={liqpayDataRef} type="hidden" name="data" />
        <input ref={liqpaySigRef} type="hidden" name="signature" />
      </form>

      <div className="max-w-5xl mx-auto pb-20">
        <h1 className="text-3xl font-bold text-foreground mb-8">Оформлення замовлення</h1>

        <div className="grid md:grid-cols-[1fr_400px] gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="glass-panel p-6 md:p-8 space-y-6 rounded-[2rem]">
            <h2 className="text-xl font-semibold text-foreground mb-4">Контактні дані</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70 ml-1">Ім'я та прізвище</label>
                <Input
                  {...register('customerName')}
                  placeholder="Іван Іваненко"
                  className={errors.customerName ? "border-destructive/50" : ""}
                />
                {errors.customerName && <span className="text-xs text-destructive ml-1">{errors.customerName.message}</span>}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground/70 ml-1">Телефон</label>
                <Input
                  {...register('phone')}
                  placeholder="+380 50 123 4567"
                  className={errors.phone ? "border-destructive/50" : ""}
                />
                {errors.phone && <span className="text-xs text-destructive ml-1">{errors.phone.message}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground/70 ml-1">Спосіб зв'язку</label>
              <Controller
                control={control}
                name="contactMethod"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="bg-foreground/5 border-foreground/10 text-foreground rounded-xl h-12">
                      <SelectValue placeholder="Оберіть спосіб" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/90 backdrop-blur-xl border-foreground/10 text-foreground">
                      <SelectItem value="viber">Viber</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <h2 className="text-xl font-semibold text-foreground pt-4 mb-4 border-t border-foreground/10">Доставка (Нова Пошта)</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70 ml-1">Місто</label>
                <Input
                  {...register('city')}
                  placeholder="Київ"
                  className={errors.city ? "border-destructive/50" : ""}
                />
                {errors.city && <span className="text-xs text-destructive ml-1">{errors.city.message}</span>}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-foreground/70 ml-1">Відділення / Поштомат</label>
                <Input
                  {...register('novaPoshtaBranch')}
                  placeholder="№123"
                  className={errors.novaPoshtaBranch ? "border-destructive/50" : ""}
                />
                {errors.novaPoshtaBranch && <span className="text-xs text-destructive ml-1">{errors.novaPoshtaBranch.message}</span>}
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-sm text-foreground/70 ml-1">Коментар до замовлення (необов'язково)</label>
              <Textarea
                {...register('comment')}
                placeholder="Ваші побажання..."
                className="resize-none min-h-[100px] bg-foreground/5 border-foreground/10 text-foreground rounded-xl focus:border-primary/50"
              />
            </div>

            {/* Payment method */}
            <div className="pt-4 border-t border-foreground/10">
              <h2 className="text-xl font-semibold text-foreground mb-4">Спосіб оплати</h2>
              <Controller
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => field.onChange('cash')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                        field.value === 'cash'
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-foreground/10 bg-foreground/5 text-foreground/50 hover:border-foreground/30'
                      }`}
                    >
                      <Banknote className="w-6 h-6" />
                      <span className="text-sm font-medium">Накладений платіж</span>
                      <span className="text-xs opacity-70">Оплата при отриманні</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('liqpay')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                        field.value === 'liqpay'
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-foreground/10 bg-foreground/5 text-foreground/50 hover:border-foreground/30'
                      }`}
                    >
                      <CreditCard className="w-6 h-6" />
                      <span className="text-sm font-medium">Онлайн оплата</span>
                      <span className="text-xs opacity-70">LiqPay / картка</span>
                    </button>
                  </div>
                )}
              />
              {paymentMethod === 'liqpay' && (
                <p className="mt-3 text-xs text-foreground/50 text-center">
                  Після підтвердження замовлення вас буде перенаправлено на захищену сторінку оплати LiqPay.
                </p>
              )}
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-base rounded-2xl"
                disabled={cartTotal < 300 || isPending}
              >
                {isPending
                  ? 'Обробка...'
                  : paymentMethod === 'liqpay'
                    ? 'Перейти до оплати'
                    : 'Підтвердити замовлення'}
                {!isPending && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </div>
          </form>

          {/* Summary */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-[2rem] sticky top-24">
              <h3 className="text-lg font-semibold text-foreground mb-6">Ваше замовлення</h3>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3 text-sm">
                    <div className="w-12 h-12 rounded-lg bg-foreground/10 shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <span className="text-foreground line-clamp-1">{item.productName}</span>
                      <span className="text-foreground/50">{item.quantity} шт × {formatPrice(item.price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-foreground/10 pt-4 space-y-3">
                <div className="flex justify-between text-foreground/70">
                  <span>Доставка</span>
                  <span>За тарифами НП</span>
                </div>
                <div className="flex justify-between text-foreground text-lg font-bold">
                  <span>До сплати</span>
                  <span className="text-primary">{formatPrice(cartTotal)}</span>
                </div>
              </div>

              {cartTotal < 300 && (
                <div className="mt-6 p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive-foreground text-sm text-center">
                  Мінімальна сума замовлення 300 грн. Додайте ще товарів на {formatPrice(300 - cartTotal)}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
