export type BenchmarkNiche = {
  slug:string; name:string; description:string; references:string[]; source:string; variants:string[];
};

const shared=[
  'Conversion-first local',
  'Premium editorial',
  'Trust & proof',
  'Bold visual',
  'Minimal luxury',
  'Mobile-first',
  'Storytelling',
  'Service-led',
  'Lead-generation',
  'Local SEO'
];

export const RB_BENCHMARK_CATALOG:BenchmarkNiche[]=[
{slug:'dentistas',name:'Dentistas',description:'Clínicas odontológicas e especialistas.',source:'Aspire Media Marketing 2026',references:['Clarkson Village Dental','Ajooni Smiles','Apollonia Dental Arts','Serenity Dental','Integrative Dentistry NJ','Pacific Signature Dental','Ridge Road Family Dentistry','Caledon Dental Care','Meadowvale Smiles','East Credit Dental'],variants:shared},
{slug:'veterinarias',name:'Veterinárias',description:'Clínicas veterinárias e hospitais pet.',source:'My Codeless Website 2026',references:['Vetster','AniCura Group','Colonial Veterinary Hospital','Guelph Cat Clinic','The Bond Between','Clínica Dr. Mauro','Animal Medical Center (AMC)','Gallatin Veterinary Hospital','Crescenta Canada Pet Hospital','Bond Vet'],variants:shared},
{slug:'advocacia',name:'Advocacia',description:'Advogados e escritórios jurídicos.',source:'SiteBuilderReport / Attorney at Law Magazine 2026',references:['Reidenbach & Associates','YLaw Group','HagEstad Law Group','Estate Planning Attorneys','Bouhan Falligant','DKM Law Group','Davis, Bethune & Jones','Pitta & Baione','Adamucci LLC','Claremont-selected legal examples'],variants:shared},
{slug:'imobiliarias',name:'Imobiliárias',description:'Imobiliárias, corretores e lançamentos.',source:'My Codeless Website / Web Design Awards 2026',references:['Developwise','360 LEX','Core NYC','Mariah Hamm','Compass','Sotheby’s International Realty','The Agency','Douglas Elliman','11 Tanjung','Navana Real Estate'],variants:shared},
{slug:'restaurantes',name:'Restaurantes',description:'Restaurantes, cafés e gastronomia.',source:'Owner / UENI / Zarla 2026',references:['Bodip’s Smokin’ Que','Zingerman’s Roadhouse','Mujo Atlanta','Downtown Bistro','Tidewater Bistro','House of Louie','Spacca Tutto','Summerland','Kira Omakase','Brasserie Boulud'],variants:shared},
{slug:'saloes',name:'Salões & Beleza',description:'Salões, barbearias e estética.',source:'Zarla / My Codeless Website 2026',references:['Strange Bird Salon','Oxana Salon','Jon Alan Salons','Blonde Faith Salon','Element Salon','Style House Salon','Avalon Salon','Salon 1800','Mane Attraction','Boutique salon examples'],variants:shared},
{slug:'fitness',name:'Fitness & Academias',description:'Academias, studios, personal trainers e yoga.',source:'My Codeless Website / SiteBuilderReport 2026',references:['Yogamaya','Kinective','Fitlab','G0180','The Akt','Planet Fitness','Jim Karas','Ulrik on Hands','Anytime Fitness','The Body Coach'],variants:shared},
{slug:'oficinas',name:'Oficinas Mecânicas',description:'Oficinas, centros automotivos e reparação.',source:'My Codeless Website / Zarla 2026',references:['Precision Auto Collision','Miller Auto Repair Shop','Barnett Auto Repair','Armstrong','Auto Care East','Ramirez and Sons Auto Service and Collision','West Coast Tire & Service','North Sydney Automotive','SWCC','Pete Kelley’s Auto Service'],variants:shared},
{slug:'construcao',name:'Construção & Serviços Residenciais',description:'Construtoras, reformas e home services.',source:'WebCitz / My Codeless Website / Hook Agency 2026',references:['Never Stop Building','Honest Renovators','Greentek Roofing & Solar','United Home Services','PreFix','Dash Maids','Eco Mama Green Clean','Blue Sky Design & Build','C&K Paving Contractors','Randolph Scott Bell'],variants:shared},
{slug:'contabilidade',name:'Contabilidade',description:'Contadores, escritórios contábeis e consultoria financeira.',source:'Zarla / CreateToday / NanoGlobals 2026',references:['Appletree Business Services','Little Fish Accounting','Crunch','Anders CPA','Orbit Accountants','Fusion Accountants','ProVision Wealth','Whitfield & Corey CPAs','Avalon Accounting','Haven'],variants:shared}
];

export const RB_DEMO_COUNT=RB_BENCHMARK_CATALOG.reduce((n,x)=>n+x.variants.length,0);
