# Reformular o sistema para cadastro, busca e relatórios de guias

## Resultado esperado

O sistema deixa de trabalhar visualmente com “Folhas de Pagamento” e passa a ter um fluxo direto de **Cadastrar Guia** e **Buscar Guias**, preservando os registros atuais. O cadastro já poderá registrar pagamentos e, ao concluir, abrirá automaticamente a visualização do PDF sem baixá-lo.

## Alterações principais

### 1. Cadastro e busca de guias
- Substituir no menu e nas telas:
  - “Folhas de Pagamento” por **Cadastrar Guia**.
  - “Guias PDF” por **Buscar Guias**.
- Remover a tela intermediária de listagem de folhas e a importação de folha do fluxo principal.
- Transformar o formulário atual em cadastro de guia.
- Após salvar, abrir a guia em PDF em uma nova aba e retornar para **Buscar Guias**.
- Preservar compatibilidade com as guias já existentes.

### 2. Descrição e órgão
- Trocar “Centro de Custo” por **Descrição** nas telas operacionais e PDFs.
- Criar um catálogo de descrições independente dos órgãos.
- No cadastro, permitir:
  - selecionar uma descrição já cadastrada;
  - digitar uma descrição livre;
  - marcar **Cadastrar esta descrição** para reutilizá-la no futuro.
- Manter a escolha do órgão pagador em um campo separado e obrigatório.
- Aproveitar os centros de custo atuais como descrições iniciais, sem manter o vínculo deles com órgãos.

### 3. Valores, acréscimos e correção
- Remover “Quantidade de Servidores” do cadastro, visualização, edição e PDF.
- Manter remuneração, base, alíquotas e contribuições do servidor e patronal.
- Permitir alíquotas independentes para:
  - Juros/Multa do servidor;
  - Juros/Multa patronal;
  - Correção do servidor;
  - Correção patronal.
- Calcular automaticamente os valores dos acréscimos sobre cada contribuição correspondente.
- Adicionar à caixa de previdência o nome do índice de correção, como **INPC**, **IPCA** ou outro texto configurável.
- Exibir no PDF o índice configurado e os valores calculados de cada parte.

### 4. Pagamentos
- No cadastro da guia, permitir informar opcionalmente:
  - valor pago do servidor e sua data;
  - valor pago patronal e sua data.
- Datas independentes permitem pagamentos em dias diferentes.
- Se uma parte ficar sem pagamento ou com saldo, **Buscar Guias** mostrará **Lançar pagamento**.
- Ajustar o lançamento posterior para identificar servidor ou patronal, aceitar pagamentos parciais e registrar a data informada.
- Calcular o status por parte: pendente, parcial ou pago. A guia completa só estará paga quando os dois saldos forem zerados.

### 5. Buscar Guias
- Manter visualizações em grade e lista.
- Adicionar filtros por mês, órgão e situação.
- Mostrar valores devidos, pagos e saldos separados para servidor e patronal.
- Manter visualizar PDF, baixar PDF, editar, excluir e lançar pagamento conforme as permissões atuais.

### 6. Dashboard
- Adicionar filtros por mês e órgão pagador.
- Exibir separadamente:
  - devido, pago e pendente do servidor;
  - devido, pago e pendente patronal.
- Atualizar a listagem recente para usar os termos **Guia** e **Descrição**.
- Fazer todos os indicadores respeitarem os filtros selecionados.

### 7. Relatórios mensais
- Criar no dashboard um panorama mensal, filtrável por órgão.
- Para cada mês e órgão, mostrar:
  - remuneração;
  - base de cálculo;
  - devido do servidor e patronal;
  - pago do servidor e patronal;
  - saldo do servidor e patronal.
- Mostrar subtotais mensais e total anual.
- Criar exportação em PDF com os mesmos filtros e dados exibidos.

## Preservação de dados e segurança
- Manter os registros existentes e tratá-los como guias.
- Criar as novas informações sem apagar campos antigos necessários à compatibilidade.
- Classificar pagamentos antigos como servidor ou patronal quando a observação permitir; pagamentos sem identificação permanecerão visíveis para revisão, sem serem atribuídos silenciosamente à parte errada.
- Manter o isolamento entre caixas e as permissões atuais de Administrador, Gestor, Operador e Fiscal.
- Fiscal continuará somente com visualização; ações de cadastro, edição e pagamento seguirão as permissões existentes.

## Detalhes técnicos
- Criar catálogo de descrições por caixa, com acesso protegido pelas mesmas regras operacionais.
- Adicionar referência do órgão às guias, mantendo o nome gravado para histórico.
- Adicionar índice de correção à caixa e alíquotas separadas de juros/correção às guias.
- Identificar a natureza de cada pagamento e usar a data efetivamente informada.
- Centralizar os cálculos de devido, pago e saldo para que cadastro, busca, dashboard e relatório usem a mesma regra.
- Atualizar rotas antigas com redirecionamentos para evitar links quebrados.
- Validar o fluxo em telas grandes e pequenas, além da geração visual dos dois PDFs: guia e relatório.
