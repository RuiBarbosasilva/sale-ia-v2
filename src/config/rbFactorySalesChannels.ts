export const RB_FACTORY_SALES_CHANNELS = {
  owner: {
    whatsapp: String(process.env.RB_FACTORY_OWNER_WHATSAPP || '').replace(/\D/g, ''),
    email: String(process.env.RB_FACTORY_OWNER_EMAIL || '').trim().toLowerCase(),
  },
  whatsapp: {
    provider: String(process.env.RB_FACTORY_WHATSAPP_PROVIDER || 'evolution').trim().toLowerCase(),
    instance: String(process.env.EVOLUTION_INSTANCE || process.env.WHATSAPP_INSTANCE_NAME || '').trim(),
    apiUrl: String(process.env.EVOLUTION_API_URL || process.env.WHATSAPP_API_URL || '').trim(),
    configured: Boolean(
      process.env.EVOLUTION_API_KEY &&
      (process.env.EVOLUTION_API_URL || process.env.WHATSAPP_API_URL) &&
      (process.env.EVOLUTION_INSTANCE || process.env.WHATSAPP_INSTANCE_NAME)
    ),
    outreachAuthorized: process.env.RB_FACTORY_WHATSAPP_OUTREACH_AUTHORIZED === 'true',
    autoSend: process.env.RB_FACTORY_WHATSAPP_AUTOSEND === 'true',
  },
  email: {
    provider: String(process.env.RB_FACTORY_EMAIL_PROVIDER || 'gmail').trim().toLowerCase(),
    sender: String(process.env.RB_FACTORY_EMAIL_SENDER || '').trim().toLowerCase(),
    autoSend: process.env.RB_FACTORY_EMAIL_AUTOSEND === 'true',
    oauthConfigured: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
    ),
  },
} as const;

export function rbFactorySalesChannelsStatus() {
  return {
    owner: {
      whatsappConfigured: RB_FACTORY_SALES_CHANNELS.owner.whatsapp.length >= 10,
      emailConfigured: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(RB_FACTORY_SALES_CHANNELS.owner.email),
    },
    whatsapp: {
      provider: RB_FACTORY_SALES_CHANNELS.whatsapp.provider,
      instanceConfigured: Boolean(RB_FACTORY_SALES_CHANNELS.whatsapp.instance),
      apiConfigured: RB_FACTORY_SALES_CHANNELS.whatsapp.configured,
      outreachAuthorized: RB_FACTORY_SALES_CHANNELS.whatsapp.outreachAuthorized,
      autoSend: RB_FACTORY_SALES_CHANNELS.whatsapp.autoSend,
    },
    email: {
      provider: RB_FACTORY_SALES_CHANNELS.email.provider,
      senderConfigured: Boolean(RB_FACTORY_SALES_CHANNELS.email.sender),
      oauthConfigured: RB_FACTORY_SALES_CHANNELS.email.oauthConfigured,
      autoSend: RB_FACTORY_SALES_CHANNELS.email.autoSend,
    },
  };
}
