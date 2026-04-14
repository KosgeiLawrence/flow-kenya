import { useEffect } from "react";
import { chatbotUIActionEvent } from "@/components/dashboard/shared/DashboardChatbot";

interface UIAction {
  type: string;
  panel_id?: string;
  dialog_id?: string;
  tab_id?: string;
  message?: string;
}

/**
 * Hook that listens for chatbot-triggered UI actions and calls a handler
 * when a matching dialog_id is received.
 */
export function useChatbotUIAction(
  dialogIds: string[],
  onAction: (action: UIAction) => void
) {
  useEffect(() => {
    const handler = (e: Event) => {
      const action = (e as CustomEvent<UIAction>).detail;
      if (action?.dialog_id && dialogIds.includes(action.dialog_id)) {
        onAction(action);
      }
    };
    chatbotUIActionEvent.addEventListener("chatbot-ui-action", handler);
    return () => chatbotUIActionEvent.removeEventListener("chatbot-ui-action", handler);
  }, [dialogIds, onAction]);
}
