import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Dentistas', slug: 'dentistas', icon: 'Ãƒ°Ã…¸Ã‚¦Ã‚·' },
  { name: 'MÃƒÆ’Ã‚©dicos', slug: 'medicos', icon: 'Ãƒ¢Ã…¡‚¬¢Ãƒ¯Ã‚¸Ã‚' },
  { name: 'Nutricionistas', slug: 'nutricionistas', icon: 'Ãƒ°Ã…¸Ã‚¥‚¬€' },
  { name: 'ClÃƒÆ’Ã‚­nicas', slug: 'clinicas', icon: 'Ãƒ°Ã…¸Ã‚Ã‚¥' },
  { name: 'EstÃƒÆ’Ã‚©tica', slug: 'estetica', icon: 'Ãƒ°Ã…¸‚¬„¢‚¬ ' },
  { name: 'PsicÃƒÆ’Ã‚³logos', slug: 'psicologos', icon: 'Ãƒ°Ã…¸Ã‚§Ã‚ ' },
  { name: 'Advogados', slug: 'advogados', icon: 'Ãƒ¢Ã…¡‚¬€œÃƒ¯Ã‚¸Ã‚' },
  { name: 'Contadores', slug: 'contadores', icon: 'Ãƒ°Ã…¸‚¬Å“Ã… ' },
  { name: 'ImobiliÃƒÆ’Ã‚¡rias', slug: 'imobiliarias', icon: 'Ãƒ°Ã…¸Ã‚Ã‚ ' },
  { name: 'Restaurantes', slug: 'restaurantes', icon: 'Ãƒ°Ã…¸Ã‚Ã‚½Ãƒ¯Ã‚¸Ã‚' },
  { name: 'HotÃƒÆ’Ã‚©is', slug: 'hoteis', icon: 'Ãƒ°Ã…¸Ã‚Ã‚¨' },
  { name: 'Academias', slug: 'academias', icon: 'Ãƒ°Ã…¸‚¬„¢Ã‚ª' },
  { name: 'SalÃƒÆ’Ã‚µes', slug: 'saloes', icon: 'Ãƒ°Ã…¸‚¬„¢‚¬¡' },
  { name: 'Barbearias', slug: 'barbearias', icon: 'Ãƒ°Ã…¸‚¬„¢Ã‹€ ' },
  { name: 'FotÃƒÆ’Ã‚³grafos', slug: 'fotografos', icon: '' },
  { name: 'Arquitetos', slug: 'arquitetos', icon: 'Ãƒ¯Ã‚¸Ã‚' },
  { name: 'Engenheiros', slug: 'engenheiros', icon: 'Ãƒ°Ã…¸‚¬Ã‚§' },
  { name: 'Prestadores de ServiÃƒÆ’Ã‚§os', slug: 'prestadores', icon: 'Ãƒ°Ã…¸‚¬ºÃ‚ Ãƒ¯Ã‚¸Ã‚' },
  { name: 'ComÃƒÆ’Ã‚©rcio', slug: 'comercio', icon: 'Ãƒ°Ã…¸‚¬º‚¬„¢' },
  { name: 'Empresas', slug: 'empresas', icon: 'Ãƒ°Ã…¸Ã‚Ã‚¢' },
  { name: 'EducaÃƒÆ’Ã‚§ÃƒÆ’Ã‚£o', slug: 'educacao', icon: 'Ãƒ°Ã…¸‚¬Å“Ã…¡' },
  { name: 'Eventos', slug: 'eventos', icon: 'Ãƒ°Ã…¸Ã…½‚¬°' },
  { name: 'Outros', slug: 'outros', icon: 'Ãƒ°Ã…¸‚¬Å“Ã‚¦' }
];

async function seed() {
  console.log('Ãƒ°Ã…¸Ã…€™Ã‚± Criando categorias iniciais...');
  for (const cat of categories) {
    await prisma.websiteCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    });
  }
  console.log('Ãƒ¢Ã…€œ‚¬¦ ' + categories.length + ' categorias criadas!');
  await prisma.\$disconnect();
}

seed().catch(console.error);
