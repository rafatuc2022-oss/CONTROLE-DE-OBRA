import React, { useState } from 'react';
import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNotification } from '../context/NotificationContext';
import { X, Lock, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { showToast } = useNotification();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const user = auth.currentUser;
  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com');
  const isDemoUser = user?.uid === 'demo_user_123';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (isDemoUser) {
      setError('A alteração de senha não é permitida na conta de demonstração.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação de senha não coincidem.');
      return;
    }

    if (!user || !user.email) {
      setError('Nenhum usuário autenticado encontrado.');
      return;
    }

    setLoading(true);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setSuccess(true);
      showToast('Senha alterada com sucesso!', 'success');
      
      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Close modal after success delay
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setError('A senha atual inserida está incorreta.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve conter pelo menos 6 caracteres.');
      } else {
        setError(err.message || 'Erro ao alterar a senha. Verifique os dados e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#16191F] border border-slate-200 dark:border-[#2D323D] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-zoomIn">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-[#2D323D] flex justify-between items-center bg-slate-50 dark:bg-[#101318]/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-[#E4E6EB] uppercase tracking-wider">
                Alterar Senha do Perfil
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#9BA1B1]">
                Atualize sua credencial de acesso do Firebase Auth.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#2D323D] rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#E4E6EB] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isGoogleUser ? (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">Login via Google Detectado</span>
              </div>
              <p className="leading-relaxed pl-6">
                Sua conta está integrada via autenticação do Google. Para alterar ou redefinir suas credenciais de segurança, faça isso diretamente na central de contas do seu e-mail Google.
              </p>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Entendi
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Senha atualizada com sucesso! Fechando...</span>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#9BA1B1] mb-1.5 uppercase tracking-wider">
                  Senha Atual *
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    disabled={loading || success}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Sua senha de login atual"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D323D] rounded-lg text-xs text-slate-800 dark:text-[#E4E6EB] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#E4E6EB]"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#9BA1B1] mb-1.5 uppercase tracking-wider">
                  Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    disabled={loading || success}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D323D] rounded-lg text-xs text-slate-800 dark:text-[#E4E6EB] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#E4E6EB]"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-[#9BA1B1] mb-1.5 uppercase tracking-wider">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    disabled={loading || success}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha criada"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D323D] rounded-lg text-xs text-slate-800 dark:text-[#E4E6EB] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#E4E6EB]"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#2D323D]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading || success}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-[#9BA1B1] dark:hover:text-[#E4E6EB] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {loading ? 'Alterando...' : 'Confirmar Alteração'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
