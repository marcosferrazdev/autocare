'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm deve ser usado dentro de um ConfirmProvider');
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [closing, setClosing] = useState(false);
  const resolverRef = useRef<(value: boolean) => void>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setClosing(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = (result: boolean) => {
    setClosing(true);
    // Pequeno delay para a animação de saída
    setTimeout(() => {
      resolverRef.current?.(result);
      resolverRef.current = null;
      setOptions(null);
      setClosing(false);
    }, 120);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <div
          className={`fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-150 ${
            closing ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={() => handleClose(false)}
        >
          <div
            className={`bg-white rounded-lg shadow-2xl max-w-md w-full p-6 transition-all duration-150 ${
              closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            }`}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5.5 w-5.5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-base">
                  {options.title || 'Confirmar ação'}
                </h3>
                <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">{options.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2.5 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {options.cancelLabel || 'Cancelar'}
              </button>
              <button
                onClick={() => handleClose(true)}
                className="px-4 py-2.5 rounded-md text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
                autoFocus
              >
                {options.confirmLabel || 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
