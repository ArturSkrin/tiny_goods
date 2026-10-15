import React, { useRef, useState } from 'react';
import { StoreLayout } from '../components/layout/StoreLayout';
import { useCart, variantLabel } from '../context/cart';
import { useSettings } from '../hooks/use-settings';
import { formatPrice } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CityPicker, WarehousePicker } from '../components/store/NovaPoshtaPickers';
import { Textarea } from '../components/ui/textarea';
import { useCreateOrder, useCreateLiqpayCheckout } from '@workspace/api-client-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ArrowRight, CreditCard } from 'lucide-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

const LIQPAY_URL = 'https://www.liqpay.ua/api/3/checkout';

const checkoutSchema = z.object({
  lastName: z.string().trim().min(2, 'Введіть прізвище'),
  firstName: z.string().trim().min(2, "Введіть ім'я"),
  middleName: z.string().trim().optional(),
  phone: z.string().regex(/^\+?[\d\s()-]{10,}$/, 'Введіть номер телефону'),
  email: z.string().trim().email('Введіть коректний email'),
  contactMethod: z.enum(['viber', 'telegram', 'whatsapp', 'phone']),
  city: z.string(),
  npCityRef: z.string().min(1, 'Оберіть місто зі списку'),
  novaPoshtaBranch: z.string(),
  npWarehouseRef: z.string().min(1, 'Оберіть відділення зі списку'),
  comment: z.string().optional(),
  paymentMethod: z.literal('liqpay'),
});

const CONTACT_METHODS = [
  { value: 'viber', label: 'Viber' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Подзвонити' },
] as const;

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const minOrder = useSettings()?.minOrderTotal ?? 0;
  const createOrder = useCreateOrder();
  const createLiqpayCheckout = useCreateLiqpayCheckout();
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null);

  // Hidden form used to auto-submit to LiqPay
  const liqpayFormRef = useRef<HTMLFormElement>(null);
  const liqpayDataRef = useRef<HTMLInputElement>(null);
  const liqpaySigRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      contactMethod: 'viber',
      paymentMethod: 'liqpay',
      city: '',
      npCityRef: '',
      novaPoshtaBranch: '',
      npWarehouseRef: '',
    }
  });
  const npCityRef = watch('npCityRef');


  const onSubmit = async (data: CheckoutForm) => {
    if (cartTotal < minOrder) return;

    try {
      const order = await createOrder.mutateAsync({
        data: {
          lastName: data.lastName,
          firstName: data.firstName,
          middleName: data.middleName || undefined,
          phone: data.phone,
          email: data.email,
          contactMethod: data.contactMethod,
          city: data.city,
          npCityRef: data.npCityRef,
          novaPoshtaBranch: data.novaPoshtaBranch,
          npWarehouseRef: data.npWarehouseRef,
          comment: data.comment,
          paymentMethod: data.paymentMethod,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
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
      alert((err as { data?: { error?: string } })?.data?.error ?? 'Помилка при створенні замовлення. Спробуйте пізніше.');
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

            <div className="grid md:grid-cols-3 gap-4">
              {([
                ['lastName', 'Прізвище', 'Іваненко'],
                ['firstName', "Ім'я", 'Іван'],
                ['middleName', 'По батькові', 'Необовʼязково'],
              ] as const).map(([name, label, placeholder]) => (
                <div key={name} className="space-y-2">
                  <label className="text-sm text-foreground/70 ml-1">{label}</label>
                  <Input {...register(name)} placeholder={placeholder} autoComplete={name === 'lastName' ? 'family-name' : name === 'firstName' ? 'given-name' : 'additional-name'} className={errors[name] ? 'border-destructive/50' : ''} />
                  {errors[name] && <span className="text-xs text-destructive ml-1">{errors[name]?.message}</span>}
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground/70 ml-1">Телефон</label>
                <Input {...register('phone')} type="tel" autoComplete="tel" placeholder="+380 50 123 4567" className={errors.phone ? 'border-destructive/50' : ''} />
                {errors.phone && <span className="text-xs text-destructive ml-1">{errors.phone.message}</span>}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground/70 ml-1">Email</label>
                <Input {...register('email')} type="email" autoComplete="email" placeholder="you@example.com" className={errors.email ? 'border-destructive/50' : ''} />
                {errors.email && <span className="text-xs text-destructive ml-1">{errors.email.message}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground/70 ml-1">Як з вами звʼязатися?</label>
              <Controller
                control={control}
                name="contactMethod"
                render={({ field }) => (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CONTACT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => field.onChange(m.value)}
                        className={`h-11 rounded-xl text-sm font-semibold border transition active:scale-95 ${
                          field.value === m.value ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/40' : 'border-foreground/10 bg-foreground/5 text-foreground/60 hover:text-foreground'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <h2 className="text-xl font-semibold text-foreground pt-4 mb-4 border-t border-foreground/10">Доставка (Нова Пошта)</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <CityPicker
                  invalid={!!errors.npCityRef}
                  onChange={(c) => {
                    setValue('city', `${c.name} (${c.area} обл.)`);
                    setValue('npCityRef', c.ref, { shouldValidate: true });
                    setValue('novaPoshtaBranch', '');
                    setValue('npWarehouseRef', '');
                  }}
                />
                {errors.npCityRef && <span className="text-xs text-destructive ml-1">{errors.npCityRef.message}</span>}
              </div>
              <div>
                <WarehousePicker
                  key={npCityRef}
                  cityRef={npCityRef || undefined}
                  value={watch('novaPoshtaBranch')}
                  invalid={!!errors.npWarehouseRef}
                  onChange={(w) => {
                    setValue('novaPoshtaBranch', w.name);
                    setValue('npWarehouseRef', w.ref, { shouldValidate: true });
                  }}
                />
                {errors.npWarehouseRef && <span className="text-xs text-destructive ml-1">{errors.npWarehouseRef.message}</span>}
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
              <h2 className="text-xl font-semibold text-foreground mb-4">Оплата</h2>
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-primary/40 bg-primary/10">
                <CreditCard className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-foreground">Онлайн карткою через LiqPay</div>
                  <div className="text-xs text-foreground/60">Після підтвердження вас буде перенаправлено на захищену сторінку оплати.</div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-base rounded-2xl"
                disabled={cartTotal < minOrder || isPending}
              >
                {isPending ? 'Обробка...' : 'Перейти до оплати'}
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
                  <div key={item.key} className="flex gap-3 text-sm">
                    <div className="w-12 h-12 rounded-lg bg-foreground/10 shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <span className="text-foreground line-clamp-1">{item.productName}</span>
                      {variantLabel(item) && <span className="text-xs text-muted-foreground">{variantLabel(item)}</span>}
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

              {cartTotal < minOrder && (
                <div className="mt-6 p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive-foreground text-sm text-center">
                  Мінімальна сума замовлення {formatPrice(minOrder)}. Додайте ще товарів на {formatPrice(minOrder - cartTotal)}.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
