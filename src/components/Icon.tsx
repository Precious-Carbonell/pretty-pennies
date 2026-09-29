// ---------------------------------------------------------------------------
// Icon — thin wrapper over lucide-react (icons bundled as React components,
// no CDN / web font). Friendly names map to lucide icons in one place so the
// rest of the app never imports lucide directly.
// ---------------------------------------------------------------------------

import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Coins,
  CreditCard,
  Download,
  Gift,
  Heart,
  Landmark,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  RefreshCw,
  ArrowLeftRight,
  Search,
  Smartphone,
  Star,
  Trash2,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "book"
  | "wallet"
  | "bank"
  | "card"
  | "mobile"
  | "coin"
  | "arrow-up"
  | "arrow-down"
  | "transfer"
  | "download"
  | "upload"
  | "lock"
  | "unlock"
  | "search"
  | "pencil"
  | "trash"
  | "plus"
  | "heart"
  | "star"
  | "bow"
  | "reload";

const MAP: Record<IconName, LucideIcon> = {
  book: BookOpen,
  wallet: Wallet,
  bank: Landmark,
  card: CreditCard,
  mobile: Smartphone,
  coin: Coins,
  "arrow-up": ArrowUpRight,
  "arrow-down": ArrowDownLeft,
  transfer: ArrowLeftRight,
  download: Download,
  upload: Upload,
  lock: Lock,
  unlock: LockOpen,
  search: Search,
  pencil: Pencil,
  trash: Trash2,
  plus: Plus,
  heart: Heart,
  star: Star,
  bow: Gift,
  reload: RefreshCw,
};

interface Props {
  name: IconName;
  /** Screen-reader label; when omitted the icon is decorative. */
  label?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, label, size = 18, className, style }: Props) {
  const Cmp = MAP[name];
  return (
    <Cmp
      size={size}
      className={className}
      style={style}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
