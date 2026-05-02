import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  increment: () => void;
  decrement: () => void;
  setCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  increment: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrement: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  setCount: (count: number) => set({ unreadCount: count }),
}));
