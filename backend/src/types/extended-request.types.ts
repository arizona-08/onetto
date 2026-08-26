export type User = {
  sub: string,
  email: string,
  iat: number,
  exp: number,
  id: string,
  firstname: string,
  lastname: string,
  accountType: string,
  subscriptionPlan: string | null,
  lastConnectedCompanyId?: string
}

export interface ExtendedRequest extends Response {
  user?: User
}