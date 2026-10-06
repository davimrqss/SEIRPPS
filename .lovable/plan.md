# Ajustar juros, multa e correção monetária

## Resultado esperado
- A guia terá uma única alíquota de **Juros e Multa**, aplicada aos valores do servidor e patronal.
- A caixa de previdência terá dois campos de correção monetária: **Índice** (por exemplo, INPC ou IPCA) e **Alíquota (%)**.
- No cadastro da guia, **Correção Monetária** será uma escolha Sim/Não.
- Ao escolher Sim, o índice e a alíquota definidos na caixa serão exibidos somente para consulta e aplicados às duas contribuições.
- Ao escolher Não, nenhuma correção monetária será aplicada à guia.

## Alterações
1. Adicionar a alíquota de correção monetária aos dados da caixa, preservando o índice já cadastrado.
2. Reorganizar a seção de alíquotas da caixa com os campos “Correção Monetária (%)” e “Índice”.
3. Substituir os dois campos de juros/multa da criação e edição da guia por um campo único.
4. Substituir as correções editáveis da guia pela escolha Sim/Não e pela visualização bloqueada da configuração da caixa.
5. Manter os cálculos separados de servidor e patronal, aplicando a mesma alíquota comum sobre cada base.
6. Atualizar a visualização e o PDF para usar o título “Correção Monetária” e mostrar o índice configurado.
7. Validar cadastro, edição, cálculos, PDF e telas em tamanhos grandes e pequenos.

## Compatibilidade
- Os campos internos atuais das guias serão mantidos para não quebrar registros e relatórios existentes.
- Nas novas guias, a mesma alíquota de juros/multa será gravada para servidor e patronal.
- Quando a correção for aplicada, a alíquota configurada na caixa será gravada para as duas partes; quando não for, ambas serão gravadas como zero.
- Guias antigas continuarão usando os valores que já possuem.