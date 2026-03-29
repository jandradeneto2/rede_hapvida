import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ActiveFilters } from '../types';

interface FiltersContextValue {
  filters: ActiveFilters;
  setFilter: (field: keyof ActiveFilters, value: string) => void;
  clearFilters: () => void;
  activeCount: number;
}

const EMPTY: ActiveFilters = {
  operadora: '',
  uf: '',
  cidade: '',
  servico: '',
  grupoServico: '',
  especialidade: '',
  rede: '',
  search: '',
  cnpjCpf: '',
  redeProduto: '',
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY);

  const setFilter = useCallback((field: keyof ActiveFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY);
  }, []);

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <FiltersContext.Provider value={{ filters, setFilter, clearFilters, activeCount }}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used inside FiltersProvider');
  return ctx;
}
