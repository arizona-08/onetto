type BridgeTransaction = {
  amount: number;
  currency: string;
  beneficiary?: {
    iban: string;
    company_name: string;
    email: string;
  },
  client_reference: string;
  execution_date: string;
}


export type BridgeCreatePaymentLinkInput = {
  user : {
    company_name: string;
    email: string;
    external_reference: string; // l'id de l'utilisateur connecté
  },
  expired_date: string;
  client_reference: string;
  transactions: BridgeTransaction[];
  callback_url: string;
}
