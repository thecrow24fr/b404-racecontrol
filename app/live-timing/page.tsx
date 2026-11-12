import type { Metadata } from "next";
import { LiveTimingClient } from "../_components/live-timing-client";

export const metadata: Metadata = {
  title: "Live Timing — B404 RaceControl",
  description: "Page Live Timing du serveur S20 B404 RaceControl, prête à afficher le classement public dès que le flux sera disponible.",
};

export default function LiveTimingPage() {
  return <LiveTimingClient serverId={20} />;
}
