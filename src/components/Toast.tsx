import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md border animate-bounce-short transition-all duration-300"
      style={{
        backgroundColor:
          toast.type === 'success'
            ? 'rgba(238, 255, 240, 0.95)'
            : toast.type === 'error'
            ? 'rgba(254, 242, 242, 0.95)'
            : 'rgba(239, 246, 255, 0.95)',
        borderColor:
          toast.type === 'success'
            ? '#16a34a'
            : toast.type === 'error'
            ? '#ef4444'
            : '#3b82f6',
        color:
          toast.type === 'success'
            ? '#15803d'
            : toast.type === 'error'
            ? '#b91c1c'
            : '#1d4ed8',
      }}
    >
      {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
      {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
      {toast.type === 'info' && <Info className="w-5 h-5" />}
      
      <span className="text-sm font-semibold pr-2">{toast.text}</span>
      
      <button
        onClick={onClose}
        className="rounded-full hover:bg-black/5 p-1 transition-colors"
      >
        <X className="w-4 h-4 cursor-pointer" />
      </button>
    </div>
  );
}
