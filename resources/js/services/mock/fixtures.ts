/**
 * FICTIONAL development fixtures. Every name, city pairing, message and document below is invented.
 * No real KTP scans, faces, NIK, contact details or production identifiers. Do not replace with real data.
 */
import docPlaceholder from './media/doc-identity-placeholder.svg';
import selfiePlaceholder from './media/selfie-placeholder.svg';
import type {
  AdminUser, AuditEntry, CandidateSummary, CvDraft, CvSchema, CvSectionView, GuardianAssignmentSummary,
  GuardianInvitationView, IdentityStatus, PendampingApproval, PendampingNomination, PhotoGrant,
  ReportCaseDetail, RequestStatus, ConversationStatus, RoleAssignment, TaArufCloseReason,
  VerificationCaseDetail,
} from '@/domain/types';

/** Fixed mock clock so exports and tests are deterministic. */
export const MOCK_NOW = new Date('2026-11-13T02:00:00.000Z'); // 09:00 WIB
export function minutesAgo(m: number): string {
  return new Date(MOCK_NOW.getTime() - m * 60_000).toISOString();
}
export function minutesAhead(m: number): string {
  return new Date(MOCK_NOW.getTime() + m * 60_000).toISOString();
}

export type PersonaId = 'participant' | 'pendamping' | 'moderator' | 'admin';

export interface MockAccount {
  id: string;
  displayName: string;
  email?: string;
  roles: ('participant' | 'pendamping' | 'moderator' | 'admin')[];
  identityStatus: IdentityStatus;
  ageEligible: boolean;
  emailConfirmed: boolean;
}

export interface MockCandidate {
  summary: CandidateSummary;
  sections: CvSectionView[];
  lockedSections: { id: string; title: string }[];
  pendamping: { accountId: string; displayName: string };
  discoveryOptIn: boolean;
  blocked: boolean;
}

export interface MockTaaruf {
  id: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  counterpartId: string;
  requestStatus: RequestStatus;
  conversationStatus: ConversationStatus;
  exclusiveReservation: boolean;
  expiresAt?: string;
  closedReason?: TaArufCloseReason;
  closedAt?: string;
  acceptedA: boolean;
  acceptedB: boolean;
  approvalA: PendampingApproval['status'];
  approvalB: PendampingApproval['status'];
  approvalAAt?: string;
  approvalBAt?: string;
  /** Current pendamping for side A (the viewer's side). */
  pendampingA: { accountId: string; displayName: string; authorizedFrom: string; membership: 'approved' | 'withdrawn' | 'replacement_pending' };
  /** Set when exclusivity is resolved against this request by the server. */
  conflictOnAccept?: boolean;
}

export interface MockMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: 'participant' | 'pendamping';
  sentAt: string;
  body: string;
  keyEpochId: string;
}

/** Mock-only ownership fields. The real backend owns these relations; they never reach the UI. */
export type MockPhotoGrant = PhotoGrant & { ownerId: string };
export type MockAssignment = GuardianAssignmentSummary & { participantId: string; pendampingAccountId: string };
export type MockInvitation = GuardianInvitationView & { inviterId: string; inviteeAccountId: string };

export interface World {
  scenarioId: string;
  persona: PersonaId;
  /** False after logout; every call except login/register then answers UNAUTHORIZED. */
  signedIn: boolean;
  accounts: Record<PersonaId, MockAccount>;
  cv: CvDraft;
  discoveryOptIn: boolean;
  photoUploaded: boolean;
  nomination: PendampingNomination;
  candidates: MockCandidate[];
  taaruf: MockTaaruf[];
  messages: MockMessage[];
  photoGrants: MockPhotoGrant[];
  guardianInvitations: MockInvitation[];
  guardianAssignments: MockAssignment[];
  verificationCases: VerificationCaseDetail[];
  reportCases: ReportCaseDetail[];
  users: AdminUser[];
  roles: RoleAssignment[];
  audit: AuditEntry[];
  kycOutcome: IdentityStatus;
  pendampingMayCompose: boolean;
  staffCapabilitiesRevoked: boolean;
  /** 'network' makes every call reject like a dropped connection (fetch TypeError). */
  failMode?: 'service_unavailable' | 'loading' | 'network';
  rateLimited?: boolean;
  /** Report submission fails (T23) while the rest of the room keeps working. */
  reportSubmissionFails?: boolean;
  clockOffsetMinutes: number;
}

export const IDS = {
  viewer: 'acc-p-aisyah',
  pendampingA: 'acc-g-fatimah',
  replacementA: 'acc-g-khadijah',
  moderator: 'acc-m-dewi',
  admin: 'acc-a-rizal',
} as const;

/**
 * Fictional demo sign-ins. Any password is accepted except "salah-sandi". Emails use the reserved
 * contoh.id example domain; they are not real mailboxes.
 */
export const DEMO_LOGINS: { email: string; persona: PersonaId; label: string }[] = [
  { email: 'aisyah@contoh.id', persona: 'participant', label: 'Peserta — Aisyah R.' },
  { email: 'fatimah@contoh.id', persona: 'pendamping', label: 'Pendamping — Ibu Fatimah S.' },
  { email: 'dewi@contoh.id', persona: 'moderator', label: 'Moderator — Dewi' },
  { email: 'rizal@contoh.id', persona: 'admin', label: 'Admin — Rizal' },
];

export const CV_SCHEMA: CvSchema = {
  version: 'draft-2026-11',
  sections: [
    {
      id: 'dasar', title: 'Data dasar', audience: 'catalog',
      description: 'Ditampilkan di katalog kepada pengguna terverifikasi. Usia diambil dari hasil verifikasi, bukan diisi ulang.',
      fields: [
        { id: 'displayName', label: 'Nama tampilan', kind: 'text', required: true, maxLength: 40, help: 'Gunakan nama panggilan atau inisial. Jangan cantumkan NIK atau alamat lengkap.' },
        { id: 'city', label: 'Kota domisili', kind: 'text', required: true, maxLength: 40, help: 'Cukup kota/kabupaten, bukan alamat.' },
        { id: 'maritalStatus', label: 'Status perkawinan (dinyatakan)', kind: 'select', required: true, options: ['Belum pernah menikah', 'Cerai hidup', 'Cerai mati'], help: 'Status ini adalah pernyataan Anda dan tidak diverifikasi oleh Zawjan.' },
        { id: 'education', label: 'Pendidikan terakhir', kind: 'select', required: false, options: ['SMA/sederajat', 'Diploma', 'Sarjana', 'Magister', 'Doktor', 'Lainnya'] },
        { id: 'occupation', label: 'Pekerjaan / aktivitas', kind: 'text', required: false, maxLength: 60 },
      ],
    },
    {
      id: 'tentang', title: 'Tentang saya', audience: 'catalog',
      fields: [
        { id: 'about', label: 'Perkenalan singkat', kind: 'textarea', required: true, maxLength: 600 },
        { id: 'hobbies', label: 'Kegiatan yang disukai', kind: 'text', required: false, maxLength: 120 },
      ],
    },
    {
      id: 'tujuan', title: 'Tujuan dan kesiapan menikah', audience: 'after_request',
      description: 'Terlihat oleh calon setelah kedua pihak menerima pengajuan.',
      fields: [
        { id: 'readiness', label: 'Kesiapan menikah', kind: 'textarea', required: true, maxLength: 500 },
        { id: 'timeline', label: 'Perkiraan waktu', kind: 'select', required: false, options: ['Dalam 6 bulan', '6–12 bulan', 'Lebih dari 12 bulan', 'Belum ditentukan'] },
      ],
    },
    {
      id: 'kriteria', title: 'Kriteria calon', audience: 'after_request',
      fields: [{ id: 'criteria', label: 'Kriteria yang Anda harapkan', kind: 'textarea', required: true, maxLength: 500 }],
    },
    {
      id: 'domisili', title: 'Rencana domisili', audience: 'catalog',
      fields: [{ id: 'relocation', label: 'Rencana tempat tinggal setelah menikah', kind: 'select', required: true, options: ['Tetap di kota saat ini', 'Bersedia pindah', 'Didiskusikan bersama'] }],
    },
    {
      id: 'nilai', title: 'Nilai dan komunikasi', audience: 'after_request',
      description: 'Opsional. Isi hanya yang Anda nyaman bagikan.',
      fields: [
        { id: 'values', label: 'Nilai yang penting bagi Anda', kind: 'textarea', required: false, maxLength: 500, sensitive: true },
        { id: 'communication', label: 'Gaya komunikasi', kind: 'textarea', required: false, maxLength: 300 },
      ],
    },
  ],
};

export const VIEWER_CV_COMPLETE: Record<string, string> = {
  displayName: 'Aisyah R.',
  city: 'Bandung',
  maritalStatus: 'Belum pernah menikah',
  education: 'Sarjana',
  occupation: 'Perencana tata kota',
  about: 'Saya senang belajar hal baru, aktif di kegiatan literasi anak, dan menghargai komunikasi yang jujur dan tenang.',
  hobbies: 'Membaca, berkebun, bersepeda pagi',
  readiness: 'Saya ingin membangun keluarga yang saling mendukung, dengan proses yang terbuka bersama keluarga.',
  timeline: '6–12 bulan',
  criteria: 'Bertanggung jawab, terbuka berdiskusi, dan menghormati keluarga kedua belah pihak.',
  relocation: 'Didiskusikan bersama',
  values: 'Kejujuran, kesederhanaan, dan saling menghargai.',
  communication: 'Lebih nyaman berdiskusi langsung dan terjadwal.',
};

interface CandidateSeed {
  id: string; name: string; age: number; city: string; marital: string; education: string; occupation: string;
  about: string; relocation: string; pendamping: string;
}

const SEEDS: CandidateSeed[] = [
  { id: 'cand-rahman', name: 'Rahman F.', age: 29, city: 'Bandung', marital: 'Belum pernah menikah', education: 'Sarjana', occupation: 'Insinyur perangkat lunak', about: 'Senang mendaki gunung dan mengajar ngaji anak-anak di lingkungan rumah setiap akhir pekan.', relocation: 'Bersedia pindah', pendamping: 'Bapak Hasan K.' },
  { id: 'cand-yusuf', name: 'Yusuf A.', age: 27, city: 'Jakarta Selatan', marital: 'Belum pernah menikah', education: 'Magister', occupation: 'Analis keuangan', about: 'Menyukai diskusi buku sejarah dan memasak bersama keluarga.', relocation: 'Didiskusikan bersama', pendamping: 'Bapak Darmawan L.' },
  { id: 'cand-hafidz', name: 'Hafidz M.', age: 31, city: 'Yogyakarta', marital: 'Cerai hidup', education: 'Sarjana', occupation: 'Guru SMA', about: 'Pendidik yang percaya pada kesabaran dan rutinitas yang sederhana.', relocation: 'Tetap di kota saat ini', pendamping: 'Ibu Ratna W.' },
  { id: 'cand-ilham', name: 'Ilham N.', age: 28, city: 'Surabaya', marital: 'Belum pernah menikah', education: 'Diploma', occupation: 'Teknisi kelistrikan', about: 'Pekerja keras yang suka memperbaiki barang dan berkebun hidroponik.', relocation: 'Bersedia pindah', pendamping: 'Bapak Sudirman T.' },
  { id: 'cand-fikri', name: 'Fikri S.', age: 30, city: 'Bogor', marital: 'Belum pernah menikah', education: 'Sarjana', occupation: 'Dokter hewan', about: 'Menyayangi hewan, gemar bersepeda, dan ingin membangun rumah tangga yang tenang.', relocation: 'Didiskusikan bersama', pendamping: 'Ibu Laila P.' },
  { id: 'cand-daffa', name: 'Daffa P.', age: 26, city: 'Semarang', marital: 'Belum pernah menikah', education: 'Sarjana', occupation: 'Desainer grafis', about: 'Kreatif, menyukai kaligrafi kontemporer dan perjalanan ke kota kecil.', relocation: 'Bersedia pindah', pendamping: 'Bapak Agus R.' },
  { id: 'cand-arif', name: 'Arif W.', age: 33, city: 'Malang', marital: 'Cerai mati', education: 'Magister', occupation: 'Peneliti pertanian', about: 'Tenang dan terstruktur; senang berdiskusi tentang ketahanan pangan.', relocation: 'Tetap di kota saat ini', pendamping: 'Ibu Siti H.' },
];

export function buildCandidates(): MockCandidate[] {
  return SEEDS.map((s) => ({
    summary: {
      id: s.id,
      displayName: s.name,
      age: s.age,
      city: s.city,
      summary: s.about,
      declaredCriteria: { maritalStatus: s.marital, education: s.education, occupation: s.occupation, relocation: s.relocation },
      verificationFacts: [
        { kind: 'identity', status: 'confirmed', checkedAt: minutesAgo(60 * 24 * 20) },
        { kind: 'age', status: 'confirmed', checkedAt: minutesAgo(60 * 24 * 20) },
        { kind: 'marital_status', status: 'declared' },
      ],
      photoVisibility: 'hidden',
    },
    sections: [
      { id: 'dasar', title: 'Data dasar', fields: [
        { label: 'Domisili', value: s.city, declared: true },
        { label: 'Status perkawinan', value: s.marital, declared: true },
        { label: 'Pendidikan terakhir', value: s.education, declared: true },
        { label: 'Pekerjaan / aktivitas', value: s.occupation, declared: true },
      ] },
      { id: 'tentang', title: 'Tentang saya', fields: [{ label: 'Perkenalan singkat', value: s.about, declared: true }] },
      { id: 'domisili', title: 'Rencana domisili', fields: [{ label: 'Setelah menikah', value: s.relocation, declared: true }] },
    ],
    lockedSections: [
      { id: 'tujuan', title: 'Tujuan dan kesiapan menikah' },
      { id: 'kriteria', title: 'Kriteria calon' },
      { id: 'nilai', title: 'Nilai dan komunikasi' },
    ],
    pendamping: { accountId: `acc-g-${s.id.slice(5)}`, displayName: s.pendamping },
    discoveryOptIn: s.id !== 'cand-arif',
    blocked: false,
  }));
}

export function baseAccounts(): Record<PersonaId, MockAccount> {
  return {
    participant: { id: IDS.viewer, displayName: 'Aisyah R.', roles: ['participant'], identityStatus: 'approved', ageEligible: true, emailConfirmed: true },
    pendamping: { id: IDS.pendampingA, displayName: 'Ibu Fatimah S.', roles: ['pendamping'], identityStatus: 'approved', ageEligible: true, emailConfirmed: true },
    moderator: { id: IDS.moderator, displayName: 'Dewi (Moderator)', roles: ['moderator'], identityStatus: 'approved', ageEligible: true, emailConfirmed: true },
    admin: { id: IDS.admin, displayName: 'Rizal (Admin)', roles: ['admin'], identityStatus: 'approved', ageEligible: true, emailConfirmed: true },
  };
}

export const PENDAMPING_A = { accountId: IDS.pendampingA, displayName: 'Ibu Fatimah S.' };

export function taaruf(partial: Partial<MockTaaruf> & Pick<MockTaaruf, 'id' | 'counterpartId' | 'direction'>): MockTaaruf {
  return {
    createdAt: minutesAgo(60 * 26),
    requestStatus: 'pending_recipient',
    conversationStatus: 'locked',
    exclusiveReservation: false,
    acceptedA: partial.direction === 'outgoing',
    acceptedB: partial.direction === 'incoming',
    approvalA: 'invited',
    approvalB: 'invited',
    pendampingA: { ...PENDAMPING_A, authorizedFrom: minutesAgo(60 * 24 * 30), membership: 'approved' },
    ...partial,
  };
}

export const ROOM_ID = 'tar-rahman';

export function activeRoomMessages(): MockMessage[] {
  const m = (i: number, senderId: string, role: 'participant' | 'pendamping', mins: number, body: string): MockMessage => ({
    id: `msg-${i}`, roomId: ROOM_ID, senderId, senderRole: role, sentAt: minutesAgo(mins), body, keyEpochId: 'epoch-1',
  });
  return [
    m(1, 'acc-g-rahman', 'pendamping', 600, "Assalamu'alaikum. Saya Hasan, pendamping Rahman. Semoga perkenalan ini berjalan baik dan saling menghormati."),
    m(2, IDS.pendampingA, 'pendamping', 590, "Wa'alaikumussalam, Pak Hasan. Saya Fatimah, pendamping Aisyah. Terima kasih, mari kita jalani dengan tenang."),
    m(3, 'cand-rahman', 'participant', 560, "Assalamu'alaikum Aisyah. Terima kasih sudah menerima pengajuan saya. Boleh saya bertanya tentang kegiatan literasi anak yang Anda ikuti?"),
    m(4, IDS.viewer, 'participant', 540, "Wa'alaikumussalam. Tentu. Saya membantu taman baca di dekat rumah setiap Sabtu pagi. Kalau Anda, bagaimana dengan kegiatan mengajar ngaji?"),
    m(5, 'cand-rahman', 'participant', 520, 'Saya mengajar anak-anak usia SD setelah Maghrib, dua kali seminggu. Bagaimana pandangan Anda tentang tinggal dekat keluarga setelah menikah?'),
    m(6, IDS.viewer, 'participant', 120, 'Saya terbuka untuk mendiskusikannya bersama keluarga. Yang penting kita bisa saling mendukung dan tetap dekat dengan orang tua.'),
  ];
}

export function baseNomination(): PendampingNomination {
  return {
    id: 'nom-1', status: 'accepted', inviteeMasked: 'f•••••@contoh.id', pendampingDisplayName: 'Ibu Fatimah S.',
    pendampingIdentity: 'approved', sentAt: minutesAgo(60 * 24 * 32),
  };
}

export function baseVerificationCases(): VerificationCaseDetail[] {
  const doc = (n: number) => [
    { id: `doc-${n}-a`, label: 'Dokumen identitas (contoh fiktif)', protectedUrl: docPlaceholder },
    { id: `doc-${n}-b`, label: 'Swafoto (ilustrasi fiktif)', protectedUrl: selfiePlaceholder },
  ];
  return [
    { id: 'vc-101', caseRef: 'VER-2611-101', submittedAt: minutesAgo(95), stage: 'needs_manual_review', ageEligibility: 'eligible', state: 'pending', assignee: 'Dewi (Moderator)', applicantDisplayName: 'Nadia K.', applicantRole: 'participant', maskedDocumentNumber: '•••• •••• •••• 0000', automatedResult: { outcome: 'low_quality', reason: 'Foto dokumen buram pada area tanggal lahir; pemeriksaan otomatis tidak yakin.' }, documents: doc(101), audit: [{ id: 'au-1', at: minutesAgo(95), actor: 'Sistem', action: 'Dialihkan ke tinjauan manual', entity: 'VER-2611-101' }] },
    { id: 'vc-102', caseRef: 'VER-2611-102', submittedAt: minutesAgo(180), stage: 'needs_manual_review', ageEligibility: 'unknown', state: 'pending', applicantDisplayName: 'Bapak Imran S.', applicantRole: 'pendamping', maskedDocumentNumber: '•••• •••• •••• 0000', automatedResult: { outcome: 'timeout', reason: 'Layanan pemeriksaan otomatis tidak merespons dalam batas waktu.' }, documents: doc(102), audit: [{ id: 'au-2', at: minutesAgo(180), actor: 'Sistem', action: 'Dialihkan ke tinjauan manual', entity: 'VER-2611-102' }] },
    { id: 'vc-103', caseRef: 'VER-2611-103', submittedAt: minutesAgo(400), stage: 'needs_manual_review', ageEligibility: 'eligible', state: 'pending', applicantDisplayName: 'Salma T.', applicantRole: 'participant', maskedDocumentNumber: '•••• •••• •••• 0000', automatedResult: { outcome: 'face_mismatch', reason: 'Kemiripan wajah dengan dokumen di bawah ambang otomatis.' }, documents: doc(103), audit: [] },
    { id: 'vc-099', caseRef: 'VER-2611-099', submittedAt: minutesAgo(1500), stage: 'approved', ageEligibility: 'eligible', state: 'approved', assignee: 'Dewi (Moderator)', applicantDisplayName: 'Hanif R.', applicantRole: 'participant', maskedDocumentNumber: '•••• •••• •••• 0000', automatedResult: { outcome: 'data_mismatch', reason: 'Nama pada formulir berbeda ejaan dengan dokumen.' }, documents: doc(99), audit: [{ id: 'au-3', at: minutesAgo(1400), actor: 'Dewi (Moderator)', action: 'Disetujui', entity: 'VER-2611-099', reason: 'Perbedaan ejaan dikonfirmasi wajar.' }] },
  ];
}

export function baseReportCases(): ReportCaseDetail[] {
  return [
    { id: 'rc-201', ref: 'LAP-2611-201', reporterDisplay: 'Pengguna #5821', subjectDisplay: 'Pengguna #3307', category: 'scam_or_money', receivedAt: minutesAgo(40), priority: 'high', status: 'received', description: 'Lawan bicara meminta transfer uang untuk "biaya keluarga".', evidence: [
      { messageId: 'ev-1', senderDisplay: 'Pengguna #3307', senderRole: 'participant', sentAt: minutesAgo(70), body: 'Bisa bantu transfer dulu untuk biaya keluarga? Nanti saya ganti.' },
      { messageId: 'ev-2', senderDisplay: 'Pengguna #3307', senderRole: 'participant', sentAt: minutesAgo(65), body: 'Jangan bilang pendamping dulu ya.' },
    ], notes: [], audit: [{ id: 'au-r1', at: minutesAgo(40), actor: 'Sistem', action: 'Laporan diterima; ruang dibekukan', entity: 'LAP-2611-201' }] },
    { id: 'rc-202', ref: 'LAP-2611-202', reporterDisplay: 'Pengguna #1180', subjectDisplay: 'Pengguna #4472', category: 'pressure', receivedAt: minutesAgo(300), priority: 'normal', assignee: 'Dewi (Moderator)', status: 'reviewing', description: 'Didesak untuk segera memutuskan dan berbagi nomor pribadi.', evidence: [
      { messageId: 'ev-3', senderDisplay: 'Pengguna #4472', senderRole: 'participant', sentAt: minutesAgo(330), body: 'Kirim nomor WA kamu sekarang, tidak usah lewat sini.' },
    ], notes: [{ at: minutesAgo(200), author: 'Dewi (Moderator)', text: 'Menunggu konteks tambahan dari pelapor bila ada.' }], audit: [] },
    { id: 'rc-203', ref: 'LAP-2611-203', reporterDisplay: 'Pengguna #7712', subjectDisplay: 'Pengguna #2004', category: 'fake_identity', receivedAt: minutesAgo(2000), priority: 'low', status: 'closed', description: 'Ragu foto profil asli.', evidence: [], notes: [], audit: [{ id: 'au-r3', at: minutesAgo(1800), actor: 'Dewi (Moderator)', action: 'Ditutup', entity: 'LAP-2611-203', reason: 'Tidak ada bukti dikirim; identitas sudah terverifikasi.' }] },
  ];
}

export function baseUsers(): AdminUser[] {
  return [
    { id: 'u-1', displayName: 'Aisyah R.', roles: ['participant'], accountState: 'active', identityStatus: 'approved', createdAt: minutesAgo(60 * 24 * 40) },
    { id: 'u-2', displayName: 'Ibu Fatimah S.', roles: ['pendamping'], accountState: 'active', identityStatus: 'approved', createdAt: minutesAgo(60 * 24 * 33) },
    { id: 'u-3', displayName: 'Pengguna #3307', roles: ['participant'], accountState: 'suspended', identityStatus: 'approved', createdAt: minutesAgo(60 * 24 * 12) },
    { id: 'u-4', displayName: 'Nadia K.', roles: ['participant'], accountState: 'active', identityStatus: 'needs_manual_review', createdAt: minutesAgo(200) },
    { id: 'u-5', displayName: 'Dewi (Moderator)', roles: ['moderator'], accountState: 'active', identityStatus: 'approved', createdAt: minutesAgo(60 * 24 * 90) },
    { id: 'u-6', displayName: 'Bapak Imran S.', roles: ['pendamping'], accountState: 'active', identityStatus: 'needs_manual_review', createdAt: minutesAgo(300) },
  ];
}

export function baseRoles(): RoleAssignment[] {
  return [
    { userId: 'u-5', displayName: 'Dewi (Moderator)', roles: ['moderator'], capabilities: ['verification.review', 'report.review', 'user.warn', 'user.suspend'] },
    { userId: 'u-7', displayName: 'Rizal (Admin)', roles: ['admin'], capabilities: ['user.manage', 'role.view', 'audit.view'] },
  ];
}

export function baseAudit(): AuditEntry[] {
  return [
    { id: 'a-1', at: minutesAgo(30), actor: 'Dewi (Moderator)', action: 'Status laporan: ditinjau', entity: 'LAP-2611-202' },
    { id: 'a-2', at: minutesAgo(120), actor: 'Rizal (Admin)', action: 'Akun ditangguhkan', entity: 'Pengguna #3307', reason: 'Menunggu hasil peninjauan laporan LAP-2611-201.' },
    { id: 'a-3', at: minutesAgo(1400), actor: 'Dewi (Moderator)', action: 'Verifikasi disetujui', entity: 'VER-2611-099', reason: 'Perbedaan ejaan dikonfirmasi wajar.' },
    { id: 'a-4', at: minutesAgo(1800), actor: 'Dewi (Moderator)', action: 'Laporan ditutup', entity: 'LAP-2611-203' },
  ];
}
