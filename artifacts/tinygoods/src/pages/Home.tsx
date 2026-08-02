import React, { useState } from 'react';
import { useListProducts, useListCategories } from '@workspace/api-client-react';
import { ProductCard } from '../components/store/ProductCard';
import { StoreLayout } from '../components/layout/StoreLayout';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { Search } from 'lucide-react';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: categories, isLoading: isLoadingCategories } = useListCategories();
  const { data: products, isLoading: isLoadingProducts } = useListProducts({ 
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined
  });

  const featuredProducts = products?.filter(p => p.isFeatured) || [];
  const displayProducts = products || [];

  return (
    <StoreLayout>
      <div className="space-y-12 pb-12">
        
        {/* Hero Section */}
        <section className="relative pt-8 pb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto space-y-6"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
              Все для дому та подарунків
            </h1>
            <p className="text-lg text-white/60">
              Корисні гаджети, атмосферне освітлення та преміальне пакування.
            </p>
            
            <div className="relative max-w-md mx-auto mt-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input 
                type="text" 
                placeholder="Пошук товарів..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-white/10 border border-white/20 rounded-full backdrop-blur-xl text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </motion.div>
        </section>

        {/* Categories */}
        <section>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "whitespace-nowrap px-6 py-2.5 rounded-full backdrop-blur-md transition-all border text-sm font-medium",
                selectedCategory === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              Всі товари
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "whitespace-nowrap px-6 py-2.5 rounded-full backdrop-blur-md transition-all border text-sm font-medium",
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                {cat.name} <span className="opacity-50 ml-1">{cat.productCount}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        {!selectedCategory && !searchQuery && featuredProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">Хіти продажу</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((product, i) => (
                <motion.div
                  key={`featured-${product.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* All Products */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">
            {searchQuery ? 'Результати пошуку' : selectedCategory ? categories?.find(c => c.id === selectedCategory)?.name : 'Всі товари'}
          </h2>
          
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="glass-panel rounded-2xl aspect-[3/4] animate-pulse bg-white/5" />
              ))}
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="py-20 text-center text-white/50 glass-panel rounded-3xl">
              <p className="text-lg">Товарів не знайдено</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {displayProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </StoreLayout>
  );
}
