# MERCADO_LIVRE_ARCHITECTURE.md

## Como conectar a primeira conta

1. **Crie a Aplicação**: Acesse [Mercado Livre Developers](https://applications.mercadolibre.com/) e crie uma nova aplicação.
2. **Configure o Redirect URI**: Defina a URL de retorno como http://localhost:3000/api/mercadolivre/auth/callback (ou sua URL de produção).
3. **Preencha o .env**: Copie APP ID e SECRET KEY para as variáveis MERCADO_LIVRE_APP_ID e MERCADO_LIVRE_CLIENT_SECRET. Gere uma chave aleatória de 32+ caracteres para MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY.
4. **Inicie o Backend**: 
pm run dev ou 
pm run start.
5. **Inicie a Conexão**: Acesse no navegador: http://localhost:3000/api/mercadolivre/auth/connect.
6. **Autorize**: Faça login na sua conta de vendedor do Mercado Livre e autorize a aplicação.
7. **Redirecionamento**: Você será redirecionado de volta ao dashboard com ?status=success.
8. **Verifique**: Chame GET /api/mercadolivre/account para confirmar que os dados da conta foram salvos e os tokens criptografados.

## Segurança
- Tokens são criptografados com AES-256-GCM antes de tocar o banco de dados.
- O fluxo OAuth utiliza state criptográfico armazenado em cookie httpOnly para prevenção de CSRF.
- Webhooks respondem HTTP 200 imediatamente e processam em segundo plano para evitar retentativas agressivas do ML.
