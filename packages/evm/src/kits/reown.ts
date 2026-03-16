export type ReownConfig = {
  projectId: string;
  ssr?: boolean;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
};
