export type User = {
  sub: string,
  email: string,
  iat: number,
  exp: number,
  id: string,
  firstname: string,
  lastname: string,
  role: string,
  lastConnectedCompanyId?: string
}

export interface ExtendedRequest extends Response {
  user?: User
}