# Concluir guias e reforçar a segurança

## Resultado
- Em Guias de Recolhimento, cada parte exibirá somente um valor: **Devido** enquanto houver pendência e **Pago** após a quitação.
- O Dashboard seguirá a mesma regra, sem cartões ou colunas separadas de devido, pago e saldo.
- O Dashboard terá um gráfico de colunas para comparar servidor e patronal e um gráfico de pizza para visualizar a distribuição dos valores.
- A área de descrições deixará de apresentar código, órgão ou nomenclatura de centro de custo.

## Interface e fluxo
- Corrigir o seletor de caixa que hoje causa tela em branco e o aviso do formulário de edição.
- Preservar filtros, modos grade/lista, cadastro, visualização, edição, pagamento e exportação.
- Ajustar os relatórios para manter a visão financeira detalhada no PDF, sem reintroduzir os três campos nas telas solicitadas.
- Validar o fluxo principal no Preview em desktop e celular.

## Segurança
- Conferir RLS e privilégios de todas as tabelas públicas e do armazenamento, mantendo admins globais e demais perfis limitados à própria caixa.
- Restringir arquivos de logos à caixa e às funções autorizadas, eliminando regras amplas por usuário autenticado.
- Confirmar que páginas privadas e ações sensíveis exigem sessão e permissão compatíveis no banco ou na função protegida.
- Remover qualquer segredo privado encontrado no navegador e atualizar dependências de produção com vulnerabilidades conhecidas.
- Aplicar validação Zod e limites nos formulários e funções mais sensíveis, sem renderização insegura de conteúdo.
- Substituir erros internos por mensagens seguras ao usuário, mantendo detalhes somente nos registros técnicos.
- Executar novamente os scanners, marcar como corrigidos apenas os achados efetivamente resolvidos e registrar qualquer configuração externa que não possa ser alterada automaticamente.

## Verificação técnica
- Validar tipos, testes relevantes e estado do Preview.
- Testar acesso sem sessão, acesso por perfil, operações entre caixas, pagamentos, gráficos e PDFs.
- Não alterar dados existentes nem relaxar permissões para fazer os testes passarem.