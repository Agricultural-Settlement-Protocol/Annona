import { ExternalLink } from "lucide-react";
import { cn } from "./cn.js";

const EXPLORER: Record<string, string> = {
  testnet: "https://stellar.expert/explorer/testnet/tx",
  mainnet: "https://stellar.expert/explorer/public/tx",
};

/** On-chain tx hash chip + explorer link. Aqua = on-chain (DESIGN_GUIDE).
 *  Every on-chain action in the UI must surface this. */
export function TxHashLink({
  hash,
  network = "testnet",
  className,
}: {
  hash: string;
  network?: "testnet" | "mainnet";
  className?: string;
}) {
  const short = hash.length > 12 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;
  return (
    <a
      href={`${EXPLORER[network]}/${hash}`}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-aqua-50 px-2.5 py-0.5",
        "font-mono text-xs text-aqua-700 transition-colors hover:bg-aqua-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {short}
      <ExternalLink size={11} />
    </a>
  );
}
