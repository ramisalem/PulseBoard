import { useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { logger } from '@core/logger';

interface OfflineConfig {
  cacheTime?: number;
  staleTime?: number;
  persistKey?: string;
}

export function useOfflineQuery<TData, TError = Error>(
  queryKey: unknown[],
  fetcher: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> &
    OfflineConfig,
) {
  const queryOptions = options || {};

  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      const netState = await NetInfo.fetch();

      if (!netState.isConnected) {
        logger.warn('Offline: returning cached data', {
          queryKey: String(queryKey),
        });
        throw new Error('OFFLINE');
      }

      return fetcher();
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: options?.cacheTime ?? 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if ((error as Error)?.message === 'OFFLINE') return false;
      return failureCount < 2;
    },
    ...queryOptions,
  });
}

export function useOfflineMutation<TData, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>,
) {
  return useMutation<TData, TError, TVariables>({
    mutationFn,
    retry: false,
    ...options,
  });
}

export function useNetworkStatus() {
  const isConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = isConnected.current === false;
      isConnected.current = state.isConnected ?? false;

      if (wasOffline && state.isConnected) {
        logger.info('Network reconnected');
      } else if (!state.isConnected) {
        logger.warn('Network disconnected');
      }
    });

    return unsubscribe;
  }, []);

  return {
    isConnected: isConnected.current,
  };
}

export function useRetryOnReconnect() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        logger.info('Refetching stale queries after reconnect');
        queryClient.refetchQueries({ stale: true });
      }
    });

    return unsubscribe;
  }, [queryClient]);
}

export function useStaleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
) {
  const queryClient = useQueryClient();
  const isRefreshing = useRef(false);

  const getData = useCallback(async () => {
    const cached = queryClient.getQueryData([key]) as T | undefined;

    if (cached) {
      if (!isRefreshing.current) {
        isRefreshing.current = true;
        NetInfo.fetch().then(state => {
          if (state.isConnected) {
            fetcher()
              .then(data => {
                queryClient.setQueryData([key], data);
                logger.debug('Background revalidation complete', { key });
              })
              .catch(error => {
                logger.warn('Background revalidation failed', {
                  error: String(error),
                });
              })
              .finally(() => {
                isRefreshing.current = false;
              });
          }
        });
      }
      return cached;
    }

    return fetcher();
  }, [key, fetcher, queryClient]);

  return { getData };
}
