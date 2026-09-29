import type { Account } from "@/domain/types";
import type { IconName } from "@/components/Icon";

// Existing accounts still carry an emoji field. Map it (and common names) to a
// Lineicons name so the UI shows line icons instead of emojis, with a sensible
// fallback to a wallet.
const EMOJI_TO_ICON: Record<string, IconName> = {
  "🏦": "bank",
  "💳": "card",
  "📱": "mobile",
  "👛": "wallet",
  "🐷": "coin",
  "💰": "coin",
  "🌟": "star",
  "🩷": "heart",
  "🎀": "bow",
};

export function accountIcon(a: Pick<Account, "emoji" | "name">): IconName {
  const stored = a.emoji ? storedToIcon(a.emoji) : null;
  if (stored) return stored;
  if (a.emoji && EMOJI_TO_ICON[a.emoji]) return EMOJI_TO_ICON[a.emoji];
  const n = a.name.toLowerCase();
  if (n.includes("gcash") || n.includes("wallet") || n.includes("maya") || n.includes("paypal")) return "mobile";
  if (n.includes("cash")) return "wallet";
  if (n.includes("bdo") || n.includes("bank") || n.includes("union")) return "bank";
  if (n.includes("card") || n.includes("credit")) return "card";
  if (n.includes("save") || n.includes("piggy")) return "coin";
  return "wallet";
}

// The picker on the Accounts page now offers icon choices (by IconName) instead
// of emoji. We still store the choice in the account's `emoji` field for
// backward compatibility, using a marker string.
export const ICON_CHOICES: IconName[] = [
  "bank",
  "card",
  "mobile",
  "wallet",
  "coin",
  "star",
  "heart",
  "bow",
];

/** We persist icon choices as `icon:<name>` in the emoji field. */
export function iconToStored(name: IconName): string {
  return `icon:${name}`;
}

export function storedToIcon(stored: string): IconName | null {
  if (stored.startsWith("icon:")) return stored.slice(5) as IconName;
  return null;
}
