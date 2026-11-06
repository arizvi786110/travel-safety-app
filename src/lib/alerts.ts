import { Alert as RNAlert, Platform, type AlertButton } from "react-native";

function webAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const g = globalThis as any;
  const text = message ? `${title}\n\n${message}` : title;

  // No buttons, or a single OK: just show the message, then run the button if any
  if (!buttons || buttons.length <= 1) {
    g.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Two or more buttons: OK runs the main action, Cancel runs the cancel button
  const cancel = buttons.find((b) => b.style === "cancel");
  const rest = buttons.filter((b) => b !== cancel);
  const action = rest[rest.length - 1];
  const fallbackCancel = cancel ?? (rest.length > 1 ? rest[0] : undefined);
  if (g.confirm(text)) action?.onPress?.();
  else fallbackCancel?.onPress?.();
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS === "web") return webAlert(title, message, buttons);
    RNAlert.alert(title, message, buttons);
  },
};