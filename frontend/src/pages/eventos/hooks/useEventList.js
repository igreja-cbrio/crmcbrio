import { useState, useEffect, useCallback } from 'react';
import { events as api } from '../../../api';

export function useEventList({ status, categoryId } = {}) {
  const [eventList, setEventList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (status) params.status = status;
      if (categoryId) params.category_id = categoryId;
      setEventList(await api.list(params));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, categoryId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { eventList, loading, error, refresh };
}
