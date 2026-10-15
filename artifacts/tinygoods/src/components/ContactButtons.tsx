import { Phone, Send, Instagram, Mail, MessageCircle } from 'lucide-react';
import type { SiteContacts } from '@workspace/api-client-react';
import { contactLinks } from '../hooks/use-settings';
import { cn } from '../lib/utils';

/** Buttons for every contact channel filled in the admin panel. */
export function ContactButtons({ contacts, className }: { contacts: SiteContacts; className?: string }) {
  const l = contactLinks(contacts);
  const items = [
    { href: l.viber, label: 'Viber', icon: MessageCircle, cls: 'text-[#7360F2] ring-[#7360F2]/30 bg-[#7360F2]/10' },
    { href: l.telegram, label: 'Telegram', icon: Send, cls: 'text-[#2AABEE] ring-[#2AABEE]/30 bg-[#2AABEE]/10' },
    { href: l.instagram, label: 'Instagram', icon: Instagram, cls: 'text-[#E1306C] ring-[#E1306C]/30 bg-[#E1306C]/10' },
    { href: l.phone, label: contacts.phone, icon: Phone, cls: 'text-foreground ring-foreground/15 bg-foreground/5' },
    { href: l.email, label: contacts.email, icon: Mail, cls: 'text-foreground ring-foreground/15 bg-foreground/5' },
  ].filter((i) => i.href);

  if (items.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((i) => (
        <a
          key={i.label}
          href={i.href!}
          target={i.href!.startsWith('http') ? '_blank' : undefined}
          rel="noreferrer"
          className={cn('h-11 px-4 rounded-2xl ring-1 font-bold text-sm flex items-center gap-2 hover:brightness-110 active:scale-95 transition', i.cls)}
        >
          <i.icon className="w-4 h-4" /> {i.label}
        </a>
      ))}
    </div>
  );
}
