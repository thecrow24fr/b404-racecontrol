import type { SendEmailParams, SendEmailResult } from "./email-types";
import { emailConfig } from "./email-config";

/**
 * Service d'envoi d'email.
 *
 * MODE DEBUG (emailConfig.debug = true) :
 *   - Logge les donnees de l'email dans la console
 *   - Simule un delai de 1.2s
 *   - Comportement identique a l'ancien setTimeout
 *
 * MODE PRODUCTION (emailConfig.debug = false) :
 *   - Envoie les donnees a l'API PHP hebergee sur OVH
 *   - L'API utilise mail() pour expedier l'email
 *   - L'URL est configuree dans emailConfig.apiUrl
 *
 * @param params - Paramètres de l'email (from, to, subject, html, replyTo)
 * @returns Résultat de l'envoi
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  // --- MODE DEBUG ---
  if (emailConfig.debug) {
    console.log("═══════════════════════════════════════");
    console.log("  B404 RACECONTROL — ENVOI D'EMAIL (debug)");
    console.log("═══════════════════════════════════════");
    console.log(`  From:    ${params.from}`);
    console.log(`  To:      ${params.to}`);
    console.log(`  Subject: ${params.subject}`);
    console.log(`  ReplyTo: ${params.replyTo || "(non renseigné)"}`);
    console.log(`  HTML:    ${params.html.length} caracteres`);
    console.log("═══════════════════════════════════════");
    console.log(`  Contenu HTML :`);
    console.log(params.html.slice(0, 500) + "...");
    console.log("═══════════════════════════════════════");

    await new Promise((resolve) => setTimeout(resolve, 1200));

    return { success: true, messageId: `debug-${Date.now()}` };
  }

  // --- MODE PRODUCTION ---
  try {
    const response = await fetch(emailConfig.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo || "",
      }),
    });

    const result: SendEmailResult = await response.json();

    if (!response.ok || !result.success) {
      console.error(
        "[EMAIL] Echec de l'envoi via API PHP:",
        result.error || `HTTP ${response.status}`
      );
      return {
        success: false,
        error: result.error || "Erreur lors de l'envoi",
      };
    }

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[EMAIL] Erreur reseau lors de l'appel API:", message);
    return {
      success: false,
      error: "Impossible de contacter le serveur d'envoi.",
    };
  }
}
