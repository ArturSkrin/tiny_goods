import React, { useState } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useGetAdminSession, useChangeAdminPassword, useTotpSetup, useTotpEnable, useTotpDisable, getGetAdminSessionQueryKey } from '@workspace/api-client-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, KeyRound, Smartphone, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminSettings() {
  const { data: session } = useGetAdminSession();
  const queryClient = useQueryClient();
  
  const changePassword = useChangeAdminPassword();
  const totpSetup = useTotpSetup();
  const totpEnable = useTotpEnable();
  const totpDisable = useTotpDisable();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  // 2FA state
  const [setupData, setSetupData] = useState<{ secret: string, otpauthUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);
    
    if (newPassword.length < 8) {
      setPassError('Новий пароль має містити щонайменше 8 символів');
      return;
    }

    try {
      await changePassword.mutateAsync({ data: { currentPassword, newPassword } });
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPassError(err.response?.status === 401 ? 'Невірний поточний пароль' : 'Помилка зміни пароля');
    }
  };

  const handleStart2FASetup = async () => {
    try {
      const data = await totpSetup.mutateAsync();
      setSetupData(data);
      setTotpError('');
      setTotpCode('');
    } catch (err) {
      setTotpError('Помилка генерації 2FA');
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError('');
    try {
      await totpEnable.mutateAsync({ data: { code: totpCode } });
      setSetupData(null);
      setTotpCode('');
      queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
    } catch (err) {
      setTotpError('Невірний код. Спробуйте ще раз.');
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError('');
    try {
      await totpDisable.mutateAsync({ data: { code: totpCode } });
      setTotpCode('');
      queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
    } catch (err) {
      setTotpError('Невірний код. Спробуйте ще раз.');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-8 pb-20">
        <h1 className="text-3xl font-bold text-white">Налаштування</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Зміна пароля */}
          <div className="glass-panel p-6 rounded-3xl space-y-6 self-start">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <KeyRound className="text-primary w-6 h-6" />
              <h2 className="text-xl font-semibold text-white">Зміна пароля</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-white/60">Поточний пароль</label>
                <Input 
                  type="password" 
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-white/60">Новий пароль</label>
                <Input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>
              
              {passError && <div className="text-destructive text-sm">{passError}</div>}
              {passSuccess && <div className="text-green-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Пароль успішно змінено</div>}
              
              <Button type="submit" disabled={changePassword.isPending} className="w-full">
                Зберегти пароль
              </Button>
            </form>
          </div>

          {/* Двофакторна автентифікація */}
          <div className="glass-panel p-6 rounded-3xl space-y-6 self-start">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Shield className="text-primary w-6 h-6" />
              <h2 className="text-xl font-semibold text-white">Двофакторна автентифікація (2FA)</h2>
            </div>

            {session?.totpEnabled ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-green-400 bg-green-400/10 p-4 rounded-2xl border border-green-400/20">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <span className="font-medium">2FA увімкнено та працює. Ваш акаунт надійно захищений.</span>
                </div>

                <form onSubmit={handleDisable2FA} className="space-y-4 border-t border-white/10 pt-4">
                  <p className="text-sm text-white/60">Щоб вимкнути 2FA, введіть поточний код з вашого додатка:</p>
                  <Input 
                    type="text" 
                    placeholder="6-значний код" 
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value)}
                    required
                    maxLength={6}
                  />
                  {totpError && <div className="text-destructive text-sm">{totpError}</div>}
                  <Button type="submit" variant="destructive" disabled={totpDisable.isPending} className="w-full">
                    Вимкнути 2FA
                  </Button>
                </form>
              </div>
            ) : setupData ? (
              <div className="space-y-6">
                <p className="text-sm text-white/70">1. Відскануйте цей QR-код у додатку-автентифікаторі (Google Authenticator, Authy тощо).</p>
                <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                  <QRCodeSVG value={setupData.otpauthUrl} size={150} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">Або введіть секретний ключ вручну:</label>
                  <code className="block p-3 bg-white/5 rounded-xl text-white font-mono text-sm border border-white/10 select-all">
                    {setupData.secret}
                  </code>
                </div>
                
                <form onSubmit={handleEnable2FA} className="space-y-4 border-t border-white/10 pt-4">
                  <p className="text-sm text-white/70">2. Введіть 6-значний код з додатка для підтвердження:</p>
                  <Input 
                    type="text" 
                    placeholder="6-значний код" 
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value)}
                    required
                    maxLength={6}
                  />
                  {totpError && <div className="text-destructive text-sm">{totpError}</div>}
                  <div className="flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => setSetupData(null)}>
                      Скасувати
                    </Button>
                    <Button type="submit" disabled={totpEnable.isPending} className="flex-1">
                      Підтвердити та увімкнути
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-white/70 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <Smartphone className="w-8 h-8 shrink-0 text-white/40" />
                  <span className="text-sm">Використовуйте додаток на смартфоні для генерації одноразових кодів під час входу.</span>
                </div>
                <Button onClick={handleStart2FASetup} disabled={totpSetup.isPending} className="w-full">
                  Увімкнути 2FA
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
