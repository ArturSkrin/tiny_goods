import { Phone, Send, Instagram, Mail, MessageCircle } from 'lucide-react';
import type { SiteContacts } from '@workspace/api-client-react';
import { contactLinks } from '../hooks/use-settings';
import { cn } from '../lib/utils';

const WhatsApp = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={p.className} aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.7-.3-2.1-.8-3.2-2.6-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.2-.2-.2-.5-.4Z" />
  </svg>
);

/** Buttons for every contact channel filled in the admin panel. */
export function ContactButtons({
  contacts,
  className,
  messengersOnly,
}: {
  contacts: SiteContacts;
  className?: string;
  messengersOnly?: boolean;
}) {
  const l = contactLinks(contacts);
  const items = [
    { href: l.telegram, label: 'Telegram', icon: Send, cls: 'text-[#2AABEE] ring-[#2AABEE]/30 bg-[#2AABEE]/10' },
    { href: l.viber, label: 'Viber', icon: MessageCircle, cls: 'text-[#7360F2] ring-[#7360F2]/30 bg-[#7360F2]/10' },
    { href: l.whatsapp, label: 'WhatsApp', icon: WhatsApp, cls: 'text-[#1FAF54] ring-[#25D366]/35 bg-[#25D366]/10' },
    { href: l.instagram, label: 'Instagram', icon: Instagram, cls: 'text-[#E1306C] ring-[#E1306C]/30 bg-[#E1306C]/10' },
    ...(messengersOnly
      ? []
      : [
          { href: l.phone, label: contacts.phone, icon: Phone, cls: 'text-foreground ring-foreground/15 bg-foreground/5' },
          { href: l.email, label: contacts.email, icon: Mail, cls: 'text-foreground ring-foreground/15 bg-foreground/5' },
        ]),
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
