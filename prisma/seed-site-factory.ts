import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Dentistas', slug: 'dentistas', icon: 'ÃƒÂ°Ã…Â¸Ã‚Â¦Ã‚Â·' },
  { name: 'MÃƒÆ’Ã‚Â©dicos', slug: 'medicos', icon: 'ÃƒÂ¢Ã…Â¡Ã¢â‚¬Â¢ÃƒÂ¯Ã‚Â¸Ã‚Â' },
  { name: 'Nutricionistas', slug: 'nutricionistas', icon: 'ÃƒÂ°Ã…Â¸Ã‚Â¥Ã¢â‚¬â€' },
  { name: 'ClÃƒÆ’Ã‚Â­nicas', slug: 'clinicas', icon: 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â¥' },
  { name: 'EstÃƒÆ’Ã‚Â©tica', slug: 'estetica', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã¢â‚¬Â ' },
  { name: 'PsicÃƒÆ’Ã‚Â³logos', slug: 'psicologos', icon: 'ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â ' },
  { name: 'Advogados', slug: 'advogados', icon: 'ÃƒÂ¢Ã…Â¡Ã¢â‚¬â€œÃƒÂ¯Ã‚Â¸Ã‚Â' },
  { name: 'Contadores', slug: 'contadores', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â ' },
  { name: 'ImobiliÃƒÆ’Ã‚Â¡rias', slug: 'imobiliarias', icon: 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â ' },
  { name: 'Restaurantes', slug: 'restaurantes', icon: 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â½ÃƒÂ¯Ã‚Â¸Ã‚Â' },
  { name: 'HotÃƒÆ’Ã‚Â©is', slug: 'hoteis', icon: 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â¨' },
  { name: 'Academias', slug: 'academias', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Âª' },
  { name: 'SalÃƒÆ’Ã‚Âµes', slug: 'saloes', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã¢â‚¬Â¡' },
  { name: 'Barbearias', slug: 'barbearias', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‹â€ ' },
  { name: 'FotÃƒÆ’Ã‚Â³grafos', slug: 'fotografos', icon: '' },
  { name: 'Arquitetos', slug: 'arquitetos', icon: 'ÃƒÂ¯Ã‚Â¸Ã‚Â' },
  { name: 'Engenheiros', slug: 'engenheiros', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â§' },
  { name: 'Prestadores de ServiÃƒÆ’Ã‚Â§os', slug: 'prestadores', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â' },
  { name: 'ComÃƒÆ’Ã‚Â©rcio', slug: 'comercio', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂºÃ¢â‚¬â„¢' },
  { name: 'Empresas', slug: 'empresas', icon: 'ÃƒÂ°Ã…Â¸Ã‚ÂÃ‚Â¢' },
  { name: 'EducaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o', slug: 'educacao', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã…Â¡' },
  { name: 'Eventos', slug: 'eventos', icon: 'ÃƒÂ°Ã…Â¸Ã…Â½Ã¢â‚¬Â°' },
  { name: 'Outros', slug: 'outros', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦' }
];

async function seed() {
  console.log('ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â± Criando categorias iniciais...');
  for (const cat of categories) {
    await prisma.websiteCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    });
  }
  console.log('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ ' + categories.length + ' categorias criadas!');
  await prisma.\$disconnect();
}

seed().catch(console.error);
