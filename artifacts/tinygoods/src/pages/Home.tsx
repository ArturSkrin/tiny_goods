import React, { useState } from 'react';
import { useListProducts, useListCategories } from '@workspace/api-client-react';
import { ProductCard } from '../components/store/ProductCard';
import { StoreLayout } from '../components/layout/StoreLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Search, X, PackageSearch } from 'lucide-react';
import { Hero } from '../components/home/Hero';
import { Showcase } from '../components/home/Showcase';
import { BrandBanner } from '../components/home/BrandBanner';
import { ContactsSection } from '../components/home/ContactsSection';
import { Faq } from '../components/home/Faq';
import { Reveal, SectionTitle } from '../components/home/Reveal';
import { useSettings } from '../hooks/use-settings';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const settings = useSettings();
  const { data: categories } = useListCategories();
  const { data: products, isLoading: isLoadingProducts } = useListProducts({
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
  });

  const featuredProducts = products?.filter((p) => p.isFeatured) || [];
  const displayProducts = products || [];

  const find = (query: string, categoryId: number | null) => {
    setSearchQuery(query);
    setSelectedCategory(categoryId);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chip = (active: boolean) =>
    cn(
      'whitespace-nowrap px-5 h-10 rounded-full transition-all text-sm font-semibold active:scale-95',
      active
        ? 'bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_hsl(var(--primary))]'
        : 'liquid-glass text-foreground/75 hover:text-foreground',
    );

  return (
    <StoreLayout>
      <div className="space-y-6 md:space-y-10">
        {settings ? (
          <Hero settings={settings} categories={categories ?? []} onFind={find} />
        ) : (
          <div className="liquid-glass rounded-[32px] h-[560px] animate-pulse" />
        )}

        <Showcase categories={categories ?? []} onPick={(id) => find('', id)} />

        {settings && <BrandBanner season={settings.bannerTheme} />}

        {/* Catalog */}
        <section id="catalog" className="scroll-mt-24 md:scroll-mt-28 space-y-5">
          <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <SectionTitle
              title={searchQuery ? 'Результати пошуку' : selectedCategory ? categories?.find((c) => c.id === selectedCategory)?.name : 'Каталог'}
              subtitle="Готове пакування та товари зі складу"
            />
            <div className="relative md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Пошук товарів…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="liquid-glass w-full h-12 pl-11 pr-10 rounded-full text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} aria-label="Очистити" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </Reveal>

          <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <button onClick={() => setSelectedCategory(null)} className={chip(selectedCategory === null)}>
              Усі товари
            </button>
            {categories?.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={chip(selectedCategory === cat.id)}>
                {cat.name} <span className="opacity-60 ml-1">{cat.productCount}</span>
              </button>
            ))}
          </div>

          {!selectedCategory && !searchQuery && featuredProducts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold text-foreground">Хіти продажу</h3>
              <ProductGrid products={featuredProducts} keyPrefix="featured" />
            </div>
          )}

          {isLoadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {Array.from({ length: 8 }).map((_, n) => (
                <div key={n} className="liquid-glass rounded-[24px] aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="liquid-glass rounded-[32px] py-16 px-6 text-center flex flex-col items-center gap-3">
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"
              >
                <PackageSearch className="w-8 h-8" />
              </motion.div>
              <p className="font-bold text-foreground">Нічого не знайшли</p>
              <p className="text-sm text-muted-foreground max-w-sm">Спробуйте інше слово або подивіться весь каталог. Не знайшли потрібне — напишіть нам.</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => find('', null)} className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold">Весь каталог</button>
                <a href="#contacts" className="h-10 px-5 rounded-full ring-1 ring-primary/40 text-primary text-sm font-bold flex items-center">Контакти</a>
              </div>
            </div>
          ) : (
            <ProductGrid products={displayProducts} />
          )}
        </section>

        {settings && <Faq items={settings.faq} />}
        {settings && <ContactsSection contacts={settings.contacts} />}
      </div>
    </StoreLayout>
  );
}

function ProductGrid({ products, keyPrefix = '' }: { products: React.ComponentProps<typeof ProductCard>['product'][]; keyPrefix?: string }) {
  return (
    <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
      <AnimatePresence mode="popLayout">
        {products.map((product, i) => (
          <motion.div
            key={`${keyPrefix}${product.id}`}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: (i % 4) * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
