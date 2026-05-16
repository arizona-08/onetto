export type Client = {
  id: string;
  name: string;
  email: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export type Service = {
  id: string
  name: string
  description?: string
  unitPrice: number
  unit: string
  taxRate: number
  category: string
}

export type ServiceLineItem = {
  description: string
  quantity: number
  taxRate: number
  unitPrice: number
  unit: string
}