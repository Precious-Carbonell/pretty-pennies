import { useState, type FormEvent } from "react";
import lockBg from "@/assets/lockbg.jpg";
import logoUrl from "@/assets/logo.png";
import { Icon } from "./Icon";
import { FallingLeaves } from "./FallingLeaves";

interface Props {
  mode: "setup" | "locked";
  onSetup: (pin: string) => Promise<void>;
  onUnlock: (pin: string) => Promise<boolean>;
  onReset: () => Promise<void>;
}

/** A PIN field that masks each entered digit with a yellow heart 💛. */
function HeartPinInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="pin-field">
      {/* Real input drives typing/paste/a11y; its own text is hidden. */}
      <input
        className="pin-real"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={12}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        aria-label={ariaLabel}
      />
      {/* Visual layer: one heart per digit, or the placeholder when empty. */}
      <span className="pin-mask" aria-hidden="true">
        {value.length === 0 ? (
          <span className="pin-placeholder">{placeholder}</span>
        ) : (
          Array.from(value).map((_, i) => (
            <span key={i} className="pin-heart">💛</span>
          ))
        )}
      </span>
    </label>
  );
}

/**
 * The privacy gate. Nothing behind it renders until the correct PIN is entered,
 * and the data on disk is encrypted with that PIN — so a person who opens this
 * app (or pokes at the browser storage) can't read your money info.
 */
export function LockScreen({ mode, onSetup, onUnlock, onReset }: Props) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSetup = mode === "setup";

  async function handleReset() {
    const sure = window.confirm(
      "Reset your diary? This permanently erases all entries and your PIN on this device, and can't be undone. Only do this if you've forgotten your PIN or want a fresh start.",
    );
    if (!sure) return;
    await onReset();
    setPin("");
    setConfirm("");
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (pin.length < 4) {
      setError("Pick at least 4 digits, cutie.");
      return;
    }
    if (isSetup && pin !== confirm) {
      setError("The two PINs don't match.");
      return;
    }
    setBusy(true);
    try {
      if (isSetup) {
        await onSetup(pin);
      } else {
        const ok = await onUnlock(pin);
        if (!ok) {
          setError("That PIN doesn't look right.");
          setPin("");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lock-screen" style={{ backgroundImage: `url(${lockBg})` }}>
      <FallingLeaves count={16} />
      <form className="lock-card" onSubmit={handleSubmit}>
        <div className="lock-bow"><img src={logoUrl} alt="Pretty Pennies" className="lock-logo" /></div>
        <h1>Pretty Pennies</h1>
        <p>{isSetup ? "Create a private PIN for your money diary." : "Enter your PIN to peek inside."}</p>

        <HeartPinInput
          value={pin}
          onChange={setPin}
          placeholder="enter pin"
          ariaLabel="PIN"
          autoFocus
        />

        {isSetup && (
          <HeartPinInput
            value={confirm}
            onChange={setConfirm}
            placeholder="confirm pin"
            ariaLabel="Confirm PIN"
          />
        )}

        <div className="lock-error">{error}</div>

        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "…" : isSetup ? "Create my diary" : "Unlock"}
        </button>

        <div className="lock-hint">
          {isSetup
            ? "Your PIN never leaves this device and isn't stored anywhere. It's the only key — keep it safe."
            : "Everything stays encrypted on this device. No accounts, no cloud, no one else can read it."}
        </div>

        {!isSetup && (
          <button type="button" className="lock-reset" onClick={handleReset}>
            Forgot PIN? Reset diary
          </button>
        )}
      </form>
    </div>
  );
}
