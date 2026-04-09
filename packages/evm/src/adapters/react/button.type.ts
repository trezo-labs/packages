export type CommonButtonRenderProps = {
  isConnected: boolean;
  isConnecting?: boolean;
  address?: string;
  truncatedAddress?: string;
  ensName?: string | null;
  ensAvatar?: string;
  chainId?: number | string;
  open: (options?: any) => Promise<any> | void;
  close: () => void;
};
