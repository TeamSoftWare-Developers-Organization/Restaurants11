import { create } from 'zustand';

export type ModalVariant = 'danger' | 'warning' | 'info' | 'success' | 'error';

interface ConfirmOptions {
    title?: string;
    message: string;
    itemName?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ModalVariant;
}

interface AlertOptions {
    title?: string;
    message: string;
    variant?: ModalVariant;
    buttonText?: string;
}

interface ModalState {
    // Confirm Dialog State
    isConfirmOpen: boolean;
    confirmConfig: ConfirmOptions;
    confirmResolve: ((value: boolean) => void) | null;
    isConfirmLoading: boolean;

    // Alert Dialog State
    isAlertOpen: boolean;
    alertConfig: AlertOptions;
    alertResolve: (() => void) | null;

    // Actions
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    closeConfirm: (result: boolean) => void;
    setConfirmLoading: (loading: boolean) => void;

    alert: (options: AlertOptions | string) => Promise<void>;
    closeAlert: () => void;
}

export const useModalStore = create<ModalState>((set, get) => ({
    // Confirm State
    isConfirmOpen: false,
    confirmConfig: {
        title: 'تأكيد الإجراء',
        message: '',
        confirmText: 'تأكيد',
        cancelText: 'إلغاء',
        variant: 'danger',
    },
    confirmResolve: null,
    isConfirmLoading: false,

    // Alert State
    isAlertOpen: false,
    alertConfig: {
        title: 'تنبيه',
        message: '',
        variant: 'info',
        buttonText: 'حسناً',
    },
    alertResolve: null,

    // Confirm Action returning Promise<boolean>
    confirm: (options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            set({
                isConfirmOpen: true,
                confirmConfig: {
                    title: options.title || (options.variant === 'danger' ? 'تأكيد الحذف' : 'تأكيد الإجراء'),
                    message: options.message,
                    itemName: options.itemName,
                    confirmText: options.confirmText || (options.variant === 'danger' ? 'نعم، حذف' : 'تأكيد'),
                    cancelText: options.cancelText || 'إلغاء',
                    variant: options.variant || 'danger',
                },
                confirmResolve: resolve,
                isConfirmLoading: false,
            });
        });
    },

    closeConfirm: (result: boolean) => {
        const { confirmResolve } = get();
        if (confirmResolve) {
            confirmResolve(result);
        }
        set({
            isConfirmOpen: false,
            confirmResolve: null,
            isConfirmLoading: false,
        });
    },

    setConfirmLoading: (loading: boolean) => {
        set({ isConfirmLoading: loading });
    },

    // Alert Action returning Promise<void>
    alert: (options: AlertOptions | string) => {
        const config: AlertOptions =
            typeof options === 'string'
                ? { message: options, title: 'تنبيه', variant: 'info', buttonText: 'حسناً' }
                : {
                      title: options.title || 'تنبيه',
                      message: options.message,
                      variant: options.variant || 'info',
                      buttonText: options.buttonText || 'حسناً',
                  };

        return new Promise<void>((resolve) => {
            set({
                isAlertOpen: true,
                alertConfig: config,
                alertResolve: resolve,
            });
        });
    },

    closeAlert: () => {
        const { alertResolve } = get();
        if (alertResolve) {
            alertResolve();
        }
        set({
            isAlertOpen: false,
            alertResolve: null,
        });
    },
}));

// Global convenient helpers
export const confirmDialog = (options: ConfirmOptions) => useModalStore.getState().confirm(options);
export const alertDialog = (options: AlertOptions | string) => useModalStore.getState().alert(options);
