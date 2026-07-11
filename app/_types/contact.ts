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

