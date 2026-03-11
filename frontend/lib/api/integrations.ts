import { apiGet, apiPut } from './client';

export interface StripeKeys {
    stripePublicKey: string | null;
    stripeSecretKey: string | null;
}

export interface SetStripeKeysData {
    stripePublicKey: string;
    stripeSecretKey: string;
}

export const integrationsApi = {
    getStripeKeys: () => apiGet<StripeKeys>('integrations/stripe'),
    setStripeKeys: (data: SetStripeKeysData) =>
        apiPut<{ message: string }>('integrations/stripe', data),
};
