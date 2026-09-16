# Ajustar folha única e ordem da guia PDF

## Resultado esperado
- O cadastro e a edição representarão uma única folha, contendo simultaneamente as contribuições do servidor e patronal.
- O campo “Tipo de Folha” e seus indicadores/filtros visuais serão removidos.
- Haverá uma data de emissão selecionável (normalmente dia 21) e uma data de vencimento selecionável (normalmente dia 20), ambas sem preenchimento automático.
- O PDF exibirá “Centro de Custo” em uma linha própria, separado de “Órgão Pagador”.
- A “Guia Servidor” aparecerá antes da “Guia Patronal”.

## Implementação
1. Ajustar o formulário de nova folha para retirar o tipo e incluir as datas selecionáveis de emissão e vencimento.
2. Aplicar as mesmas regras na visualização e edição de folhas existentes.
3. Remover o filtro, coluna e selo de tipo das telas de folhas e guias.
4. Reorganizar o PDF, separando órgão e centro de custo e invertendo a ordem das duas guias.
5. Validar a compilação e gerar uma guia de teste para inspeção visual, corrigindo cortes ou sobreposições.

## Detalhes técnicos
- O campo interno legado `tipo` continuará preenchido com um valor compatível para não quebrar registros existentes, mas deixará de representar uma escolha do usuário.
- As datas não serão preenchidas nem alteradas automaticamente; a competência continuará baseada na data de vencimento selecionada.
- Não haverá alteração no cálculo das contribuições servidor, patronal ou suplementar.
