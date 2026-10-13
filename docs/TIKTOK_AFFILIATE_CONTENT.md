# TikTok — conteúdo de afiliados

## Estado desta entrega

O SALE-IA V2 pode gerar um **rascunho revisável** de vídeo de afiliado para TikTok. Esta etapa não publica vídeos, não acessa uma conta TikTok e não confirma que o link de afiliado foi aprovado pelo programa.

## Endpoint

`POST /api/afiliados/tiktok/roteiro`

Autenticação: envie o cabeçalho administrativo já usado pelo projeto:
- `x-affiliate-admin-key: <AFFILIATE_ADMIN_KEY>`, ou
- `x-mercado-livre-admin-key: <MERCADO_LIVRE_ADMIN_KEY>`.

Exemplo de corpo:

```json
{
  "productName": "Garrafa térmica",
  "category": "casa",
  "description": "Garrafa reutilizável com tampa rosqueável",
  "affiliateUrl": "https://exemplo.com/link-de-afiliado",
  "durationSeconds": 20
}
```

Duração aceita: 15 a 60 segundos. URLs precisam usar HTTP/HTTPS e não podem conter usuário/senha embutidos.

A resposta inclui gancho, sequência de cenas, fala, sobreposições de texto, legenda, hashtags, CTA e divulgação comercial. O estado é sempre `DRAFT_REQUIRES_HUMAN_REVIEW`.

## Para habilitar publicação real no futuro

1. Registrar/revisar o aplicativo no portal oficial de desenvolvedores TikTok.
2. Implementar OAuth oficial com os escopos de publicação aprovados para o aplicativo.
3. Validar o fluxo de inicialização e status da Content Posting API e os requisitos de mídia/URL pública.
4. Guardar tokens somente em armazenamento seguro e nunca em logs.
5. Exigir aprovação explícita antes de cada publicação real e registrar o ID retornado pela API.
6. Testar primeiro em modo de rascunho e verificar as regras comerciais/divulgação de afiliados vigentes.

Não adicione credenciais ao Git e não declare publicação automática antes de uma integração autenticada e testada.
