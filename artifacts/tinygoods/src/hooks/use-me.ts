import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetMe,
  getGetMeQueryKey,
  useAddMyViewed,
  getListMyViewedQueryKey,
} from '@workspace/api-client-react';

/** Current buyer: `customer` is null for guests; undefined while loading. */
export function useMe() {
  const { data, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey(), staleTime: 60_000 } });
  return { customer: data?.customer, defaultAddress: data?.defaultAddress ?? null, isLoading };
}

export function useRefreshMe() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
}

/* ── Recently viewed: kept in the browser for everyone, synced to the account when signed in ── */

const KEY = 'tinygoods-viewed';
const MAX = 20;

export function localViewed(): number[] {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(ids) ? ids.filter((x) => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
}

function pushLocal(id: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...localViewed().filter((x) => x !== id)].slice(0, MAX)));
  } catch {
    /* storage unavailable: history just isn't kept */
  }
}

/** Records a product view (browser + account). */
export function useRecordView(productId: number | undefined) {
  const { customer } = useMe();
  const add = useAddMyViewed();
  const qc = useQueryClient();
  useEffect(() => {
    if (!productId) return;
    pushLocal(productId);
    if (customer) {
      add.mutate(
        { data: { productIds: [productId] } },
        { onSuccess: (list) => qc.setQueryData(getListMyViewedQueryKey(), list) },
      );
    }
  }, [productId, customer?.id]);
}

/** After sign-in, uploads what was viewed as a guest (once per session). */
export function useSyncViewedOnLogin() {
  const { customer } = useMe();
  const add = useAddMyViewed();
  const qc = useQueryClient();
  const done = useRef(false);
  useEffect(() => {
    if (!customer || done.current) return;
    done.current = true;
    const ids = localViewed();
    if (ids.length) {
      add.mutate({ data: { productIds: ids } }, { onSuccess: (list) => qc.setQueryData(getListMyViewedQueryKey(), list) });
    }
  }, [customer?.id]);
}
