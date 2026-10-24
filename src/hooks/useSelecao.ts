import { useCallback, useState } from "react";

/**
 * Seleção múltipla sobre a lista visível. "Selecionar tudo" age apenas sobre
 * os itens visíveis (respeitando busca e filtros), e itens que saem da lista
 * deixam de contar como selecionados.
 */
export function useSelecao(idsVisiveis: string[]) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const selecionados = idsVisiveis.filter((id) => marcados.has(id));
  const todos = idsVisiveis.length > 0 && selecionados.length === idsVisiveis.length;
  const parcial = selecionados.length > 0 && !todos;

  const alternar = useCallback((id: string) => {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }, []);

  const alternarTodos = () => {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (todos) idsVisiveis.forEach((id) => novo.delete(id));
      else idsVisiveis.forEach((id) => novo.add(id));
      return novo;
    });
  };

  const limpar = useCallback(() => setMarcados(new Set()), []);

  return {
    selecionados,
    estaMarcado: (id: string) => marcados.has(id),
    todos,
    parcial,
    alternar,
    alternarTodos,
    limpar,
  };
}
