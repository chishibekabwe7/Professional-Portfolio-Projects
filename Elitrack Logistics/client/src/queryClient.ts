import { QueryClient } from '@tanstack/react-query';
import type { ApiError } from './types/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const apiError = error as ApiError;
        const status = apiError?.response?.status;

        if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
          return false;
        }

        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});
