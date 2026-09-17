import { useState, useEffect, useCallback } from 'react';

export function usePagedList(fetchFn, initialFilters = {}, limit = 30) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn({ ...filters, page, limit });
      const list = result?.items || [];
      setItems(list);
      setTotal(result?.total ?? list.length);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, filters, page, limit]);

  useEffect(() => { load(); }, [page, load]);

  const setFilter = useCallback((patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  return {
    items,
    total,
    page,
    setPage,
    loading,
    error,
    filters,
    setFilters,
    setFilter,
    reload: load,
    limit,
  };
}
