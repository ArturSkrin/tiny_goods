import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import {
  useGetAuthConfig,
  getGetAuthConfigQueryKey,
  useStartEmailLogin,
  useVerifyEmailLogin,
  useTelegramLogin,
  type TelegramAuthInput,
} from '@workspace/api-client-react';
import { useRefreshMe } from '../../hooks/use-me';

const apiError = (e: unknown, fallback: string) => (e as { data?: { error?: string } })?.data?.error ?? fallback;

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
  </svg>
);

/** Official Telegram Login Widget; calls back with signed user data. */
function TelegramButton({ bot, onAuth }: { bot: string; onAuth: (u: TelegramAuthInput) => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    (window as unknown as { onTelegramAuth: (u: TelegramAuthInput) => void }).onTelegramAuth = onAuth;
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.setAttribute('data-telegram-login', bot);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-radius', '14');
    s.setAttribute('data-onauth', 'onTelegramAuth(user)');
    s.setAttribute('data-request-access', 'write');
    box.current?.replaceChildren(s);
  }, [bot]);
  return <div ref={box} className="flex justify-center min-h-[40px]" />;
}

export function LoginPanel() {
  const { data: config } = useGetAuthConfig({ query: { queryKey: getGetAuthConfigQueryKey() } });
  const refreshMe = useRefreshMe();
  const start = useStartEmailLogin();
  const verify = useVerifyEmailLogin();
  const telegram = useTelegramLogin();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState(new URLSearchParams(window.location.search).get('login_error') ? 'Не вдалося увійти через Google. Спробуйте ще раз.' : '');

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    try {
      await start.mutateAsync({ data: { email: email.trim() } });
      setStep('code');
      setCode('');
    } catch (err) {
      setError(apiError(err, 'Не вдалося надіслати код'));
    }
  };

  const checkCode = async (value: string) => {
    setError('');
    try {
      await verify.mutateAsync({ data: { email: email.trim(), code: value } });
      await refreshMe();
    } catch (err) {
      setError(apiError(err, 'Невірний код'));
      setCode('');
    }
  };

  return (
    <div className="liquid-glass rounded-[32px] p-6 md:p-10 max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground">Особистий кабінет</h1>
        <p className="text-sm text-muted-foreground">Історія замовлень, збережені адреси та швидке оформлення. Без паролів.</p>
      </div>

      <div className="space-y-3">
        {config?.google && (
          <a
            href="/api/auth/google"
            className="h-12 w-full rounded-2xl bg-white text-[#1f1f1f] ring-1 ring-black/10 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition"
          >
            <GoogleLogo /> Увійти через Google
          </a>
        )}
        {config?.telegramBot && (
          <TelegramButton
            bot={config.telegramBot}
            onAuth={async (u) => {
              try {
                await telegram.mutateAsync({ data: u });
                await refreshMe();
              } catch (err) {
                setError(apiError(err, 'Не вдалося увійти через Telegram'));
              }
            }}
          />
        )}
      </div>

      {config?.email && (
        <>
          {(config.google || config.telegramBot) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex-1 h-px bg-foreground/10" /> або за email <span className="flex-1 h-px bg-foreground/10" />
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            {step === 'email' ? (
              <motion.form key="email" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} onSubmit={sendCode} className="space-y-3">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-12 rounded-2xl bg-foreground/5 border border-foreground/10 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={start.isPending}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 transition"
                >
                  {start.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Отримати код
                </button>
              </motion.form>
            ) : (
              <motion.div key="code" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Ми надіслали 6-значний код на <span className="font-semibold text-foreground">{email}</span>
                </p>
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(v);
                    if (v.length === 6) checkCode(v);
                  }}
                  placeholder="••••••"
                  className="w-full h-14 rounded-2xl bg-foreground/5 border border-foreground/10 text-center text-2xl font-bold tracking-[0.5em] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {verify.isPending && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
                <div className="flex justify-between text-sm">
                  <button type="button" onClick={() => setStep('email')} className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Інший email
                  </button>
                  <button type="button" onClick={() => sendCode()} disabled={start.isPending} className="text-primary font-semibold hover:underline">
                    Надіслати ще раз
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {error && <div className="text-sm text-destructive text-center">{error}</div>}
      {config && !config.email && !config.google && !config.telegramBot && (
        <p className="text-sm text-muted-foreground text-center">Вхід тимчасово недоступний.</p>
      )}
      <p className="text-xs text-muted-foreground text-center">Реєстрація не обовʼязкова — замовити можна й без акаунта.</p>
    </div>
  );
}
