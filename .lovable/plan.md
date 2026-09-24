# Implementar prioridades de folhas, guias e ícone

## Resultado esperado
- As contribuições do servidor e patronal continuarão calculadas automaticamente, mas poderão ser substituídas manualmente no cadastro e na edição da folha.
- O valor digitado manualmente será salvo e usado nas listagens, totais e PDFs.
- A página de guias terá um seletor entre Grade e Lista, mantendo filtros e ações nos dois modos.
- O ícone do navegador usará o “M” da logo META em PNG, com recorte nítido e fundo transparente.

## Implementação
1. Adicionar campos monetários editáveis para as duas contribuições e sincronizá-los com o cálculo enquanto não houver alteração manual.
2. Aplicar a mesma regra ao editar folhas existentes, preservando os valores já salvos.
3. Criar a visualização em lista das guias e um seletor acessível Grade/Lista.
4. Gerar o favicon a partir da logo META e atualizar os metadados obrigatórios do site.
5. Validar cadastro, edição, alternância das guias e o ícone no navegador.

## Detalhes técnicos
- Alterar base ou alíquota recalcula o valor apenas enquanto o respectivo campo não tiver sido sobrescrito manualmente.
- Um valor manual, inclusive zero, prevalece no salvamento.
- A visualização em lista reutilizará as mesmas funções de visualizar, baixar PDF e lançar pagamento.
