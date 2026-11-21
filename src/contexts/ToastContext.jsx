/**
 * Re-export shim: the Toast context implementation lives in
 * src/components/ui/Toast.jsx (ToastProvider + useToast).
 * This module exists so imports of `contexts/ToastContext` resolve.
 */
export { ToastProvider, useToast, default } from '../components/ui/Toast'