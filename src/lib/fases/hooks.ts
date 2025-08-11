import { useEffect, useMemo, useState } from 'react';
import { motherfileService, MotherfileFases } from '@/lib/pocketbase';

export function useHeading(faseKey: string) {
  const [data, setData] = useState<{ heading: string; image?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const record = await motherfileService.get();
        const fases: MotherfileFases = record.fases || {};
        const item = fases[faseKey] || null;
        if (mounted) setData(item);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load heading';
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [faseKey]);

  return { data, loading, error };
}

export function useMediaUrl(fileName?: string) {
  return useMemo(() => (fileName ? motherfileService.fileUrl(fileName) : ''), [fileName]);
}
