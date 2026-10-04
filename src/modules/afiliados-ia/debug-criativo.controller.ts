import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const debugCriativo = async (req: Request, res: Response) => {
  try {
    const debug: any = { sucesso: false, etapas: [] };

    // Etapa 1: Verificar conexão com banco
    debug.etapas.push({ etapa: '1. Conexão Prisma', status: 'testando' });
    try {
      await prisma.$connect();
      debug.etapas.push({ etapa: '1. Conexão Prisma', status: 'OK' });
    } catch (e: any) {
      debug.etapas.push({ etapa: '1. Conexão Prisma', status: 'FALHOU', erro: e.message });
      return res.json(debug);
    }

    // Etapa 2: Verificar se o modelo existe
    debug.etapas.push({ etapa: '2. Modelo AfiliadoCriativo', status: 'testando' });
    try {
      const count = await prisma.afiliadoCriativo.count();
      debug.etapas.push({ etapa: '2. Modelo AfiliadoCriativo', status: 'OK', registros: count });
    } catch (e: any) {
      debug.etapas.push({ etapa: '2. Modelo AfiliadoCriativo', status: 'FALHOU', erro: e.message });
      return res.json(debug);
    }

    // Etapa 3: Buscar produto
    debug.etapas.push({ etapa: '3. Buscar Produto', status: 'testando' });
    const produto = await prisma.afiliadoProduto.findUnique({ 
      where: { id: 'dbf3786e-6617-4c55-bca1-4cfc6caaf5d4' } 
    });
    if (produto) {
      debug.etapas.push({ etapa: '3. Buscar Produto', status: 'OK', nome: produto.nome });
    } else {
      debug.etapas.push({ etapa: '3. Buscar Produto', status: 'NAO ENCONTRADO' });
      return res.json(debug);
    }

    // Etapa 4: Buscar copy
    debug.etapas.push({ etapa: '4. Buscar Copy', status: 'testando' });
    const copy = await prisma.afiliadoCopy.findUnique({ 
      where: { id: '878de6c3-eaba-4fdc-9c11-b22bf44d1c22' } 
    });
    if (copy) {
      debug.etapas.push({ etapa: '4. Buscar Copy', status: 'OK', id: copy.id });
    } else {
      debug.etapas.push({ etapa: '4. Buscar Copy', status: 'NAO ENCONTRADO' });
      return res.json(debug);
    }

    // Etapa 5: Tentar criar criativo
    debug.etapas.push({ etapa: '5. Criar Criativo', status: 'testando' });
    try {
      const descricaoCriativo = JSON.stringify({
        copyId: copy.id,
        roteiroVideo: 'Teste de roteiro',
        promptImagem: 'Teste de prompt'
      });

      const criativo = await prisma.afiliadoCriativo.create({
        data: {
          produtoId: produto.id,
          tipo: 'video_imagem',
          descricao: descricaoCriativo,
          url: '',
          status: 'gerado'
        }
      });
      debug.etapas.push({ etapa: '5. Criar Criativo', status: 'OK', id: criativo.id });
      debug.sucesso = true;
    } catch (e: any) {
      debug.etapas.push({ etapa: '5. Criar Criativo', status: 'FALHOU', erro: e.message, stack: e.stack });
    }

    await prisma.$disconnect();
    return res.json(debug);
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message, stack: error.stack });
  }
};
