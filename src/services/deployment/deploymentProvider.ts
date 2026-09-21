export interface DeploymentInput {
  projectName: string;
  html: string;
  target?: 'production' | 'preview';
  metadata?: Record<string, string>;
}

export interface DeploymentResult {
  provider: string;
  deploymentId: string;
  url: string;
  state: string;
  verified: boolean;
}

export interface DeploymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  deploy(input: DeploymentInput): Promise<DeploymentResult>;
}

export function slugifyDeploymentName(value: string): string {
  return (value || 'rb-factory-site')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) || 'rb-factory-site';
}
