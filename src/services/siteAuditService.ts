import { websiteAuditService } from './website/websiteAuditService';

export const siteAuditService = {
  async auditWebsite(url: string) {
    return websiteAuditService.audit(url);
  }
};
