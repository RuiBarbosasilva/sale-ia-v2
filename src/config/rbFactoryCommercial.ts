export type RbFactoryPlanCode = 'START' | 'PRO' | 'PREMIUM';

export interface RbFactoryCommercialPlan {
  code: RbFactoryPlanCode;
  name: string;
  projectPrice: number;
  monthlyPrice: number;
  position: number;
  role: 'ENTRY' | 'PRIMARY' | 'UPGRADE';
  highlighted: boolean;
  description: string;
}

export interface RbFactoryLaunchOffer {
  enabled: boolean;
  planCode: RbFactoryPlanCode;
  projectPrice: number;
  monthlyPrice: number;
  label: string;
  description: string;
}

export const RB_FACTORY_COMMERCIAL = {
  brand: 'RB Factory Sites',

  presentation: {
    initialOffer: 'PRO' as RbFactoryPlanCode,
    comparisonPlans: ['START', 'PRO', 'PREMIUM'] as RbFactoryPlanCode[],
    primaryPlan: 'PRO' as RbFactoryPlanCode,
    fallbackPlan: 'START' as RbFactoryPlanCode,
    upgradePlan: 'PREMIUM' as RbFactoryPlanCode,
  },

  payment: {
    project: '50% na aprovação + 50% na publicação',
    monthly: 'A mensalidade começa somente após a publicação do site',
  },

  plans: [
    {
      code: 'START',
      name: 'SITE START',
      projectPrice: 1490,
      monthlyPrice: 149,
      position: 1,
      role: 'ENTRY',
      highlighted: false,
      description:
        'Presença profissional na internet para pequenos negócios.',
    },
    {
      code: 'PRO',
      name: 'SITE PRO',
      projectPrice: 2490,
      monthlyPrice: 249,
      position: 2,
      role: 'PRIMARY',
      highlighted: true,
      description:
        'Site profissional estruturado para apresentação, vendas e geração de contatos.',
    },
    {
      code: 'PREMIUM',
      name: 'SITE PREMIUM',
      projectPrice: 3990,
      monthlyPrice: 399,
      position: 3,
      role: 'UPGRADE',
      highlighted: false,
      description:
        'Presença digital completa com maior personalização, SEO e conversão.',
    },
  ] satisfies RbFactoryCommercialPlan[],

  launchOffer: {
    enabled: true,
    planCode: 'PRO',
    projectPrice: 1990,
    monthlyPrice: 249,
    label: 'OFERTA DE LANÇAMENTO',
    description:
      'Condição especial para projetos selecionados durante o lançamento da RB Factory Sites.',
  } satisfies RbFactoryLaunchOffer,

  whatsapp: {
    initialMessage:
      'Olá! Analisei a presença digital da sua empresa e preparei uma proposta de site profissional. Posso te mostrar rapidamente como podemos melhorar sua presença online e facilitar o contato de novos clientes?',

    primaryOffer:
      'Nossa principal solução é o SITE PRO, desenvolvido para transformar o site em uma ferramenta profissional de apresentação e geração de contatos.',

    comparisonIntro:
      'Também temos três níveis de projeto para adaptar a solução ao momento e às necessidades da empresa.',

    launchOffer:
      'Para alguns projetos selecionados, estamos trabalhando com uma condição especial de lançamento no SITE PRO.',
  },
} as const;

export function getCommercialPlan(
  code: RbFactoryPlanCode,
): RbFactoryCommercialPlan {
  const plan = RB_FACTORY_COMMERCIAL.plans.find(
    (item) => item.code === code,
  );

  if (!plan) {
    throw new Error(`RB_FACTORY_PLAN_NOT_FOUND:${code}`);
  }

  return plan;
}

export function getInitialCommercialPlan(): RbFactoryCommercialPlan {
  return getCommercialPlan(RB_FACTORY_COMMERCIAL.presentation.initialOffer);
}

export function getLaunchOffer(): RbFactoryLaunchOffer | null {
  return RB_FACTORY_COMMERCIAL.launchOffer.enabled
    ? RB_FACTORY_COMMERCIAL.launchOffer
    : null;
}
