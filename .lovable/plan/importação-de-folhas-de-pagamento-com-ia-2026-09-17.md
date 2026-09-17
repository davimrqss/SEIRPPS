# Importação de folhas de pagamento com IA

## Objetivo
Manter o cadastro manual atual e adicionar uma opção **Importar PDF** que analisa a folha, separa os totais por centro de custo e prepara várias folhas para revisão antes de salvar.

O PDF enviado confirma que esse fluxo é viável: possui 215 páginas, vários servidores repetindo o mesmo centro e, ao final de cada grupo, um resumo consolidado com código/nome do centro, quantidade de funcionários, remuneração total, base previdenciária e valores de contribuição.

## Experiência de importação
1. Adicionar o botão **Importar PDF** ao lado de **Nova Folha**.
2. Criar uma tela responsiva para anexar um PDF de até 20 MB, mantendo o arquivo apenas durante a análise.
3. Extrair o texto do PDF e usar IA para reconhecer somente os resumos consolidados de cada centro de custo, evitando somar novamente os lançamentos individuais dos servidores.
4. Mostrar progresso durante a leitura e uma revisão com uma linha por centro encontrado.
5. Solicitar uma única data de emissão e uma única data de vencimento para todas as linhas; validar dia 21 e dia 20, respectivamente.
6. Permitir revisar e editar antes de importar:
   - centro de custo vinculado;
   - quantidade de servidores;
   - remuneração total;
   - base de cálculo previdenciária;
   - alíquotas e valores do servidor, patronal e suplementar;
   - salário-maternidade, salário-família e auxílio-doença;
   - grupo Normal ou 13°.
7. Exibir totais gerais e permitir desmarcar linhas que não devam ser importadas.
8. Salvar todas as linhas selecionadas de uma vez somente após confirmação.

## Correspondência dos centros de custo
- Priorizar correspondência exata pelo código dentro da caixa ativa.
- Usar nome normalizado apenas como sugestão quando o código não coincidir.
- Para centro não cadastrado ou correspondência ambígua, exigir que o usuário escolha um centro existente ou abra o cadastro antes de salvar.
- Nunca criar centros automaticamente.
- Preencher o órgão a partir do centro cadastrado no sistema, não confiar apenas no texto do PDF.

## Segurança e confiabilidade
- Disponibilizar a importação somente para os mesmos perfis que podem criar folhas; Fiscal permanece somente leitura.
- Processar a análise em uma função protegida, sem expor credenciais no navegador.
- Usar Lovable AI com saída estruturada e validação rigorosa dos campos.
- Importar os valores consolidados apresentados no PDF, inclusive quando houver pequena diferença de arredondamento em relação a `base × alíquota`; destacar divergências para revisão.
- Detectar folhas já existentes para a mesma caixa, competência e centro, avisando e deixando-as desmarcadas por padrão; não sobrescrever automaticamente.
- Não salvar a folha nem o PDF durante a etapa de análise; falhas preservam a revisão e exibem a mensagem real do serviço.

## Detalhes técnicos
- Extrair texto paginado no navegador e selecionar blocos de resumo por centro, reduzindo custo e evitando enviar centenas de páginas irrelevantes à IA.
- Criar uma função de análise autenticada usando `openai/gpt-6-astra` via Lovable AI, com chamadas em streaming consumidas no servidor e resposta JSON estritamente validada.
- Processar blocos em lotes limitados, mesclar resultados pelo código do centro e aplicar repetição controlada apenas para erros temporários.
- Reaproveitar os cálculos, componentes de moeda/data, lista de centros e invalidação das consultas já usados no cadastro manual.
- Fazer a gravação final em um único lote na tabela de folhas, mantendo `tipo = "folha"` e o isolamento pela caixa ativa.

## Validação
- Testar com o PDF enviado, confirmando múltiplos centros sem duplicação por servidor.
- Conferir amostras como `102001`, `201004`, `401001` e `401002` contra os resumos do documento.
- Validar centro sem correspondência, possível duplicidade, edição da revisão, falha da IA e importação em lote.
- Verificar permissões, telas mobile/desktop e executar os testes do projeto.
