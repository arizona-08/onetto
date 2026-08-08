export type DocumentDateError = {
  dueDate?: string[]
}

export type DocumentClientError = {
  name?: string[];
  email?: string[];
  address?: string[];
  city?: string[];
  postalCode?: string[];
  country?: string[];
  general?: string[];
}

export type DocumentLineItemsError = {
  general?: string[];
}
