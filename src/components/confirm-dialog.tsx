"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  // Store the resolver in a ref: it's not used for rendering and we don't
  // want a re-render when it changes.
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts(options);
    });
  }, []);

  const handleClose = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  const destructive = opts?.destructive;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <BaseDialog.Root
        open={opts !== null}
        onOpenChange={(open) => {
          if (!open) handleClose(false);
        }}
      >
        <BaseDialog.Portal>
          <BaseDialog.Backdrop className="data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <BaseDialog.Popup
            className={
              "data-[open]:animate-in data-[closed]:animate-out " +
              "data-[closed]:fade-out-0 data-[open]:fade-in-0 " +
              "data-[closed]:zoom-out-95 data-[open]:zoom-in-95 " +
              "fixed top-1/2 left-1/2 z-50 w-[420px] max-w-[92vw] " +
              "-translate-x-1/2 -translate-y-1/2 " +
              "rounded-3xl border border-amber-500/25 " +
              "bg-black/90 p-5 shadow-2xl shadow-amber-500/10 " +
              "ring-1 ring-amber-500/10 backdrop-blur-xl " +
              "duration-200"
            }
          >
            {opts && (
              <>
                <div className="flex items-start gap-3">
                  {destructive && (
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/30">
                      <AlertTriangle className="size-4 text-red-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <BaseDialog.Title className="font-sans text-base font-semibold leading-tight text-amber-50">
                      {opts.title}
                    </BaseDialog.Title>
                    {opts.description && (
                      <BaseDialog.Description className="text-[13px] leading-snug text-amber-100/70">
                        {opts.description}
                      </BaseDialog.Description>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => handleClose(false)}
                    className="h-9 rounded-xl font-mono text-xs uppercase tracking-wider text-amber-200/70 hover:bg-amber-500/10 hover:text-amber-100"
                  >
                    {opts.cancelLabel ?? "Annulla"}
                  </Button>
                  <Button
                    onClick={() => handleClose(true)}
                    className={
                      destructive
                        ? "h-9 rounded-xl bg-red-500 font-mono text-xs uppercase tracking-wider text-white shadow-lg shadow-red-500/20 hover:bg-red-400"
                        : "h-9 rounded-xl bg-amber-400 font-mono text-xs uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 hover:bg-amber-300"
                    }
                  >
                    {opts.confirmLabel ?? "Conferma"}
                  </Button>
                </div>
              </>
            )}
          </BaseDialog.Popup>
        </BaseDialog.Portal>
      </BaseDialog.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within <ConfirmProvider>");
  }
  return confirm;
}
