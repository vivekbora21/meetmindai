import { create } from 'zustand';

export type ModalType = 'info' | 'success' | 'error' | 'confirm';

export interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ModalState {
  isOpen: boolean;
  options: ModalOptions;
  showModal: (options: ModalOptions) => void;
  closeModal: () => void;
}

const defaultOptions: ModalOptions = {
  title: '',
  message: '',
  type: 'info',
  confirmText: 'OK',
  cancelText: 'Cancel'
};

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  options: defaultOptions,
  showModal: (options) => set({ isOpen: true, options: { ...defaultOptions, ...options } }),
  closeModal: () => set({ isOpen: false, options: defaultOptions }),
}));
