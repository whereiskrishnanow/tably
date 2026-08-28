import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  emoji?: string;
}

interface ToastState {
  current: Toast | null;
  show: (message: string, emoji?: string) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToast = create<ToastState>((set) => ({
  current: null,
  show: (message, emoji) => {
    const id = ++toastId;
    if (hideTimer) clearTimeout(hideTimer);
    set({ current: { id, message, emoji } });
    hideTimer = setTimeout(() => {
      set((s) => (s.current?.id === id ? { current: null } : s));
    }, 2400);
  },
  dismiss: (id) => set((s) => (s.current?.id === id ? { current: null } : s)),
}));

export const showToast = (message: string, emoji?: string) => useToast.getState().show(message, emoji);
