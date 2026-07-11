"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  ContactCategoryConfig,
  ContactFormData,
  ModalStep,
} from "../_types/contact";
import { contactCategories } from "./contact-config";
import { ContactCategories } from "./contact-categories";
import { ContactForm } from "./contact-form";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal de contact premium.
 * Gere l'ouverture/fermeture, le focus trap, les animations optimisees,
 * la navigation entre les etapes (categories, formulaire, succes).
 *
 * Les donnees des formulaires sont conservees entre les retours aux
 * categories : l'utilisateur ne perd jamais sa saisie.
 * Le bouton "Nouvelle demande" depuis l'ecran succes reinitialise
 * le formulaire de la categorie courante.
 */
export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [step, setStep] = useState<ModalStep>("categories");
  const [selectedCategory, setSelectedCategory] =
    useState<ContactCategoryConfig | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Stockage persistant des formulaires en cours de saisie
  const [formsData, setFormsData] = useState<
    Record<string, ContactFormData>
  >({});

  useEffect(() => {
    if (isOpen) {
      setStep("categories");
      setSelectedCategory(null);
      setFormsData({});
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      onClose();
    }, 180);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElement.current = document.activeElement as HTMLElement;

    setTimeout(() => {
      modalRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements =
          modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement =
          focusableElements[focusableElements.length - 1];

        if (
          e.shiftKey &&
          document.activeElement === firstElement
        ) {
          e.preventDefault();
          lastElement.focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === lastElement
        ) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = scrollbarWidth + "px";

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      previousActiveElement.current?.focus();
    };
  }, [isOpen, handleClose]);

  const handleSelectCategory = useCallback(
    (category: ContactCategoryConfig) => {
      setSelectedCategory(category);
      setStep("form");
    },
    []
  );

  // Retour aux categories - conserve les formulaires
  const handleBack = useCallback(() => {
    setStep("categories");
  }, []);

  // Retour aux categories depuis l'ecran succes
  // Reinitialise les donnees de la categorie courante
  const handleBackFromSuccess = useCallback(() => {
    if (selectedCategory) {
      setFormsData((prev) => {
        const next = { ...prev };
        delete next[selectedCategory.id];
        return next;
      });
    }
    setStep("categories");
  }, [selectedCategory]);

  const handleStepChange = useCallback((newStep: ModalStep) => {
    setStep(newStep);
  }, []);

  const handleFormDataChange = useCallback(
    (categoryId: string, data: ContactFormData) => {
      setFormsData((prev) => ({ ...prev, [categoryId]: data }));
    },
    []
  );

  if (!isOpen && !isAnimating) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] transition-opacity duration-[80ms] ${
          isOpen && !isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Container centre */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Formulaire de contact"
          tabIndex={-1}
          className="relative w-full max-w-lg outline-none"
          style={{
            animation: `${
              isOpen && !isAnimating ? "modal-enter" : "modal-exit"
            } 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
          }}
        >
          <div className="rounded-3xl border border-white/10 bg-[#071426] shadow-2xl shadow-black/40 backdrop-blur-xl">
            {/* Bouton fermeture */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="px-6 pb-8 pt-10 sm:px-8">
              <div className="mb-7 text-center">
                <h2 className="text-2xl font-black text-white">
                  Comment pouvons-nous vous aider&nbsp;?
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  {step === "categories"
                    ? "S\u00e9lectionnez le type de demande."
                    : ""}
                </p>
              </div>

              {step === "categories" && (
                <ContactCategories
                  categories={contactCategories}
                  onSelect={handleSelectCategory}
                />
              )}

              {step === "form" && selectedCategory && (
                <ContactForm
                  key={selectedCategory.id}
                  category={selectedCategory}
                  initialData={formsData[selectedCategory.id]}
                  onDataChange={handleFormDataChange}
                  onBack={handleBack}
                  onStepChange={handleStepChange}
                />
              )}

              {step === "success" && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
                    <svg
                      className="h-10 w-10 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-black text-white">
                    Message envoy&eacute;
                  </h3>
                  <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-gray-400">
                    Merci de nous avoir contact&eacute;s. Nous vous
                    r&eacute;pondrons dans les plus brefs d&eacute;lais.
                  </p>
                  <button
                    type="button"
                    onClick={handleBackFromSuccess}
                    className="mt-8 rounded-full border border-orange-400/40 px-6 py-2.5 text-sm font-bold text-orange-200 transition hover:border-orange-300 hover:bg-orange-500/10"
                  >
                    Nouvelle demande
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes modal-exit {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.97) translateY(6px);
          }
        }
      `}</style>
    </>
  );
}
