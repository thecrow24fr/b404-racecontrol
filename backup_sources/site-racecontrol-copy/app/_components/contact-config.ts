import type {
  ContactCategoryConfig,
  ContactFormData,
  ContactRecipientConfig,
} from "../_types/contact";

/**
 * Configuration centralisée des catégories de contact.
 * Chaque catégorie définit ses propres champs de formulaire.
 * Facilement extensible : il suffit d'ajouter un objet.
 */
export const contactCategories: ContactCategoryConfig[] = [
  {
    id: "recrutement",
    icon: "\uD83D\uDC64",
    label: "Recrutement",
    description: "Postuler pour rejoindre la team B404",
    fields: [
      {
        name: "nom",
        type: "text",
        label: "Nom",
        placeholder: "Votre nom",
        required: true,
      },
      {
        name: "prenom",
        type: "text",
        label: "Pr\u00e9nom",
        placeholder: "Votre pr\u00e9nom",
        required: true,
      },
      {
        name: "email",
        type: "email",
        label: "Adresse email",
        placeholder: "votre@email.fr",
        required: true,
      },
      {
        name: "age",
        type: "text",
        label: "\u00c2ge",
        placeholder: "Votre \u00e2ge",
        required: false,
      },
      {
        name: "discord",
        type: "text",
        label: "Discord",
        placeholder: "Votre pseudo Discord (ex: user#1234)",
        required: true,
      },
      {
        name: "steam",
        type: "text",
        label: "Steam (facultatif)",
        placeholder: "Votre profil Steam",
        required: false,
      },
      {
        name: "simulateur",
        type: "select",
        label: "Simulateur principal",
        placeholder: "S\u00e9lectionnez votre simulateur",
        required: true,
        options: [
          "rFactor 2",
          "iRacing",
          "Assetto Corsa Competizione",
          "Assetto Corsa",
          "RaceRoom",
          "Automobilista 2",
          "Le Mans Ultimate",
          "F1 24",
          "Autre",
        ],
      },
      {
        name: "niveau",
        type: "select",
        label: "Niveau / Exp\u00e9rience",
        placeholder: "S\u00e9lectionnez votre niveau",
        required: true,
        options: [
          "D\u00e9butant",
          "Interm\u00e9diaire",
          "Avanc\u00e9",
          "Comp\u00e9titeur",
          "Professionnel",
        ],
      },
      {
        name: "disponibilites",
        type: "text",
        label: "Disponibilit\u00e9s",
        placeholder: "Soir, week-end, cr\u00e9neaux...",
        required: true,
      },
      {
        name: "motivation",
        type: "textarea",
        label: "Motivation",
        placeholder: "Parlez-nous de votre parcours, vos objectifs...",
        required: true,
      },
      {
        name: "rgpd",
        type: "checkbox",
        label: "J\u2019accepte que mes donn\u00e9es soient trait\u00e9es dans le cadre de ma candidature",
        placeholder: "",
        required: true,
      },
    ],
  },
  {
    id: "contact-general",
    icon: "\uD83D\uDCE9",
    label: "Contact g\u00e9n\u00e9ral",
    description: "Une question ou une demande d\u2019information",
    fields: [
      {
        name: "nom",
        type: "text",
        label: "Nom",
        placeholder: "Votre nom",
        required: true,
      },
      {
        name: "email",
        type: "email",
        label: "Adresse email",
        placeholder: "votre@email.fr",
        required: true,
      },
      {
        name: "sujet",
        type: "text",
        label: "Sujet",
        placeholder: "Objet de votre message",
        required: true,
      },
      {
        name: "message",
        type: "textarea",
        label: "Message",
        placeholder: "Votre message...",
        required: true,
      },
      {
        name: "rgpd",
        type: "checkbox",
        label: "J\u2019accepte que mes donn\u00e9es soient trait\u00e9es pour r\u00e9pondre \u00e0 ma demande",
        placeholder: "",
        required: true,
      },
    ],
  },
  {
    id: "partenariat",
    icon: "\uD83E\uDD1D",
    label: "Partenariat",
    description: "Proposer une collaboration avec B404",
    fields: [
      {
        name: "nom",
        type: "text",
        label: "Nom",
        placeholder: "Votre nom",
        required: true,
      },
      {
        name: "societe",
        type: "text",
        label: "Soci\u00e9t\u00e9",
        placeholder: "Nom de votre soci\u00e9t\u00e9 (facultatif)",
        required: false,
      },
      {
        name: "email",
        type: "email",
        label: "Adresse email",
        placeholder: "votre@email.fr",
        required: true,
      },
      {
        name: "site",
        type: "text",
        label: "Site internet",
        placeholder: "https://votre-site.com (facultatif)",
        required: false,
      },
      {
        name: "type-partenariat",
        type: "select",
        label: "Type de partenariat",
        placeholder: "S\u00e9lectionnez un type",
        required: true,
        options: [
          "Sponsoring",
          "\u00c9quipementier",
          "M\u00e9dia / Stream",
          "\u00c9v\u00e9nementiel",
          "Autre",
        ],
      },
      {
        name: "description",
        type: "textarea",
        label: "Description",
        placeholder: "D\u00e9crivez votre proposition de partenariat...",
        required: true,
      },
      {
        name: "rgpd",
        type: "checkbox",
        label: "J\u2019accepte que mes donn\u00e9es soient trait\u00e9es dans le cadre de cette proposition",
        placeholder: "",
        required: true,
      },
    ],
  },
  {
    id: "support",
    icon: "\uD83D\uDEE0",
    label: "Support RaceControl",
    description: "Probl\u00e8me technique sur la plateforme",
    fields: [
      {
        name: "nom",
        type: "text",
        label: "Nom",
        placeholder: "Votre nom",
        required: true,
      },
      {
        name: "email",
        type: "email",
        label: "Adresse email",
        placeholder: "votre@email.fr",
        required: true,
      },
      {
        name: "categorie-probleme",
        type: "select",
        label: "Cat\u00e9gorie du probl\u00e8me",
        placeholder: "S\u00e9lectionnez la cat\u00e9gorie",
        required: true,
        options: [
          "Connexion / Acc\u00e8s",
          "Affichage / Live Timing",
          "Erreur / Bug",
          "Compte / Profil",
          "Autre probl\u00e8me technique",
        ],
      },
      {
        name: "serveur",
        type: "select",
        label: "Serveur concern\u00e9",
        placeholder: "S\u00e9lectionnez un serveur",
        required: true,
        options: [
          "Serveur GT3",
          "Serveur Hypercar",
          "Serveur LMP2",
          "Tous les serveurs",
          "Je ne sais pas",
        ],
      },
      {
        name: "description",
        type: "textarea",
        label: "Description",
        placeholder: "D\u00e9crivez pr\u00e9cis\u00e9ment le probl\u00e8me rencontr\u00e9...",
        required: true,
      },
      {
        name: "rgpd",
        type: "checkbox",
        label: "J\u2019accepte que mes donn\u00e9es soient trait\u00e9es pour le suivi de mon incident",
        placeholder: "",
        required: true,
      },
    ],
  },
  {
    id: "suggestion",
    icon: "\uD83D\uDCA1",
    label: "Suggestion",
    description: "Proposer une am\u00e9lioration ou une id\u00e9e",
    fields: [
      {
        name: "nom",
        type: "text",
        label: "Nom (facultatif)",
        placeholder: "Votre nom",
        required: false,
      },
      {
        name: "email",
        type: "email",
        label: "Adresse email (facultative)",
        placeholder: "votre@email.fr",
        required: false,
      },
      {
        name: "categorie-suggestion",
        type: "select",
        label: "Cat\u00e9gorie",
        placeholder: "S\u00e9lectionnez une cat\u00e9gorie",
        required: true,
        options: [
          "Interface / Design",
          "Fonctionnalit\u00e9",
          "Serveurs / Sessions",
          "Contenu",
          "Autre",
        ],
      },
      {
        name: "suggestion",
        type: "textarea",
        label: "Suggestion",
        placeholder: "D\u00e9crivez votre id\u00e9e en d\u00e9tail...",
        required: true,
      },
      {
        name: "rgpd",
        type: "checkbox",
        label: "J\u2019accepte que mes donn\u00e9es soient trait\u00e9es pour l\u2019\u00e9tude de ma suggestion",
        placeholder: "",
        required: true,
      },
    ],
  },
  {
    id: "autre",
    icon: "\u2753",
    label: "Autre",
    description: "Toute autre demande non list\u00e9e",
    fields: [
      {
        name: "nom",
        type: "text",
        label: "Nom",
        placeholder: "Votre nom",
        required: true,
      },
      {
        name: "email",
        type: "email",
        label: "Adresse email",
        placeholder: "votre@email.fr",
        required: true,
      },
      {
        name: "sujet",
        type: "text",
        label: "Sujet",
        placeholder: "Objet de votre demande",
        required: true,
      },
      {
        name: "message",
        type: "textarea",
        label: "Message",
        placeholder: "Votre message...",
        required: true,
      },
      {
        name: "rgpd",
        type: "checkbox",
        label: "J\u2019accepte que mes donn\u00e9es soient trait\u00e9es pour r\u00e9pondre \u00e0 ma demande",
        placeholder: "",
        required: true,
      },
    ],
  },
];

/** Trouve la config d'une catégorie par son id */
export function getCategoryConfig(
  id: string
): ContactCategoryConfig | undefined {
  return contactCategories.find((c) => c.id === id);
}

// ----------------------------------------------------------------
// Configuration des destinataires email
// ----------------------------------------------------------------
// Centralise les adresses de réception par type de formulaire.
// Chaque clé correspond à un ContactCategoryId.
// Facilement extensible : ajouter une entrée pour chaque nouvelle
// catégorie.
// Utilisé par le service d'envoi email (Sprint SMTP).

export const contactRecipients: Record<
  string,
  ContactRecipientConfig
> = {
  "contact-general": {
    from: "B404 RaceControl <noreply@b404ldc.fr>",
    to: "contact@b404ldc.fr",
    subject: "Nouveau message - Contact general",
    label: "Contact general",
  },
  recrutement: {
    from: "B404 RaceControl <noreply@b404ldc.fr>",
    to: "recrutement@b404ldc.fr",
    subject: "Nouvelle candidature - Recrutement",
    label: "Recrutement",
  },
  partenariat: {
    from: "B404 RaceControl <noreply@b404ldc.fr>",
    to: "partenariat@b404ldc.fr",
    subject: "Nouvelle proposition - Partenariat",
    label: "Partenariat",
  },
  support: {
    from: "B404 RaceControl <noreply@b404ldc.fr>",
    to: "support@b404ldc.fr",
    subject: "Nouvel incident - Support RaceControl",
    label: "Support RaceControl",
  },
  suggestion: {
    from: "B404 RaceControl <noreply@b404ldc.fr>",
    to: "contact@b404ldc.fr",
    subject: "Nouvelle suggestion",
    label: "Suggestion",
  },
  autre: {
    from: "B404 RaceControl <noreply@b404ldc.fr>",
    to: "contact@b404ldc.fr",
    subject: "Nouvelle demande - Autre",
    label: "Autre",
  },
};

/** Trouve la config destinataire d'une catégorie par son id */
export function getRecipientConfig(
  id: string
): ContactRecipientConfig | undefined {
  return contactRecipients[id];
}

// ----------------------------------------------------------------
// Construction du corps de l'email
// ----------------------------------------------------------------
// Transforme les donnees d'un formulaire en corps d'email formaté.
// Utilise la configuration des champs pour afficher les labels
// (et non les noms techniques).

/**
 * Construit le corps HTML d'un email a partir des donnees soumises.
 *
 * @param category - Configuration de la categorie (champs, label...)
 * @param formData - Donnees saisies par l'utilisateur
 * @returns Chaîne HTML prete a etre envoyee
 */
export function buildEmailBody(
  category: ContactCategoryConfig,
  formData: Record<string, string>
): string {
  const rows = category.fields
    .filter((f) => f.name !== "rgpd") // Ne pas inclure le consentement RGPD dans le corps
    .map((f) => {
      const value = formData[f.name]?.trim() || "(non renseigné)";
      return `
        <tr>
          <td style="padding:8px 16px;font-weight:600;color:#f97316;white-space:nowrap;vertical-align:top;border-bottom:1px solid #1e293b;">
            ${f.label}
            ${f.type === "checkbox" && value === "true" ? '<span style="color:#22c55e">✓</span>' : ""}
          </td>
          <td style="padding:8px 16px;color:#e2e8f0;border-bottom:1px solid #1e293b;">
            ${value}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #1e293b;">
      <div style="padding:24px 32px;background:linear-gradient(135deg,#0f172a,#1e293b);border-bottom:2px solid #f97316;">
        <h1 style="margin:0;font-size:18px;font-weight:800;color:#f97316;letter-spacing:0.05em;">
          B404 RACECONTROL
        </h1>
        <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">
          ${category.label} — ${new Date().toLocaleString("fr-FR")}
        </p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
      <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;">
        <p style="margin:0;font-size:11px;color:#475569;">
          Cet email a ete envoye depuis le formulaire de contact B404 RaceControl.
        </p>
      </div>
    </div>`;
}
