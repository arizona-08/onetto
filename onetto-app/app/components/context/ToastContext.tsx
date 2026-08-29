'use client';

import React from 'react';

type ToastType = 'success' | 'error';
type Toast = { type: ToastType; message: string };

const ToastContext = React.createContext<{ showToast: (message: string, type: ToastType) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<Toast | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast: (message, type) => setToast({ message, type }) }}>
      {children}
      {toast && (
        <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm" role={toast.type === 'error' ? 'alert' : 'status'}>
          <div className={`flex items-start justify-between gap-4 rounded-lg border p-4 text-sm ${toast.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            <p>{toast.message}</p>
            <button type="button" aria-label="Fermer la notification" onClick={() => setToast(null)} className="font-semibold">×</button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
