import React from 'react';
import { X, Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart, variantLabel } from '../../context/cart';
import { useSettings } from '../../hooks/use-settings';
import { formatPrice } from '../../lib/utils';
import { Link, useLocation } from 'wouter';
import { Button } from '../ui/button';

export default function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, cartTotal } = useCart();
  const [, setLocation] = useLocation();
  const minOrder = useSettings()?.minOrderTotal ?? 0;

  const handleCheckout = () => {
    setIsCartOpen(false);
    setLocation('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-foreground/15 dark:bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full md:w-[400px] glass-panel md:rounded-l-3xl md:rounded-r-none rounded-none z-50 flex flex-col border-r-0 border-y-0"
          >
            <div className="flex items-center justify-between p-6 border-b border-foreground/10">
              <h2 className="text-xl font-semibold text-foreground">Кошик</h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-full hover:bg-foreground/10 text-foreground/70 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-foreground/50 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center">
                    <Trash2 className="w-8 h-8 opacity-50" />
                  </div>
                  <p>Кошик порожній</p>
                  <Button 
                    variant="glass" 
                    onClick={() => setIsCartOpen(false)}
                  >
                    Повернутися до покупок
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.key} className="flex gap-4 p-4 rounded-2xl bg-foreground/5 border border-foreground/10 relative group">
                      <div className="w-20 h-20 rounded-xl bg-foreground/10 overflow-hidden shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-foreground/20">
                            <span className="text-xs">No image</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col">
                        <h3 className="text-sm font-medium text-foreground line-clamp-2">{item.productName}</h3>
                        {variantLabel(item) && <div className="text-xs text-muted-foreground">{variantLabel(item)}</div>}
                        <div className="mt-1 text-primary font-medium">{formatPrice(item.price)}</div>
                        
                        <div className="mt-auto flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-foreground/10 rounded-lg p-1">
                            <button 
                              onClick={() => updateQuantity(item.key, item.quantity - 1)}
                              className="p-1 rounded-md hover:bg-foreground/10 text-foreground/70 hover:text-foreground"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm w-4 text-center text-foreground">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.key, item.quantity + 1)}
                              className="p-1 rounded-md hover:bg-foreground/10 text-foreground/70 hover:text-foreground"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => removeFromCart(item.key)}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-foreground/10 bg-foreground/5 backdrop-blur-lg">
                <div className="flex justify-between mb-4 text-foreground">
                  <span className="text-foreground/70">Сума замовлення</span>
                  <span className="text-lg font-bold">{formatPrice(cartTotal)}</span>
                </div>
                
                {cartTotal < minOrder ? (
                  <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive dark:text-destructive-foreground text-sm text-center">
                    Мінімальна сума замовлення {formatPrice(minOrder)}.<br/>
                    Додайте ще товарів на {formatPrice(minOrder - cartTotal)}.
                  </div>
                ) : null}

                <Button 
                  className="w-full h-14 text-base rounded-2xl" 
                  size="lg"
                  disabled={cartTotal < minOrder}
                  onClick={handleCheckout}
                >
                  Оформити замовлення <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
