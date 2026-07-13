/**
 * Configuration SMTP pour l'envoi des emails.
 *
 * Actuellement en mode debug : les emails sont logs dans la console.
 * Lors du deploiement sur b404-site avec SMTP OVH :
 *   1. Creer un fichier .env.local avec les variables ci-dessous
 *   2. Remplacer le contenu de email.ts par la version SMTP OVH
 *   3. Decommenter l'appel a sendEmail() dans contact-form.tsx
 *
 * Variables d'environnement attendues par la version SMTP OVH :
 *   SMTP_HOST=smtp.ovh.net
 *   SMTP_PORT=465
 *   SMTP_USER=contact@b404ldc.fr
 *   SMTP_PASS=xxxxxxxx
 *   SMTP_FROM=B404 RaceControl <noreply@b404ldc.fr>
 */

export const emailConfig = {
  /** Mode debug : true = log console, false = envoi SMTP OVH */
  debug: true,
} as const;
