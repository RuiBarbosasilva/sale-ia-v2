# Guia de criação das APIs e autorizações — SALE-IA V2

Data de revisão: 10/11/2026  
Repositório: RuiBarbosasilva/sale-ia-v2

Este guia acompanha o arquivo .env.example. Ele descreve onde criar cada credencial, quais dados copiar, onde configurar e quais integrações ainda dependem de alteração no código ou aprovação do provedor.

## 1. Antes de criar qualquer credencial

1. Defina primeiro o endereço HTTPS público do backend. Os provedores OAuth exigem que a URL de callback cadastrada seja exatamente igual à usada pelo Sale-IA.
2. Copie .env.example para .env no computador. Não renomeie o modelo do GitHub para .env e não faça commit do arquivo real.
3. Em produção, cadastre os valores no gerenciador de variáveis secretas da hospedagem. Não os coloque no README, no código, em prints públicos ou em mensagens.
4. Crie uma credencial diferente para cada finalidade. Não reutilize a senha do e-mail, a senha do GitHub ou a senha do painel como API key.
5. Comece com Gemini e Netlify. São as primeiras credenciais que destravam a geração de conteúdo e a publicação de sites.
6. Só habilite automações depois de testar manualmente cada integração.

O arquivo .gitignore já exclui .env e libera apenas .env.example. Portanto, o arquivo atualizado neste repositório é intencionalmente um modelo sem segredos.

## 2. Mapa: o que criar agora e o que ainda não adianta criar

| Integração | Credencial/ação | Situação no código |
|---|---|---|
| Gemini | API Key | Integrado ao provedor de IA do Site Factory |
| Netlify | Personal Access Token | Integrado à publicação de sites |
| Mercado Livre | App ID, Client Secret e OAuth do vendedor | OAuth implementado |
| Meta | App ID, App Secret e OAuth | OAuth/publicação implementados; acesso e revisão dependem da Meta |
| TikTok | Client Key, Client Secret e OAuth | OAuth/publicação implementados; Direct Post exige aprovação e auditoria |
| Google/YouTube | OAuth Client ID e Secret | OAuth e upload implementados; APIs/cotas e verificação dependem do Google |
| Google Business Profile | Acesso de API aprovado + OAuth Google | Acesso separado; validar compatibilidade do endpoint atual antes de produção |
| Pinterest | App ID, App Secret e OAuth | OAuth/publicação implementados |
| Qwen | API Key e endpoint regional | Provedor alternativo implementado |
| OpenAI | API Key | Provedor implementado; cobrança da API é separada do ChatGPT |
| WordPress | Application Password | Envio de artigos como rascunho implementado |
| Hotmart | Client ID e Client Secret | Adaptador implementado; credenciais são gravadas criptografadas no banco |
| Evolution API | URL, chave de autenticação e nome da instância | Serviço de envio de mensagens implementado |
| SMTP | Servidor, usuário e senha de aplicativo | Envio por SMTP implementado |
| Unsplash | Access Key | Provedor de imagens opcional |
| Pexels | API Key | Emissão de novas chaves está pausada na data da revisão |
| Canva | Client ID, Client Secret e token | Código atual não conclui OAuth/renovação; não é uma integração pronta |
| Shopee | Partner ID/Key e Shop ID | Adaptador oficial ainda não foi implementado |
| Amazon KDP/SP-API | Credenciais de vendedor | O módulo atual prepara metadados; não publica livros pela SP-API |

Não crie agora credenciais da Shopee, Canva, Amazon Seller ou Pexels para tentar destravar módulos que ainda não têm integração operacional. A criação de uma chave não substitui o adaptador de software ausente.

## 3. Primeiras credenciais: RB Factory Sites

### 3.1 Google Gemini — GEMINI_API_KEY

Uso: geração de textos e conteúdo pelo Site Factory.

1. Abra https://aistudio.google.com/.
2. Entre com a conta Google que será responsável pelo projeto.
3. Abra a área de API Keys.
4. Clique em Create API Key.
5. Selecione o projeto sugerido ou crie um projeto para o SALE-IA V2.
6. Copie a chave completa imediatamente e guarde-a em um gerenciador de senhas.
7. No .env local, preencha GEMINI_API_KEY.
8. Mantenha GEMINI_WEBSITE_MODEL com o modelo aceito pela conta/região. O valor de exemplo é apenas uma referência; confirme os modelos disponíveis na conta.
9. Faça uma chamada de teste antes de ativar qualquer automação.

A Google AI Studio pode disponibilizar uso gratuito com limites por modelo e região. Esses limites podem mudar. Não habilite faturamento ou plano pago sem verificar antes a tela de preços e as condições da conta.

Documentação oficial: https://aistudio.google.com/docs/get-started

### 3.2 Netlify — NETLIFY_AUTH_TOKEN

Uso: o Sale-IA cria/reutiliza um site e envia o pacote do site gerado pela API Netlify.

1. Abra https://app.netlify.com/ e entre na conta que será proprietária dos sites dos clientes.
2. Abra as configurações da conta/usuário.
3. Acesse Applications.
4. Abra Personal access tokens.
5. Clique em New access token.
6. Informe um nome identificável, por exemplo SALE-IA-V2.
7. Escolha uma data de expiração adequada. Registre a data para renovar o token antes do vencimento.
8. Clique em Generate token.
9. Copie o token imediatamente. O valor completo não fica disponível novamente depois que você sai da tela.
10. Cadastre o valor como NETLIFY_AUTH_TOKEN no ambiente do backend.
11. Faça o teste de publicação de um site demonstrativo e confirme que a URL HTTPS abre em janela anônima.

O token dá ao sistema os poderes da conta Netlify que o criou. Use uma conta/projeto dedicado quando possível e revogue o token se houver suspeita de vazamento.

A Netlify anuncia um plano Free, com limites mensais de créditos. Acompanhe o consumo; publicação em volume pode ultrapassar a franquia gratuita.

Documentação oficial: https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/  
Planos: https://www.netlify.com/pricing/

### 3.3 OpenAI — OPENAI_API_KEY (alternativa, não primeira prioridade)

O Site Factory consegue usar OpenAI como alternativa de IA. O módulo Blog Factory atual também chama OpenAI diretamente.

1. Abra https://platform.openai.com/.
2. Entre ou crie a conta da plataforma de API.
3. Crie um projeto com nome SALE-IA-V2.
4. Abra API keys.
5. Clique em Create new secret key.
6. Dê um nome como sale-ia-backend.
7. Copie a chave uma única vez.
8. Cadastre-a em OPENAI_API_KEY no ambiente do backend.
9. Defina limites de projeto e monitore o consumo.

A API da OpenAI é faturada separadamente da assinatura do ChatGPT. Não é necessário criar esta chave para começar pelo Gemini. O Blog Factory atual, porém, depende de OPENAI_API_KEY para gerar artigos; usar Gemini nesse módulo exigirá uma alteração posterior do serviço.

Documentação: https://platform.openai.com/docs/quickstart

### 3.4 Qwen — QWEN_API_KEY e QWEN_BASE_URL (alternativa)

1. Abra https://www.alibabacloud.com/ e crie/acesse sua conta Alibaba Cloud.
2. Entre no Model Studio: https://modelstudio.console.alibabacloud.com/.
3. Aceite os termos para ativar o Model Studio, se for solicitado.
4. Abra a área de API Keys.
5. Clique em Create API Key.
6. Escolha o workspace adequado e dê uma descrição como sale-ia-v2.
7. Copie a chave exibida na criação.
8. Na mesma tela, copie o API Host/endpoint compatível com OpenAI da região escolhida.
9. Coloque a chave em QWEN_API_KEY e o endpoint copiado em QWEN_BASE_URL.
10. Deixe QWEN_WEBSITE_MODEL com um modelo disponível naquela região.
11. Teste antes de colocar qwen na ordem principal.

Não invente nem copie um endpoint de outra região. A Alibaba informa que o API Host varia conforme a região e o protocolo. Verifique os preços e se a conta exige forma de pagamento antes de consumir modelos pagos.

Documentação oficial: https://www.alibabacloud.com/help/pt-br/model-studio/get-api-key  
Primeira chamada: https://www.alibabacloud.com/help/en/model-studio/first-api-call-to-qwen

### 3.5 Google Places — GOOGLE_PLACES_API_KEY (não ativar ainda)

O adaptador atual do repositório chama os endpoints antigos do Places (Legacy), enquanto o Google documenta a Places API (New) com endpoints e FieldMask diferentes. Uma chave criada para a API New, sozinha, não atualiza o código.

Antes de criar a chave:

1. Não habilite GOOGLE_PLACES_ENABLED.
2. Não cole uma chave nova esperando que o conector atual funcione.
3. A próxima alteração técnica precisa migrar o arquivo src/services/prospecting/providers/googlePlacesProvider.ts para Places API (New), incluindo o endpoint de Text Search, o endpoint de Place Details e o FieldMask.
4. Só depois dessa alteração crie um projeto em https://console.cloud.google.com/.
5. Abra Billing e associe uma conta de faturamento ao projeto. O Google exige faturamento habilitado para Places API.
6. Abra APIs & Services > Library e habilite Places API (New).
7. Abra APIs & Services > Credentials e crie uma API Key.
8. Restrinja a chave à Places API (New) e às origens/IPs autorizados para o backend.
9. Cadastre a chave em GOOGLE_PLACES_API_KEY e habilite GOOGLE_PLACES_ENABLED somente após o adaptador novo ser testado.

Como o Google exige conta de faturamento, esta não é a primeira opção para quem não dispõe de cartão. Não tente contornar a cobrança com uma chave sem faturamento.

Documentação oficial: https://developers.google.com/maps/documentation/places/web-service/get-api-key  
Preços e faturamento: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

Alternativa geográfica: OpenStreetMap não exige uma API key para vários serviços, mas o Nominatim público não é uma base para varrer sistematicamente todas as empresas de uma cidade. A política do serviço limita o uso a uma requisição por segundo e proíbe consultas sistemáticas/bulk. Para prospecção em escala é preciso outro provedor ou um serviço OSM próprio/adequado, além de implementar o adaptador no Sale-IA.

Política oficial: https://operations.osmfoundation.org/policies/nominatim/

## 4. Mercado Livre — conexão da conta de vendedor

Variáveis: MERCADO_LIVRE_APP_ID, MERCADO_LIVRE_CLIENT_SECRET, MERCADO_LIVRE_REDIRECT_URI, MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY e MERCADO_LIVRE_ADMIN_KEY.

### Criar a aplicação

1. Abra https://applications.mercadolibre.com/ ou o portal https://developers.mercadolivre.com.br/.
2. Entre usando a própria conta que será proprietária da aplicação. A documentação recomenda criar a aplicação na conta proprietária da solução.
3. Abra Minhas aplicações e escolha criar uma aplicação.
4. Nomeie como SALE-IA-V2.
5. Preencha os dados e a finalidade solicitados pelo formulário.
6. Na configuração de autenticação, cadastre a URL de callback do backend exatamente assim, substituindo SEU-DOMINIO pelo host real:

    https://SEU-DOMINIO/api/mercadolivre/auth/callback

7. Salve a aplicação.
8. Abra a tela de detalhes da aplicação e copie Client ID e Client Secret.
9. Cadastre-os em MERCADO_LIVRE_APP_ID e MERCADO_LIVRE_CLIENT_SECRET.
10. Cadastre a callback completa em MERCADO_LIVRE_REDIRECT_URI.
11. Gere MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY e MERCADO_LIVRE_ADMIN_KEY localmente.

### Autorizar a conta de vendedor

1. Depois que o backend estiver publicado e a URL de callback estiver acessível, abra:

    https://SEU-DOMINIO/api/mercadolivre/auth/connect

2. Entre na conta de vendedor que deseja conectar.
3. Revise as permissões solicitadas.
4. Clique para autorizar a aplicação.
5. Aguarde o retorno para o painel.
6. Consulte GET /api/mercadolivre/account com o cabeçalho administrativo exigido e confirme que a conta está conectada.
7. Faça uma leitura de conta/anúncios antes de testar operações de escrita.

Não compartilhe o Client Secret nem os tokens OAuth. O Sale-IA foi preparado para armazenar tokens criptografados.

Documentação oficial: https://developers.mercadolivre.com.br/crie-uma-aplicacao-no-mercado-livre  
Guia do projeto: docs/MERCADO_LIVRE_ARCHITECTURE.md

## 5. Social Media Factory — criar apps de desenvolvedor

Todas as plataformas sociais usam o mesmo callback do Sale-IA. Substitua SEU-DOMINIO pelo endereço HTTPS público definitivo:

    https://SEU-DOMINIO/api/social-media-factory/oauth/callback

Cadastre essa URL exatamente igual em cada portal. Não inclua barra final se ela não estiver presente no valor do .env.

Antes do OAuth, cadastre no ambiente:

- SOCIAL_MEDIA_OAUTH_REDIRECT_URI
- SOCIAL_MEDIA_TOKEN_ENCRYPTION_KEY
- PUBLIC_BASE_URL
- SOCIAL_MEDIA_MEDIA_ALLOWED_HOSTS

SOCIAL_MEDIA_MEDIA_ALLOWED_HOSTS deve conter somente o hostname, sem https:// e sem caminho. Exemplo: sale-ia.exemplo.com.

### 5.1 Meta — Facebook Pages e Instagram

Variáveis: META_APP_ID, META_APP_SECRET e META_GRAPH_API_VERSION.

1. Abra https://developers.facebook.com/apps/.
2. Entre com o perfil que administra a Página e os ativos da empresa.
3. Clique para criar um aplicativo.
4. Escolha a configuração/caso de uso que permita acessar Páginas e publicar conteúdo para Facebook e Instagram. Os nomes das opções no portal podem mudar.
5. Adicione os produtos de login e as APIs necessárias para Facebook Pages e Instagram.
6. Em configurações de login, cadastre a callback do Sale-IA.
7. Na tela de configurações básicas do app, copie App ID e App Secret.
8. Cadastre-os em META_APP_ID e META_APP_SECRET. Mantenha META_GRAPH_API_VERSION no valor suportado pelo app/código.
9. Solicite as permissões que o conector atual pede:
   - pages_show_list
   - pages_read_engagement
   - pages_manage_posts
   - instagram_basic
   - instagram_content_publish
   - business_management
10. Teste primeiro com uma Página e uma conta Instagram profissional que você administra.
11. Para usar com contas de clientes que não são administradores/desenvolvedores do app, verifique Advanced Access, App Review e Business Verification exigidos pela Meta.
12. No painel Social Media Factory, crie um projeto, selecione Conectar na conta Facebook/Instagram e finalize a autorização.

A conta Instagram precisa ser profissional e estar vinculada à Página adequada. O usuário que autoriza deve ter acesso administrativo aos ativos. Criar App ID e Secret não concede, por si só, aprovação de publicação para todos os usuários.

Portal: https://developers.facebook.com/  
Documentação Instagram: https://developers.facebook.com/docs/instagram-platform/  
Documentação de permissões: https://developers.facebook.com/docs/permissions/

### 5.2 TikTok — Content Posting API

Variáveis: TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET.

1. Abra https://developers.tiktok.com/.
2. Cadastre-se como desenvolvedor.
3. Abra Manage apps e crie uma aplicação para o RB Factory.
4. Preencha nome, descrição, site, Termos de Serviço e Política de Privacidade.
5. Em Products, adicione Content Posting API.
6. Habilite a configuração Direct Post se a finalidade for publicar diretamente.
7. Em Scopes, solicite:
   - user.info.basic
   - video.publish
   - video.upload
8. Cadastre a callback do Sale-IA.
9. Copie Client Key e Client Secret para TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET.
10. Verifique o domínio/URL de mídia solicitado pelo TikTok. O domínio público do Sale-IA precisa estar acessível para o provedor buscar o vídeo/foto.
11. Envie o app para revisão e acompanhe o estado em Production.
12. Autorize sua conta TikTok no painel do Sale-IA.
13. Teste com conteúdo privado antes de pedir auditoria/publicação pública.

O escopo video.publish precisa ser aprovado e autorizado pelo usuário. Clientes não auditados têm restrições de visibilidade; a documentação informa que o conteúdo pode ficar privado até a auditoria. O Sale-IA exige consentimento explícito para cada publicação TikTok.

Portal: https://developers.tiktok.com/  
Criar app: https://developers.tiktok.com/docs/en/getting-started-create-an-app  
Publicação direta: https://developers.tiktok.com/docs/en/content-posting-api-get-started

### 5.3 Google — YouTube e Google Business Profile

Variáveis: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.

#### Parte A: YouTube

1. Abra https://console.cloud.google.com/.
2. Crie um projeto chamado RB-FACTORY-SOCIAL.
3. Abra APIs & Services > Library.
4. Pesquise e habilite YouTube Data API v3.
5. Abra Google Auth Platform/Consent Screen.
6. Informe nome do app, e-mail de suporte, domínio e contatos solicitados.
7. Enquanto estiver em modo Testing, adicione como test users as contas Google que farão os primeiros testes.
8. Abra Clients/Credentials e crie OAuth Client ID.
9. Escolha Web application.
10. Cadastre a callback do Sale-IA em Authorized redirect URIs.
11. Copie Client ID e Client Secret para GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.
12. Verifique que os escopos do fluxo incluem youtube.upload e youtube.readonly.
13. No painel, clique Conectar na conta YouTube e autorize o canal.
14. Faça primeiro um upload privado. O código usa private como privacidade padrão.

Projetos Google não verificados podem sofrer restrições de upload/visibilidade. Para uso público amplo, siga o processo de verificação aplicável às APIs e ao consentimento OAuth.

Documentação: https://developers.google.com/youtube/data/guides/authentication

#### Parte B: Google Business Profile

O acesso às APIs do Perfil da Empresa é separado da criação do Client ID do YouTube.

1. Use uma Conta Google que seja proprietária/gerente de um Perfil da Empresa ativo e completo.
2. Crie/seleciona o projeto no Google Cloud Console.
3. Confirme a organização/conta empresarial exigida pelo Google.
4. Acesse os pré-requisitos do Business Profile API.
5. Envie o formulário de solicitação de acesso básico às APIs do GBP usando o número do projeto e o e-mail que aparece como proprietário/gerente do perfil.
6. Aguarde a aprovação do Google.
7. Só depois da aprovação, habilite as APIs do Business Profile disponibilizadas para o projeto.
8. Use o mesmo GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET criados como Web application, desde que o projeto/escopos permitam o acesso solicitado.
9. Conecte a conta pelo painel Social Media Factory e selecione a localização no formato accounts/ID/locations/ID.

Sem a aprovação do Google, ter OAuth Client ID/Secret não libera a API. Além disso, valide a compatibilidade do adaptador do Sale-IA com as versões atualmente disponíveis do Business Profile API antes de prometer publicação automática; a credencial sozinha não corrige endpoints antigos.

Pré-requisitos oficiais: https://developers.google.com/my-business/content/prereqs  
Configuração: https://developers.google.com/my-business/content/basic-setup

### 5.4 Pinterest

Variáveis: PINTEREST_APP_ID e PINTEREST_APP_SECRET.

1. Abra https://developers.pinterest.com/.
2. Entre na conta Pinterest que será proprietária da aplicação.
3. Acesse My apps e registre um novo app.
4. Informe nome, descrição, site e finalidade.
5. Registre a callback do Sale-IA.
6. Copie App ID e App Secret.
7. Cadastre os escopos necessários ao conector:
   - user_accounts:read
   - boards:read
   - pins:read
   - pins:write
8. Cadastre os valores no ambiente.
9. No painel, conecte a conta Pinterest pelo fluxo OAuth.
10. Selecione o board de destino. O Sale-IA precisa do ID do board para criar Pins.

O token é emitido pelo fluxo OAuth depois que a conta autoriza os escopos. Não coloque token de usuário diretamente no código.

Portal: https://developers.pinterest.com/  
Autorização oficial: https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/

### 5.5 Ativação social somente depois dos testes

1. Confira que cada app passou pelas revisões necessárias.
2. Crie um workspace no painel /social-media-factory.
3. Conecte uma conta de teste de cada plataforma.
4. Selecione as contas/destinos e, quando necessário, informe localização Google Business e board Pinterest.
5. Teste geração e agendamento sem publicação.
6. Configure PUBLIC_BASE_URL em HTTPS.
7. Confirme que os arquivos de mídia estão acessíveis sem login.
8. Configure SOCIAL_MEDIA_MEDIA_ALLOWED_HOSTS com o hostname público.
9. Instale Python e FFmpeg caso vá gerar vídeos.
10. Mantenha SOCIAL_MEDIA_FACTORY_ENABLED=false durante a validação. Mantenha SOCIAL_MEDIA_DRY_RUN=true para simulação.
11. Só depois de teste real e consentimento, habilite o scheduler. Não habilite publicação nas seis redes sem validar todas.

## 6. Blog Factory — WordPress

Variáveis: BLOG_FACTORY_WORDPRESS_URL, BLOG_FACTORY_WORDPRESS_USERNAME, BLOG_FACTORY_WORDPRESS_APP_PASSWORD, BLOG_FACTORY_FEEDS e OPENAI_API_KEY.

### Criar a senha de aplicação WordPress

1. Entre no painel administrativo do WordPress por HTTPS.
2. Crie um usuário próprio para o SALE-IA, em vez de usar a senha do administrador principal.
3. Dê somente a função necessária para criar rascunhos (Autor/Editor, conforme o site e as permissões).
4. Abra Usuários > Perfil.
5. Localize Application Passwords/Senhas de aplicação.
6. Informe o nome SALE-IA e gere a senha.
7. Copie a senha imediatamente. Ela será exibida uma vez.
8. Cadastre:
   - BLOG_FACTORY_WORDPRESS_URL: endereço base do site, por exemplo https://blog.exemplo.com, sem /wp-admin.
   - BLOG_FACTORY_WORDPRESS_USERNAME: usuário criado para a integração.
   - BLOG_FACTORY_WORDPRESS_APP_PASSWORD: senha gerada.
9. Cadastre em BLOG_FACTORY_FEEDS as URLs RSS confiáveis separadas por vírgula.
10. O serviço atual usa OPENAI_API_KEY para criar artigos. Configure essa chave antes de habilitar geração automática.
11. Comece com BLOG_FACTORY_AUTORUN_ENABLED=false, gere um rascunho manual e confirme no painel WordPress.
12. Só depois configure BLOG_FACTORY_AI_ENABLED=true e escolha um intervalo prudente.

O código atual envia artigos ao WordPress com status draft. Ele não os publica automaticamente no site. Não conceda função de Administrador ao usuário de integração se Autor/Editor for suficiente.

Documentação oficial: https://developer.wordpress.org/advanced-administration/security/application-passwords/  
Endpoint de posts: https://developer.wordpress.org/rest-api/reference/posts/

## 7. Hotmart — credenciais de afiliados

Credenciais: client_id e client_secret. Elas não são lidas de variáveis de ambiente; o Sale-IA guarda os dados criptografados no banco.

1. Entre em https://app.hotmart.com/ com a conta responsável pelos produtos/afiliações.
2. No menu lateral, abra Ferramentas.
3. Selecione Credenciais (Developers).
4. Crie credenciais para integração.
5. Copie Client ID, Client Secret e, se exibido, Basic Token. Guarde tudo em local seguro.
6. No Sale-IA, abra a rede Hotmart na área de Afiliados/Inteligência e obtenha o ID do registro da rede.
7. Configure AFFILIATE_CREDENTIALS_KEY (64 caracteres hexadecimais) no servidor antes de gravar as credenciais.
8. Use a rota administrativa:
   
    PUT /api/affiliate-networks/ID_DA_REDE/credentials

9. Envie o cabeçalho x-affiliate-admin-key com o valor de AFFILIATE_ADMIN_KEY.
10. Corpo esperado:

    {
      "credentials": {
        "clientId": "SEU_CLIENT_ID",
        "clientSecret": "SEU_CLIENT_SECRET"
      }
    }

11. Faça o teste administrativo:

    POST /api/affiliate-networks/ID_DA_REDE/credentials/test

12. Confirme que o retorno indica credenciais configuradas. O valor secreto não deve ser retornado pelo painel.

Não envie client_secret pelo navegador sem HTTPS. Não coloque esses valores em .env.example nem em commits.

Ajuda oficial Hotmart: https://help.hotmart.com/pt-br/article/4403617024013/como-utilizo-as-apis-da-hotmart-e-o-hotmart-developers-para-integrar-meu-negocio-

## 8. WhatsApp — Evolution API

O serviço atual usa Evolution API; ele não está conectado diretamente à WhatsApp Cloud API.

Variáveis: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME e WHATSAPP_WEBHOOK_SECRET.

### Se ainda não tiver Evolution API

1. Escolha onde executar a Evolution API: servidor próprio ou provedor que ofereça uma instância administrada.
2. Siga a documentação oficial para instalar a versão 2 e configure HTTPS no endereço público.
3. No ambiente da Evolution API, defina a chave global de autenticação (AUTHENTICATION_API_KEY) com um segredo forte.
4. Reinicie a Evolution API e confirme que o endpoint de saúde responde.
5. Crie uma instância chamada sale-ia pelo Manager ou pelo endpoint oficial de criação de instância.
6. Se utilizar a API, o endpoint é POST /instance/create; o corpo básico contém instanceName, token e qrcode=true, e a chamada administrativa deve incluir a chave global no cabeçalho apikey.
7. Abra o QR Code da instância e conecte um número de teste do WhatsApp.
8. Confirme no Manager que a instância aparece conectada.
9. No .env do Sale-IA, coloque a URL pública da Evolution em EVOLUTION_API_URL, a chave global configurada no serviço em EVOLUTION_API_KEY e o nome exato da instância em EVOLUTION_INSTANCE_NAME.
10. Faça um teste de envio para um número autorizado.
11. Configure WHATSAPP_WEBHOOK_SECRET com uma chave diferente se também for usar os webhooks de entrada do Sale-IA.

O serviço de envio do Sale-IA envia o cabeçalho apikey. Uma chave de instância diferente da chave global do servidor pode não autenticar essa chamada. Confirme qual chave o seu deployment da Evolution exige.

Para uso comercial de longo prazo, avalie os termos e riscos operacionais do método de conexão escolhido. A API oficial WhatsApp Cloud é uma integração diferente e exigirá um adaptador próprio no Sale-IA.

Documentação: https://github.com/EvolutionAPI/evolution-api  
Criar instância: https://github.com/evolution-foundation/evolution-docs/blob/main/docs/03-Instance%20contoller/00-create-instance.md

## 9. E-mail — SMTP

O Sale-IA tem dois serviços de envio e, por compatibilidade, o .env.example apresenta dois grupos:

- Provider de prospecção: EMAIL_ENABLED, EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, EMAIL_SMTP_USER, EMAIL_SMTP_PASS e EMAIL_FROM.
- Serviço legado: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM.

Escolha um provedor de e-mail que permita SMTP autenticado e configure SPF, DKIM e DMARC no domínio de envio.

### Exemplo com Zoho Mail

1. Crie/acesse uma caixa de e-mail no Zoho Mail.
2. Abra as configurações da conta e consulte Server Configurations Details para ver o servidor correto do seu data center/plano.
3. Para contas pessoais/organizações gratuitas, a documentação indica smtp.zoho.com e porta 587 com TLS ou 465 com SSL.
4. Para planos pagos com domínio, confira se a conta utiliza smtppro.zoho.com ou outro host indicado na própria tela de configuração.
5. Ative autenticação de dois fatores quando disponível.
6. Gere senha específica de aplicativo, caso o provedor exija para SMTP.
7. Preencha EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, EMAIL_SMTP_USER, EMAIL_SMTP_PASS e EMAIL_FROM.
8. Repita os mesmos valores em SMTP_* somente se o serviço legado for utilizado.
9. Envie um e-mail de teste para uma caixa que você controla e confirme recebimento, spam e remetente.
10. Configure SPF, DKIM e DMARC conforme instruções do provedor.

Zoho SMTP: https://www.zoho.com/pt-br/mail/help/zoho-smtp.html  
Gmail SMTP: https://developers.google.com/workspace/gmail/imap/imap-smtp

## 10. Imagens: Unsplash, Pexels e opções sem chave

### Unsplash

1. Abra https://unsplash.com/developers.
2. Crie/acesse uma conta de desenvolvedor.
3. Abra Your apps e clique New Application.
4. Leia/aceite as regras de uso da API.
5. Copie Access Key.
6. Cadastre em UNSPLASH_ACCESS_KEY.
7. Comece em modo de demonstração e respeite o limite apresentado no portal.
8. Se a aplicação exigir maior cota, solicite Production e aguarde análise.
9. Mantenha a atribuição exigida pela API.

A documentação informa que aplicações novas começam em Demo Mode, com limite de requisições por hora, e que o uso de produção exige solicitação.

Documentação: https://unsplash.com/documentation

### Pexels

Na revisão de 10/11/2026, a central oficial do Pexels informa que a emissão de novas API keys está pausada. Não perca tempo tentando criar uma chave agora. Caso já possua uma, confirme com o suporte se ela permanece válida.

Aviso oficial atualizado em 09/11/2026: https://help.pexels.com/hc/en-us/articles/900004904026-How-do-I-get-an-API-key

### Openverse e Wikimedia

O motor do Site Factory já possui provedores Openverse e Wikimedia Commons sem API key. Eles são alternativas para imagens, respeitando licença e atribuição. Não há credencial para criar.

## 11. Credenciais internas: gerar no PowerShell

Estas chaves são geradas por nós; não existe um portal externo onde criar:

- SALE_IA_ADMIN_KEY
- AFFILIATE_ADMIN_KEY
- AFFILIATE_WEBHOOK_KEY
- AFFILIATE_CREDENTIALS_KEY
- SOCIAL_MEDIA_TOKEN_ENCRYPTION_KEY
- MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY
- PAYMENT_WEBHOOK_SECRET
- WHATSAPP_WEBHOOK_SECRET

Abra PowerShell e execute:

    function New-HexSecret {
        $bytes = New-Object byte[] 32
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        $rng.GetBytes($bytes)
        $rng.Dispose()
        return ([BitConverter]::ToString($bytes) -replace "-", "").ToLowerInvariant()
    }

    $names = @(
        "SALE_IA_ADMIN_KEY",
        "AFFILIATE_ADMIN_KEY",
        "AFFILIATE_WEBHOOK_KEY",
        "AFFILIATE_CREDENTIALS_KEY",
        "SOCIAL_MEDIA_TOKEN_ENCRYPTION_KEY",
        "MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY",
        "PAYMENT_WEBHOOK_SECRET",
        "WHATSAPP_WEBHOOK_SECRET"
    )

    foreach ($name in $names) {
        Write-Host "$name=$(New-HexSecret)"
    }

Copie cada saída para a variável correspondente no ambiente local/hospedagem. AFFILIATE_CREDENTIALS_KEY e SOCIAL_MEDIA_TOKEN_ENCRYPTION_KEY precisam permanecer com 64 caracteres hexadecimais. Não altere essas chaves depois que tokens já tiverem sido criptografados sem planejar uma migração, pois os dados antigos podem deixar de ser descriptografáveis.

## 12. Serviços de infraestrutura — não são API keys

### Redis

BullMQ e ioredis precisam de uma URL de conexão Redis real, no protocolo Redis, por exemplo rediss://... em serviço com TLS. Uma URL HTTP de REST API não substitui uma conexão Redis. Crie um Redis gerenciado compatível com BullMQ e copie a URL de conexão para REDIS_URL. Se o serviço de hospedagem bloquear conexões persistentes, os workers não funcionarão corretamente.

### Banco de dados

O exemplo usa SQLite. Em produção, o arquivo do banco precisa estar em volume persistente e incluído em backups. Não use filesystem temporário da hospedagem para o banco nem para arquivos gerados que precisem permanecer disponíveis.

### Mídia social

PUBLIC_BASE_URL deve ser uma URL HTTPS que qualquer provedor consiga acessar. Não use localhost. SOCIAL_MEDIA_MEDIA_ALLOWED_HOSTS deve conter o hostname público, sem protocolo. O YouTube e outras redes podem buscar a mídia externamente; arquivos só acessíveis dentro do servidor falharão.

## 13. O que NÃO criar agora

### Canva

O código atual de Factory Ebook contém um helper que espera CANVA_ACCESS_TOKEN, mas não implementa o fluxo OAuth completo de autorização/renovação. Criar Client ID e Client Secret sem implementar esse fluxo não fecha a integração. Quando o código for preparado, crie uma aplicação no Developer Portal, habilite Canva REST APIs e configure escopos/redirect. Atenção: alguns tipos de app/recursos dependem do plano Canva e de créditos de API.

Portal: https://www.canva.com/developers/  
Autenticação Connect API: https://www.canva.dev/docs/apps/rest-apis/authentication/

### Shopee

O .env.example conserva campos SHOPEE_* como placeholders, mas o repositório não tem adaptador oficial concluído. Não solicite Partner ID/Key ainda. Primeiro é necessário implementar e testar autenticação, assinatura de requisições, catálogo, pedidos e sincronização.

### Amazon KDP / Seller API

O módulo Factory Ebook prepara PDF, imagens e metadados. Isso não equivale a publicar um livro automaticamente no KDP nem a possuir um conector Amazon Seller SP-API. Não crie credenciais Amazon para tentar habilitar publicação automática antes de haver um adaptador e escopo definidos.

### ElevenLabs

ELEVENLABS_API_KEY permanece como variável opcional no modelo. Só gere uma chave se o recurso de áudio correspondente estiver ligado a uma rota/serviço ativo do projeto. Restrinja a chave ao endpoint necessário e configure limite de créditos.

Portal: https://elevenlabs.io/app/settings/api-keys

## 14. Ordem recomendada para preencher e validar

1. Gerar as chaves internas no PowerShell.
2. Criar GEMINI_API_KEY no AI Studio.
3. Criar NETLIFY_AUTH_TOKEN.
4. Publicar o backend e definir domínio HTTPS, antes de registrar callbacks OAuth de produção.
5. Conectar uma conta Mercado Livre por OAuth.
6. Criar e autorizar o app Meta.
7. Criar e enviar o app TikTok para revisão.
8. Criar o OAuth Google e habilitar YouTube Data API; solicitar separadamente acesso ao Google Business Profile.
9. Criar o app Pinterest e autorizar a conta.
10. Criar WordPress Application Password, se Blog Factory for ativado.
11. Criar credenciais Hotmart e gravá-las pela rota administrativa, se o módulo de afiliados for ativado.
12. Configurar Evolution API e SMTP, se WhatsApp/e-mail forem ativados.
13. Configurar Qwen ou OpenAI somente se houver necessidade e orçamento/limite de uso.
14. Testar uma integração por vez. Não ativar todos os schedulers simultaneamente.

## 15. Checklist de validação

Uma credencial só deve ser marcada como pronta depois de:

- [ ] Estar cadastrada no ambiente correto (local ou produção), nunca no Git.
- [ ] Ter escopo mínimo necessário e restrições de uso.
- [ ] Ter callback exata e HTTPS quando OAuth exigir.
- [ ] Conseguir autenticar sem erro.
- [ ] Ter a conta/ativo certo autorizado (Página, canal, localização, board ou vendedor).
- [ ] Passar por um teste real controlado.
- [ ] Ter data de expiração/renovação anotada quando aplicável.
- [ ] Não expor tokens, secrets ou dados pessoais nos logs.

Depois que as primeiras chaves forem criadas, informe somente os nomes das variáveis preenchidas e quais testes deram certo. Nunca envie o conteúdo das chaves ou secrets.
