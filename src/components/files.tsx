"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Camera, Upload, Trash2, Globe, Lock, FileText, Loader2 } from "lucide-react";
import { apiEnabled, files, type FileRow } from "@/lib/api";

export function Thumb({ id, mime, name, portal, className }: { id: number; mime: string; name: string; portal?: boolean; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { files.url(id, portal).then(setSrc).catch(() => setSrc(null)); }, [id, portal]);
  const open = () => src && window.open(src, "_blank");
  if (!mime.startsWith("image/")) {
    return <button onClick={open} className={clsx("grid place-items-center bg-sunken rounded-md text-ink-2 p-2", className)} title={name}><FileText size={22} /><span className="text-[11px] truncate max-w-full">{name}</span></button>;
  }
  return src
    ? <button onClick={open} className={clsx("block overflow-hidden rounded-md bg-sunken", className)} title={name}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt={name} className="w-full h-full object-cover" /></button>
    : <div className={clsx("grid place-items-center rounded-md bg-sunken", className)}><Loader2 size={16} className="animate-spin text-ink-3" /></div>;
}

export function WOFiles({ woId, compact }: { woId: number; compact?: boolean }) {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pub, setPub] = useState(true);
  const cam = useRef<HTMLInputElement>(null);
  const pick = useRef<HTMLInputElement>(null);
  const load = useCallback(() => { files.list(woId).then(setRows).catch((e) => setErr(e.message)); }, [woId]);
  useEffect(() => { if (apiEnabled) load(); }, [load]);

  if (!apiEnabled) return <p className="text-ink-3 text-[13px]">Photo and file upload needs the API backend.</p>;

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true); setErr(null);
    try { for (const f of Array.from(list)) await files.upload(woId, f, pub); load(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); if (cam.current) cam.current.value = ""; if (pick.current) pick.current.value = ""; }
  };

  return (
    <div className={clsx(!compact && "card p-4")}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => upload(e.target.files)} />
        <input ref={pick} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => upload(e.target.files)} />
        <button className="btn" disabled={busy} onClick={() => cam.current?.click()}><Camera size={15} />Take photo</button>
        <button className="btn" disabled={busy} onClick={() => pick.current?.click()}><Upload size={15} />Upload</button>
        <label className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 ml-1">
          <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} />Show to customer
        </label>
        {busy && <Loader2 size={16} className="animate-spin text-ink-3" />}
      </div>
      {err && <p className="text-[13px] mb-2" style={{ color: "var(--danger)" }}>{err}</p>}
      {rows.length === 0 ? <p className="text-ink-3 text-[13px]">No photos or files yet.</p> : (
        <div className={clsx("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6")}>
          {rows.map((f) => (
            <figure key={f.id} className="relative group">
              <Thumb id={f.id} mime={f.mime} name={f.name} className="w-full aspect-square" />
              <figcaption className="flex items-center gap-1 mt-1 text-[11.5px] text-ink-3">
                <button title={f.public ? "Visible on customer portal — click to hide" : "Internal — click to show to customer"}
                  onClick={() => files.setPublic(f.id, !f.public).then(load).catch((e) => setErr(e.message))}
                  className="inline-flex items-center gap-0.5" style={{ color: f.public ? "var(--ok)" : undefined }}>
                  {f.public ? <Globe size={12} /> : <Lock size={12} />}{f.public ? "Public" : "Internal"}
                </button>
                <span className="flex-1" />
                <button title="Delete" onClick={() => confirm("Delete this file?") && files.remove(f.id).then(load).catch((e) => setErr(e.message))}><Trash2 size={12} /></button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {!compact && <p className="text-[12px] text-ink-3 mt-3">Public photos appear on the customer&apos;s service report once the work is complete. Photos are resized on the device before upload.</p>}
    </div>
  );
}
