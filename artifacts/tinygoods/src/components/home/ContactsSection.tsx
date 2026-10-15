import { Phone, Mail, Clock, MapPin } from 'lucide-react';
import type { SiteContacts } from '@workspace/api-client-react';
import { contactLinks } from '../../hooks/use-settings';
import { ContactButtons } from '../ContactButtons';
import { Reveal, SectionTitle } from './Reveal';

export function ContactsSection({ contacts }: { contacts: SiteContacts }) {
  const l = contactLinks(contacts);
  const rows = [
    { icon: Phone, label: 'Телефон', value: contacts.phone, href: l.phone },
    { icon: Mail, label: 'Пошта', value: contacts.email, href: l.email },
    { icon: Clock, label: 'Графік', value: contacts.workHours, href: null },
    { icon: MapPin, label: 'Адреса', value: contacts.address, href: null },
  ].filter((r) => r.value);

  return (
    <section id="contacts" className="scroll-mt-28">
      <Reveal className="liquid-glass rounded-[32px] p-5 md:p-10 grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-5">
          <SectionTitle eyebrow="Контакти" title="Звʼяжіться з нами" subtitle="Підкажемо з вибором пакування та відповімо на питання щодо замовлення." />
          <ContactButtons contacts={contacts} messengersOnly />
        </div>
        <ul className="grid sm:grid-cols-2 gap-3">
          {rows.map((r) => {
            const body = (
              <>
                <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <r.icon className="w-5 h-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{r.label}</span>
                  <span className="block font-semibold text-foreground break-words">{r.value}</span>
                </span>
              </>
            );
            const cls = 'flex items-center gap-3 rounded-2xl p-3.5 bg-background/60 dark:bg-white/[0.05] ring-1 ring-foreground/10';
            return (
              <li key={r.label}>
                {r.href ? <a href={r.href} className={`${cls} hover:ring-primary/40 transition`}>{body}</a> : <div className={cls}>{body}</div>}
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}
