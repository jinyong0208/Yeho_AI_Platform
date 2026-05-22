import { apiClient, unwrap } from './client';

export type Wallet = {
  tenantId: string;
  balanceCredits: number;
  frozenCredits: number;
  totalRechargeCredits: number;
  totalUsedCredits: number;
  updatedAt: string;
};

export type WalletLog = {
  id: string;
  tenantId: string;
  bizType: string;
  bizId?: string | null;
  direction: string;
  amountCredits: number;
  balanceAfter: number;
  remark?: string | null;
  createdAt: string;
};

export type RechargeOrder = {
  id: string;
  tenantId: string;
  orderNo: string;
  amountCny: number;
  credits: number;
  status: string;
  payChannel: string;
  paidAt?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RechargeOrderCreateRequest = {
  tenantId: string;
  amountCny: number;
  credits: number;
  payChannel: string;
  remark?: string;
};

export const billingApi = {
  wallet: async (tenantId: string) => unwrap<Wallet>(await apiClient.get(`/wallets/${tenantId}`)),
  rechargeWallet: async (tenantId: string, payload: { amountCredits: number; remark?: string }) =>
    unwrap<Wallet>(await apiClient.post(`/wallets/${tenantId}/recharge`, payload)),
  walletLogs: async (tenantId: string, limit = 50) =>
    unwrap<WalletLog[]>(await apiClient.get(`/wallets/${tenantId}/logs`, { params: { limit } })),
  rechargeOrders: async (tenantId?: string | null, limit = 50) =>
    unwrap<RechargeOrder[]>(
      await apiClient.get('/recharge-orders', {
        params: {
          tenantId: tenantId || undefined,
          limit,
        },
      }),
    ),
  createRechargeOrder: async (payload: RechargeOrderCreateRequest) =>
    unwrap<RechargeOrder>(await apiClient.post('/recharge-orders', payload)),
  confirmRechargeOrder: async (id: string) => unwrap<RechargeOrder>(await apiClient.post(`/recharge-orders/${id}/confirm`)),
};
