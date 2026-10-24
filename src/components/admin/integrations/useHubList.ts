"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAbortError, useAbortableFetch } from "@/components/admin/useAbortableFetch";
import { hubQuery, hubRequest, type HubListResponse } from "@/utils/integrationHub";

export const HUB_PAGE_SIZE = 25;

/**
 * Server-side paginated list. Reloads when `path` or the serialized filters change, or on
 * `reload()`. No polling: the caller decides when to refresh.
 */
export function useHubList<T>(path: string, filters: Record<string, string | number | undefined | null>, limit = HUB_PAGE_SIZE) {
    const [rows, setRows] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);
    const { begin } = useAbortableFetch();
    const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

    useEffect(() => {
        setPage(1);
    }, [filterKey, path]);

    useEffect(() => {
        const run = begin();
        setLoading(true);
        setError(null);
        const params = { ...(JSON.parse(filterKey) as Record<string, string | number | undefined | null>), page, limit };
        hubRequest<HubListResponse<T>>(`${path}${hubQuery(params)}`, { signal: run.signal })
            .then((j) => {
                if (!run.isCurrent()) return;
                setRows(Array.isArray(j.rows) ? j.rows : []);
                setTotal(typeof j.total === "number" ? j.total : 0);
            })
            .catch((e: unknown) => {
                if (isAbortError(e) || !run.isCurrent()) return;
                setError(e instanceof Error ? e.message : "Request failed");
                setRows([]);
            })
            .finally(() => {
                if (run.isCurrent()) setLoading(false);
            });
    }, [begin, path, filterKey, page, limit, tick]);

    const reload = useCallback(() => setTick((t) => t + 1), []);
    return { rows, total, page, setPage, limit, loading, error, reload };
}

/** Single-resource loader with the same reload semantics. */
export function useHubResource<T>(path: string | null) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(Boolean(path));
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);
    const { begin } = useAbortableFetch();

    useEffect(() => {
        if (!path) {
            setData(null);
            setLoading(false);
            return;
        }
        const run = begin();
        setLoading(true);
        setError(null);
        hubRequest<{ data: T }>(path, { signal: run.signal })
            .then((j) => {
                if (run.isCurrent()) setData(j.data);
            })
            .catch((e: unknown) => {
                if (isAbortError(e) || !run.isCurrent()) return;
                setError(e instanceof Error ? e.message : "Request failed");
            })
            .finally(() => {
                if (run.isCurrent()) setLoading(false);
            });
    }, [begin, path, tick]);

    const reload = useCallback(() => setTick((t) => t + 1), []);
    return { data, loading, error, reload, setData };
}
