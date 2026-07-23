export const COMPANY_UPDATED_EVENT = 'onetto:company-updated';

export function notifyCompanyUpdated() {
  window.dispatchEvent(new Event(COMPANY_UPDATED_EVENT));
}
