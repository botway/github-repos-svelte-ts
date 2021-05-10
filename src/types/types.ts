export interface Owner {
  login: string;
  avatar_url: string;
  url: string;
  html_url: string;
  id: number;
}

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  url: string;
  owner: Owner;
}

export interface RepoDetails extends Repo {
  created_at: string;
  updated_at: string;
  stargazers_count: number;
}

export interface SearchResults {
  incomplete_results: boolean;
  items: RepoDetails[];
  total_count: number;
}
