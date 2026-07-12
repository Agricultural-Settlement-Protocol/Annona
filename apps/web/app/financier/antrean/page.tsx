"use client";

/**
 * Screen: Antrean Persetujuan (Approval Desk).
 * Shows all Requested funding requests. Each card exposes:
 * - Koperasi name, backing hash proof, projected settlement, coverage ratio, risk badge
 * - Actions: Setujui / Tolak / Cairkan wired through useTx (demo mode: simulate
 *   + fabricated hash + toast).
 *
 * Contract fns: approve_funding / reject_funding / disburse_funding are NOT yet
 * built on-chain. Demo mode simulates them. Wire real Invocations when deployed.
 */

import { PageHeader } from "@/components/kmp/page-header";
import { useTx } from "@/components/kmp/use-tx";
import type { Invocation } from "@/lib/tx";
import { fetchFinancierQueue, type ApiFundingRequestRow, type RiskBadge } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  RupiahAmount,
  TxHashLink,
} from "@annona/ui";
import {
  CheckCircle2,
  ClipboardCheck,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function shortHash(h: string): string {
  if (h.length <= 16) return h;
  return `${h.slice(0, 8)}...${h.slice(-6)}`;
}

function riskBadgeClass(badge: RiskBadge): string {
  if (badge === "Rendah") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (badge === "Sedang") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

type ActionType = "approve" | "reject" | "disburse";

const ACTION_LABEL: Record<ActionType, string> = {
  approve: "Setujui",
  reject: "Tolak",
  disburse: "Cairkan",
};

/** Placeholder builder: in demo mode the builder is never called.
 *  TODO: replace with real Invocations when approve_funding /
 *  reject_funding / disburse_funding are deployed on-chain. */
function buildFundingInvocation(action: ActionType): (signer: string) => Invocation {
  const method =
    action === "approve"
      ? "approve_funding"
      : action === "reject"
        ? "reject_funding"
        : "disburse_funding";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (_signer: string): Invocation => ({ method, args: [] });
}

interface ActionLog {
  requestId: string;
  coopName: string;
  action: ActionType;
  hash: string;
}

function RequestCard({
  req,
  busy,
  onAction,
}: {
  req: ApiFundingRequestRow;
  busy: boolean;
  onAction: (action: ActionType) => void;
}) {
  const coveragePct = (req.coverageRatioBps / 100).toFixed(1);

  return (
    <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
      <CardHeader
        title={req.coopName}
        description={`Diajukan ${req.createdAt.slice(0, 10)}`}
        action={
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskBadgeClass(req.riskBadge)}`}
          >
            Risiko: {req.riskBadge}
          </span>
        }
      />
      <CardContent className="space-y-4">
        {/* Proof + coverage */}
        <div className="flex flex-wrap gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium text-gray-500">Bukti Offtake</p>
            <p className="break-all font-mono text-xs text-gray-800">
              {shortHash(req.backingHash)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="mb-1 text-xs font-medium text-gray-500">Rasio Cakupan</p>
            <p className="text-sm font-bold tabular-nums text-gray-900">{coveragePct}%</p>
            <p className="mt-0.5 text-[10px] text-gray-400">lebih rendah lebih aman</p>
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <p className="mb-0.5 text-xs font-medium text-gray-500">Proyeksi Panen</p>
            <RupiahAmount smallest={req.projectedSettlement} className="text-sm font-semibold" />
          </div>
          <div>
            <p className="mb-0.5 text-xs font-medium text-gray-500">Diminta</p>
            <RupiahAmount smallest={req.amountRequested} className="text-sm font-semibold" />
          </div>
          <div>
            <p className="mb-0.5 text-xs font-medium text-gray-500">Disetujui</p>
            <RupiahAmount
              smallest={req.amountApproved}
              className="text-sm font-semibold text-amber-700"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckCircle2 size={14} />}
            disabled={busy}
            onClick={() => onAction("approve")}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {busy ? "Memproses..." : "Setujui"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ShieldAlert size={14} />}
            disabled={busy}
            onClick={() => onAction("reject")}
            className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
          >
            Tolak
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Wallet size={14} />}
            disabled={busy}
            onClick={() => onAction("disburse")}
            className="rounded-full border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            Cairkan
          </Button>
          <Link href={`/financier/${req.id}`} className="ml-auto">
            <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-800">
              Detail
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AntreanPage() {
  const { data: queue, loading, error } = useApi(fetchFinancierQueue);
  const tx = useTx();

  // Track which request and action is currently in-flight.
  const activeRef = useRef<{ id: string; coopName: string; action: ActionType } | null>(null);
  const [, forceUpdate] = useState(0);
  const [actionLog, setActionLog] = useState<ActionLog[]>([]);

  // When tx transitions to success, capture the log entry and reset.
  useEffect(() => {
    if (tx.state === "success" && tx.txHash && activeRef.current) {
      const { id, coopName, action } = activeRef.current;
      setActionLog((prev) => [{ requestId: id, coopName, action, hash: tx.txHash ?? "" }, ...prev]);
      activeRef.current = null;
      tx.reset();
    }
  }, [tx.state, tx.txHash, tx]);

  const requests = queue ?? [];

  function handleAction(req: ApiFundingRequestRow, action: ActionType) {
    if (tx.state !== "idle") return;
    activeRef.current = { id: req.id, coopName: req.coopName, action };
    forceUpdate((n) => n + 1);
    tx.run(buildFundingInvocation(action));
  }

  const busyId = tx.state !== "idle" ? activeRef.current?.id : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Antrean Persetujuan"
        description="Permohonan talangan modal kerja yang menunggu keputusan Anda."
      />

      {error && (
        <Alert tone="warning" title="Gagal memuat antrean">
          {error}
        </Alert>
      )}

      {/* Action result feed */}
      {actionLog.length > 0 && (
        <div className="space-y-2">
          {actionLog.map((log) => (
            <div
              key={log.hash}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span className="text-sm font-medium text-gray-800">
                {log.coopName}: {ACTION_LABEL[log.action]} berhasil dicatat.
              </span>
              <TxHashLink hash={log.hash} />
            </div>
          ))}
        </div>
      )}

      {tx.state === "signing" && (
        <Alert tone="info" title="Menandatangani transaksi">
          Konfirmasi di Freighter (atau sedang disimulasikan). Jangan tutup jendela.
        </Alert>
      )}
      {tx.state === "submitting" && (
        <Alert tone="info" title="Mengirim ke jaringan">
          Mencatat di Stellar Testnet. Proses 5 hingga 10 detik.
        </Alert>
      )}

      {loading && (
        <p className="py-8 text-center text-sm text-gray-400">Memuat antrean...</p>
      )}

      {!loading && requests.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <ClipboardCheck size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-400">
            Tidak ada permohonan yang menunggu persetujuan.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {requests.map((req) => (
          <RequestCard
            key={req.id}
            req={req}
            busy={busyId === req.id}
            onAction={(action) => handleAction(req, action)}
          />
        ))}
      </div>
    </div>
  );
}
