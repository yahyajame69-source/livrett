"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";

function PinInput({
  value,
  onChange,
  showDigits,
  disabled,
  autoFocus,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  showDigits: boolean;
  disabled: boolean;
  autoFocus?: boolean;
  label: string;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const updateAt = (index: number, char: string) => {
    const arr = digits.slice();
    arr[index] = char;
    onChange(arr.join(""));
  };

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      updateAt(index, "");
      return;
    }
    if (cleaned.length > 1) {
      const merged = (value.slice(0, index) + cleaned).slice(0, 6);
      onChange(merged);
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

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    inputsRef.current[Math.min(5, pasted.length)]?.focus();
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
            onPaste={handlePaste}
            className="pinBox"
            aria-label={`Chiffre ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [showDigits, setShowDigits] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    fetch("/api/admin/auth")
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
        if (active) setConfigured(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Veuillez saisir les 6 chiffres du code.");
      return;
    }
    if (configured === false && code !== confirmCode) {
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Code incorrect.");
        if (configured !== false) {
          setCode("");
        }
        setBusy(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Erreur de connexion au serveur.");
      setBusy(false);
    }
  }

  return (
    <main className="admin">
      <div className="wrap" style={{ maxWidth: 460 }}>
        <div className="panel">
          <div className="brand">Le Monde des Petits Livres</div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
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
                  value={code}
                  onChange={setCode}
                  showDigits={showDigits}
                  disabled={busy}
                  autoFocus
                />
                <PinInput
                  label="Confirmez le code à 6 chiffres"
                  value={confirmCode}
                  onChange={setConfirmCode}
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
                {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
                <button className="btn" disabled={busy || code.length < 6 || confirmCode.length < 6}>
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
                  value={code}
                  onChange={setCode}
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
                {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
                <button className="btn" disabled={busy || code.length < 6}>
                  {busy ? "Vérification…" : "Accéder à l'administration"}
                </button>
              </form>
            </>
          )}

          <p className="muted" style={{ marginTop: 18 }}>
            Accès réservé à l'administrateur autorisé.
          </p>
          <a href="/" className="muted">
            ← Retour à la boutique
          </a>
        </div>
      </div>
    </main>
  );
}