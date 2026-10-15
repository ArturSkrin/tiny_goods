import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey, type SiteSettings } from '@workspace/api-client-react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2, Check } from 'lucide-react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ImageUpload } from '../components/admin/ImageUpload';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel p-6 rounded-3xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {hint && <p className="text-sm text-white/50 mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-white/60">{label}</span>
      {children}
    </label>
  );
}

/** Reorderable list of cards, each rendered by `render`. */
function ListEditor<T>({ items, onChange, create, render, addLabel }: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
  addLabel: string;
}) {
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>#{i + 1}</span>
            <div className="flex gap-1">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30" aria-label="Вище"><ArrowUp className="w-4 h-4" /></button>
              <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30" aria-label="Нижче"><ArrowDown className="w-4 h-4" /></button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1.5 rounded-lg hover:bg-destructive/20 hover:text-destructive" aria-label="Видалити"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...items, create()])}>
        <Plus className="w-4 h-4 mr-2" /> {addLabel}
      </Button>
    </div>
  );
}

export default function AdminSite() {
  const { data } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const update = useUpdateSettings();
  const queryClient = useQueryClient();
  const [s, setS] = useState<SiteSettings>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !s) setS(data);
  }, [data, s]);

  if (!s) {
    return (
      <AdminLayout>
        <div className="py-10 text-center text-white/50">Завантаження...</div>
      </AdminLayout>
    );
  }

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setS({ ...s, [key]: value });

  const save = async () => {
    try {
      const fresh = await update.mutateAsync({ data: s });
      queryClient.setQueryData(getGetSettingsQueryKey(), fresh);
      setS(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert((e as { data?: { error?: string } })?.data?.error ?? 'Помилка збереження');
    }
  };

  const contact = (key: keyof SiteSettings['contacts'], label: string, placeholder: string) => (
    <Field label={label}>
      <Input value={s.contacts[key]} placeholder={placeholder} onChange={(e) => set('contacts', { ...s.contacts, [key]: e.target.value })} />
    </Field>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 pb-28">
        <div>
          <h1 className="text-3xl font-bold text-white">Сайт</h1>
          <p className="text-white/50 mt-1">Тексти, контакти, суми та блоки головної сторінки. Зміни зʼявляться на сайті після збереження.</p>
        </div>

        <Section title="Замовлення">
          <Field label="Мінімальна сума замовлення, грн">
            <Input type="number" min={0} value={s.minOrderTotal} onChange={(e) => set('minOrderTotal', Number(e.target.value))} className="max-w-xs" />
          </Field>
        </Section>

        <Section title="Контакти" hint="Порожні поля на сайті не показуються.">
          <div className="grid md:grid-cols-2 gap-4">
            {contact('phone', 'Телефон', '+380 67 123 45 67')}
            {contact('viber', 'Viber (номер)', '+380 67 123 45 67')}
            {contact('telegram', 'Telegram', '@tinygoods або https://t.me/…')}
            {contact('instagram', 'Instagram', '@tinygoods.ua')}
            {contact('email', 'Email', 'hello@example.com')}
            {contact('workHours', 'Графік роботи', 'Пн–Пт 10:00–19:00')}
            <div className="md:col-span-2">{contact('address', 'Адреса / самовивіз', 'Київ, вул. …')}</div>
          </div>
        </Section>

        <Section title="Головний екран">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Надпис над заголовком">
              <Input value={s.hero.eyebrow} onChange={(e) => set('hero', { ...s.hero, eyebrow: e.target.value })} />
            </Field>
            <div />
            <Field label="Заголовок">
              <Input value={s.hero.title} onChange={(e) => set('hero', { ...s.hero, title: e.target.value })} />
            </Field>
            <Field label="Виділена частина заголовка">
              <Input value={s.hero.titleAccent} onChange={(e) => set('hero', { ...s.hero, titleAccent: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Підзаголовок">
                <Textarea value={s.hero.subtitle} onChange={(e) => set('hero', { ...s.hero, subtitle: e.target.value })} />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Промо-карусель" hint="Картки біля головного екрана. Клік відкриває каталог з пошуком за словом.">
          <ListEditor
            items={s.promos}
            onChange={(v) => set('promos', v)}
            addLabel="Додати картку"
            create={() => ({ title: '', note: '', image: '', color: '#ec8aa0', query: '' })}
            render={(p, upd) => (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Field label="Заголовок"><Input value={p.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
                  <Field label="Підпис внизу"><Input value={p.note} onChange={(e) => upd({ note: e.target.value })} /></Field>
                  <div className="flex gap-3">
                    <Field label="Колір шапки">
                      <input type="color" value={p.color} onChange={(e) => upd({ color: e.target.value })} className="w-14 h-12 rounded-xl bg-transparent border border-white/10 cursor-pointer" />
                    </Field>
                    <div className="flex-1">
                      <Field label="Пошук у каталозі"><Input value={p.query} placeholder="коробк" onChange={(e) => upd({ query: e.target.value })} /></Field>
                    </div>
                  </div>
                </div>
                <Field label="Зображення"><ImageUpload value={p.image} onChange={(image) => upd({ image })} /></Field>
              </div>
            )}
          />
        </Section>

        <Section title="Вітрина «Усе для ідеального подарунка»">
          <ListEditor
            items={s.showcase}
            onChange={(v) => set('showcase', v)}
            addLabel="Додати картку"
            create={() => ({ label: '', title: '', image: '', query: '' })}
            render={(it, upd) => (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Field label="Назва"><Input value={it.title} onChange={(e) => upd({ title: e.target.value })} /></Field>
                  <Field label="Малий надпис"><Input value={it.label} onChange={(e) => upd({ label: e.target.value })} /></Field>
                  <Field label="Пошук у каталозі"><Input value={it.query} onChange={(e) => upd({ query: e.target.value })} /></Field>
                </div>
                <Field label="Зображення"><ImageUpload value={it.image} onChange={(image) => upd({ image })} /></Field>
              </div>
            )}
          />
        </Section>

        <Section title="Питання та відповіді (FAQ)">
          <ListEditor
            items={s.faq}
            onChange={(v) => set('faq', v)}
            addLabel="Додати питання"
            create={() => ({ q: '', a: '' })}
            render={(f, upd) => (
              <div className="space-y-3">
                <Field label="Питання"><Input value={f.q} onChange={(e) => upd({ q: e.target.value })} /></Field>
                <Field label="Відповідь"><Textarea value={f.a} onChange={(e) => upd({ a: e.target.value })} /></Field>
              </div>
            )}
          />
        </Section>

        <div className="fixed bottom-6 right-6 z-30">
          <Button size="lg" onClick={save} disabled={update.isPending} className="rounded-2xl shadow-2xl">
            {saved ? <Check className="w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {saved ? 'Збережено' : 'Зберегти'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
