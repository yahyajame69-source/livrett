"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Lock } from "lucide-react";
import { useAdminSession } from "@/components/AdminSessionProvider";

function PinInput({
  digits,
  onChange,
  showDigits,
  disabled,
  autoFocus,
  label,
}: {
  digits: string[];
  onChange: (next: string[]) => void;
  showDigits: boolean;
  disabled: boolean;
  autoFocus?: boolean;
  label: string;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const updateAt = (index: number, char: string) => {
    const arr = digits.slice();
    arr[index] = char;
    onChange(arr);
  };

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      updateAt(index, "");
      return;
    }

    const prev = digits[index];
    if (prev && cleaned.length === 2) {
      const nextChar = cleaned.startsWith(prev) ? cleaned.slice(1) : cleaned.slice(0, 1);
      updateAt(index, nextChar);
      if (index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
      return;
    }

    if (cleaned.length > 1) {
      const arr = digits.slice();
      for (let offset = 0; offset < cleaned.length && index + offset < 6; offset++) {
        arr[index + offset] = cleaned[offset];
      }
      onChange(arr);
      const focusIdx = Math.min(5, index + cleaned.length);
      inputsRef.current[focusIdx]?.focus();
      return;
    }

    updateAt(index, cleaned);
    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        updateAt(index, "");
      } else if (index > 0) {
        updateAt(index - 1, "");
        inputsRef.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const arr = digits.slice();
    for (let offset = 0; offset < pasted.length && index + offset < 6; offset++) {
      arr[index + offset] = pasted[offset];
    }
    onChange(arr);
    inputsRef.current[Math.min(5, index + pasted.length)]?.focus();
  };

  return (
    <div>
      <div className="pinLabel">{label}</div>
      <div className="pinGrid" role="group" aria-label={label}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type={showDigits ? "text" : "password"}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            autoFocus={autoFocus && index === 0}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(index, e)}
            className="pinBox"
            aria-label={`Chiffre ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

const EMPTY_PIN = ["", "", "", "", "", ""];

export default function Login() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [codeDigits, setCodeDigits] = useState<string[]>(EMPTY_PIN);
  const [confirmDigits, setConfirmDigits] = useState<string[]>(EMPTY_PIN);
  const [showDigits, setShowDigits] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { token, setToken } = useAdminSession();
  const router = useRouter();

  const code = codeDigits.join("");
  const confirmCode = confirmDigits.join("");
  const isCodeComplete = codeDigits.every((d) => /^\d$/.test(d));
  const isConfirmComplete = confirmDigits.every((d) => /^\d$/.test(d));

  useEffect(() => {
    let active = true;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    fetch("/api/admin/auth", { cache: "no-store", headers })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.authenticated) {
          router.replace("/admin");
          return;
        }
        setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (active) {
          setConfigured(true);
          setError("Impossible de joindre le serveur. Vérifiez votre connexion.");
        }
      });
    return () => {
      active = false;
    };
  }, [router, token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isCodeComplete || !/^\d{6}$/.test(code)) {
      setError("Veuillez saisir les 6 chiffres du code.");
      return;
    }
    if (configured === false && (!isConfirmComplete || code !== confirmCode)) {
      setError("Les deux codes à 6 chiffres ne correspondent pas.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(
          configured === false
            ? { action: "setup", code, confirmCode }
            : { action: "login", code }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Code incorrect.");
        if (configured !== false) {
          setCodeDigits(EMPTY_PIN);
        }
        setBusy(false);
        return;
      }

      if (typeof data.token === "string" && data.token) {
        setToken(data.token);
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Erreur de connexion au serveur.");
      setBusy(false);
    }
  }

  return (
    <main className="admin connexionMain">
      <div className="wrap" style={{ maxWidth: 460 }}>
        <div className="panel connexionPanel">
          <div className="brand">Le Monde des Petits Livres</div>
          <h1 className="connexionTitle">
            <Lock size={22} aria-hidden="true" />
            Administration
          </h1>

          {configured === null ? (
            <p className="muted">Chargement…</p>
          ) : configured === false ? (
            <>
              <p className="muted">
                Première ouverture : définissez votre code secret à 6 chiffres pour sécuriser l'accès administrateur.
              </p>
              <form className="form" onSubmit={submit}>
                <PinInput
                  label="Choisissez un code à 6 chiffres"
                  digits={codeDigits}
                  onChange={setCodeDigits}
                  showDigits={showDigits}
                  disabled={busy}
                  autoFocus
                />
                <PinInput
                  label="Confirmez le code à 6 chiffres"
                  digits={confirmDigits}
                  onChange={setConfirmDigits}
                  showDigits={showDigits}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="pinToggle"
                  onClick={() => setShowDigits((v) => !v)}
                >
                  {showDigits ? <EyeOff size={15} /> : <Eye size={15} />}
                  {showDigits ? "Masquer les chiffres" : "Afficher les chiffres"}
                </button>
                {error && (
                  <div className="errorBox" role="alert">
                    <AlertCircle size={16} aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}
                <button
                  className="btn"
                  disabled={busy || !isCodeComplete || !isConfirmComplete}
                >
                  {busy ? "Enregistrement…" : "Enregistrer le code et accéder"}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="muted">
                Saisissez votre code d'accès à 6 chiffres pour gérer votre boutique.
              </p>
              <form className="form" onSubmit={submit}>
                <PinInput
                  label="Code secret à 6 chiffres"
                  digits={codeDigits}
                  onChange={setCodeDigits}
                  showDigits={showDigits}
                  disabled={busy}
                  autoFocus
                />
                <button
                  type="button"
                  className="pinToggle"
                  onClick={() => setShowDigits((v) => !v)}
                >
                  {showDigits ? <EyeOff size={15} /> : <Eye size={15} />}
                  {showDigits ? "Masquer les chiffres" : "Afficher les chiffres"}
                </button>
                {error && (
                  <div className="errorBox" role="alert">
                    <AlertCircle size={16} aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}
                <button className="btn" disabled={busy || !isCodeComplete}>
                  {busy ? "Vérification…" : "Accéder à l'administration"}
                </button>
              </form>
            </>
          )}

          <div className="connexionFooter">
            <span className="muted">Accès réservé à l'administrateur autorisé.</span>
            <Link href="/" className="backLink">
              ← Retour à la boutique
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}