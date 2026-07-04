export type User = {
  sub: string,
  email: string,
  iat: number,
  exp: number,
  id: string,
  firstname: string,
  lastname: string,
  role: string
}

export interface ExtendedResponse extends Response {
  user?: User
}