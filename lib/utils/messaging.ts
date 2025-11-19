/**
 * Утилита для отправки сообщений между компонентами через CustomEvent
 * Используется для уведомления о необходимости обновления данных
 */

export function sendMessage(message: string, data?: any) {
  if (typeof window === "undefined") {
    // SSR - события не работают на сервере
    return;
  }

  const event = new CustomEvent(message, {
    detail: data,
  });

  window.dispatchEvent(event);
}

