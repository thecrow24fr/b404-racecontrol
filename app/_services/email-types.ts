/**
 * Types partagés pour le service d'envoi d'email.
 * Utilisés par le service email (debug ou SMTP OVH).
 */

export interface SendEmailParams {
  /** Adresse de l'expéditeur (configurée dans contactRecipients) */
  from: string;
  /** Adresse du destinataire (configurée dans contactRecipients) */
  to: string;
  /** Sujet de l'email */
  subject: string;
  /** Corps HTML de l'email */
  html: string;
  /** Adresse de réponse (email saisi par l'utilisateur) */
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
