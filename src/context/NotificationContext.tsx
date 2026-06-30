import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface ConfirmConfig {
  title: string;
  message: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface NotificationContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  confirmAction: (config: ConfirmConfig) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirmAction = useCallback((config: ConfirmConfig) => {
    setConfirmConfig(config);
    setConfirmLoading(false);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = async () => {
    if (!confirmConfig) return;
    setConfirmLoading(true);
    try {
      if (confirmConfig.onConfirm) {
        await confirmConfig.onConfirm();
      }
      if (resolveRef.current) {
        resolveRef.current(true);
        resolveRef.current = null;
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao realizar ação', 'error');
    } finally {
      setConfirmLoading(false);
      setConfirmConfig(null);
    }
  };

  const handleCancel = () => {
    if (!confirmConfig) return;
    if (confirmConfig.onCancel) {
      confirmConfig.onCancel();
    }
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setConfirmConfig(null);
  };

  return (
    <NotificationContext.Provider value={{ showToast, confirmAction }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            let bgClass = 'bg-[#1C2129] border-[#2D323D]';
            let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

            if (toast.type === 'success') {
              bgClass = 'bg-emerald-950/90 border-emerald-500/30';
              icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
            } else if (toast.type === 'error') {
              bgClass = 'bg-rose-950/90 border-rose-500/30';
              icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
            } else if (toast.type === 'warning') {
              bgClass = 'bg-amber-950/90 border-amber-500/30';
              icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`p-4 rounded-xl border shadow-xl flex items-start gap-3 pointer-events-auto backdrop-blur-md ${bgClass}`}
                id={`toast-${toast.id}`}
              >
                {icon}
                <div className="flex-1 text-xs font-medium text-[#E4E6EB] leading-relaxed">
                  {toast.message}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-[#9BA1B1] hover:text-[#E4E6EB] transition-colors p-0.5 hover:bg-[#2D323D]/50 rounded shrink-0 cursor-pointer"
                  id={`close-toast-${toast.id}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmConfig && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1C2129] w-full max-w-sm rounded-2xl border border-[#2D323D] p-6 shadow-2xl relative overflow-hidden"
              id="confirm-dialog"
            >
              {/* Variant Accent indicator */}
              <div 
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  confirmConfig.variant === 'danger' 
                    ? 'bg-rose-500' 
                    : confirmConfig.variant === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-[#F27D26]'
                }`}
              />

              <div className="flex items-start gap-3.5 mt-2">
                <div className={`p-2 rounded-xl shrink-0 ${
                  confirmConfig.variant === 'danger'
                    ? 'bg-rose-500/10 text-rose-400'
                    : confirmConfig.variant === 'warning'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-[#F27D26]/10 text-[#F27D26]'
                }`}>
                  {confirmConfig.variant === 'danger' ? (
                    <XCircle className="w-5 h-5" />
                  ) : confirmConfig.variant === 'warning' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Info className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <h4 className="text-xs font-bold text-[#E4E6EB] uppercase tracking-wider font-sans">
                    {confirmConfig.title}
                  </h4>
                  <p className="text-xs text-[#9BA1B1] leading-relaxed font-sans">
                    {confirmConfig.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2D323D]/50">
                <button
                  onClick={handleCancel}
                  disabled={confirmLoading}
                  className="px-4 py-2 text-xs font-semibold text-[#9BA1B1] hover:text-[#E4E6EB] transition-colors disabled:opacity-50 cursor-pointer"
                  id="confirm-cancel-btn"
                >
                  {confirmConfig.cancelText || 'Cancelar'}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmLoading}
                  className={`px-5 py-2.5 rounded-lg text-xs font-bold shadow transition-colors disabled:opacity-50 cursor-pointer text-white ${
                    confirmConfig.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : confirmConfig.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-[#F27D26] hover:bg-[#ff8c3a]'
                  }`}
                  id="confirm-ok-btn"
                >
                  {confirmLoading ? 'Processando...' : (confirmConfig.confirmText || 'Confirmar')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
