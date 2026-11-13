/**
 * Configuration du service d'envoi d'email.
 *
 * Cette API est le service technique commun a tous les projets B404.
 * Hebergee sur le sous-domaine RaceControl (racecontrol.b404ldc.fr).
 * Utilisee par b404-racecontrol et b404-site.
 *
 * MODE DEBUG (par defaut) :
 *   - Aucun appel reseau : les emails sont logs dans la console
 *   - Delai simule de 1.2s
 *   - Utilise en developpement local
 *
 * MODE PRODUCTION :
 *   1. Basculer debug = false
 *   2. Copier api/email.php dans /api/email.php du sous-domaine
 *      racecontrol.b404ldc.fr
 *   3. Aucune autre modification necessaire
 */

export const emailConfig = {
  /** Mode debug : true = log console, false = envoi via API PHP */
  debug: false,

  /** URL de l'API PHP d'envoi d'email (uniquement si debug = false) */
  apiUrl: "https://racecontrol.b404ldc.fr/api/email.php",
} as const;
