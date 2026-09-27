"use client";

import { useState, useCallback, useRef } from "react";
import type {
  ContactCategoryConfig,
  ContactFormData,
  ModalStep,
} from "../_types/contact";
import { getRecipientConfig, buildEmailBody } from "./contact-config";
import { sendEmail } from "../_services/email";
import { ContactField } from "./contact-field";

interface ContactFormProps {
  category: ContactCategoryConfig;
  initialData?: ContactFormData;
  onDataChange: (categoryId: string, data: ContactFormData) => void;
  onBack: () => void;
  onStepChange: (step: ModalStep) => void;
}

/**
 * Formulaire de contact dynamique.
 * Les champs sont générés automatiquement depuis la configuration de la catégorie.
 * Gère la validation, la soumission (placeholder) et l'affichage du succès.
 */
export function ContactForm({
  category,
  initialData,
  onDataChange,
  onBack,
  onStepChange,
}: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>(
    initialData ?? { category: category.id }
  );
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref pour stabiliser handleChange : evite de recréer la fonction
  // a chaque saisie (qui forcerait le re-rendu de tous les ContactField).
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const handleChange = useCallback(
    (name: string, value: string) => {
      const current = formDataRef.current;
      const next = { ...current, [name]: value };
      formDataRef.current = next;
      setFormData(next);
      onDataChange(category.id, next);

      // Efface l'erreur du champ quand l'utilisateur commence à taper
      if (errors[name]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    },
    // Ne depend plus de formData (via la ref), seulement de errors/category.id
    [errors, category.id, onDataChange]
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string | null> = {};

    for (const field of category.fields) {
      const value = formData[field.name] || "";

      if (field.type === "checkbox") {
        if (field.required && value !== "true") {
          newErrors[field.name] = "Vous devez accepter cette condition";
        }
        continue;
      }

      if (field.required && !value.trim()) {
        newErrors[field.name] = "Ce champ est requis";
        continue;
      }

      if (field.type === "email" && value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          newErrors[field.name] = "Adresse email invalide";
          continue;
        }
      }

      if (field.validation) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.name] = error;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [category.fields, formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      setIsSubmitting(true);

      // Construire l'email et l'envoyer via le service email
      const recipient = getRecipientConfig(category.id);
      if (!recipient) {
        console.error(
          "Aucun destinataire pour la categorie",
          category.id
        );
        setIsSubmitting(false);
        return;
      }

      const replyTo = formData["email"]?.trim() || "";
      const body = buildEmailBody(category, formData);

      await sendEmail({
        from: recipient.from,
        to: recipient.to,
        subject: recipient.subject,
        html: body,
        replyTo: replyTo || undefined,
      });

      setIsSubmitting(false);
      onStepChange("success");
    },
    [validate, onStepChange, formData]
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* En-tête avec bouton retour */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          aria-label="Retour aux catégories"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </button>
        <div>
          <p className="font-bold text-white">
            {category.icon} {category.label}
          </p>
          <p className="text-xs text-gray-400">{category.description}</p>
        </div>
      </div>

      {/* Champs dynamiques */}
      {category.fields.map((field) => (
        <ContactField
          key={field.name}
          field={field}
          value={formData[field.name] || ""}
          error={errors[field.name] || null}
          onChange={handleChange}
        />
      ))}

      {/* Bouton de soumission */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3.5 text-sm font-bold shadow-xl shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-400 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Envoi en cours...</span>
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
            <span>Envoyer le message</span>
          </>
        )}
      </button>
    </form>
  );
}
