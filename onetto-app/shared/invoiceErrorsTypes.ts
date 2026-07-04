export type InvoiceDateError = {
  creationDate?: string[],
  dueDate?: string[]
}

export type InvoiceClientError = {
  name?: string[];
  email?: string[];
  address?: string[];
  city?: string[];
  postalCode?: string[];
  country?: string[];
  general?: string[];
}