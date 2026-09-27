import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface ModuleEmptyStateProps {
  title: string;
  message: string;
  detail?: string;
  icon?: LucideIcon;
}

export function ModuleEmptyState({
  title,
  message,
  detail,
  icon: Icon = Inbox,
}: ModuleEmptyStateProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0d1b2e] p-8 text-center">
      <Icon className="mx-auto h-10 w-10 text-gray-600" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-black text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-400">{message}</p>
      {detail && <p className="mx-auto mt-3 max-w-2xl text-xs leading-5 text-gray-500">{detail}</p>}
    </div>
  );
}
