import React from "react";
import { createContext, useContext, useRef, useState } from "react";
import { Check, CircleAlert, Info, Loader } from "lucide-react";

const ToastContext = createContext(() => {});

const toastIcons = { warning: CircleAlert, error: CircleAlert, success: Check, info: Info, loading: Loader };

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ message: "", type: "success" });
  const timer = useRef();
  function flash(message, type = "success") {
    setToast({ message, type });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast({ message: "", type: "success" }), 3500);
  }
  const Icon = toastIcons[toast.type] ?? Check;
  return (
    <ToastContext.Provider value={flash}>
      {children}
      {toast.message && <div className={`toast toast-${toast.type}`}><Icon size={16} className={toast.type === "loading" ? "spin" : ""} />{toast.message}</div>}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

