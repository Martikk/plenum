"use client";
import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/logic";
import { Field, PageHeader } from "@/components/ui";
import { apiEnabled } from "@/lib/api";
import { Users } from "@/components/users";
import { AuditLog, MyPassword } from "@/components/account";

const pctIn = (v: number) => Math.round(v * 1000) / 10;

export default function Settings() {
  const s = useStore();
  const canEdit = s.persona === "manager" || s.persona === "ceo";
  const [f, setF] = useState({
    pst: pctIn(s.settings.pst), gst: pctIn(s.settings.gst), margin: pctIn(s.settings.marginThreshold),
    j: s.settings.labourCost.Journeyman, a: s.settings.labourCost.Apprentice, o: s.settings.labourCost.Office,
  });
  const [saved, setSaved] = useState(false);
  const save = () => {
    s.setSettings({ pst: f.pst / 100, gst: f.gst / 100, marginThreshold: f.margin / 100, labourCost: { Journeyman: f.j, Apprentice: f.a, Office: f.o } });
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };
  const num = (k: keyof typeof f, label: string, hint: string, suffix: string) => (
    <Field label={label} hint={hint}>
      <div className="relative">
        <input type="number" step="0.1" className="field num !pr-10" disabled={!canEdit} value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 text-[12.5px]">{suffix}</span>
      </div>
    </Field>
  );

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Settings" sub={canEdit ? "Calculation rules apply to every margin, quote and invoice check immediately." : "Read-only. Only the Coordination Manager or CEO can change these."} />
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Taxes & margin</h2>
        <p className="text-[12.5px] text-ink-3 mb-4">Open questions from the GPP review: confirm with accounting, then set here.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {num("pst", "PST on purchased materials", "Added to material cost unless the line is PST-exempt", "%")}
          {num("gst", "GST on invoices", "Shown on invoices and PDFs", "%")}
          {num("margin", "GP% alert threshold", "Below this the job is flagged", "%")}
        </div>
      </section>
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Internal labour cost</h2>
        <p className="text-[12.5px] text-ink-3 mb-4">Burdened cost per hour (wage + benefits + vehicle). Used for cost and margin, not for billing rates, which live on contracts.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {num("j", "Journeyman", `Default ${DEFAULT_SETTINGS.labourCost.Journeyman}`, "$/h")}
          {num("a", "Apprentice", `Default ${DEFAULT_SETTINGS.labourCost.Apprentice}`, "$/h")}
          {num("o", "Office", `Default ${DEFAULT_SETTINGS.labourCost.Office}`, "$/h")}
        </div>
      </section>
      {canEdit && (
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={save}>Save settings</button>
          {saved && <span className="inline-flex items-center gap-1" style={{ color: "var(--ok)" }}><Check size={15} />Saved</span>}
        </div>
      )}
      {canEdit && (
        <section className="card p-5 flex items-center gap-4">
          <div className="flex-1"><h2 className="font-semibold">Import data</h2><p className="text-[12.5px] text-ink-3">Organizations, buildings, equipment, contacts and contracts from GamePlanPro CSV exports.</p></div>
          <Link href="/import" className="btn">Open import</Link>
        </section>
      )}
      {apiEnabled && canEdit && <Users />}
      <MyPassword />
      {canEdit && <AuditLog />}
    </div>
  );
}
