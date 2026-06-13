import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'loading' | 'info';
  duration?: number; // duration in ms, defaults to 3000ms
}

export interface ConfirmConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isDanger?: boolean;
}

interface UIStore {
  toasts: Toast[];
  confirm: ConfirmConfig | null;
  addToast: (message: string, type?: Toast['type'], duration?: number) => string;
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
  dismissToast: (id: string) => void;
  showConfirm: (config: Omit<ConfirmConfig, 'isOpen'>) => void;
  closeConfirm: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  toasts: [],
  confirm: null,

  addToast: (message, type = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    if (type !== 'loading' && duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }

    return id;
  },

  updateToast: (id, updates) => {
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));

    // If it becomes non-loading, set up auto-dismiss
    const updated = get().toasts.find((t) => t.id === id);
    if (updated && updated.type !== 'loading' && (updated.duration ?? 4000) > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, updated.duration ?? 4000);
    }
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  showConfirm: (config) => {
    set({
      confirm: {
        ...config,
        isOpen: true,
      },
    });
  },

  closeConfirm: () => {
    set({ confirm: null });
  },
}));
