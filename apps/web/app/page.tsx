import { Landing } from "@/components/landing";
import type { Metadata } from "next";
import "./urbangreen/urbangreen.css";

export const metadata: Metadata = {
  title: "Annona Protocol — Tamper-Proof Offtake Settlement",
  description:
    "Annona Protocol turns input-credit to harvest-buyback into a tamper-proof, auto-netting, HPP-anchored on-chain ledger on Stellar/Soroban.",
};

export default function Home() {
  return <Landing />;
}
