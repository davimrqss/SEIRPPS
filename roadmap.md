# Roadmap

- [x] Cadastrar guia sem abrir o PDF automaticamente; botão "Cadastrar Guia".
- [x] Importar guias por planilha Excel (aba por mês), com Gemini identificando colunas de modelos desconhecidos; revisão testada com a aba JANEIRO (35 guias, totais iguais à planilha); gravação final não testada para não criar dados reais.

- [x] Remover somente arquivos e tabelas comprovadamente sem uso, preservando guias, descrições, dados e dependências ativas.

- [x] Liberar qualquer data válida de emissão e vencimento no cadastro, edição e importação; testes aprovados, cadastro autenticado não verificado neste ambiente.
- [x] Unificar a abertura do PDF e usar o nome GRPPS - descrição da guia; download manual e nome verificados no navegador.

- [x] Centralizar e ampliar um pouco as logos da guia PDF.
- [x] Calcular a alíquota pela contribuição digitada no cadastro, mantendo o cálculo inverso por alíquota.
- [x] Testar o cálculo (10 testes aprovados) e conferir visualmente o PDF sem cortes ou sobreposições; teste autenticado do cadastro indisponível neste ambiente.

- [x] Mover descrição para o campo maior do PDF, anteriormente Observações.
- [x] Ampliar logo JACOPREV no PDF, preservando proporções.
- [x] Ajustar fundo branco da logo IPPN e aplicar na visualização e no download das guias da IPPN/Ponto Novo.

- [x] Remover a escolha de tipo da criação e edição da folha, mantendo servidor e patronal juntos.
- [x] Adicionar data de emissão selecionável livremente, sem preenchimento automático.
- [x] Manter data de vencimento selecionável livremente, sem preenchimento automático.
- [x] Separar centro de custo de órgão pagador no PDF.
- [x] Exibir a guia servidor antes da guia patronal.
- [x] Validar a interface e o PDF gerado.
- [x] Adicionar importação de folhas por PDF com análise de IA.
- [x] Agrupar e revisar os valores por centro de custo antes de salvar.
- [x] Validar permissões, duplicidades, datas e importação em lote.
- [x] Permitir valores manuais para contribuição do servidor e patronal, mantendo o cálculo automático.
- [x] Adicionar modos Grade e Lista à página de guias.
- [x] Trocar o ícone do site pelo “M” da logo META.
- [x] Migrar a análise da importação de PDFs para a API direta do Google Gemini.
- [x] Aceitar o formato atual da chave da Google AI API sem exigir prefixo específico.
- [x] Processar PDFs grandes em lotes e consolidar os centros sem duplicidade.
- [x] Reformular Folhas de Pagamento para Cadastrar Guia e Guias de Recolhimento.
- [x] Criar descrições independentes de órgãos, com seleção, texto livre e cadastro opcional.
- [x] Adicionar juros, multa e correção por alíquotas separadas para servidor e patronal.
- [x] Configurar o índice de correção por caixa de previdência.
- [x] Registrar pagamentos e datas separadas para servidor e patronal.
- [x] Adicionar filtros e saldos separados ao dashboard.
- [x] Criar panorama mensal por órgão, total anual e exportação em PDF.
- [ ] Validar migração, permissões, responsividade e PDFs.
- [ ] Simplificar Dashboard e Guias de Recolhimento para um único valor por parte, alternando entre Devido e Pago.
- [ ] Adicionar gráficos de colunas e pizza ao Dashboard.
- [ ] Concluir a transformação de Centros de Custo em Descrições independentes de órgãos.
- [ ] Corrigir falhas atuais de interface e atualizar o Preview.
- [ ] Auditar e corrigir RLS, autenticação, segredos, validação, dependências e mensagens de erro.
- [ ] Unificar a alíquota de juros/multa para servidor e patronal nas guias.
- [ ] Configurar índice e alíquota da correção monetária por caixa.
- [ ] Permitir aplicar ou não a correção monetária na guia, exibindo a configuração da caixa sem edição.
