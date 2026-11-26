import type { CvDraft, CvSchema, RegisterInput } from './types';

export const MINIMUM_AGE = 19;
export const REPORT_OTHER_LIMIT = 100;

export function validReportOtherReason(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= REPORT_OTHER_LIMIT && !/[\r\n\u2028\u2029]/.test(value);
}

/** Client-side hint only. The server is authoritative for age eligibility. */
export function ageOn(dobIso: string, today: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobIso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dob = new Date(Date.UTC(y, mo - 1, d));
  if (dob.getUTCFullYear() !== y || dob.getUTCMonth() !== mo - 1 || dob.getUTCDate() !== d) return null;
  let age = today.getUTCFullYear() - y;
  const beforeBirthday =
    today.getUTCMonth() < mo - 1 || (today.getUTCMonth() === mo - 1 && today.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

export function validateRegistration(input: RegisterInput, today?: Date): Record<string, string> {
  const e: Record<string, string> = {};
  if (input.displayName.trim().length < 2) e.displayName = 'Masukkan nama tampilan minimal 2 karakter.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) e.email = 'Masukkan alamat email yang valid.';
  if (input.password.length < 8) e.password = 'Kata sandi minimal 8 karakter.';
  const age = ageOn(input.dateOfBirth, today);
  if (age === null) e.dateOfBirth = 'Masukkan tanggal lahir yang valid.';
  else if (age < MINIMUM_AGE) e.dateOfBirth = 'Zawjan ditujukan bagi pengguna berusia 19 tahun ke atas.';
  if (!input.acceptPurpose) e.acceptPurpose = 'Mohon konfirmasi tujuan penggunaan Zawjan.';
  if (!input.acceptTerms) e.acceptTerms = 'Mohon setujui Syarat Layanan.';
  if (!input.acceptPrivacy) e.acceptPrivacy = 'Mohon setujui Kebijakan Privasi.';
  return e;
}

export function validateCvSection(schema: CvSchema, sectionId: string, draft: CvDraft): Record<string, string> {
  const section = schema.sections.find((s) => s.id === sectionId);
  const e: Record<string, string> = {};
  if (!section) return e;
  for (const f of section.fields) {
    const v = (draft.values[f.id] ?? '').trim();
    if (f.required && !v) e[f.id] = `${f.label} wajib diisi.`;
    if (f.maxLength && v.length > f.maxLength) e[f.id] = `${f.label} maksimal ${f.maxLength} karakter.`;
    if (f.kind === 'number' && v && Number.isNaN(Number(v))) e[f.id] = `${f.label} harus berupa angka.`;
  }
  return e;
}

export function validateCv(schema: CvSchema, draft: CvDraft): Record<string, string> {
  return schema.sections.reduce<Record<string, string>>(
    (acc, s) => ({ ...acc, ...validateCvSection(schema, s.id, draft) }),
    {},
  );
}
