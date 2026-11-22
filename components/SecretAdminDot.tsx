"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

export default function SecretAdminDot() {
  const router = useRouter();
  const lastTapRef = useRef<number>(0);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current <= 450) {
      lastTapRef.current = 0;
      router.push("/connexion");
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <button
      type="button"
      className="secretAdminDot"
      onClick={handleTap}
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}
