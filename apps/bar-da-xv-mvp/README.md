# Bar da XV — MVP de controle

Aplicativo web instalável (PWA) para controle pessoal do Bar da XV, pensado para uso no celular Android por um único proprietário.

## Funcionalidades
- Registro de venda rápida, com forma de pagamento e observação.
- Baixa automática de estoque nas vendas.
- Cadastro e edição de produtos, preços, custos e quantidades.
- Registro de entradas de estoque.
- Abertura e fechamento de caixa, com cálculo estimado de dinheiro esperado.
- Registro de despesas.
- Resumo diário e relatórios por período.
- Impressão/Salvar como PDF e exportação de vendas em CSV.
- Backup e restauração manual em JSON.
- Interface responsiva e suporte básico a uso offline após carregamento.

## Publicar/instalar no Android
O projeto precisa ser servido por HTTPS para instalação como PWA. No GitHub, abra a pasta `apps/bar-da-xv-mvp`. Para publicar gratuitamente, use GitHub Pages configurado para a pasta raiz do repositório ou copie o conteúdo desta pasta para um repositório próprio e habilite Pages. Abra o endereço HTTPS no Chrome Android e escolha **Instalar app** ou **Adicionar à tela inicial**.

## Atenção aos dados
Esta versão armazena os dados localmente no navegador do aparelho (`localStorage`). Não existe sincronização em nuvem nem autenticação por senha. Não limpe os dados do navegador sem exportar backup. Faça backups frequentes e teste a restauração. O relatório usa dados inseridos manualmente; confira o caixa físico. O saldo simples (vendas menos despesas) não é lucro líquido.

## Testes antes do uso diário
1. Cadastre/ajuste produtos e estoque real.
2. Abra o caixa com o fundo inicial.
3. Registre venda de teste e confirme a baixa do estoque.
4. Registre despesa, feche o caixa e confira os valores.
5. Exporte backup, CSV e PDF; teste a restauração do backup.
6. Só depois de conferir, comece a usar em operações reais.

## Escopo do MVP
Não inclui emissão fiscal, integração com maquininha, sincronização entre dispositivos, usuários/senhas, nem cálculo contábil de lucro.
