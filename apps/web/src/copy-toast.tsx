import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Toast = { id: number; message: string; kind: "success" | "error" };
type CopyValue = (value: string) => Promise<void>;

const CopyToastContext = createContext<CopyValue | undefined>(undefined);

export function CopyToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>();
  const nextId = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(undefined), 2_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const copyValue = useCallback<CopyValue>(async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast({ id: ++nextId.current, message: "Copied", kind: "success" });
    } catch {
      setToast({
        id: ++nextId.current,
        message: "Copy failed",
        kind: "error",
      });
    }
  }, []);

  return (
    <CopyToastContext.Provider value={copyValue}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className={`copy-toast ${toast.kind}`}
          aria-live="polite"
          role="status"
        >
          {toast.message}
        </div>
      )}
    </CopyToastContext.Provider>
  );
}

export function useCopyValue(): CopyValue {
  const copyValue = useContext(CopyToastContext);
  if (!copyValue)
    throw new Error("useCopyValue must be used within CopyToastProvider");
  return copyValue;
}
