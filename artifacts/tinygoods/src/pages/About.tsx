import React from 'react';
import { StoreLayout } from '../components/layout/StoreLayout';
import { Package, Truck, HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';

export default function About() {
  const features = [
    {
      icon: Package,
      title: "Корисні товари",
      desc: "Ретельно відбираємо гаджети та товари для дому, які дійсно полегшують життя."
    },
    {
      icon: Truck,
      title: "Швидка доставка",
      desc: "Відправляємо замовлення Новою Поштою по всій Україні кожного дня."
    },
    {
      icon: HeartHandshake,
      title: "З турботою",
      desc: "Надійно пакуємо та завжди готові допомогти з вибором через Viber чи Telegram."
    }
  ];

  return (
    <StoreLayout>
      <div className="max-w-3xl mx-auto py-12 md:py-20 space-y-12">
        <div className="text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-foreground"
          >
            Про магазин <span className="text-primary">TinyGoods UA</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-foreground/70 leading-relaxed max-w-2xl mx-auto"
          >
            Ми — невеликий український інтернет-магазин, створений з любов'ю до деталей.
            Наша мета — зібрати в одному місці сучасні гаджети, атмосферне освітлення 
            та красиве пакування для ваших подарунків.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="glass-panel p-8 rounded-[2rem] text-center flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-6">
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-foreground/60 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            )
          })}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel p-8 md:p-12 rounded-[2rem] text-center"
        >
          <h2 className="text-2xl font-bold text-foreground mb-4">Маєте запитання?</h2>
          <p className="text-foreground/70 mb-8">
            Наш менеджер із задоволенням відповість на всі ваші питання.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#" className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#7360F2]/20 text-[#7360F2] hover:bg-[#7360F2]/30 border border-[#7360F2]/30 font-medium transition-colors flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              Написати у Viber
            </a>
            <a href="#" className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#2AABEE]/20 text-[#2AABEE] hover:bg-[#2AABEE]/30 border border-[#2AABEE]/30 font-medium transition-colors flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              Написати в Telegram
            </a>
          </div>
        </motion.div>
      </div>
    </StoreLayout>
  );
}
