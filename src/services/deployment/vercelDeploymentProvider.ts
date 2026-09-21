import axios from 'axios';
import { DeploymentInput, DeploymentProvider, DeploymentResult, slugifyDeploymentName } from './deploymentProvider';

const VERCEL_API = 'https://api.vercel.com';
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

export class VercelDeploymentProvider implements DeploymentProvider {
  readonly name = 'VERCEL';

  isConfigured(): boolean {
    return Boolean(process.env.VERCEL_TOKEN);
  }

  private headers() {
    const token = process.env.VERCEL_TOKEN;
    if (!token) throw new Error('VERCEL_TOKEN_NOT_CONFIGURED');
    return {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    };
  }

  async deploy(input: DeploymentInput): Promise<DeploymentResult> {
    if (!this.isConfigured()) throw new Error('VERCEL_TOKEN_NOT_CONFIGURED');

    const name = slugifyDeploymentName(input.projectName);
    const body = {
      name,
      target: input.target || 'production',
      files: [
        { file: 'index.html', data: input.html, encoding: 'utf-8' }
      ],
      projectSettings: {
        buildCommand: null,
        devCommand: null,
        framework: null,
        installCommand: null,
        outputDirectory: null
      },
      meta: input.metadata || {}
    };

    const create = await axios.post(
      VERCEL_API + '/v13/deployments?forceNew=1&skipAutoDetectionConfirmation=1',
      body,
      { headers: this.headers(), timeout: 30000 }
    );

    const deploymentId = String(create.data?.id || create.data?.uid || '');
    if (!deploymentId) throw new Error('VERCEL_DEPLOYMENT_ID_MISSING');

    let deployment: any = create.data;

    for (let i = 0; i < MAX_POLLS; i++) {
      const state = String(
        deployment?.readyState || deployment?.state || deployment?.status || ''
      ).toUpperCase();

      if (state === 'READY') break;

      if (['ERROR', 'CANCELED', 'CANCELLED'].includes(state)) {
        const detail = deployment?.error?.message || deployment?.error?.code || state;
        throw new Error('VERCEL_DEPLOYMENT_FAILED:' + detail);
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

      const check = await axios.get(
        VERCEL_API + '/v13/deployments/' + encodeURIComponent(deploymentId),
        { headers: this.headers(), timeout: 15000 }
      );
      deployment = check.data;
    }

    const finalState = String(
      deployment?.readyState || deployment?.state || deployment?.status || ''
    ).toUpperCase();

    if (finalState !== 'READY') {
      throw new Error('VERCEL_DEPLOYMENT_TIMEOUT:' + finalState);
    }

    const rawUrl = String(deployment?.url || '');
    if (!rawUrl) throw new Error('VERCEL_DEPLOYMENT_URL_MISSING');
    const url = rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl;

    let verified = false;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          maxRedirects: 5,
          validateStatus: status => status >= 200 && status < 400
        });
        if (response.status >= 200 && response.status < 400) {
          verified = true;
          break;
        }
      } catch {
        // A READY deployment can take a few seconds to become reachable at the edge.
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!verified) throw new Error('VERCEL_URL_VERIFICATION_FAILED');

    return {
      provider: this.name,
      deploymentId,
      url,
      state: finalState,
      verified
    };
  }
}

export const vercelDeploymentProvider = new VercelDeploymentProvider();
