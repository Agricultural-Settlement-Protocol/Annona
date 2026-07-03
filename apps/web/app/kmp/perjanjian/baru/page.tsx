"use client";

// Screen C — Buat Perjanjian (Create Offtake Agreement) (PRD §8.1).
// Stepped single-page form: farmer selection, catalog basket, markup/fees,
// live cost-structure ledger, harvest estimate (transparent formula), and
// a plain-Bahasa preview before signing via Freighter.

import { CreateAgreementForm } from "@/components/kmp/create-agreement-form";
import { PageHeader } from "@/components/kmp/page-header";
import { Button } from "@annona/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BuatPerjanjianPage() {
  return (
    <div>
      <PageHeader
        title="Buat Perjanjian"
        description="Buat perjanjian offtake baru antara KMP dan petani. Tanda tangan digital via Freighter diperlukan."
        actions={
          <Link href="/kmp/perjanjian">
            <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>
              Kembali
            </Button>
          </Link>
        }
      />
      <CreateAgreementForm />
    </div>
  );
}
