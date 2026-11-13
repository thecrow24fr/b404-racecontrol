import type { Metadata } from "next";
import { LiveTimingClient } from "../_components/live-timing-client";
import { emptyLiveTimingData } from "../_data/empty-live-timing-data";

export const metadata: Metadata = {
  title: "Live Timing | B404",
  description: "Suivi Live Timing de tous les serveurs B404.",
};

export default function LiveTimingPage() {
  return <LiveTimingClient initialData={emptyLiveTimingData} />;
}
