import { eq } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import { GetSettingsResponse } from "@workspace/api-zod";
import type { SiteSettings } from "@workspace/api-zod";

/** Used until the admin saves settings for the first time. */
export const DEFAULT_SETTINGS: SiteSettings = {
  minOrderTotal: 300,
  bannerTheme: "spring",
  // Placeholder contacts (invalid +380 00 number) until real ones are entered in the admin.
  contacts: {
    phone: "+380 00 000 00 00",
    viber: "+380000000000",
    telegram: "+380000000000",
    whatsapp: "+380000000000",
    instagram: "",
    email: "hello@tinygoods.skrin.pp.ua",
    address: "",
    workHours: "Пн–Сб 10:00–19:00",
  },
  hero: {
    eyebrow: "Пакування · Подарунки · Дім",
    title: "Пакування, яке",
    titleAccent: "хочеться відкривати",
    subtitle:
      "Коробки, пакети, стрічки та тішʼю зі складу, а ще затишне світло й корисні дрібниці для дому.",
  },
  promos: [
    { title: "Шукаєте бонбоньєрки на весілля?", note: "найкращі коробки тут", image: "/products/giftbox.jpg", color: "#ec8aa0", query: "коробк" },
    { title: "Потрібна стрічка до подарунка?", note: "фінальний акцент", image: "/products/ribbon.jpg", color: "#8a5fc4", query: "стрічк" },
    { title: "Пакети для подарунків", note: "на будь-яку подію", image: "/products/giftbag.jpg", color: "#c99649", query: "пакет" },
    { title: "Затишне світло вдома", note: "нічники та лампи", image: "/products/nightlight.jpg", color: "#6f975c", query: "нічник" },
    { title: "Тішʼю для пакування", note: "ніжно та охайно", image: "/products/tissue.jpg", color: "#dc7f6e", query: "тіш" },
    { title: "Корисні гаджети", note: "павербанки й ліхтарики", image: "/products/powerbank.jpg", color: "#5d7191", query: "павербанк" },
  ],
  showcase: [
    { label: "Основа подарунка", title: "Коробки", image: "/products/giftbox.jpg", query: "коробк" },
    { label: "Для вручення", title: "Пакети", image: "/products/giftbag.jpg", query: "пакет" },
    { label: "Фінальний акцент", title: "Стрічки", image: "/products/ribbon.jpg", query: "стрічк" },
    { label: "Папір для пакування", title: "Тішʼю", image: "/products/tissue.jpg", query: "тіш" },
    { label: "Атмосфера", title: "Нічники", image: "/products/nightlight.jpg", query: "нічник" },
    { label: "Затишок", title: "Настільні лампи", image: "/products/desklamp.jpg", query: "ламп" },
    { label: "Завжди заряджений", title: "Павербанки", image: "/products/powerbank.jpg", query: "павербанк" },
    { label: "В дорогу", title: "Ліхтарики", image: "/products/flashlight.jpg", query: "ліхтар" },
  ],
  faq: [
    { q: "Яка мінімальна сума замовлення?", a: "Мінімальне замовлення — 300 ₴. Кошик підкаже, скільки ще додати до мінімальної суми." },
    { q: "Як ви доставляєте?", a: "Новою Поштою по всій Україні — у відділення або поштомат, який ви вкажете при оформленні." },
    { q: "Як можна оплатити?", a: "Онлайн карткою через захищену сторінку LiqPay одразу після оформлення замовлення." },
    { q: "Як із вами звʼязатися?", a: "У Telegram, Viber або WhatsApp — контакти внизу сторінки. Після оформлення замовлення ми самі напишемо у вибраний месенджер, щоб підтвердити деталі." },
  ],
};

export async function getSettings(): Promise<SiteSettings> {
  const [row] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.id, 1));
  if (!row) return DEFAULT_SETTINGS;
  // Fill keys added after the row was saved, then validate the shape.
  const stored = row.data as Partial<SiteSettings>;
  return GetSettingsResponse.parse({
    ...DEFAULT_SETTINGS,
    ...stored,
    contacts: { ...DEFAULT_SETTINGS.contacts, ...stored.contacts },
    hero: { ...DEFAULT_SETTINGS.hero, ...stored.hero },
  });
}

export async function saveSettings(data: SiteSettings): Promise<void> {
  await db
    .insert(siteSettingsTable)
    .values({ id: 1, data })
    .onConflictDoUpdate({ target: siteSettingsTable.id, set: { data } });
}
