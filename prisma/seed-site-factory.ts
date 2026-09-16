import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Dentistas', slug: 'dentistas', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â¦Ãƒâ€šÃ‚Â·' },
  { name: 'MÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©dicos', slug: 'medicos', icon: 'ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â' },
  { name: 'Nutricionistas', slug: 'nutricionistas', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â¥ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â' },
  { name: 'ClÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­nicas', slug: 'clinicas', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â¥' },
  { name: 'EstÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©tica', slug: 'estetica', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ' },
  { name: 'PsicÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³logos', slug: 'psicologos', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â§Ãƒâ€šÃ‚Â ' },
  { name: 'Advogados', slug: 'advogados', icon: 'ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â' },
  { name: 'Contadores', slug: 'contadores', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€¦Ã‚Â ' },
  { name: 'ImobiliÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡rias', slug: 'imobiliarias', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â ' },
  { name: 'Restaurantes', slug: 'restaurantes', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â½ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â' },
  { name: 'HotÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©is', slug: 'hoteis', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â¨' },
  { name: 'Academias', slug: 'academias', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€šÃ‚Âª' },
  { name: 'SalÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes', slug: 'saloes', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡' },
  { name: 'Barbearias', slug: 'barbearias', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢Ãƒâ€¹Ã¢â‚¬Â ' },
  { name: 'FotÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³grafos', slug: 'fotografos', icon: '' },
  { name: 'Arquitetos', slug: 'arquitetos', icon: 'ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â' },
  { name: 'Engenheiros', slug: 'engenheiros', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â§' },
  { name: 'Prestadores de ServiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§os', slug: 'prestadores', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â' },
  { name: 'ComÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©rcio', slug: 'comercio', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢' },
  { name: 'Empresas', slug: 'empresas', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚ÂÃƒâ€šÃ‚Â¢' },
  { name: 'EducaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o', slug: 'educacao', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€¦Ã‚Â¡' },
  { name: 'Eventos', slug: 'eventos', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã‚Â½ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°' },
  { name: 'Outros', slug: 'outros', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â¦' }
];

async function seed() {
  console.log('ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢Ãƒâ€šÃ‚Â± Criando categorias iniciais...');
  for (const cat of categories) {
    await prisma.websiteCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    });
  }
  console.log('ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ ' + categories.length + ' categorias criadas!');
  await prisma.\$disconnect();
}

seed().catch(console.error);
