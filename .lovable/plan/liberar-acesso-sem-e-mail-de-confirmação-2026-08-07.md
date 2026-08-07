# Liberar acesso sem e-mail de confirmação

## Por que o erro acontece

O cadastro cria o usuário, mas a confirmação de e-mail está ativa no backend. Enquanto o link de confirmação (que hoje não chega) não é clicado, o login retorna "Invalid login credentials" — a conta existe, mas não está confirmada.

## O que fazer

1. **Confirmar a conta já criada** (davimarques2290@gmail.com) para que o login com a senha atual funcione imediatamente.
2. **Dar acesso de administrador** a essa conta: registrar o papel admin e vincular o perfil a uma caixa de previdência (criando uma caixa inicial se ainda não existir), para que todas as telas e permissões fiquem liberadas.

Nenhuma configuração de envio de e-mail é alterada e nenhum código de e-mail é criado ou removido.

## Detalhes técnicos

- Migração para: confirmar o usuário existente (email_confirmed_at), inserir em user_roles (admin), garantir uma linha em caixas_previdencia e setar profiles.caixa_id.

