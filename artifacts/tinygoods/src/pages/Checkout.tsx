import React, { useEffect, useRef, useState } from 'react';
import { StoreLayout } from '../components/layout/StoreLayout';
import { useCart, variantLabel } from '../context/cart';
import { useSettings } from '../hooks/use-settings';
import { useMe, useRefreshMe } from '../hooks/use-me';
import { formatPrice } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CityPicker, WarehousePicker } from '../components/store/NovaPoshtaPickers';
import { Textarea } from '../components/ui/textarea';
import { useCreateOrder, useCreateLiqpayCheckout } from '@workspace/api-client-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ArrowRight, CreditCard, Landmark, Info } from 'lucide-react';
import { Link } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';

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
  paymentMethod: z.enum(['liqpay', 'bank_transfer']),
  saveAsDefault: z.boolean().optional(),
});

const CONTACT_METHODS = [
  { value: 'viber', label: 'Viber' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Подзвонити' },
] as const;

const PAYMENT_METHODS = [
  { value: 'liqpay', label: 'Онлайн карткою', note: 'Visa / Mastercard через LiqPay', icon: CreditCard },
  { value: 'bank_transfer', label: 'За реквізитами', note: 'Надішлемо реквізити в месенджер', icon: Landmark },
] as const;

/** "…зв'яжеться з вами <how>" for the chosen contact method. */
const CONTACT_HINT: Record<string, string> = {
  viber: 'у Viber',
  telegram: 'у Telegram',
  whatsapp: 'у WhatsApp',
  phone: 'телефоном',
};

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

  const { customer, defaultAddress } = useMe();
  const refreshMe = useRefreshMe();

  const { register, handleSubmit, control, setValue, getValues, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      contactMethod: 'viber',
      paymentMethod: 'liqpay',
      city: '',
      npCityRef: '',
      novaPoshtaBranch: '',
      npWarehouseRef: '',
      saveAsDefault: true,
    }
  });
  const npCityRef = watch('npCityRef');
  const paymentMethod = watch('paymentMethod');
  const contactMethod = watch('contactMethod');

  // Signed-in buyer: fill the form from the saved profile once, without any clicks.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!customer || prefilled) return;
    const saved: Partial<CheckoutForm> = {
      lastName: customer.lastName ?? '',
      firstName: customer.firstName ?? '',
      middleName: customer.middleName ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      ...(customer.contactMethod ? { contactMethod: customer.contactMethod as CheckoutForm['contactMethod'] } : {}),
      ...(defaultAddress ? { city: defaultAddress.city, npCityRef: defaultAddress.npCityRef, novaPoshtaBranch: defaultAddress.branch, npWarehouseRef: defaultAddress.npWarehouseRef } : {}),
    };
    // Don't overwrite what the buyer already typed; contactMethod only holds the form's default.
    for (const [k, v] of Object.entries(saved)) {
      if (v && (k === 'contactMethod' || !getValues(k as keyof CheckoutForm))) setValue(k as keyof CheckoutForm, v as never);
    }
    setPrefilled(true);
  }, [customer, defaultAddress, prefilled]);

  // Offer "save as default" only when a saved profile exists and the buyer changed something.
  const watched = watch();
  const differsFromSaved =
    prefilled &&
    !!customer?.phone &&
    (watched.lastName !== (customer.lastName ?? '') ||
      watched.firstName !== (customer.firstName ?? '') ||
      (watched.middleName ?? '') !== (customer.middleName ?? '') ||
      watched.phone !== customer.phone ||
      watched.contactMethod !== customer.contactMethod ||
      (!!watched.npWarehouseRef && watched.npWarehouseRef !== defaultAddress?.npWarehouseRef));


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
          saveAsDefault: differsFromSaved && data.saveAsDefault,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          }))
        }
      });

      clearCart();
      if (customer) refreshMe();

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
              {paymentMethod === 'bank_transfer'
                ? `Менеджер звʼяжеться з вами ${CONTACT_HINT[contactMethod]} і надішле реквізити для оплати.`
                : "Наш менеджер зв'яжеться з вами найближчим часом."}
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
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h2 className="text-xl font-semibold text-foreground">Контактні дані</h2>
              {customer === null && (
                <Link href="/account" className="text-sm font-semibold text-primary hover:underline">Увійти — дані підставляться самі</Link>
              )}
            </div>

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
                  key={prefilled ? 'saved' : 'empty'}
                  initial={watch('city')}
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

            <AnimatePresence>
              {differsFromSaved && (
                <motion.label
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 rounded-2xl bg-primary/5 ring-1 ring-primary/20 p-3 text-sm text-foreground cursor-pointer overflow-hidden"
                >
                  <input type="checkbox" {...register('saveAsDefault')} className="w-4 h-4 accent-primary" />
                  Зберегти ці дані як дані за замовчуванням для наступних замовлень
                </motion.label>
              )}
            </AnimatePresence>

            {/* Payment method */}
            <div className="pt-4 border-t border-foreground/10">
              <h2 className="text-xl font-semibold text-foreground mb-4">Оплата</h2>
              <Controller
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map((m) => {
                      const active = field.value === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => field.onChange(m.value)}
                          className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition active:scale-[0.98] ${
                            active ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/40' : 'border-foreground/10 bg-foreground/5 hover:border-foreground/25'
                          }`}
                        >
                          <m.icon className={`w-6 h-6 shrink-0 ${active ? 'text-primary' : 'text-foreground/50'}`} />
                          <div>
                            <div className="text-sm font-semibold text-foreground">{m.label}</div>
                            <div className="text-xs text-foreground/60">{m.note}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
              <AnimatePresence mode="wait">
                <motion.p
                  key={paymentMethod}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 flex gap-2 text-sm text-foreground/70 rounded-xl bg-foreground/5 p-3"
                >
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  {paymentMethod === 'bank_transfer'
                    ? `Менеджер звʼяжеться з вами ${CONTACT_HINT[contactMethod]}, погодить замовлення й надішле реквізити для оплати.`
                    : 'Після підтвердження вас буде перенаправлено на захищену сторінку оплати LiqPay.'}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-base rounded-2xl"
                disabled={cartTotal < minOrder || isPending}
              >
                {isPending ? 'Обробка...' : paymentMethod === 'bank_transfer' ? 'Оформити замовлення' : 'Перейти до оплати'}
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
