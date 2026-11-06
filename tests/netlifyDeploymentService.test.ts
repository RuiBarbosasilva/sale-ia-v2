const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: mockAxios,
}));

jest.mock('dns/promises', () => ({
  lookup: jest.fn(),
}));

import { lookup } from 'dns/promises';
import { netlifyDeploymentService } from '../src/services/website/netlifyDeploymentService';

const mockLookup = lookup as jest.Mock;

function configureNetlifyMocks() {
  mockAxios.get.mockImplementation(async (url: string) => {
    if (url === 'https://api.netlify.com/api/v1/sites') return { data: [] };
    if (url === 'https://cdn.example.com/photo.png') {
      return {
        data: Buffer.from('image-bytes'),
        headers: { 'content-type': 'image/png' },
        status: 200,
      };
    }
    if (url === 'https://api.netlify.com/api/v1/deploys/deploy-1') {
      return { data: { id: 'deploy-1', state: 'ready', deploy_url: 'https://deploy.example.netlify.app' } };
    }
    if (url === 'https://deploy.example.netlify.app') return { status: 200, data: 'ok' };
    throw new Error('Unexpected GET: ' + url);
  });
  mockAxios.post.mockImplementation(async (url: string) => {
    if (url === 'https://api.netlify.com/api/v1/sites') {
      return { data: { id: 'site-1', name: 'rb-empresa-12345678', url: 'https://empresa.netlify.app' } };
    }
    if (url === 'https://api.netlify.com/api/v1/sites/site-1/deploys') {
      return { data: { id: 'deploy-1', state: 'building' } };
    }
    throw new Error('Unexpected POST: ' + url);
  });
}

describe('netlifyDeploymentService asset security', () => {
  const originalToken = process.env.NETLIFY_AUTH_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NETLIFY_AUTH_TOKEN = 'test-netlify-token';
    mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    configureNetlifyMocks();
  });

  afterAll(() => {
    if (originalToken === undefined) delete process.env.NETLIFY_AUTH_TOKEN;
    else process.env.NETLIFY_AUTH_TOKEN = originalToken;
  });

  it('downloads only HTTPS public image assets and disables redirects', async () => {
    const result = await netlifyDeploymentService.deployStaticSite({
      projectId: '12345678-project',
      companyName: 'Empresa',
      html: '<html><img src="https://cdn.example.com/photo.png"></html>',
      assets: [{ sourceUrl: 'https://cdn.example.com/photo.png' }],
    });

    const assetRequest = mockAxios.get.mock.calls.find(([url]) => url === 'https://cdn.example.com/photo.png');
    expect(assetRequest).toBeDefined();
    expect(assetRequest?.[1]).toEqual(expect.objectContaining({
      responseType: 'arraybuffer',
      maxRedirects: 0,
    }));
    expect(result.publicUrl).toBe('https://deploy.example.netlify.app');
    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.netlify.com/api/v1/sites/site-1/deploys',
      expect.any(Buffer),
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/zip' }) }),
    );
  });

  it('does not request HTTP or private-network asset URLs', async () => {
    mockLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

    await netlifyDeploymentService.deployStaticSite({
      projectId: '87654321-project',
      companyName: 'Empresa',
      html: '<html><img src="http://cdn.example.com/a.png"><img src="https://internal.example/a.png"></html>',
      assets: [
        { sourceUrl: 'http://cdn.example.com/a.png' },
        { sourceUrl: 'https://internal.example/a.png' },
      ],
    });

    expect(mockAxios.get).not.toHaveBeenCalledWith(
      'http://cdn.example.com/a.png',
      expect.anything(),
    );
    expect(mockAxios.get).not.toHaveBeenCalledWith(
      'https://internal.example/a.png',
      expect.anything(),
    );
  });


  it.each([
    ['IPv4 documentation network', '192.0.2.10'],
    ['IPv4 TEST-NET-2 network', '198.51.100.20'],
    ['IPv4 TEST-NET-3 network', '203.0.113.7'],
    ['IPv6 unique-local network', 'fd12::1'],
    ['IPv6 documentation network', '2001:db8::1'],
  ])('rejects %s returned by DNS', async (_label, address) => {
    mockLookup.mockResolvedValue([{ address, family: address.includes(':') ? 6 : 4 }]);

    await netlifyDeploymentService.deployStaticSite({
      projectId: 'reserved-range-test',
      companyName: 'Empresa',
      html: '<html><img src="https://cdn.example.com/photo.png"></html>',
      assets: [{ sourceUrl: 'https://cdn.example.com/photo.png' }],
    });

    expect(mockAxios.get).not.toHaveBeenCalledWith(
      'https://cdn.example.com/photo.png',
      expect.anything(),
    );
  });

  it('does not package a response whose content type is not an image', async () => {
    mockAxios.get.mockImplementation(async (url: string) => {
      if (url === 'https://api.netlify.com/api/v1/sites') return { data: [] };
      if (url === 'https://cdn.example.com/photo.png') {
        return { data: Buffer.from('<html>not an image</html>'), headers: { 'content-type': 'text/html' } };
      }
      if (url === 'https://api.netlify.com/api/v1/deploys/deploy-1') {
        return { data: { id: 'deploy-1', state: 'ready', deploy_url: 'https://deploy.example.netlify.app' } };
      }
      if (url === 'https://deploy.example.netlify.app') return { status: 200, data: 'ok' };
      throw new Error('Unexpected GET: ' + url);
    });

    const result = await netlifyDeploymentService.deployStaticSite({
      projectId: 'abc12345-project',
      companyName: 'Empresa',
      html: '<html><img src="https://cdn.example.com/photo.png"></html>',
      assets: [{ sourceUrl: 'https://cdn.example.com/photo.png' }],
    });

    expect(result.state).toBe('ready');
    const deployCall = mockAxios.post.mock.calls.find(([url]) =>
      url === 'https://api.netlify.com/api/v1/sites/site-1/deploys'
    );
    expect(deployCall?.[1]).toBeInstanceOf(Buffer);
  });
});
