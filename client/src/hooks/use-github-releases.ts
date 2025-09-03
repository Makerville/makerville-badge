import { useState, useEffect } from 'react';

export interface GitHubAsset {
  id: number;
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: GitHubAsset[];
}

interface UseGitHubReleasesReturn {
  releases: GitHubRelease[];
  isLoading: boolean;
  error: string | null;
}

export function useGitHubReleases(owner: string, repo: string): UseGitHubReleasesReturn {
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReleases() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch releases: ${response.statusText}`);
        }
        
        const data: GitHubRelease[] = await response.json();
        setReleases(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReleases();
  }, [owner, repo]);

  return { releases, isLoading, error };
}