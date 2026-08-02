import React from 'react';
import { Link } from 'wouter';
import { Product } from '@workspace/api-client-react';
import { formatPrice } from '../../lib/utils';
import { Button } from '../ui/button';
import { useCart } from '../../context/cart';
import { ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product, 1);
  };

  return (
    <Link href={`/product/${product.id}`}>
      <motion.div 
        whileHover={{ y: -5 }}
        className="glass-panel group rounded-2xl flex flex-col h-full overflow-hidden cursor-pointer"
      >
        <div className="aspect-[4/3] bg-white/5 relative overflow-hidden">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              No image
            </div>
          )}
          {product.oldPrice && product.oldPrice > product.price && (
            <div className="absolute top-3 left-3 bg-destructive text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-md">
              Знижка
            </div>
          )}
        </div>
        
        <div className="p-4 flex flex-col flex-1">
          <h3 className="text-white font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          <div className="mt-auto flex items-end justify-between">
            <div>
              {product.oldPrice && product.oldPrice > product.price && (
                <div className="text-white/40 text-sm line-through mb-0.5">
                  {formatPrice(product.oldPrice)}
                </div>
              )}
              <div className="text-lg font-bold text-white">
                {formatPrice(product.price)}
              </div>
            </div>
            
            <Button 
              size="icon" 
              variant="glass" 
              className="rounded-full shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
              onClick={handleAdd}
            >
              <ShoppingBag className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
