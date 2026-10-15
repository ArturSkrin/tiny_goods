import React from 'react';
import { StoreLayout } from '../components/layout/StoreLayout';
import { Package, Truck, HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '../hooks/use-settings';
import { ContactButtons } from '../components/ContactButtons';

export default function About() {
  const settings = useSettings();
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
          {settings && <ContactButtons contacts={settings.contacts} className="justify-center" />}
          {(settings?.contacts.address || settings?.contacts.workHours) && (
            <div className="mt-6 text-sm text-muted-foreground space-y-1">
              {settings.contacts.address && <div>{settings.contacts.address}</div>}
              {settings.contacts.workHours && <div>{settings.contacts.workHours}</div>}
            </div>
          )}
        </motion.div>
      </div>
    </StoreLayout>
  );
}
