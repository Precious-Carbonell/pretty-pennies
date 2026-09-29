import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastFn = (message: string) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback<ToastFn>((message) => {
    setMsg(message);
    setShow(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 2200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={"toast" + (show ? " show" : "")} role="status" aria-live="polite">
        {msg}
      </div>
    </ToastContext.Provider>
  );
}
