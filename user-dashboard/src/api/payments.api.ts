import { apiClient, handleApiResponse } from './base';

export interface MpesaStkPushRequest {
  phone_number: string;
  amount: number;
  account_reference?: string;
  transaction_desc?: string;
}

export interface MpesaStkPushResponse {
  checkout_request_id: string;
  merchant_request_id?: string | null;
  customer_message?: string;
  status: 'pending';
}

export interface MpesaTransactionStatus {
  id: number;
  merchant_request_id?: string | null;
  checkout_request_id: string;
  phone_number: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout';
  result_code?: string | null;
  result_desc?: string | null;
  mpesa_receipt_number?: string | null;
  transaction_date?: string | null;
  created_at: string;
  updated_at: string;
}

class PaymentsApi {
  async initiateMpesaStkPush(payload: MpesaStkPushRequest): Promise<MpesaStkPushResponse> {
    const response = await apiClient.post<MpesaStkPushResponse>('/payments/mpesa/stk-push', payload);
    return handleApiResponse(response);
  }

  async getMpesaTransactionStatus(checkoutRequestId: string): Promise<MpesaTransactionStatus> {
    const response = await apiClient.get<MpesaTransactionStatus>(`/payments/mpesa/transactions/${checkoutRequestId}`);
    return handleApiResponse(response);
  }
}

export const paymentsApi = new PaymentsApi();
