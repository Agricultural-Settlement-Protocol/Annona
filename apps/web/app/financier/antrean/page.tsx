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
import {
  approveFunding,
  disburseFunding,
  rejectFunding,
} from "@/lib/invocations";
import { useI18n } from "@/lib/i18n/use-i18n";
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

const ACTION_LABEL_KEY: Record<ActionType, string> = {
  approve: "page.financier.antrean.approve",
  reject: "page.financier.antrean.reject",
  disburse: "page.financier.antrean.disburse",
};

/** Build a real Invocation for the given action. */
function handleAction(tx: ReturnType<typeof useTx>, req: ApiFundingRequestRow, action: ActionType) {
  const onchainId = BigInt(req.onchainId);
  if (action === "approve") {
    tx.run((signer) =>
      approveFunding(signer, onchainId, req.amountRequested),
    );
  } else if (action === "reject") {
    tx.run((signer) =>
      rejectFunding(signer, onchainId, "DITOLAK"),
    );
  } else if (action === "disburse") {
    tx.run((signer) =>
      disburseFunding(signer, onchainId),
    );
  }
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
  t,
}: {
  req: ApiFundingRequestRow;
  busy: boolean;
  onAction: (action: ActionType) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const coveragePct = (req.coverageRatioBps / 100).toFixed(1);

  return (
    <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
      <CardHeader
        title={req.coopName}
        description={`${t("badge.funding.Requested")} ${req.createdAt.slice(0, 10)}`}
        action={
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskBadgeClass(req.riskBadge)}`}
          >
            {t("page.financier.portofolio.badge.risiko", { level: req.riskBadge })}
          </span>
        }
      />
      <CardContent className="space-y-4">
        {/* Proof + coverage */}
        <div className="flex flex-wrap gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-medium text-gray-500">{t("page.financier.antrean.proof")}</p>
            <p className="break-all font-mono text-xs text-gray-800">
              {shortHash(req.backingHash)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="mb-1 text-xs font-medium text-gray-500">{t("page.financier.antrean.coverage")}</p>
            <p className="text-sm font-bold tabular-nums text-gray-900">{coveragePct}%</p>
            <p className="mt-0.5 text-[10px] text-gray-400">{t("page.financier.antrean.coverageHint")}</p>
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <p className="mb-0.5 text-xs font-medium text-gray-500">{t("page.financier.antrean.projected")}</p>
            <RupiahAmount smallest={req.projectedSettlement} className="text-sm font-semibold" />
          </div>
          <div>
            <p className="mb-0.5 text-xs font-medium text-gray-500">{t("page.financier.antrean.requested")}</p>
            <RupiahAmount smallest={req.amountRequested} className="text-sm font-semibold" />
          </div>
          <div>
            <p className="mb-0.5 text-xs font-medium text-gray-500">{t("page.financier.antrean.approved")}</p>
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
            {busy ? t("page.financier.antrean.processing") : t("page.financier.antrean.approve")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ShieldAlert size={14} />}
            disabled={busy}
            onClick={() => onAction("reject")}
            className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
          >
            {t("page.financier.antrean.reject")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Wallet size={14} />}
            disabled={busy}
            onClick={() => onAction("disburse")}
            className="rounded-full border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            {t("page.financier.antrean.disburse")}
          </Button>
          <Link href={`/financier/${req.id}`} className="ml-auto">
            <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-800">
              {t("common.detail")}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AntreanPage() {
  const { t } = useI18n();
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

  function handleActionClick(req: ApiFundingRequestRow, action: ActionType) {
    if (tx.state !== "idle") return;
    activeRef.current = { id: req.id, coopName: req.coopName, action };
    forceUpdate((n) => n + 1);
    handleAction(tx, req, action);
  }

  const busyId = tx.state !== "idle" ? activeRef.current?.id : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.financier.antrean.title")}
        description={t("page.financier.antrean.desc")}
      />

      {error && (
        <Alert tone="warning" title={t("common.error")}>
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
                {t("page.financier.antrean.logEntry", { coop: log.coopName, action: t(ACTION_LABEL_KEY[log.action]) })}
              </span>
              <TxHashLink hash={log.hash} />
            </div>
          ))}
        </div>
      )}

      {tx.state === "signing" && (
        <Alert tone="info" title={t("page.financier.antrean.signing")}>
          {t("page.financier.antrean.signAlert")}
        </Alert>
      )}
      {tx.state === "submitting" && (
        <Alert tone="info" title={t("page.financier.antrean.submitting")}>
          {t("page.financier.antrean.submitAlert")}
        </Alert>
      )}

      {loading && (
        <p className="py-8 text-center text-sm text-gray-400">{t("page.financier.antrean.loading")}</p>
      )}

      {!loading && requests.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <ClipboardCheck size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-400">
            {t("page.financier.antrean.empty")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {requests.map((req) => (
          <RequestCard
            key={req.id}
            req={req}
            busy={busyId === req.id}
            onAction={(action) => handleActionClick(req, action)}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
