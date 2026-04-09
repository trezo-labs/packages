import { Metadata } from "@reown/appkit";

export type ReownConfigType = {
  projectId: string;
  metadata: Metadata;
  ssr?: boolean;
  features?: {
    analytics?: boolean;
  };
};
