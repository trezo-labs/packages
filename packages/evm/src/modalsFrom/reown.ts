import { Metadata } from "@reown/appkit";

export type ReownConfigType = {
  projectId: string;
  metadata: Metadata;
  ssr?: boolean;
  features?: {
    analytics?: boolean; // Optional - defaults to your Cloud configuration
  };
};
