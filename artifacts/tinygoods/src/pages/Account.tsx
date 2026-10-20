import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LogOut, Package, UserRound, Eye, MapPin, Star, Trash2, Plus, Check, Gift, Info } from 'lucide-react';
import {
  useListMyOrders,
  getListMyOrdersQueryKey,
  useListMyAddresses,
  getListMyAddressesQueryKey,
  useAddMyAddress,
  useSetMyDefaultAddress,
  useDeleteMyAddress,
  useListMyViewed,
  getListMyViewedQueryKey,
  useUpdateMe,
  useDeleteMe,
  useCustomerLogout,
  getGetMeQueryKey,
  type Customer,
  type NpCity,
} from '@workspace/api-client-react';
import { StoreLayout } from '../components/layout/StoreLayout';
import { LoginPanel } from '../components/account/LoginPanel';
import { ProductCard } from '../components/store/ProductCard';
import { CityPicker, WarehousePicker } from '../components/store/NovaPoshtaPickers';
import { useMe, useSyncViewedOnLogin } from '../hooks/use-me';
import { cn, formatPrice } from '../lib/utils';

const STATUS: Record<string, [string, string]> = {
  new: ['Нове', 'bg-sky-500/15 text-sky-600 dark:text-sky-300'],
  confirmed: ['Підтверджено', 'bg-violet-500/15 text-violet-600 dark:text-violet-300'],
  shipped: ['Відправлено', 'bg-amber-500/15 text-amber-700 dark:text-amber-300'],
  completed: ['Виконано', 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'],
  cancelled: ['Скасовано', 'bg-destructive/15 text-destructive'],
};

const CONTACTS = [
  { value: 'viber', label: 'Viber' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Подзвонити' },
] as const;

const apiError = (e: unknown, fallback: string) => (e as { data?: { error?: string } })?.data?.error ?? fallback;
const field = 'w-full h-11 rounded-xl bg-foreground/5 border border-foreground/10 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40';

function Orders() {
  const { data: orders, isLoading } = useListMyOrders({ query: { queryKey: getListMyOrdersQueryKey() } });
  if (isLoading) return <div className="h-40 liquid-glass rounded-3xl animate-pulse" />;
  if (!orders?.length) {
    return (
      <div className="liquid-glass rounded-3xl p-10 text-center space-y-3">
        <Package className="w-10 h-10 mx-auto text-primary/60" />
        <p className="font-semibold text-foreground">Замовлень ще немає</p>
        <Link href="/" className="inline-flex h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold items-center">До каталогу</Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const [label, cls] = STATUS[o.status] ?? [o.status, 'bg-foreground/10 text-foreground'];
        return (
          <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="liquid-glass rounded-3xl p-4 md:p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div>
                <div className="font-bold text-foreground">Замовлення №{o.id}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <div className="flex gap-2 items-center">
                {o.paymentMethod === 'liqpay' && o.paymentStatus === 'paid' && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Оплачено</span>}
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', cls)}>{label}</span>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {o.items.map((i, idx) => (
                <div key={idx} className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-foreground/5 flex items-center justify-center" title={`${i.productName}${i.variant ? ` — ${i.variant}` : ''} × ${i.quantity}`}>
                  {i.imageUrl ? <img src={i.imageUrl} alt="" className="w-full h-full object-cover" /> : <Gift className="w-5 h-5 text-foreground/30" />}
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground space-y-0.5">
              {o.items.map((i, idx) => (
                <div key={idx} className="truncate">{i.quantity} × {i.productName}{i.variant && <span> — {i.variant}</span>}</div>
              ))}
            </div>
            <div className="flex justify-between items-end pt-2 border-t border-foreground/10 text-sm">
              <span className="text-muted-foreground truncate pr-3">{o.city} · {o.novaPoshtaBranch}</span>
              <span className="font-extrabold text-foreground shrink-0">{formatPrice(o.total)}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function Profile({ customer }: { customer: Customer }) {
  const qc = useQueryClient();
  const update = useUpdateMe();
  const [form, setForm] = useState({
    lastName: customer.lastName ?? '',
    firstName: customer.firstName ?? '',
    middleName: customer.middleName ?? '',
    phone: customer.phone ?? '',
    contactMethod: (customer.contactMethod ?? 'viber') as (typeof CONTACTS)[number]['value'],
  });
  const [saved, setSaved] = useState(false);

  const save = async () => {
    try {
      const me = await update.mutateAsync({ data: form });
      qc.setQueryData(getGetMeQueryKey(), me);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(apiError(e, 'Не вдалося зберегти'));
    }
  };

  return (
    <section className="liquid-glass rounded-3xl p-5 md:p-6 space-y-4">
      <h2 className="font-display text-lg font-semibold text-foreground">Контактні дані</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        {([['lastName', 'Прізвище'], ['firstName', "Ім'я"], ['middleName', 'По батькові']] as const).map(([k, l]) => (
          <label key={k} className="space-y-1 block">
            <span className="text-xs text-muted-foreground ml-1">{l}</span>
            <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={field} />
          </label>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-xs text-muted-foreground ml-1">Телефон</span>
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+380 50 123 4567" className={field} />
        </label>
        <label className="space-y-1 block">
          <span className="text-xs text-muted-foreground ml-1">Email</span>
          <input value={customer.email ?? '—'} disabled className={cn(field, 'opacity-60')} />
        </label>
      </div>
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground ml-1">Як з вами звʼязатися</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CONTACTS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setForm({ ...form, contactMethod: m.value })}
              className={cn('h-10 rounded-xl text-sm font-semibold border transition', form.contactMethod === m.value ? 'border-primary bg-primary/10 text-foreground' : 'border-foreground/10 bg-foreground/5 text-foreground/60')}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={save} disabled={update.isPending} className="h-11 px-6 rounded-2xl bg-primary text-primary-foreground font-bold text-sm inline-flex items-center gap-2 disabled:opacity-60">
        {saved && <Check className="w-4 h-4" />} {saved ? 'Збережено' : 'Зберегти'}
      </button>
    </section>
  );
}

function Addresses() {
  const qc = useQueryClient();
  const { data: list } = useListMyAddresses({ query: { queryKey: getListMyAddressesQueryKey() } });
  const add = useAddMyAddress();
  const setDefault = useSetMyDefaultAddress();
  const remove = useDeleteMyAddress();
  const [adding, setAdding] = useState(false);
  const [city, setCity] = useState<NpCity | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: getListMyAddressesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  return (
    <section className="liquid-glass rounded-3xl p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Адреси доставки</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-sm font-bold text-primary flex items-center gap-1">
            <Plus className="w-4 h-4" /> Додати
          </button>
        )}
      </div>
      {list?.length === 0 && !adding && <p className="text-sm text-muted-foreground">Адреса збережеться автоматично з першого замовлення.</p>}
      <div className="space-y-2">
        {list?.map((a) => (
          <div key={a.id} className={cn('flex items-start gap-3 rounded-2xl p-3 ring-1', a.isDefault ? 'ring-primary/40 bg-primary/5' : 'ring-foreground/10')}>
            <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-sm">
              <div className="font-semibold text-foreground">{a.city}</div>
              <div className="text-muted-foreground">{a.branch}</div>
              {a.isDefault && <div className="text-xs font-bold text-primary mt-1">За замовчуванням</div>}
            </div>
            {!a.isDefault && (
              <button title="Зробити основною" onClick={async () => { await setDefault.mutateAsync({ id: a.id }); refresh(); }} className="p-2 text-foreground/50 hover:text-primary">
                <Star className="w-4 h-4" />
              </button>
            )}
            <button title="Видалити" onClick={async () => { await remove.mutateAsync({ id: a.id }); refresh(); }} className="p-2 text-foreground/50 hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {adding && (
        <div className="grid sm:grid-cols-2 gap-3 rounded-2xl p-3 ring-1 ring-foreground/10">
          <CityPicker onChange={setCity} />
          <WarehousePicker
            key={city?.ref}
            cityRef={city?.ref}
            value=""
            onChange={async (w) => {
              if (!city) return;
              await add.mutateAsync({ data: { city: `${city.name} (${city.area} обл.)`, npCityRef: city.ref, branch: w.name, npWarehouseRef: w.ref } });
              setAdding(false);
              setCity(null);
              refresh();
            }}
          />
          <button onClick={() => setAdding(false)} className="sm:col-span-2 text-sm text-muted-foreground justify-self-start">Скасувати</button>
        </div>
      )}
    </section>
  );
}

function Viewed() {
  const { data } = useListMyViewed({ query: { queryKey: getListMyViewedQueryKey() } });
  if (!data) return <div className="h-40 liquid-glass rounded-3xl animate-pulse" />;
  if (!data.length) {
    return (
      <div className="liquid-glass rounded-3xl p-10 text-center space-y-2">
        <Eye className="w-10 h-10 mx-auto text-primary/60" />
        <p className="font-semibold text-foreground">Тут зʼявляться товари, які ви переглядали</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
      {data.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

const TABS = [
  { id: 'orders', label: 'Замовлення', icon: Package },
  { id: 'profile', label: 'Мої дані', icon: UserRound },
  { id: 'viewed', label: 'Переглянуті', icon: Eye },
] as const;

export default function Account() {
  const { customer, isLoading } = useMe();
  const qc = useQueryClient();
  const logout = useCustomerLogout();
  const deleteMe = useDeleteMe();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('orders');
  useSyncViewedOnLogin();

  // Drop ?login_error once the panel has read it.
  useEffect(() => {
    if (customer && window.location.search) window.history.replaceState(null, '', '/account');
  }, [customer]);

  // Forget account data without dropping shared caches (settings, catalog).
  const signedOut = () => {
    for (const key of [getListMyOrdersQueryKey(), getListMyAddressesQueryKey(), getListMyViewedQueryKey()]) qc.removeQueries({ queryKey: key });
    qc.setQueryData(getGetMeQueryKey(), { customer: null, defaultAddress: null });
  };

  const signOut = async () => {
    await logout.mutateAsync();
    signedOut();
  };

  return (
    <StoreLayout>
      <div className="max-w-4xl mx-auto pb-12 space-y-5">
        {isLoading ? (
          <div className="h-64 liquid-glass rounded-3xl animate-pulse" />
        ) : !customer ? (
          <LoginPanel />
        ) : (
          <>
            <div className="liquid-glass rounded-[28px] p-5 md:p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-display text-xl font-semibold shrink-0">
                {(customer.firstName?.[0] ?? customer.email?.[0] ?? '♥').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl font-semibold text-foreground truncate">
                  {[customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Мій кабінет'}
                </div>
                <div className="text-sm text-muted-foreground truncate">{customer.email ?? (customer.hasTelegram ? 'Вхід через Telegram' : '')}</div>
              </div>
              <button onClick={signOut} className="h-10 px-4 rounded-xl ring-1 ring-foreground/15 text-sm font-semibold text-foreground/70 hover:text-foreground flex items-center gap-2">
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Вийти</span>
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 md:mx-0 md:px-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'shrink-0 h-10 px-4 rounded-full text-sm font-semibold flex items-center gap-2 transition',
                    tab === t.id ? 'bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_hsl(var(--primary))]' : 'liquid-glass text-foreground/70',
                  )}
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>

            {tab === 'orders' && <Orders />}
            {tab === 'profile' && (
              <div className="space-y-4">
                <Profile key={customer.id} customer={customer} />
                <Addresses />
                <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
                  <Info className="w-4 h-4 shrink-0" /> Ці дані підставляються у форму замовлення автоматично. Змінити їх можна й під час оформлення.
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('Видалити акаунт? Збережені дані зникнуть, а історію замовлень магазин збереже без привʼязки до вас.')) return;
                    await deleteMe.mutateAsync();
                    signedOut();
                  }}
                  className="text-sm text-destructive/80 hover:text-destructive px-1"
                >
                  Видалити акаунт
                </button>
              </div>
            )}
            {tab === 'viewed' && <Viewed />}
          </>
        )}
        <div className="text-center text-sm">
          <Link href="/about" className="text-muted-foreground hover:text-foreground">Про магазин і контакти</Link>
        </div>
      </div>
    </StoreLayout>
  );
}
