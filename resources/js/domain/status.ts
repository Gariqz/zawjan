import type {
  ConversationStatus, IdentityStatus, PendampingApproval, PhotoGrantStatus, ReportCaseStatus,
  RequestStatus, TaArufCloseReason, VerificationFact,
} from './types';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

export interface StatusLabel { label: string; tone: Tone }

export const identityStatusLabel: Record<IdentityStatus, StatusLabel> = {
  not_started: { label: 'Belum dimulai', tone: 'neutral' },
  submitting: { label: 'Mengirim dokumen', tone: 'info' },
  automated_check: { label: 'Sedang diperiksa', tone: 'info' },
  needs_manual_review: { label: 'Perlu tinjauan manual', tone: 'warning' },
  approved: { label: 'Terverifikasi', tone: 'success' },
  rejected: { label: 'Tidak dapat diverifikasi', tone: 'danger' },
  resubmission_required: { label: 'Perlu perbaikan dokumen', tone: 'warning' },
  temporarily_unavailable: { label: 'Belum dapat diproses', tone: 'warning' },
};

export const requestStatusLabel: Record<RequestStatus, StatusLabel> = {
  pending_recipient: { label: 'Menunggu tanggapan', tone: 'info' },
  mutually_accepted_reserved: { label: 'Diterima kedua pihak', tone: 'brand' },
  waiting_pendamping: { label: 'Menunggu persetujuan pendamping', tone: 'warning' },
  active: { label: "Ta'aruf aktif", tone: 'success' },
  declined: { label: 'Tidak dilanjutkan', tone: 'neutral' },
  cancelled: { label: 'Dibatalkan', tone: 'neutral' },
  expired: { label: 'Kedaluwarsa', tone: 'neutral' },
  unavailable: { label: 'Tidak tersedia', tone: 'neutral' },
};

export const conversationStatusLabel: Record<ConversationStatus, StatusLabel> = {
  locked: { label: 'Belum dibuka', tone: 'neutral' },
  active: { label: 'Sedang aktif', tone: 'success' },
  paused_guardian_missing: { label: 'Dijeda — pendamping belum lengkap', tone: 'warning' },
  paused_user: { label: 'Dijeda', tone: 'warning' },
  frozen_reported: { label: 'Dibekukan karena laporan', tone: 'danger' },
  ended: { label: 'Selesai', tone: 'neutral' },
};

export const approvalStatusLabel: Record<PendampingApproval['status'], StatusLabel> = {
  invited: { label: 'Diundang', tone: 'neutral' },
  verified: { label: 'Terverifikasi, belum memutuskan', tone: 'info' },
  pending: { label: 'Menunggu persetujuan', tone: 'warning' },
  approved: { label: 'Menyetujui', tone: 'success' },
  declined: { label: 'Tidak menyetujui', tone: 'danger' },
  withdrawn: { label: 'Mengundurkan diri', tone: 'neutral' },
};

export const photoGrantStatusLabel: Record<PhotoGrantStatus, StatusLabel> = {
  requested: { label: 'Diminta', tone: 'info' },
  owner_approved: { label: 'Disetujui pemilik', tone: 'info' },
  pendamping_pending: { label: 'Menunggu konfirmasi pendamping', tone: 'warning' },
  active: { label: 'Akses aktif', tone: 'success' },
  revoked: { label: 'Dicabut', tone: 'neutral' },
};

export const reportCaseStatusLabel: Record<ReportCaseStatus, StatusLabel> = {
  received: { label: 'Diterima', tone: 'info' },
  triaged: { label: 'Dipilah', tone: 'info' },
  reviewing: { label: 'Ditinjau', tone: 'warning' },
  actioned: { label: 'Ditindaklanjuti', tone: 'success' },
  closed: { label: 'Ditutup', tone: 'neutral' },
};

export const closeReasonLabel: Record<TaArufCloseReason, string> = {
  declined_by_recipient: 'Pengajuan tidak dilanjutkan oleh penerima.',
  cancelled_by_requester: 'Pengajuan dibatalkan.',
  pendamping_declined: 'Salah satu pendamping tidak menyetujui, sehingga pengajuan dibatalkan.',
  expired: 'Batas waktu persetujuan telah berakhir.',
  participant_exit: "Salah satu peserta mengakhiri ta'aruf.",
  reported: "Ta'aruf dihentikan setelah laporan keamanan.",
  exclusivity_unavailable: "Pengajuan tidak dapat dilanjutkan karena salah satu pengguna sedang menjalani proses ta'aruf lain.",
  completed: "Ta'aruf telah diselesaikan.",
};

const factKindLabel: Record<VerificationFact['kind'], string> = {
  email: 'Email',
  identity: 'Identitas',
  age: 'Usia 19+',
  marital_status: 'Status perkawinan',
};

/** Narrow, honest fact wording. A 'declared' fact is never shown as verified. */
export function describeFact(f: VerificationFact): StatusLabel {
  const kind = factKindLabel[f.kind];
  switch (f.status) {
    case 'confirmed':
      return { label: f.kind === 'email' ? 'Email dikonfirmasi' : `${kind} terverifikasi`, tone: 'success' };
    case 'declared':
      return { label: `${kind}: dinyatakan oleh pengguna`, tone: 'neutral' };
    case 'pending':
      return { label: `${kind}: sedang diperiksa`, tone: 'info' };
    case 'rejected':
      return { label: `${kind}: belum terverifikasi`, tone: 'warning' };
    default:
      return { label: `${kind}: tidak diperiksa`, tone: 'neutral' };
  }
}

export function countApproved(approvals: PendampingApproval[]): number {
  return approvals.filter((a) => a.status === 'approved').length;
}
