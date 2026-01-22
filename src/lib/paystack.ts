import { PaystackConfig } from '@/types/registration';

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: PaystackConfig) => {
        openIframe: () => void;
      };
    };
  }
}

export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

export function initializePaystack(config: PaystackConfig) {
  if (!window.PaystackPop) {
    console.error('Paystack script not loaded');
    return null;
  }

  const handler = window.PaystackPop.setup({
    ...config,
    key: PAYSTACK_PUBLIC_KEY,
    amount: config.amount * 100, // Convert to kobo
  });

  return handler;
}

export function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack script'));
    document.body.appendChild(script);
  });
}

export function generatePaymentReference(email: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `CMDA-${timestamp}-${random}`;
}
