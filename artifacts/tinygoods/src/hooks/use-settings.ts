import { useGetSettings, getGetSettingsQueryKey, type SiteContacts } from '@workspace/api-client-react';

/** Admin-editable storefront settings (texts, contacts, amounts); undefined while loading. */
export function useSettings() {
  return useGetSettings({ query: { queryKey: getGetSettingsQueryKey(), staleTime: 5 * 60_000 } }).data;
}

const handle = (v: string) => v.trim().replace(/^@/, '');

/** Messenger/contact links built from the values entered in the admin panel. */
export function contactLinks(c: SiteContacts) {
  const digits = (v: string) => v.replace(/[^\d]/g, '');
  return {
    phone: c.phone ? `tel:+${digits(c.phone)}` : null,
    viber: c.viber ? `viber://chat?number=%2B${digits(c.viber)}` : null,
    telegram: c.telegram ? (/^https?:/.test(c.telegram) ? c.telegram : `https://t.me/${handle(c.telegram)}`) : null,
    instagram: c.instagram ? (/^https?:/.test(c.instagram) ? c.instagram : `https://instagram.com/${handle(c.instagram)}`) : null,
    email: c.email ? `mailto:${c.email.trim()}` : null,
  };
}
