import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

const ConfirmContext = createContext(null);

/**
 * Styled replacement for window.confirm. Wrap the app in <ConfirmProvider>, then:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete product?', message: '...' }))) return;
 * Resolves true on confirm, false on cancel/backdrop.
 */
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog(typeof options === 'string' ? { message: options } : options);
    });
  }, []);

  const close = (result) => {
    setDialog(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-6" onClick={() => close(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-[fadeIn_.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${dialog.danger ? 'bg-red-100 text-red-600' : 'bg-lime-100 text-navy-900'}`}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="font-bold text-navy-900">{dialog.title || 'Are you sure?'}</h3>
                {dialog.message && <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{dialog.message}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(false)}>{dialog.cancelText || 'Cancel'}</Button>
              <Button
                variant={dialog.danger ? 'danger' : 'accent'}
                onClick={() => close(true)}
                className={dialog.danger ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}
              >
                {dialog.confirmText || 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return confirm;
}
