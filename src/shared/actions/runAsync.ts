import { useAppStore } from "@/shared/store/appStore";
import type { WorkflowStepId } from "@/shared/types/domain";

export interface RunAsyncOptions {
  stepId: WorkflowStepId;
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
  successAction?: { label: string; path: string };
  logSuccess?: boolean;
}

export async function runAsync<T>(
  action: () => Promise<T>,
  options: RunAsyncOptions
): Promise<T | undefined> {
  const { pushToast, addLog } = useAppStore.getState();
  try {
    const result = await action();
    if (options.successTitle) {
      pushToast({
        level: "success",
        title: options.successTitle,
        ...(options.successMessage ? { message: options.successMessage } : {}),
        ...(options.successAction ? { action: options.successAction } : {})
      });
    }
    if (options.logSuccess && options.successTitle) {
      addLog({
        id: crypto.randomUUID(),
        stepId: options.stepId,
        at: new Date().toISOString(),
        level: "info",
        message: options.successMessage
          ? `${options.successTitle} - ${options.successMessage}`
          : options.successTitle
      });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushToast({
      level: "error",
      title: options.errorTitle ?? "Action en erreur",
      message
    });
    addLog({
      id: crypto.randomUUID(),
      stepId: options.stepId,
      at: new Date().toISOString(),
      level: "error",
      message: `${options.errorTitle ?? "Erreur"}: ${message}`
    });
    return undefined;
  }
}
