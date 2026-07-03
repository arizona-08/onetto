export interface ExtendedResponse extends Response {
  user?: {
    id: string;
    email: string;
    role: string;
    firstname: string;
    lastname: string;
  }
}