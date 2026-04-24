export type SendNotificationInput = {
  title: string;
  desp: string;
  short?: string;
  tags?: string;
};

export interface Notifier {
  send(input: SendNotificationInput): Promise<void>;
}
