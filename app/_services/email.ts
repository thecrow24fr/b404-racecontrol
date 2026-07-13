import type { SendEmailParams, SendEmailResult } from "./email-types";
import { emailConfig } from "./email-config";

/**
 * Service d'envoi d'email.
 *
 * MODE DEBUG (actuel) :
 *   - Logge les donnees de l'email dans la console
 *   - Simule un delai de 1.2s
 *   - Comportement identique a l'ancien setTimeout
 *
 * MODE SMTP OVH (futur, dans b404-site) :
 *   - Remplacer le contenu de cette fonction par l'appel SMTP
 *   - Basculer emailConfig.debug = false
 *   - Ajouter les variables d'environnement SMTP
 *
 * @param params - Paramètres de l'email (from, to, subject, html, replyTo)
 * @returns Résultat de l'envoi
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  if (emailConfig.debug) {
    console.log("═══════════════════════════════════════");
    console.log("  B404 RACECONTROL — ENVOI D'EMAIL (debug)");
    console.log("═══════════════════════════════════════");
    console.log(`  From:    ${params.from}`);
    console.log(`  To:      ${params.to}`);
    console.log(`  Subject: ${params.subject}`);
    console.log(`  ReplyTo: ${params.replyTo || "(non renseigné)"}`);
    console.log(`  HTML:    ${params.html.length} caractères`);
    console.log("═══════════════════════════════════════");
    console.log(`  Contenu HTML :`);
    console.log(params.html.slice(0, 500) + "...");
    console.log("═══════════════════════════════════════");
  }

  // Simuler le temps d'envoi (1.2s)
  // Remplacer par l'appel SMTP reel lors du deploiement
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return { success: true, messageId: `debug-${Date.now()}` };
}
