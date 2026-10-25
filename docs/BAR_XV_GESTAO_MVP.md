# Bar da XV — Gestão (MVP)

Primeiro protótipo para organizar produtos, estoque e fila da cozinha.

## Acesso ao protótipo
Arquivo: `public/bar-xv-gestao.html`

Em desenvolvimento local, se a aplicação Sale-IA estiver servindo a pasta `public`, abra:
`http://localhost:3000/bar-xv-gestao.html`

## Incluído
- Cadastro de produtos e insumos com categoria, unidade, saldo, mínimo e custo unitário.
- Alertas de estoque baixo.
- Movimentações de entrada, consumo/saída, perda/vencimento e ajuste.
- Fila da cozinha com mesa/identificação, pedido, observações e estados Aguardando, Em preparo, Pronto, Entregue e Cancelado.
- Histórico exportável em CSV e backup/restauração JSON.
- Layout responsivo para celular e computador.

## Limitações importantes
- MVP de demonstração: os dados ficam no `localStorage` do navegador/dispositivo.
- Ainda não há login, usuários por função, sincronização entre dispositivos, banco de dados, impressão de comandas ou integração com vendas/caixa.
- Não representa estoque automaticamente ao lançar pedido na cozinha, pois os ingredientes e fichas técnicas ainda não foram configurados.
- Antes de uso comercial, integrar com API e banco de dados, criar autenticação, auditoria, cópias de segurança e testes.

## Próximas etapas
1. Integrar banco de dados/API do Sale-IA sem afetar módulos existentes.
2. Criar usuários e permissões (gerência, balcão e cozinha).
3. Criar ficha técnica por prato e baixa automática dos ingredientes.
4. Integrar com vendas/comandas, alertas e relatórios de consumo, perdas e compras.
5. Validar em ambiente de teste antes de produção.
