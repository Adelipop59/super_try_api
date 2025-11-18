/**
 * Interface commune pour tous les providers de notification
 */
export interface INotificationProvider {
  /**
   * Envoyer une notification
   */
  send(
    to: string,
    title: string,
    message: string,
    data?: any,
  ): Promise<boolean>;
}
