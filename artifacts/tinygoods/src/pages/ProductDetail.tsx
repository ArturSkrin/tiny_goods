import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useGetProduct, getGetProductQueryKey } from '@workspace/api-client-react';
import { StoreLayout } from '../components/layout/StoreLayout';
import { Button } from '../components/ui/button';
import { useCart } from '../context/cart';
import { formatPrice } from '../lib/utils';
import { ShoppingBag, ArrowLeft, Minus, Plus, Check } from 'lucide-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

export default function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const id = params?.id ? parseInt(params.id, 10) : 0;
  
  const { data: product, isLoading } = useGetProduct(id, { 
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id) } 
  });
  
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </StoreLayout>
    );
  }

  if (!product) {
    return (
      <StoreLayout>
        <div className="py-20 text-center text-foreground/50 glass-panel rounded-3xl">
          Товар не знайдено
        </div>
      </StoreLayout>
    );
  }

  const handleAdd = () => {
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <StoreLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <Link href="/" className="inline-flex items-center text-foreground/60 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад до каталогу
        </Link>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Image */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel rounded-[2rem] aspect-square md:aspect-[4/5] relative overflow-hidden"
          >
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-foreground/20">
                No image
              </div>
            )}
            
            {product.oldPrice && product.oldPrice > product.price && (
              <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1 rounded-full backdrop-blur-md shadow-lg">
                Знижка
              </div>
            )}
            {product.stock <= 5 && product.stock > 0 && (
              <div className="absolute top-4 right-4 bg-orange-500/80 text-foreground text-sm font-bold px-3 py-1 rounded-full backdrop-blur-md shadow-lg">
                Залишилось {product.stock} шт
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-center"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
              {product.name}
            </h1>
            
            <div className="flex items-end gap-4 mb-6">
              <div className="text-4xl font-bold text-foreground">
                {formatPrice(product.price)}
              </div>
              {product.oldPrice && product.oldPrice > product.price && (
                <div className="text-xl text-foreground/40 line-through mb-1">
                  {formatPrice(product.oldPrice)}
                </div>
              )}
            </div>

            <div className="prose prose-invert prose-p:text-foreground/70 max-w-none mb-8">
              {product.description ? (
                <p className="whitespace-pre-wrap">{product.description}</p>
              ) : (
                <p className="italic opacity-50">Опис відсутній</p>
              )}
            </div>

            <div className="glass p-6 rounded-3xl space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-foreground/70">Кількість</span>
                <div className="flex items-center gap-4 glass rounded-xl p-1">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-foreground font-medium">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                    className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full h-14 text-base rounded-2xl relative overflow-hidden group"
                onClick={handleAdd}
                disabled={product.stock === 0}
              >
                <div className="absolute inset-0 bg-foreground/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  {added ? (
                    <>
                      <Check className="w-5 h-5" /> Додано
                    </>
                  ) : product.stock === 0 ? (
                    'Немає в наявності'
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" /> Додати в кошик
                    </>
                  )}
                </span>
              </Button>
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="glass-panel p-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/70"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg>
                </div>
                <span className="text-sm text-foreground/70">Безпечна оплата</span>
              </div>
              <div className="glass-panel p-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/70"><path d="M5 12l5 5L20 7"/></svg>
                </div>
                <span className="text-sm text-foreground/70">Швидка доставка</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </StoreLayout>
  );
}
