import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient для React Query
 * Настроен для кеширования данных списков и управления серверным состоянием
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 секунд - данные считаются свежими
      gcTime: 5 * 60 * 1000, // 5 минут - кеш хранится в памяти (было cacheTime в v4)
      refetchOnWindowFocus: false, // не обновлять при фокусе окна
      refetchOnReconnect: true, // обновлять при восстановлении соединения
      retry: 1, // повторить 1 раз при ошибке
      retryDelay: 1000, // задержка перед повтором (1 секунда)
    },
    mutations: {
      retry: 0, // не повторять мутации при ошибке
    },
  },
});
