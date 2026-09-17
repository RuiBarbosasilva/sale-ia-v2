export interface ImageProviderCandidate {
  url: string;
  width: number;
  height: number;
  author?: string;
  license?: string;
  pageUrl?: string;
  alt?: string;
  mime?: string;
}

export interface ImageProvider {
  readonly name: string;
  search(query: string): Promise<ImageProviderCandidate[]>;
}
