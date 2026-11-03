"use client";

import { Toast, ToastBody, ToastTitle, useToastController } from "@fluentui/react-components";
import { useMemo } from "react";

/** Id of the single app-wide `<Toaster>` mounted in `components/Providers.tsx`. */
export const TOASTER_ID = "app-toaster";

/** Dispatch helpers for the app-wide toaster: `const toast = useAppToast(); toast.success("Guardado")`. */
export function useAppToast() {
  const { dispatchToast } = useToastController(TOASTER_ID);
  return useMemo(() => {
    const show = (intent: "success" | "error" | "warning" | "info", title: string, body?: string) =>
      dispatchToast(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          {body && <ToastBody>{body}</ToastBody>}
        </Toast>,
        { intent }
      );
    return {
      success: (title: string, body?: string) => show("success", title, body),
      error: (title: string, body?: string) => show("error", title, body),
      warning: (title: string, body?: string) => show("warning", title, body),
      info: (title: string, body?: string) => show("info", title, body),
    };
  }, [dispatchToast]);
}
