export interface WebhookHandlerInterface {
  handleWebhook(webhook: any): Promise<void>;
  isRelevantAction(action: string): boolean;
}