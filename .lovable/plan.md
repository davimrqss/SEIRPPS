# Liberar acesso sem e-mail de confirmação

## Por que o erro acontece

O cadastro cria o usuário, mas a confirmação de e-mail está ativa no backend. Enquanto o link de confirmação (que hoje não chega) não é clicado, o login retorna "Invalid login credentials" — a conta existe, mas não está confirmada.

## O que fazer

1. **Ativar confirmação automática de cadastro** no backend: quem se cadastrar entra na hora, sem e-mail. Nenhum código de envio de e-mail precisa ser criado ou removido.
2. **Confirmar a conta já criada** (davimarques2290@gmail.com) para que o login com a senha atual funcione imediatamente.
3. **Dar acesso de administrador** a essa conta: registrar o papel admin e vincular o perfil a uma caixa de previdência (criando uma caixa inicial se ainda não existir), para que as telas com regras por caixa/permissão funcionem.
4. **Ajustar a tela de login**: após o cadastro, se a sessão já vier ativa, ir direto para o sistema em vez de mostrar "verifique seu e-mail".

## Depois (quando quiser)

Antes de ir para produção, o ideal é desativar a confirmação automática e configurar o envio de e-mails de verificação. Posso fazer isso depois, sem desfazer o que for feito agora.

## Detalhes técnicos

- configure_auth com auto_confirm_email: true, mantendo signups habilitados e sem usuários anônimos.
- Migração para: confirmar o usuário existente, inserir em user_roles (admin), garantir uma linha em caixas_previdencia e setar profiles.caixa_id.
- src/pages/Login.tsx: no ramo de cadastro, checar data.session e navegar para "/" quando houver sessão.
