# Deploy do Sale-IA v2 / RB Factory Sites na Oracle Cloud

## Objetivo

Executar o backend Node.js em uma VM Oracle Cloud Ampere A1 (ARM64), mantendo SQLite e imagens em volumes Docker persistentes. O Netlify continua responsável pela publicação dos sites gerados.

> **Atenção sobre custo e disponibilidade:** use somente recursos identificados como **Always Free** no console e confira o estimador antes de criar qualquer recurso. A Oracle pode não ter capacidade Ampere na região escolhida. A documentação também prevê recuperação de instâncias Always Free consideradas ociosas. Portanto, custo zero não significa SLA nem disponibilidade garantida. Não habilite recursos pagos.

## Arquitetura

- VM Ubuntu ARM64 Always Free.
- Docker Engine + Docker Compose.
- Aplicação Sale-IA v2 na porta TCP 3000.
- SQLite persistido no volume Docker `sale_ia_data`.
- Imagens geradas persistidas no volume `sale_ia_generated_images`.
- Netlify permanece como destino dos sites publicados.
- Autonomia automática permanece desativada durante a validação inicial.

## 1. Criar a VM

No Oracle Cloud Console:

1. Crie uma instância Compute na **home region** da conta.
2. Escolha Ubuntu Server ARM64 e a forma VM.Standard.A1.Flex.
3. Não ultrapasse o limite Always Free exibido pela própria conta. A documentação atual informa o equivalente a 2 OCPUs e 12 GB de memória no Always Free Ampere A1.
4. Mantenha o boot volume dentro dos 200 GB Always Free combinados.
5. Atribua IP público e use uma chave SSH criada no seu computador.
6. Não selecione shapes, discos, endereços ou serviços marcados como pagos.

## 2. Liberar portas

Na VCN / Security List ou Network Security Group, crie regras de entrada:
- TCP 22: somente seu IP público, para SSH.
- TCP 3000: temporariamente, para validação. Restrinja ao seu IP sempre que possível.

No Ubuntu, configure também o firewall local conforme sua política. Para produção com domínio, prefira colocar um proxy HTTPS (Caddy/Nginx) nas portas 80/443 e não expor a porta 3000 diretamente.

## 3. Preparar acesso de leitura ao repositório privado

Não coloque token pessoal no script, no Dockerfile ou no Git.

No computador local, gere uma chave SSH exclusiva para deploy, sem reutilizar sua chave pessoal:

```bash
ssh-keygen -t ed25519 -C "sale-ia-v2-oracle-readonly" -f ~/.ssh/sale-ia-oracle
```

Cadastre o conteúdo de `sale-ia-oracle.pub` no GitHub em:
Repository → Settings → Deploy keys → Add deploy key.

**Não marque Allow write access.** A chave precisa apenas clonar/ler o repositório.

Copie a chave privada para a VM por um canal SSH seguro e configure `~/.ssh/config` para usar essa chave no host github.com. Nunca a envie em mensagens ou a versione no repositório.

## 4. Instalar Docker na VM

Conecte por SSH e instale Docker Engine e o plugin Compose seguindo a documentação oficial da Docker para Ubuntu. Depois confirme:

```bash
docker --version
docker compose version
```

## 5. Clonar e iniciar

Na VM:

```bash
git clone --branch main git@github.com:RuiBarbosasilva/sale-ia-v2.git
cd sale-ia-v2
```

Crie o arquivo de ambiente sem publicá-lo:

```bash
nano .env
```

Preencha com os valores reais:

```dotenv
GOOGLE_PLACES_ENABLED=true
GOOGLE_PLACES_API_KEY=COLOQUE_SUA_CHAVE
GEMINI_API_KEY=COLOQUE_SUA_CHAVE
OPENAI_API_KEY=
NETLIFY_AUTH_TOKEN=COLOQUE_SEU_TOKEN
SALE_IA_ADMIN_KEY=CRIE_UMA_CHAVE_FORTE_E_UNICA
RB_FACTORY_AUTONOMY_ENABLED=false
```

Não use valores de exemplo em produção. Se não usar um dos provedores de IA, deixe sua chave vazia. Proteja o arquivo:

```bash
chmod 600 .env
docker compose -f docker-compose.oracle.yml up -d --build
```

O container executa `prisma migrate deploy` antes de iniciar a aplicação. Não execute `prisma migrate reset`.

## 6. Validar

```bash
docker compose -f docker-compose.oracle.yml ps
docker compose -f docker-compose.oracle.yml logs --tail=150 sale-ia
curl -i http://127.0.0.1:3000/api/health
```

A partir do computador, teste `http://IP_PUBLICO_DA_VM:3000/api/health` somente enquanto a porta estiver temporariamente liberada. Não considere o serviço pronto até confirmar HTTP 200, autenticação administrativa, acesso ao banco persistente e fluxo RB Factory Sites.

## 7. Atualizar

```bash
cd ~/sale-ia-v2
git pull --ff-only origin main
docker compose -f docker-compose.oracle.yml up -d --build
```

## 8. Backup

Faça backup periódico do volume SQLite antes de atualizações importantes. Um exemplo de cópia consistente com o container parado:

```bash
docker compose -f docker-compose.oracle.yml stop sale-ia
docker run --rm -v sale-ia-v2_sale_ia_data:/data -v "$PWD:/backup" alpine sh -c "tar czf /backup/sale-ia-data-backup.tgz -C /data ."
docker compose -f docker-compose.oracle.yml start sale-ia
```

Confirme o nome real do volume com `docker volume ls` antes de executar o backup. Guarde a cópia fora da VM.

## Critério de conclusão

- [ ] VM criada usando somente recursos Always Free.
- [ ] Docker instalado.
- [ ] Deploy key somente leitura configurada.
- [ ] Container saudável e endpoint `/api/health` respondendo HTTP 200.
- [ ] SQLite sobrevive a reinicialização/redeploy.
- [ ] Google Places e IA configurados.
- [ ] Autenticação administrativa validada.
- [ ] Netlify conectado e primeiro site publicado com URL pública verificada.
- [ ] Backup e HTTPS configurados.

A URL pública do backend depende do IP público ou domínio atribuído à VM. Não invente nem registre URL antes da criação e do teste real.
