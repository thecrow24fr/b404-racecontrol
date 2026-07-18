"use client";

import { useEffect } from "react";

export default function ServeursRedirect() {
  useEffect(() => {
    window.location.href = "/#servers";
  }, []);
  return null;
}
