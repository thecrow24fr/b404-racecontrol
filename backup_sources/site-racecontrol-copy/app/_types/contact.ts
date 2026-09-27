/**
 * Types partagés pour le système de contact premium.
 */

export type ContactCategoryId =
  | "recrutement"
  | "contact-general"
  | "partenariat"
  | "support"
  | "suggestion"
  | "autre";

export interface ContactCategoryConfig {
  id: ContactCategoryId;
  icon: string;
  label: string;
  description: string;
  fields: FormFieldConfig[];
}

export interface FormFieldConfig {
  name: string;
  type: "text" | "email" | "textarea" | "select" | "checkbox";
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
  validation?: (value: string) => string | null;
}

export interface ContactFormData {
  category: ContactCategoryId;
  [key: string]: string;
}

export type ModalStep = "categories" | "form" | "success";

/**
 * Configuration d'acheminement d'un formulaire.
 * Associe un type de demande a son destinataire email et son sujet par defaut.
 */
export interface ContactRecipientConfig {
  /** Adresse email de l'expediteur (envoyee par le serveur SMTP) */
  from: string;
  /** Adresse email du destinataire */
  to: string;
  /** Sujet par defaut du message */
  subject: string;
  /** Nom lisible de la categorie */
  label: string;
}

