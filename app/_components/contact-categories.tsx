"use client";

import type { ContactCategoryConfig } from "../_types/contact";

interface ContactCategoriesProps {
  categories: ContactCategoryConfig[];
  onSelect: (category: ContactCategoryConfig) => void;
}

/**
 * Grille des 6 grandes cartes de sélection de catégorie.
 * Animation légère avec décalage progressif.
 */
export function ContactCategories({
  categories,
  onSelect,
}: ContactCategoriesProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {categories.map((category, index) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category)}
          className="group flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-[#0d1b2e]/80 p-5 text-left shadow-lg shadow-black/20 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-400/45 hover:shadow-orange-500/10 focus-visible:ring-2 focus-visible:ring-orange-400/50"
          style={{
            opacity: 0,
            animation: `card-fade-in 0.3s ease-out forwards`,
            animationDelay: `${index * 40}ms`,
          }}
        >
          <span className="text-2xl" role="img" aria-hidden="true">
            {category.icon}
          </span>
          <div>
            <p className="font-bold text-white transition group-hover:text-orange-200">
              {category.label}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-gray-400">
              {category.description}
            </p>
          </div>
        </button>
      ))}
      <style>{`
        @keyframes card-fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
