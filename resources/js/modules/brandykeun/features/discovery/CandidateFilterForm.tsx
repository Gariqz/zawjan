import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { participantCopy } from '@/content/id/participant';
import type { DiscoveryPreferences } from '@/domain/types';

const c = participantCopy.catalog;
const MARITAL = ['Belum pernah menikah', 'Cerai hidup', 'Cerai mati'];
const RELOCATION = ['Tetap di kota saat ini', 'Bersedia pindah', 'Didiskusikan bersama'];

export function CandidateFilterForm({ value, onApply, onReset }: { value: DiscoveryPreferences; onApply: (f: DiscoveryPreferences) => void; onReset: () => void }) {
  const [f, setF] = useState(value);
  const num = (v: string) => (v ? Number(v) : undefined);
  const ageInvalid = f.ageMin && f.ageMax && f.ageMin > f.ageMax ? c.ageInvalid : undefined;
  const submit = (e: FormEvent) => { e.preventDefault(); if (!ageInvalid) onApply({ ...f, region: f.region?.trim() }); };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" aria-label={c.filters}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={c.ageMin} optionalLabel={false} error={ageInvalid}>{(p) => <Input {...p} type="number" inputMode="numeric" min={19} max={80} value={f.ageMin ?? ''} onChange={(e) => setF({ ...f, ageMin: num(e.target.value) })} />}</Field>
        <Field label={c.ageMax} optionalLabel={false}>{(p) => <Input {...p} type="number" inputMode="numeric" min={19} max={80} value={f.ageMax ?? ''} onChange={(e) => setF({ ...f, ageMax: num(e.target.value) })} />}</Field>
      </div>
      <Field label={c.region} optionalLabel={false}>{(p) => <Input {...p} autoComplete="off" maxLength={80} value={f.region ?? ''} onChange={(e) => setF({ ...f, region: e.target.value })} />}</Field>
      <Field label={c.marital} optionalLabel={false}>{(p) => (
        <Select {...p} value={f.maritalStatus ?? ''} onChange={(e) => setF({ ...f, maritalStatus: e.target.value || undefined })}>
          <option value="">{c.any}</option>{MARITAL.map((m) => <option key={m}>{m}</option>)}
        </Select>
      )}</Field>
      <Field label={c.relocation} optionalLabel={false}>{(p) => (
        <Select {...p} value={f.relocation ?? ''} onChange={(e) => setF({ ...f, relocation: e.target.value || undefined })}>
          <option value="">{c.any}</option>{RELOCATION.map((m) => <option key={m}>{m}</option>)}
        </Select>
      )}</Field>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => { setF({}); onReset(); }}>{c.resetFilters}</Button>
        <Button type="submit" className="flex-1" disabled={!!ageInvalid}>{c.applyFilters}</Button>
      </div>
    </form>
  );
}
