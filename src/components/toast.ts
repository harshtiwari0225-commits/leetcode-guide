export type ToastVariant = 'info' | 'success' | 'error';

export const TOAST_EVENT = 'leetcode-guide:toast';

export interface ToastDetail {
  message: string;
  variant?: ToastVariant;
}

/** Anywhere in the panel: showToast('Saved!', 'success') */
export const showToast = (
  message: string,
  variant: ToastVariant = 'info',
): void => {
  window.dispatchEvent(
    new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, variant } }),
  );
};