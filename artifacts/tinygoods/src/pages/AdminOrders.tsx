import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Check, ChevronDown, Copy, ExternalLink, FileText, Gift, Home, Loader2, Package, PackageCheck, RefreshCw, Search, Truck, AlertTriangle,
} from 'lucide-react';
import {
  useListOrders, useUpdateOrder, useTrackOrder, getListOrdersQueryKey, type Order, type OrderUpdate,
} from '@workspace/api-client-react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { cn, formatPrice } from '../lib/utils';

const STATUSES = [
  { key: 'new', label: 'Нове', cls: 'bg-blue-500/15 text-blue-300 ring-blue-500/30' },
  { key: 'confirmed', label: 'Підтверджено', cls: 'bg-purple-500/15 text-purple-300 ring-purple-500/30' },
  { key: 'shipped', label: 'Відправлено', cls: 'bg-orange-500/15 text-orange-300 ring-orange-500/30' },
  { key: 'completed', label: 'Виконано', cls: 'bg-green-500/15 text-green-300 ring-green-500/30' },
  { key: 'cancelled', label: 'Скасовано', cls: 'bg-red-500/15 text-red-300 ring-red-500/30' },
] as const;
const statusOf = (key: string) => STATUSES.find((s) => s.key === key) ?? { key, label: key, cls: 'bg-white/10 text-white/60 ring-white/10' };

// Parcel stages in delivery order; "problem" (refused, returned, not found) is shown apart.
const STAGES = [
  { key: 'created', label: 'Накладна створена', icon: FileText },
  { key: 'sent', label: 'Відправлено', icon: Package },
  { key: 'in_transit', label: 'В дорозі', icon: Truck },
  { key: 'at_branch', label: 'У відділенні', icon: Home },
  { key: 'received', label: 'Отримано', icon: PackageCheck },
] as const;
const stageLabel = (key?: string) => STAGES.find((s) => s.key === key)?.label ?? (key === 'problem' ? 'Проблема з доставкою' : undefined);

const CONTACT_LABELS: Record<string, string> = { viber: 'Viber', telegram: 'Telegram', whatsapp: 'WhatsApp', phone: 'Дзвінок' };

/** "050 123 45 67" → "380501234567" for messenger links. */
const intlPhone = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.length === 10 && d.startsWith('0') ? `38${d}` : d;
};
const contactHref = (method: string, phone: string) => {
  const p = intlPhone(phone);
  return { viber: `viber://chat?number=%2B${p}`, telegram: `https://t.me/+${p}`, whatsapp: `https://wa.me/${p}` }[method] ?? `tel:+${p}`;
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const apiError = (e: unknown, fallback: string) => (e as { data?: { error?: string } })?.data?.error ?? fallback;

function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ring-1 text-xs font-semibold whitespace-nowrap', className)}>{children}</span>;
}

function PaymentPill({ order }: { order: Order }) {
  if (order.paymentStatus === 'paid') return <Pill className="bg-green-500/15 text-green-300 ring-green-500/30">✓ Оплачено</Pill>;
  if (order.paymentMethod === 'bank_transfer') return <Pill className="bg-sky-500/15 text-sky-300 ring-sky-500/30">🏦 Чекає оплати за реквізитами</Pill>;
  if (order.paymentStatus === 'failed') return <Pill className="bg-red-500/15 text-red-300 ring-red-500/30">💳 Оплата не пройшла</Pill>;
  return <Pill className="bg-yellow-500/15 text-yellow-300 ring-yellow-500/30">💳 Очікує оплати</Pill>;
}

function DeliveryPill({ order }: { order: Order }) {
  if (!order.ttn) return null;
  const label = stageLabel(order.tracking?.stage) ?? 'ТТН додано';
  const problem = order.tracking?.stage === 'problem';
  return <Pill className={problem ? 'bg-red-500/15 text-red-300 ring-red-500/30' : 'bg-white/5 text-white/75 ring-white/15'}><Truck className="w-3 h-3" /> {label}</Pill>;
}

function CopyButton({ text, label = 'Копіювати' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition"
    >
      {done ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />} {done ? 'Скопійовано' : label}
    </button>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-wider text-white/40">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Horizontal stepper of the parcel's journey, filled up to the current NP stage. */
function TrackingSteps({ order }: { order: Order }) {
  const t = order.tracking;
  const current = STAGES.findIndex((s) => s.key === t?.stage);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const done = i <= current;
          return (
            <div key={s.key} className="flex flex-col items-center gap-1.5 text-center relative">
              {i > 0 && <span className={cn('absolute top-4 right-1/2 w-full h-0.5 -z-0', i <= current ? 'bg-primary' : 'bg-white/10')} />}
              <span className={cn('relative z-10 w-8 h-8 rounded-full flex items-center justify-center ring-2 transition', done ? 'bg-primary ring-primary text-white' : 'bg-[#1c0c13] ring-white/15 text-white/35', i === current && 'ring-4 ring-primary/40')}>
                <Icon className="w-4 h-4" />
              </span>
              <span className={cn('text-[10px] leading-tight', done ? 'text-white' : 'text-white/40')}>{s.label}</span>
            </div>
          );
        })}
      </div>
      {t && (
        <div className={cn('rounded-xl p-3 text-sm', t.stage === 'problem' ? 'bg-red-500/10 text-red-200' : 'bg-white/5 text-white/80')}>
          <div className="flex items-start gap-2">
            {t.stage === 'problem' && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{t.status}</span>
          </div>
          {t.warehouse && <div className="text-xs text-white/50 mt-1">{t.warehouse}</div>}
          {t.scheduledDate && t.stage !== 'received' && <div className="text-xs text-white/50 mt-1">Очікувана доставка: {t.scheduledDate}</div>}
          {t.receivedAt && t.stage === 'received' && <div className="text-xs text-white/50 mt-1">Отримано: {t.receivedAt}</div>}
          <div className="text-[11px] text-white/35 mt-1">Перевірено {fmtDate(t.checkedAt)}</div>
        </div>
      )}
    </div>
  );
}

function OrderDetails({ order, onUpdate, busy }: { order: Order; onUpdate: (data: OrderUpdate) => Promise<void>; busy: boolean }) {
  const queryClient = useQueryClient();
  const track = useTrackOrder();
  const [ttn, setTtn] = useState(order.ttn ?? '');
  useEffect(() => setTtn(order.ttn ?? ''), [order.ttn]);

  const fullName = [order.lastName, order.firstName, order.middleName].filter(Boolean).join(' ') || order.customerName;
  const shipping = [fullName, order.phone, order.city, order.novaPoshtaBranch].filter(Boolean).join('\n');
  const ttnDirty = ttn.replace(/\D/g, '') !== (order.ttn ?? '');

  const refresh = async () => {
    try {
      await track.mutateAsync({ id: order.id });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    } catch (e) {
      alert(apiError(e, 'Не вдалося оновити статус'));
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-3 pt-4 items-start">
      <div className="space-y-3">
      <Section title={`Товари · ${order.items.reduce((n, i) => n + i.quantity, 0)} шт`}>
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <Gift className="w-5 h-5 text-white/20" />}
              </div>
              <div className="flex-1 min-w-0 text-sm">
                <div className="text-white/90 leading-snug line-clamp-2">{item.productName}</div>
                {item.variant && <div className="text-xs text-white/50">{item.variant}</div>}
                {item.sku && <div className="inline-block mt-0.5 px-1.5 rounded bg-white/10 font-mono text-[11px] text-white/80">Арт. {item.sku}</div>}
              </div>
              <div className="text-right text-sm shrink-0">
                <div className="text-white font-semibold">{formatPrice(item.price * item.quantity)}</div>
                <div className="text-xs text-white/40">{item.quantity} × {formatPrice(item.price)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-2 border-t border-white/10 text-white font-bold">
          <span>Разом</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </Section>

      <Section title="Отримувач і доставка" action={<CopyButton text={shipping} label="Копіювати для ТТН" />}>
        <div className="space-y-1 text-sm">
          <div className="text-white font-semibold">{fullName}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href={`tel:+${intlPhone(order.phone)}`} className="text-white/85 hover:text-white">{order.phone}</a>
            <a href={contactHref(order.contactMethod, order.phone)} target="_blank" rel="noreferrer" className="text-primary text-xs font-semibold hover:underline">
              Написати в {CONTACT_LABELS[order.contactMethod] ?? order.contactMethod} ↗
            </a>
          </div>
          {order.email && <a href={`mailto:${order.email}`} className="block text-white/60 hover:text-white">{order.email}</a>}
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-sm">
          <div className="text-white/90 font-semibold">{order.city || '—'}</div>
          <div className="text-white/70">{order.novaPoshtaBranch || 'Відділення не вказано'}</div>
        </div>
        {order.comment && <div className="rounded-xl bg-amber-500/10 text-amber-100/90 p-3 text-sm italic">«{order.comment}»</div>}
      </Section>
      </div>

      <div className="space-y-3">
        <Section title="Статус замовлення">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                disabled={busy}
                onClick={() => order.status !== s.key && onUpdate({ status: s.key })}
                className={cn('px-3 h-8 rounded-lg text-xs font-semibold ring-1 transition', order.status === s.key ? s.cls : 'ring-white/10 text-white/50 hover:text-white hover:ring-white/30')}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Оплата">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-white/80">{order.paymentMethod === 'bank_transfer' ? 'За реквізитами' : order.paymentMethod === 'liqpay' ? 'Карткою онлайн (LiqPay)' : order.paymentMethod}</div>
            <PaymentPill order={order} />
          </div>
          {order.paymentMethod === 'bank_transfer' && order.paymentStatus !== 'paid' && (
            <div className="space-y-2">
              <div className="text-xs text-white/50">Надішліть клієнту реквізити в {CONTACT_LABELS[order.contactMethod] ?? 'месенджер'}, а коли гроші прийдуть — відмітьте оплату.</div>
              <button type="button" disabled={busy} onClick={() => onUpdate({ paymentStatus: 'paid' })} className="w-full h-9 rounded-xl bg-green-500/20 text-green-200 ring-1 ring-green-500/30 text-sm font-semibold hover:bg-green-500/30">
                Оплату отримано
              </button>
            </div>
          )}
        </Section>

        <Section
          title="Посилка"
          action={order.ttn && (
            <div className="flex items-center gap-3">
              <a href={`https://novaposhta.ua/tracking/?cargo_number=${order.ttn}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white">
                НП <ExternalLink className="w-3 h-3" />
              </a>
              <button type="button" onClick={refresh} disabled={track.isPending} className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white">
                <RefreshCw className={cn('w-3.5 h-3.5', track.isPending && 'animate-spin')} /> Оновити
              </button>
            </div>
          )}
        >
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onUpdate({ ttn: ttn.trim() || null });
            }}
          >
            <input
              value={ttn}
              onChange={(e) => setTtn(e.target.value)}
              inputMode="numeric"
              placeholder="Номер ТТН, напр. 20450012345678"
              className="flex-1 min-w-0 h-10 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-primary"
            />
            {ttnDirty && (
              <button type="submit" disabled={busy} className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Зберегти'}
              </button>
            )}
          </form>
          {order.ttn ? (
            <TrackingSteps order={order} />
          ) : (
            <div className="text-xs text-white/40">Після відправки вставте номер накладної — статус доставки підтягнеться з Нової Пошти й оновлюватиметься сам.</div>
          )}
        </Section>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useListOrders();
  const updateOrder = useUpdateOrder();
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  // ?open=12 (from the dashboard) opens that order straight away.
  const [open, setOpen] = useState<number | null>(() => Number(new URLSearchParams(window.location.search).get('open')) || null);

  useEffect(() => {
    if (open && orders) document.getElementById(`order-${open}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    // only on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!orders]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders?.length ?? 0 };
    orders?.forEach((o) => (c[o.status] = (c[o.status] ?? 0) + 1));
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return (orders ?? []).filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!q) return true;
      return (
        o.customerName.toLowerCase().includes(q) ||
        String(o.id) === q.replace('#', '') ||
        (qDigits.length >= 3 && (o.phone.replace(/\D/g, '').includes(qDigits) || (o.ttn ?? '').includes(qDigits)))
      );
    });
  }, [orders, filter, query]);

  const update = async (id: number, data: OrderUpdate) => {
    try {
      await updateOrder.mutateAsync({ id, data });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    } catch (e) {
      alert(apiError(e, 'Не вдалося зберегти'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-white">Замовлення</h1>
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ім'я, телефон, №, ТТН"
              className="w-full h-10 rounded-xl bg-white/5 ring-1 ring-white/10 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[{ key: 'all', label: 'Усі' }, ...STATUSES].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={cn('shrink-0 h-9 px-4 rounded-xl text-sm font-semibold transition', filter === s.key ? 'bg-primary text-white' : 'bg-white/5 text-white/60 hover:text-white')}
            >
              {s.label} <span className="opacity-60 ml-1">{counts[s.key] ?? 0}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="glass-panel p-12 text-center text-white/50 rounded-3xl">Замовлень не знайдено</div>
        ) : (
          <div className="space-y-3">
            {visible.map((order) => {
              const isOpen = open === order.id;
              const st = statusOf(order.status);
              return (
                <div key={order.id} id={`order-${order.id}`} className={cn('glass-panel rounded-3xl p-4 md:p-5 scroll-mt-4 transition', isOpen && 'ring-1 ring-primary/40')}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : order.id)} className="w-full text-left flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex -space-x-3 shrink-0">
                        {order.items.slice(0, 3).map((i, n) => (
                          <div key={n} className="w-10 h-10 rounded-xl bg-white/10 ring-2 ring-[#1c0c13] overflow-hidden flex items-center justify-center">
                            {i.imageUrl ? <img src={i.imageUrl} alt="" className="w-full h-full object-cover" /> : <Gift className="w-4 h-4 text-white/30" />}
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-semibold truncate">
                          #{order.id} · {order.customerName}
                        </div>
                        <div className="text-xs text-white/45 truncate">
                          {fmtDate(order.createdAt)} · {order.city || 'місто не вказано'} · {order.items.reduce((n, i) => n + i.quantity, 0)} шт
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                      <Pill className={st.cls}>{st.label}</Pill>
                      <PaymentPill order={order} />
                      <DeliveryPill order={order} />
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-3 md:w-36 shrink-0">
                      <span className="text-lg font-bold text-white">{formatPrice(order.total)}</span>
                      <ChevronDown className={cn('w-5 h-5 text-white/40 transition-transform', isOpen && 'rotate-180')} />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <OrderDetails order={order} busy={updateOrder.isPending} onUpdate={(data) => update(order.id, data)} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
