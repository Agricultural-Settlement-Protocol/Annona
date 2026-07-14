"use client";

// Screen C — Buat Perjanjian (Create Offtake Agreement) (PRD §8.1).
// Stepped single-page form: farmer selection, catalog basket, markup/fees,
// live cost-structure ledger, harvest estimate (transparent formula), and
// a plain-Bahasa preview before signing via Freighter.

import { useI18n } from "@/lib/i18n/use-i18n";
import { CreateAgreementForm } from "@/components/kmp/create-agreement-form";
import { PageHeader } from "@/components/kmp/page-header";
import { Button } from "@annona/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BuatPerjanjianPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader
        title={t("page.kmp.perjanjian.baru.title")}
        description={t("page.kmp.perjanjian.baru.desc")}
        actions={
          <Link href="/kmp/perjanjian">
            <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>
              {t("page.kmp.perjanjian.baru.back")}
            </Button>
          </Link>
        }
      />
      <CreateAgreementForm />
    </div>
  );
}
