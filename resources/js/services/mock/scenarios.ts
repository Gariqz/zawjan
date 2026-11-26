/** Deterministic, FICTIONAL scenario catalogue (design.md §9.3). Development/export mode only. */
import {
  activeRoomMessages, baseAccounts, baseAudit, baseNomination, baseReportCases, baseRoles, baseUsers,
  baseVerificationCases, buildCandidates, IDS, minutesAgo, minutesAhead, taaruf, VIEWER_CV_COMPLETE,
  type PersonaId, type World,
} from './fixtures';

export interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  defaultPersona: PersonaId;
  apply?: (w: World) => void;
}

export function baseWorld(): World {
  return {
    scenarioId: 'verified_browsing',
    persona: 'participant',
    signedIn: true,
    accounts: baseAccounts(),
    cv: { values: { ...VIEWER_CV_COMPLETE }, status: 'published', updatedAt: minutesAgo(60 * 24 * 3) },
    discoveryOptIn: false,
    photoUploaded: true,
    nomination: baseNomination(),
    candidates: buildCandidates(),
    taaruf: [
      taaruf({ id: 'tar-yusuf', counterpartId: 'cand-yusuf', direction: 'incoming', createdAt: minutesAgo(180) }),
      taaruf({ id: 'tar-hafidz', counterpartId: 'cand-hafidz', direction: 'outgoing', createdAt: minutesAgo(60 * 20) }),
      taaruf({ id: 'tar-ilham', counterpartId: 'cand-ilham', direction: 'outgoing', createdAt: minutesAgo(60 * 24 * 14), requestStatus: 'declined', closedReason: 'declined_by_recipient', closedAt: minutesAgo(60 * 24 * 12) }),
    ],
    messages: [],
    photoGrants: [],
    guardianInvitations: [],
    guardianAssignments: [
      { assignmentId: 'asg-1', participantId: IDS.viewer, pendampingAccountId: IDS.pendampingA, participantDisplayName: 'Aisyah R.', status: 'active', authorizedFrom: minutesAgo(60 * 24 * 30) },
    ],
    verificationCases: baseVerificationCases(),
    reportCases: baseReportCases(),
    users: baseUsers(),
    roles: baseRoles(),
    audit: baseAudit(),
    kycOutcome: 'approved',
    pendampingMayCompose: false,
    staffCapabilitiesRevoked: false,
    clockOffsetMinutes: 0,
  };
}

function setRahman(w: World, patch: Parameters<typeof taaruf>[0]) {
  w.taaruf = [
    taaruf({ ...patch }),
    taaruf({ id: 'tar-yusuf', counterpartId: 'cand-yusuf', direction: 'incoming', createdAt: minutesAgo(180), requestStatus: 'unavailable', closedReason: 'exclusivity_unavailable', closedAt: minutesAgo(60 * 20) }),
  ];
  const asg = w.guardianAssignments[0];
  if (asg) {
    asg.activeTaArufId = 'tar-rahman';
    asg.roomStatus = patch.conversationStatus ?? 'locked';
  }
}

const reserved = { id: 'tar-rahman', counterpartId: 'cand-rahman', direction: 'outgoing' as const, createdAt: minutesAgo(60 * 22), acceptedA: true, acceptedB: true, exclusiveReservation: true };

export const SCENARIOS: ScenarioDefinition[] = [
  { id: 'verified_browsing', title: 'Peserta terverifikasi, menjelajah', description: 'Identitas disetujui, CV terbit, pendamping aktif; satu pengajuan masuk dan satu keluar.', defaultPersona: 'participant' },
  { id: 'unverified', title: 'Belum verifikasi', description: 'Akun baru; verifikasi identitas belum dimulai.', defaultPersona: 'participant', apply: (w) => {
    w.accounts.participant.identityStatus = 'not_started';
    w.cv = { values: {}, status: 'empty' };
    w.nomination = { id: 'nom-1', status: 'not_invited' };
    w.taaruf = [];
    w.photoUploaded = false;
  } },
  { id: 'verification_pending', title: 'Verifikasi otomatis berjalan', description: 'Dokumen terkirim; pemeriksaan otomatis berlangsung.', defaultPersona: 'participant', apply: (w) => {
    w.accounts.participant.identityStatus = 'automated_check'; w.taaruf = [];
  } },
  { id: 'verification_manual_review', title: 'Perlu tinjauan manual', description: 'Pemeriksaan otomatis gagal yakin; menunggu moderator.', defaultPersona: 'participant', apply: (w) => {
    w.accounts.participant.identityStatus = 'needs_manual_review'; w.taaruf = [];
  } },
  { id: 'verification_rejected', title: 'Perlu perbaikan dokumen', description: 'Moderator meminta unggah ulang dokumen.', defaultPersona: 'participant', apply: (w) => {
    w.accounts.participant.identityStatus = 'resubmission_required'; w.taaruf = [];
  } },
  { id: 'kyc_unavailable', title: 'Layanan verifikasi tidak tersedia', description: 'Penyedia verifikasi tidak dapat dihubungi (T02).', defaultPersona: 'participant', apply: (w) => {
    w.accounts.participant.identityStatus = 'temporarily_unavailable'; w.taaruf = []; w.kycOutcome = 'temporarily_unavailable';
  } },
  { id: 'underage', title: 'Di bawah 19 tahun', description: 'Server menyatakan akun belum memenuhi ketentuan usia (T01).', defaultPersona: 'participant', apply: (w) => {
    w.accounts.participant.ageEligible = false; w.accounts.participant.identityStatus = 'rejected'; w.taaruf = [];
  } },
  { id: 'cv_incomplete', title: 'CV belum lengkap', description: 'Identitas disetujui; CV masih draf.', defaultPersona: 'participant', apply: (w) => {
    w.cv = { values: { displayName: 'Aisyah R.', city: 'Bandung' }, status: 'draft', updatedAt: minutesAgo(30) }; w.taaruf = [];
  } },
  { id: 'no_pendamping', title: 'Belum ada pendamping', description: 'CV terbit; pendamping belum diundang.', defaultPersona: 'participant', apply: (w) => {
    w.nomination = { id: 'nom-1', status: 'not_invited' }; w.taaruf = [];
  } },
  { id: 'pendamping_invite_sent', title: 'Undangan pendamping terkirim', description: 'Menunggu calon pendamping menerima dan terverifikasi.', defaultPersona: 'participant', apply: (w) => {
    w.nomination = { id: 'nom-1', status: 'sent', inviteeMasked: 'f•••••@contoh.id', sentAt: minutesAgo(90), expiresAt: minutesAhead(60 * 24 * 6), pendampingIdentity: 'not_started' }; w.taaruf = [];
  } },
  { id: 'pending_request', title: 'Pengajuan terkirim', description: 'Pengajuan ke Rahman menunggu tanggapan (T05).', defaultPersona: 'participant', apply: (w) => {
    w.taaruf = [taaruf({ id: 'tar-rahman', counterpartId: 'cand-rahman', direction: 'outgoing', createdAt: minutesAgo(45) })];
  } },
  { id: 'two_pendamping_waiting', title: 'Menunggu dua pendamping', description: 'Kedua peserta menerima; reservasi eksklusif; dua persetujuan pendamping tertunda (T06).', defaultPersona: 'participant', apply: (w) => {
    setRahman(w, { ...reserved, requestStatus: 'waiting_pendamping', approvalA: 'pending', approvalB: 'pending', expiresAt: minutesAhead(60 * 47) });
  } },
  { id: 'one_approved', title: '1 dari 2 pendamping setuju', description: 'Pendamping pihak lain telah menyetujui (T08).', defaultPersona: 'participant', apply: (w) => {
    setRahman(w, { ...reserved, requestStatus: 'waiting_pendamping', approvalA: 'pending', approvalB: 'approved', approvalBAt: minutesAgo(50), expiresAt: minutesAhead(60 * 30) });
  } },
  { id: 'active_four_member_chat', title: 'Ruang aktif empat anggota', description: 'Kedua pendamping menyetujui; percakapan aktif (T09).', defaultPersona: 'participant', apply: (w) => {
    setRahman(w, { ...reserved, requestStatus: 'active', conversationStatus: 'active', approvalA: 'approved', approvalB: 'approved', approvalAAt: minutesAgo(640), approvalBAt: minutesAgo(620) });
    w.messages = activeRoomMessages();
  } },
  { id: 'guardian_declines', title: 'Pendamping tidak menyetujui', description: 'Pengajuan dibatalkan; eksklusivitas dilepas (T10).', defaultPersona: 'participant', apply: (w) => {
    setRahman(w, { ...reserved, exclusiveReservation: false, requestStatus: 'cancelled', closedReason: 'pendamping_declined', closedAt: minutesAgo(20), approvalA: 'approved', approvalB: 'declined', approvalBAt: minutesAgo(20) });
    w.taaruf = w.taaruf.slice(0, 1);
  } },
  { id: 'guardian_withdrawn', title: 'Pendamping mengundurkan diri', description: 'Ruang dijeda menunggu pengganti (T11).', defaultPersona: 'participant', apply: (w) => {
    setRahman(w, { ...reserved, requestStatus: 'active', conversationStatus: 'paused_guardian_missing', approvalA: 'withdrawn', approvalB: 'approved', pendampingA: { accountId: IDS.pendampingA, displayName: 'Ibu Fatimah S.', authorizedFrom: minutesAgo(60 * 24 * 30), membership: 'withdrawn' } });
    w.messages = activeRoomMessages();
    w.nomination = { id: 'nom-2', status: 'not_invited' };
  } },
  { id: 'replacement_pendamping', title: 'Pendamping pengganti', description: 'Pengganti hanya melihat pesan sejak otorisasinya (T12).', defaultPersona: 'pendamping', apply: (w) => {
    setRahman(w, { ...reserved, requestStatus: 'active', conversationStatus: 'active', approvalA: 'approved', approvalB: 'approved', pendampingA: { accountId: IDS.replacementA, displayName: 'Ibu Khadijah N.', authorizedFrom: minutesAgo(200), membership: 'approved' } });
    w.messages = activeRoomMessages();
    w.accounts.pendamping = { id: IDS.replacementA, displayName: 'Ibu Khadijah N.', roles: ['pendamping'], identityStatus: 'approved', ageEligible: true, emailConfirmed: true };
    w.guardianAssignments = [{ assignmentId: 'asg-2', participantId: IDS.viewer, pendampingAccountId: IDS.replacementA, participantDisplayName: 'Aisyah R.', status: 'active', activeTaArufId: 'tar-rahman', roomStatus: 'active', authorizedFrom: minutesAgo(200) }];
    w.nomination = { ...baseNomination(), pendampingDisplayName: 'Ibu Khadijah N.' };
  } },
  { id: 'simultaneous_acceptance_conflict', title: 'Konflik penerimaan bersamaan', description: 'Menerima pengajuan Yusuf akan kalah dari reservasi lain yang lebih dulu tercatat (T07).', defaultPersona: 'participant', apply: (w) => {
    const y = w.taaruf.find((t) => t.id === 'tar-yusuf');
    if (y) y.conflictOnAccept = true;
  } },
  { id: 'exclusivity_conflict_result', title: 'Hasil konflik eksklusivitas', description: 'Pengajuan tidak dapat dilanjutkan; pesan netral.', defaultPersona: 'participant', apply: (w) => {
    const y = w.taaruf.find((t) => t.id === 'tar-yusuf');
    if (y) { y.requestStatus = 'unavailable'; y.closedReason = 'exclusivity_unavailable'; y.closedAt = minutesAgo(1); }
  } },
  { id: 'report_submitted', title: 'Laporan terkirim', description: 'Ruang dibekukan; eksklusivitas dilepas (T14/T15).', defaultPersona: 'participant', apply: (w) => {
    setRahman(w, { ...reserved, exclusiveReservation: false, requestStatus: 'active', conversationStatus: 'frozen_reported', closedReason: 'reported', closedAt: minutesAgo(5), approvalA: 'approved', approvalB: 'approved' });
    w.messages = activeRoomMessages();
  } },
  { id: 'conversation_ended', title: "Ta'aruf berakhir", description: 'Riwayat hanya-baca; pelaporan tetap tersedia (T17).', defaultPersona: 'participant', apply: (w) => {
    setRahman(w, { ...reserved, exclusiveReservation: false, requestStatus: 'active', conversationStatus: 'ended', closedReason: 'participant_exit', closedAt: minutesAgo(60), approvalA: 'approved', approvalB: 'approved' });
    w.messages = activeRoomMessages();
  } },
  { id: 'blocked_user', title: 'Pengguna diblokir', description: 'Yusuf diblokir: hilang dari Jelajahi dan URL langsung (T16).', defaultPersona: 'participant', apply: (w) => {
    const c = w.candidates.find((x) => x.summary.id === 'cand-yusuf'); if (c) c.blocked = true;
    w.taaruf = w.taaruf.filter((t) => t.counterpartId !== 'cand-yusuf');
  } },
  { id: 'photo_authorized', title: 'Foto dibagikan', description: 'Rahman membagikan foto kepada Aisyah; Aisyah membagikan kepada Rahman.', defaultPersona: 'participant', apply: (w) => {
    setRahman(w, { ...reserved, requestStatus: 'active', conversationStatus: 'active', approvalA: 'approved', approvalB: 'approved' });
    w.messages = activeRoomMessages();
    w.photoGrants = [
      { id: 'pg-1', ownerId: IDS.viewer, recipientId: 'cand-rahman', recipientDisplayName: 'Rahman F.', recipientRole: 'participant', status: 'active', updatedAt: minutesAgo(90) },
      { id: 'pg-2', ownerId: 'cand-rahman', recipientId: IDS.viewer, recipientDisplayName: 'Aisyah R.', recipientRole: 'participant', status: 'active', updatedAt: minutesAgo(90) },
    ];
  } },
  { id: 'photo_pending_pendamping', title: 'Foto menunggu pendamping', description: 'Aisyah meminta berbagi foto; menunggu konfirmasi Ibu Fatimah.', defaultPersona: 'participant', apply: (w) => {
    setRahman(w, { ...reserved, requestStatus: 'active', conversationStatus: 'active', approvalA: 'approved', approvalB: 'approved' });
    w.messages = activeRoomMessages();
    w.photoGrants = [{ id: 'pg-1', ownerId: IDS.viewer, recipientId: 'cand-rahman', recipientDisplayName: 'Rahman F.', recipientRole: 'participant', status: 'pendamping_pending', updatedAt: minutesAgo(15) }];
  } },
  { id: 'photo_revoked', title: 'Akses foto dicabut', description: 'Aisyah mencabut akses; percakapan tetap berjalan (T13).', defaultPersona: 'participant', apply: (w) => {
    setRahman(w, { ...reserved, requestStatus: 'active', conversationStatus: 'active', approvalA: 'approved', approvalB: 'approved' });
    w.messages = activeRoomMessages();
    w.photoGrants = [{ id: 'pg-1', ownerId: IDS.viewer, recipientId: 'cand-rahman', recipientDisplayName: 'Rahman F.', recipientRole: 'participant', status: 'revoked', updatedAt: minutesAgo(3) }];
  } },
  { id: 'catalog_no_results', title: 'Jelajahi kosong', description: 'Tidak ada profil untuk ditampilkan.', defaultPersona: 'participant', apply: (w) => {
    w.candidates = []; w.taaruf = [];
  } },
  { id: 'pendamping_invitation', title: 'Undangan pendamping (sisi pendamping)', description: 'Ibu Fatimah menerima undangan dari Aisyah.', defaultPersona: 'pendamping', apply: (w) => {
    w.guardianAssignments = []; w.taaruf = [];
    w.nomination = { id: 'nom-1', status: 'sent', inviteeMasked: 'f•••••@contoh.id', sentAt: minutesAgo(90) };
    w.guardianInvitations = [{ id: 'inv-1', inviterId: IDS.viewer, inviteeAccountId: IDS.pendampingA, inviterDisplayName: 'Aisyah R.', status: 'pending', sentAt: minutesAgo(90), expiresAt: minutesAhead(60 * 24 * 6), viewerIdentityStatus: 'approved' }];
  } },
  { id: 'pendamping_unverified', title: 'Pendamping belum verifikasi', description: 'Undangan tidak dapat diterima sebelum identitas pendamping terverifikasi (T03).', defaultPersona: 'pendamping', apply: (w) => {
    w.guardianAssignments = []; w.taaruf = [];
    w.accounts.pendamping.identityStatus = 'not_started';
    w.guardianInvitations = [{ id: 'inv-1', inviterId: IDS.viewer, inviteeAccountId: IDS.pendampingA, inviterDisplayName: 'Aisyah R.', status: 'pending', sentAt: minutesAgo(90), expiresAt: minutesAhead(60 * 24 * 6), viewerIdentityStatus: 'not_started' }];
  } },
  { id: 'moderator_queue_empty', title: 'Antrean moderator kosong', description: 'Tidak ada kasus tertunda.', defaultPersona: 'moderator', apply: (w) => {
    w.verificationCases = []; w.reportCases = [];
  } },
  { id: 'permission_denied', title: 'Akses ditolak', description: 'Akun staf tanpa kapabilitas yang diperlukan.', defaultPersona: 'moderator', apply: (w) => {
    w.staffCapabilitiesRevoked = true;
  } },
  { id: 'network_offline', title: 'Koneksi terputus', description: 'Setiap panggilan gagal seperti jaringan putus (promise ditolak); layar menampilkan pesan koneksi dan tombol coba lagi.', defaultPersona: 'participant', apply: (w) => { w.failMode = 'network'; } },
  { id: 'signed_out', title: 'Belum masuk / sudah keluar', description: 'Sesi tidak aktif: halaman terlindungi meminta masuk. Gunakan akun demo di halaman Masuk.', defaultPersona: 'participant', apply: (w) => { w.signedIn = false; } },
  { id: 'service_error', title: 'Layanan tidak tersedia', description: 'Semua panggilan gagal dengan SERVICE_UNAVAILABLE (T22).', defaultPersona: 'participant', apply: (w) => { w.failMode = 'service_unavailable'; } },
  { id: 'report_submission_failed', title: 'Laporan gagal terkirim', description: 'Ruang aktif, tetapi pengiriman laporan gagal; keluar aman tetap tersedia (T23).', defaultPersona: 'participant', apply: (w) => {
    SCENARIOS.find((s) => s.id === 'active_four_member_chat')?.apply?.(w);
    w.reportSubmissionFails = true;
  } },
  { id: 'rate_limited', title: 'Dibatasi sementara', description: 'Tindakan mengembalikan RATE_LIMITED (T22).', defaultPersona: 'participant', apply: (w) => { w.rateLimited = true; } },
  { id: 'loading', title: 'Memuat', description: 'Data tidak pernah selesai dimuat (untuk tangkapan kerangka).', defaultPersona: 'participant', apply: (w) => { w.failMode = 'loading'; } },
];

export const DEFAULT_SCENARIO = 'verified_browsing';

export function buildWorld(scenarioId: string, persona?: PersonaId): World {
  const def = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]!;
  const w = baseWorld();
  def.apply?.(w);
  w.scenarioId = def.id;
  w.persona = persona ?? def.defaultPersona;
  return w;
}
