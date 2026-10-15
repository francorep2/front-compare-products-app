import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./endpoints";
import { type ComparisonTask } from "./types";

export const qk = {
  lists: ["lists"] as const,
  list: (id: number) => ["list", id] as const,
  sources: ["sources"] as const,
  history: ["history"] as const,
  comparison: (id: string) => ["comparison", id] as const,
  allLists: ["lists-with-items"] as const,
};

export const useLists = () => useQuery({ queryKey: qk.lists, queryFn: api.getLists });
export const useList = (id: number) => useQuery({ queryKey: qk.list(id), queryFn: () => api.getList(id), enabled: Number.isFinite(id) });
export const useSources = () =>
  useQuery({ queryKey: qk.sources, queryFn: () => api.getSources().catch(() => api.ALL_SOURCES), staleTime: 5 * 60_000 });
export const useHistory = () => useQuery({ queryKey: qk.history, queryFn: () => api.getHistory(50) });

/** Detalle de todas las listas (para estadísticas y progreso en Home / Mis listas). */
export const useListsWithItems = () =>
  useQuery({
    queryKey: qk.allLists,
    queryFn: async () => {
      const lists = await api.getLists();
      return Promise.all(lists.map((l) => api.getList(l.id)));
    },
  });

/** Una comparación; mientras esté procesando consulta cada 1,5 s. */
export const useComparison = (id: string | undefined) =>
  useQuery<ComparisonTask>({
    queryKey: qk.comparison(id ?? ""),
    queryFn: () => api.getComparison(id!),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.status === "completed" ? false : 1500),
    staleTime: Infinity,
  });

export function useInvalidate() {
  const qc = useQueryClient();
  return {
    lists: () => { qc.invalidateQueries({ queryKey: qk.lists }); qc.invalidateQueries({ queryKey: qk.allLists }); },
    list: (id: number) => { qc.invalidateQueries({ queryKey: qk.list(id) }); qc.invalidateQueries({ queryKey: qk.allLists }); },
    history: () => qc.invalidateQueries({ queryKey: qk.history }),
  };
}
