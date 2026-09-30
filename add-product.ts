import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cadastrarProduto() {
  const produto = await prisma.afiliadoProduto.create({
    data: {
      plataforma: 'clickbank',
      nome: 'NOME_DO_PRODUTO_AQUI',
      tipo: 'digital',
      preco: 97, // Preço real do produto
      comissaoPercentual: 50, // % de comissão
      linkAfiliado: 'VENDOR_NICKNAME_AQUI', // Nickname do produtor
      score: 80,
      status: 'ativo'
    }
  });
  
  console.log('✅ Produto cadastrado!');
  console.log('ID:', produto.id);
  console.log('Link de divulgação: https://seu-dominio.com/go/' + produto.id);
  
  await prisma.$disconnect();
}

cadastrarProduto();
