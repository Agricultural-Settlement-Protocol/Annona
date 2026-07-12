import { ArrowDownRight, Building2, Landmark, User } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "./card.js";
import { cn } from "./cn.js";
import { RupiahAmount } from "./rupiah.js";

/**
 * "Automated Cash-Split Settlement Card" (PRD §8.1 Screen D, DESIGN_GUIDE
 * v3.0). Renders the three allocations one `settle()` produces so a KMP
 * officer sees, at a glance, that the debt collected is not all theirs:
 * cash out to the farmer, principal locked for Supplier, and the coop's own
 * margin + handling. Money only via `RupiahAmount`; no em dashes.
 */
export function SplitSettlementCard({
  gross,
  handlingCut,
  netToFarmer,
  residuPrincipal,
  coopMargin,
  className,
}: {
  /** gross = delivered_kg * hpp_per_kg */
  gross: bigint;
  /** KMP handling cut on gross, kept by the coop */
  handlingCut: bigint;
  /** net paid to the farmer after handling cut + debt netted */
  netToFarmer: bigint;
  /** Supplier's principal recovered from the netted debt, owed back via remittance */
  residuPrincipal: bigint;
  /** KMP's markup margin recovered from the netted debt, kept by the coop */
  coopMargin: bigint;
  className?: string;
}) {
  const kmpTotal = handlingCut + coopMargin;
  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <div className="flex items-center justify-between border-b border-border bg-surface/60 px-5 py-4">
        <p className="text-sm font-semibold text-foreground">Rincian Pembagian Kas</p>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          Nilai panen <RupiahAmount smallest={gross} className="text-xs" />
        </span>
      </div>
      <div className="divide-y divide-border">
        <SplitRow
          icon={<User size={16} />}
          iconTone="bg-verdant-100 text-verdant-700"
          label="Diterima petani"
          hint="Tunai keluar dari kas koperasi"
          amount={netToFarmer}
          tone="positive"
          emphasize
        />
        <SplitRow
          icon={<Landmark size={16} />}
          iconTone="bg-aqua-100 text-aqua-700"
          label="Residu pokok Supplier"
          hint="Terkunci di kas KMP, wajib disetor balik"
          amount={residuPrincipal}
          tone="default"
        />
        <SplitRow
          icon={<Building2 size={16} />}
          iconTone="bg-amber-100 text-amber-700"
          label="Margin & biaya tangani KMP"
          hint="Markup saprotan + biaya handling, hak koperasi"
          amount={kmpTotal}
          tone="default"
        />
      </div>
      <div className="flex items-center gap-1.5 border-t border-border bg-surface/40 px-5 py-3 text-xs text-muted-foreground">
        <ArrowDownRight size={13} />
        Utang dipotong dulu dari hasil panen, sisanya baru jadi hak petani.
      </div>
    </Card>
  );
}

function SplitRow({
  icon,
  iconTone,
  label,
  hint,
  amount,
  tone,
  emphasize,
}: {
  icon: ReactNode;
  iconTone: string;
  label: string;
  hint: string;
  amount: bigint;
  tone: "default" | "positive";
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3">
        <span
          className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", iconTone)}
        >
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <RupiahAmount
        smallest={amount}
        tone={tone}
        className={cn(emphasize ? "text-lg" : "text-sm")}
      />
    </div>
  );
}
