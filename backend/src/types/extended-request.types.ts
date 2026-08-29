export type User = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
  id: string;
  firstname: string;
  lastname: string;
  accountType: string;
  subscriptionPlan: string | null;
  lastConnectedCompanyId?: string;
};

export interface ExtendedRequest extends Response {
  user?: User;
}

export const REMINDER_RULES = {
  ESTIMATE_PENDING: 3,
  ESTIMATE_PENDING_BEFORE_DUE_DATE: 3,

  INVOICE_BEFORE_DUE_DATE: 3,

  INVOICE_OVERDUE_FIRST: 1,
  INVOICE_OVERDUE_SECOND: 7,

  INSTALMENT_MANDATE_AFTER_ISSUE: 3,
  INSTALMENT_MANDATE_BEFORE_AUTHORIZATION_DEADLINE: 3,
  INSTALMENT_AUTHORIZATION_LEAD_DAYS: 5,
};
