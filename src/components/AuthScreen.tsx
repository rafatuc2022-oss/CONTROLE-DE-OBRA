import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { Hammer, Lock, Mail, User, ShieldAlert, CheckCircle, Smartphone } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (userId: string, email: string, displayName?: string) => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isForgot) {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg('E-mail de recuperação enviado com sucesso!');
        setIsForgot(false);
      } else if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        onSuccess(userCredential.user.uid, userCredential.user.email || '', name || 'Proprietário');
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onSuccess(userCredential.user.uid, userCredential.user.email || '', userCredential.user.displayName || '');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('Usuário não encontrado. Cadastre-se para começar.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Senha incorreta. Tente novamente.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está sendo utilizado.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter no mínimo 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido.');
      } else {
        setError(err.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onSuccess(result.user.uid, result.user.email || '', result.user.displayName || '');
    } catch (err: any) {
      console.error(err);
      // Fallback in case of popup block / frame block issues
      setError('Não foi possível conectar com o Google no frame. Use login por e-mail.');
    } finally {
      setLoading(false);
    }
  };

  // Demo Login Quick-Bypass to ensure developer/user can inspect with 1 click!
  const handleDemoSignIn = () => {
    onSuccess('demo_user_123', 'demo@obracontrol.com.br', 'Eng. Roberto');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden"
      >
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-8 text-center text-white relative">
          <div className="absolute top-4 right-4 bg-white/10 px-2 py-0.5 rounded text-xs backdrop-blur font-mono">
            v1.0.0
          </div>
          <div className="mx-auto bg-white/15 w-14 h-14 rounded-full flex items-center justify-center mb-4 backdrop-blur shadow-inner">
            <Hammer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">ObraControl</h1>
          <p className="text-white/80 text-sm mt-1">
            Gestão Financeira e Controle de Custos de Obras
          </p>
        </div>

        {/* Auth Forms */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-500 rounded text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 rounded text-emerald-800 dark:text-emerald-200 text-sm flex items-start gap-3">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && !isForgot && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Seu Nome completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder="Ex: Roberto Silva"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                E-mail corporativo ou pessoal
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="roberto@suaconstrutora.com"
                />
              </div>
            </div>

            {!isForgot && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Sua Senha secreta
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => { setIsForgot(true); setError(null); }}
                      className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      Esqueceu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-md shadow-violet-500/10 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isForgot ? (
                'Enviar Recuperação'
              ) : isSignUp ? (
                'Criar Conta'
              ) : (
                'Acessar Painel'
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 border-t border-slate-200 dark:border-slate-700"></span>
            <span className="relative bg-white dark:bg-slate-800 px-3 text-xs text-slate-400 dark:text-slate-500 uppercase">
              Ou continue com
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-.1.31-2.9 3.06v2.54h4.7c2.76-2.54 4.34-6.29 4.34-10.45z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.81-2.13-6.76-5.01H1.31v3.1A12 12 0 0 0 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.24 14.24a7.18 7.18 0 0 1 0-4.48V6.66H1.31a12 12 0 0 0 0 10.68l3.93-3.1z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0A12 12 0 0 0 1.31 6.66l3.93 3.1c.95-2.88 3.61-5.01 6.76-5.01z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={handleDemoSignIn}
              className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-950 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-lg text-sm font-medium transition-colors border border-transparent shadow"
            >
              <span>Acesso Rápido</span>
            </button>
          </div>

          {/* Footer Toggle */}
          <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {isForgot ? (
              <button
                type="button"
                onClick={() => { setIsForgot(false); setError(null); }}
                className="text-violet-600 dark:text-violet-400 hover:underline"
              >
                Voltar para o Login
              </button>
            ) : isSignUp ? (
              <p>
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null); }}
                  className="text-violet-600 dark:text-violet-400 hover:underline font-semibold"
                >
                  Entrar
                </button>
              </p>
            ) : (
              <p>
                Primeira vez aqui?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null); }}
                  className="text-violet-600 dark:text-violet-400 hover:underline font-semibold"
                >
                  Criar conta grátis
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
