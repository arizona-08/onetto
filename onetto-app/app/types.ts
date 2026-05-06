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
  unitPrice: number
  unit: string
}