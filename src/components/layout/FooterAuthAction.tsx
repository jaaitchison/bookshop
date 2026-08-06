"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "../../context/AccountContext";
import CardioLogo, { type CardioArea } from "./CardioLogo";

export default function FooterAuthAction() {
  const router = useRouter();
  const { isAuthenticated, isAuthLoading, profile, signOut } = useAccount();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (isAuthLoading || !isAuthenticated) return null;

  const area: CardioArea = profile.activeRole === "admin"
    ? "admin"
    : profile.activeRole === "writer"
      ? "writer"
      : "front";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={isSigningOut}
      aria-label="Log out"
      title="Log out"
      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      <CardioLogo area={area} size="footer" className={isSigningOut ? "animate-pulse" : ""} />
      <span className="sr-only">{isSigningOut ? "Logging out" : "Log out"}</span>
    </button>
  );
}
