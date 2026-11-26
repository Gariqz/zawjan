/**
 * Single source of truth for every screen: route pattern, Inertia page name, owning group, and the
 * design-export captures. The standalone router, the Inertia resolver, the dev screen index and the
 * Figma export all read this list, so designs can never drift from the components that render them.
 */
import type { ComponentType } from 'react';
import type { PersonaId } from '@/services/mock/fixtures';
import { ROUTES } from '@/routing/routes';
import PublicHomePage from '@/pages/public/PublicHomePage';
import { ForbiddenPage, NotFoundPage, ServiceErrorPage } from '@/pages/system/SystemPages';
import LoginPage from '@/modules/marinasi/pages/LoginPage';
import RegisterPage from '@/modules/marinasi/pages/RegisterPage';
import StartPage from '@/modules/marinasi/pages/StartPage';
import CvNewPage from '@/modules/marinasi/pages/CvNewPage';
import InvitePendampingPage from '@/modules/marinasi/pages/InvitePendampingPage';
import ParticipantHomePage from '@/modules/marinasi/pages/ParticipantHomePage';
import AccountPage from '@/modules/marinasi/pages/AccountPage';
import MyCvPage from '@/modules/marinasi/pages/MyCvPage';
import GuardianInvitationsPage from '@/modules/marinasi/pages/GuardianInvitationsPage';
import GuardianInvitationPage from '@/modules/marinasi/pages/GuardianInvitationPage';
import GuardianSettingsPage from '@/modules/marinasi/pages/GuardianSettingsPage';
import VerificationPage from '@/modules/brandykeun/pages/VerificationPage';
import CatalogPage from '@/modules/brandykeun/pages/CatalogPage';
import CandidateDetailPage from '@/modules/brandykeun/pages/CandidateDetailPage';
import PrivacyPage from '@/modules/brandykeun/pages/PrivacyPage';
import SafetyPage from '@/modules/brandykeun/pages/SafetyPage';
import ReportNewPage from '@/modules/brandykeun/pages/ReportNewPage';
import RequestsPage from '@/modules/khaslana/pages/RequestsPage';
import ApprovalsPage from '@/modules/khaslana/pages/ApprovalsPage';
import ChatPage from '@/modules/khaslana/pages/ChatPage';
import HistoryPage from '@/modules/khaslana/pages/HistoryPage';
import GuardianHomePage from '@/modules/khaslana/pages/GuardianHomePage';
import GuardianApprovalPage from '@/modules/khaslana/pages/GuardianApprovalPage';
import GuardianAssignmentsPage from '@/modules/khaslana/pages/GuardianAssignmentsPage';
import GuardianRoomPage from '@/modules/khaslana/pages/GuardianRoomPage';
import ModeratorOverviewPage from '@/modules/eaaa/pages/ModeratorOverviewPage';
import VerificationQueuePage from '@/modules/eaaa/pages/VerificationQueuePage';
import VerificationCasePage from '@/modules/eaaa/pages/VerificationCasePage';
import ReportsQueuePage from '@/modules/eaaa/pages/ReportsQueuePage';
import ReportCasePage from '@/modules/eaaa/pages/ReportCasePage';
import ModActionsPage from '@/modules/eaaa/pages/ModActionsPage';
import AdminOverviewPage from '@/modules/eaaa/pages/AdminOverviewPage';
import AdminUsersPage from '@/modules/eaaa/pages/AdminUsersPage';
import AdminAccessPage from '@/modules/eaaa/pages/AdminAccessPage';
import AdminAuditPage from '@/modules/eaaa/pages/AdminAuditPage';

export type Owner = 'Marinasi' | 'BrandyKeun' | 'Khaslana' | 'EAAA' | 'Shared';
/** mobile 390 and desktop 1440 are the §14 reference widths; small 360 and tablet 768 are spot checks. */
export type Viewport = 'mobile' | 'desktop' | 'small' | 'tablet';

export interface Capture {
  /** Stable id used for export file names. */
  id: string;
  label: string;
  scenario: string;
  persona?: PersonaId;
  /** Overrides the screen's example path (e.g. a different id or query string). */
  path?: string;
  /** Labels of checkboxes/radios to tick first (by accessible name). */
  check?: string[];
  /** Accessible name(s) of buttons to click in order before capturing (dialogs, next steps). */
  click?: string | string[];
  /** Shown in the manifest `notes`. */
  notes?: string;
  viewports?: Viewport[];
}

export interface ScreenEntry {
  screenId: string;
  inertiaName: string;
  title: string;
  owner: Owner;
  pattern: string;
  alias?: string;
  examplePath: string;
  component: ComponentType;
  captures: Capture[];
}

const both: Viewport[] = ['mobile', 'desktop'];
const desk: Viewport[] = ['desktop'];
const deskAndMobile: Viewport[] = ['desktop', 'mobile'];
const spot: Viewport[] = ['mobile', 'desktop', 'small', 'tablet'];
const cap = (id: string, label: string, scenario: string, extra: Omit<Capture, 'id' | 'label' | 'scenario'> = {}): Capture => ({ id, label, scenario, ...extra });

export const SCREENS: ScreenEntry[] = [
  { screenId: 'PUB-01', inertiaName: 'Public/Home', title: 'Beranda publik', owner: 'Shared', pattern: ROUTES.publicHome, examplePath: ROUTES.publicHome, component: PublicHomePage,
    captures: [cap('default', 'Default', 'verified_browsing')] },
  { screenId: 'AUTH-01', inertiaName: 'Auth/Login', title: 'Masuk', owner: 'Marinasi', pattern: ROUTES.login, examplePath: ROUTES.login, component: LoginPage,
    captures: [cap('default', 'Default', 'verified_browsing'), cap('expired', 'Sesi berakhir', 'verified_browsing', { path: `${ROUTES.login}?alasan=sesi-berakhir` }),
      cap('signed-out', 'Setelah keluar', 'signed_out', { path: `${ROUTES.login}?alasan=keluar`, notes: 'After AuthService.logout() succeeds.' })] },
  { screenId: 'AUTH-02', inertiaName: 'Auth/Register', title: 'Daftar', owner: 'Marinasi', pattern: ROUTES.register, examplePath: ROUTES.register, component: RegisterPage,
    captures: [cap('default', 'Default', 'unverified'), cap('validation', 'Validasi', 'unverified', { click: 'Daftar' })] },
  { screenId: 'ONB-01', inertiaName: 'Onboarding/Start', title: 'Langkah memulai', owner: 'Marinasi', pattern: ROUTES.start, examplePath: ROUTES.start, component: StartPage,
    captures: [cap('new', 'Akun baru', 'unverified'), cap('in-review', 'Verifikasi ditinjau', 'verification_manual_review'), cap('ready', 'Selesai', 'verified_browsing')] },
  { screenId: 'ONB-02', inertiaName: 'Onboarding/Verification', title: 'Verifikasi identitas', owner: 'BrandyKeun', pattern: ROUTES.verification, examplePath: ROUTES.verification, component: VerificationPage,
    captures: [
      cap('intro', 'Pengantar', 'unverified'),
      cap('capture', 'Unggah dokumen', 'unverified', { path: `${ROUTES.verification}?langkah=unggah` }),
      cap('checking', 'Pemeriksaan otomatis', 'verification_pending'),
      cap('manual', 'Tinjauan manual', 'verification_manual_review'),
      cap('resubmit', 'Perlu perbaikan', 'verification_rejected'),
      cap('unavailable', 'Layanan tidak tersedia', 'kyc_unavailable'),
      cap('underage', 'Di bawah 19', 'underage'),
      cap('approved', 'Disetujui', 'verified_browsing'),
    ] },
  { screenId: 'ONB-03', inertiaName: 'Onboarding/CvNew', title: 'Isi CV', owner: 'Marinasi', pattern: ROUTES.cvNew, examplePath: ROUTES.cvNew, component: CvNewPage,
    captures: [cap('draft', 'Draf', 'cv_incomplete'), cap('validation', 'Validasi', 'cv_incomplete', { click: 'Bagian berikutnya' })] },
  { screenId: 'ONB-04', inertiaName: 'Onboarding/InvitePendamping', title: 'Undang pendamping', owner: 'Marinasi', pattern: ROUTES.invitePendamping, examplePath: ROUTES.invitePendamping, component: InvitePendampingPage,
    captures: [cap('none', 'Belum diundang', 'no_pendamping'), cap('sent', 'Terkirim', 'pendamping_invite_sent'), cap('accepted', 'Aktif', 'verified_browsing')] },

  { screenId: 'PAR-01', inertiaName: 'Participant/Home', title: 'Beranda peserta', owner: 'Marinasi', pattern: ROUTES.home, examplePath: ROUTES.home, component: ParticipantHomePage,
    captures: [cap('browsing', 'Menjelajah', 'verified_browsing'), cap('unverified', 'Belum verifikasi', 'unverified'), cap('waiting', 'Menunggu pendamping', 'two_pendamping_waiting'), cap('active', 'Ruang aktif', 'active_four_member_chat'), cap('loading', 'Memuat', 'loading'), cap('error', 'Layanan gagal', 'service_error'),
      cap('offline', 'Koneksi terputus', 'network_offline', { notes: 'Service promise rejected (network failure); retry is offered.' })] },
  { screenId: 'PAR-02', inertiaName: 'Participant/Catalog', title: 'Jelajahi', owner: 'BrandyKeun', pattern: ROUTES.catalog, alias: ROUTES.catalogAlias, examplePath: ROUTES.catalog, component: CatalogPage,
    captures: [cap('results', 'Hasil', 'verified_browsing', { viewports: spot }), cap('gated', 'Terkunci (belum verifikasi)', 'verification_manual_review'), cap('empty', 'Kosong', 'catalog_no_results'), cap('exclusive', 'Dalam proses eksklusif', 'two_pendamping_waiting')] },
  { screenId: 'PAR-03', inertiaName: 'Participant/Candidate', title: 'Detail calon', owner: 'BrandyKeun', pattern: '/calon/:id', examplePath: ROUTES.candidate('cand-fikri'), component: CandidateDetailPage,
    captures: [
      cap('default', 'Default', 'verified_browsing'),
      cap('request-dialog', 'Konfirmasi pengajuan', 'verified_browsing', { click: "Ajukan Ta'aruf", viewports: both }),
      cap('staged-cv', 'CV setelah pengajuan diterima', 'photo_authorized', { path: ROUTES.candidate('cand-rahman') }),
      cap('blocked', 'Diblokir / tidak ditemukan', 'blocked_user', { path: ROUTES.candidate('cand-yusuf') }),
    ] },
  { screenId: 'PAR-04', inertiaName: 'Participant/Requests', title: 'Pengajuan', owner: 'Khaslana', pattern: ROUTES.requests, examplePath: ROUTES.requests, component: RequestsPage,
    captures: [
      cap('incoming', 'Masuk', 'verified_browsing'),
      cap('accept-dialog', 'Konfirmasi menerima', 'verified_browsing', { click: 'Terima' }),
      cap('conflict', 'Konflik penerimaan bersamaan', 'simultaneous_acceptance_conflict', { click: ['Terima', 'Terima dan mulai proses'], notes: 'T07: neutral conflict after accepting.' }),
      cap('outgoing', 'Terkirim', 'pending_request', { path: `${ROUTES.requests}?tab=outgoing` }),
      cap('history', 'Riwayat', 'exclusivity_conflict_result', { path: `${ROUTES.requests}?tab=history` }),
      cap('ongoing', 'Proses berjalan', 'two_pendamping_waiting'),
    ] },
  { screenId: 'PAR-05', inertiaName: 'Participant/Approvals', title: 'Persetujuan pendamping', owner: 'Khaslana', pattern: '/taaruf/:id/persetujuan', examplePath: ROUTES.approvals('tar-rahman'), component: ApprovalsPage,
    captures: [cap('waiting', '0 dari 2', 'two_pendamping_waiting'), cap('one', '1 dari 2', 'one_approved', { viewports: ['mobile', 'desktop', 'small'] }), cap('declined', 'Tidak disetujui', 'guardian_declines'), cap('active', 'Disetujui', 'active_four_member_chat')] },
  { screenId: 'PAR-06', inertiaName: 'Participant/Chat', title: 'Ruang percakapan', owner: 'Khaslana', pattern: '/taaruf/:id/obrolan', examplePath: ROUTES.chat('tar-rahman'), component: ChatPage,
    captures: [
      cap('active', 'Aktif', 'active_four_member_chat', { viewports: spot }),
      cap('safety-menu', 'Menu keamanan', 'active_four_member_chat', { click: 'Keamanan' }),
      cap('locked', 'Terkunci', 'two_pendamping_waiting'),
      cap('paused', 'Dijeda (pendamping keluar)', 'guardian_withdrawn'),
      cap('frozen', 'Dibekukan (laporan)', 'report_submitted'),
      cap('ended', 'Berakhir', 'conversation_ended'),
    ] },
  { screenId: 'ACC-01', inertiaName: 'Participant/Account', title: 'Akun', owner: 'Marinasi', pattern: ROUTES.account, examplePath: ROUTES.account, component: AccountPage, captures: [cap('default', 'Default', 'verified_browsing')] },
  { screenId: 'PAR-07', inertiaName: 'Participant/MyCv', title: 'CV saya', owner: 'Marinasi', pattern: ROUTES.myCv, examplePath: ROUTES.myCv, component: MyCvPage,
    captures: [cap('published', 'Terbit', 'verified_browsing'), cap('edit', 'Mode ubah', 'verified_browsing', { click: 'Ubah CV' })] },
  { screenId: 'PAR-08', inertiaName: 'Participant/Privacy', title: 'Privasi & foto', owner: 'BrandyKeun', pattern: ROUTES.privacy, examplePath: ROUTES.privacy, component: PrivacyPage,
    captures: [
      cap('no-room', 'Tanpa ruang aktif', 'verified_browsing'),
      cap('share-dialog', 'Dialog berbagi', 'active_four_member_chat', { click: 'Bagikan foto' }),
      cap('pending', 'Menunggu pendamping', 'photo_pending_pendamping'),
      cap('active', 'Akses aktif', 'photo_authorized'),
      cap('revoked', 'Dicabut', 'photo_revoked'),
    ] },
  { screenId: 'PAR-09', inertiaName: 'Participant/Safety', title: 'Keamanan', owner: 'BrandyKeun', pattern: ROUTES.safety, examplePath: ROUTES.safety, component: SafetyPage,
    captures: [cap('active', 'Dengan ruang aktif', 'active_four_member_chat'), cap('none', 'Tanpa proses', 'verified_browsing')] },
  { screenId: 'PAR-10', inertiaName: 'Participant/ReportNew', title: 'Buat laporan', owner: 'BrandyKeun', pattern: ROUTES.reportNew, examplePath: `${ROUTES.reportNew}?ruang=tar-rahman&subjek=cand-rahman`, component: ReportNewPage,
    captures: [cap('form', 'Formulir', 'active_four_member_chat'), cap('validation', 'Validasi', 'active_four_member_chat', { click: 'Tinjau laporan' }),
      cap('review', 'Tinjau', 'active_four_member_chat', { check: ['Permintaan uang atau penipuan'], click: 'Tinjau laporan' }),
      cap('success', 'Terkirim', 'active_four_member_chat', { check: ['Permintaan uang atau penipuan'], click: ['Tinjau laporan', 'Kirim laporan'] }),
      cap('failed', 'Gagal + keluar aman', 'report_submission_failed', { check: ['Permintaan uang atau penipuan'], click: ['Tinjau laporan', 'Kirim laporan'], notes: 'T23: safe exit stays available after a failed submission.' }), cap('rate-limited', 'Dibatasi', 'rate_limited', { path: `${ROUTES.reportNew}?subjek=cand-fikri` })] },
  { screenId: 'PAR-11', inertiaName: 'Participant/History', title: "Riwayat ta'aruf", owner: 'Khaslana', pattern: ROUTES.history, examplePath: ROUTES.history, component: HistoryPage,
    captures: [cap('default', 'Default', 'conversation_ended'), cap('empty', 'Kosong', 'unverified')] },

  { screenId: 'GUA-01', inertiaName: 'Pendamping/Home', title: 'Beranda pendamping', owner: 'Khaslana', pattern: ROUTES.guardianHome, examplePath: ROUTES.guardianHome, component: GuardianHomePage,
    captures: [cap('approval', 'Persetujuan menunggu', 'two_pendamping_waiting', { persona: 'pendamping' }), cap('invitation', 'Undangan baru', 'pendamping_invitation'), cap('photo', 'Konfirmasi foto', 'photo_pending_pendamping', { persona: 'pendamping' }), cap('unverified', 'Belum verifikasi', 'pendamping_unverified')] },
  { screenId: 'GUA-02a', inertiaName: 'Pendamping/Invitations', title: 'Daftar undangan', owner: 'Marinasi', pattern: ROUTES.guardianInvitations, examplePath: ROUTES.guardianInvitations, component: GuardianInvitationsPage,
    captures: [cap('default', 'Default', 'pendamping_invitation')] },
  { screenId: 'GUA-02', inertiaName: 'Pendamping/Invitation', title: 'Undangan pendamping', owner: 'Marinasi', pattern: '/pendamping/undangan/:id', examplePath: ROUTES.guardianInvitation('inv-1'), component: GuardianInvitationPage,
    captures: [cap('pending', 'Menunggu', 'pendamping_invitation'), cap('unverified', 'Identitas belum diverifikasi', 'pendamping_unverified')] },
  { screenId: 'GUA-03', inertiaName: 'Pendamping/Approval', title: "Persetujuan ta'aruf", owner: 'Khaslana', pattern: '/pendamping/persetujuan/:id', examplePath: ROUTES.guardianApproval('tar-rahman'), component: GuardianApprovalPage,
    captures: [cap('pending', 'Menunggu keputusan', 'two_pendamping_waiting', { persona: 'pendamping' }), cap('approve-dialog', 'Konfirmasi setuju', 'two_pendamping_waiting', { persona: 'pendamping', click: "Setujui ta'aruf" }), cap('decline-dialog', 'Konfirmasi tolak', 'two_pendamping_waiting', { persona: 'pendamping', click: 'Tidak menyetujui' })] },
  { screenId: 'GUA-04a', inertiaName: 'Pendamping/Assignments', title: 'Pendampingan', owner: 'Khaslana', pattern: ROUTES.guardianAssignments, examplePath: ROUTES.guardianAssignments, component: GuardianAssignmentsPage,
    captures: [cap('active', 'Ruang aktif', 'active_four_member_chat', { persona: 'pendamping' })] },
  { screenId: 'GUA-04', inertiaName: 'Pendamping/Room', title: 'Ruang (pendamping)', owner: 'Khaslana', pattern: '/pendamping/taaruf/:id', examplePath: ROUTES.guardianRoom('tar-rahman'), component: GuardianRoomPage,
    captures: [cap('observe', 'Mengikuti ruang', 'active_four_member_chat', { persona: 'pendamping' }), cap('replacement', 'Pendamping pengganti', 'replacement_pendamping')] },
  { screenId: 'GUA-05', inertiaName: 'Pendamping/Settings', title: 'Akun pendamping', owner: 'Marinasi', pattern: ROUTES.guardianSettings, examplePath: ROUTES.guardianSettings, component: GuardianSettingsPage,
    captures: [cap('default', 'Default', 'active_four_member_chat', { persona: 'pendamping' }), cap('withdraw-dialog', 'Konfirmasi mundur', 'active_four_member_chat', { persona: 'pendamping', click: 'Mengundurkan diri' })] },

  { screenId: 'MOD-01', inertiaName: 'Moderator/Overview', title: 'Ringkasan moderasi', owner: 'EAAA', pattern: ROUTES.moderator, examplePath: ROUTES.moderator, component: ModeratorOverviewPage,
    captures: [cap('default', 'Default', 'verified_browsing', { persona: 'moderator', viewports: deskAndMobile }), cap('forbidden', 'Tanpa kapabilitas', 'permission_denied', { viewports: desk })] },
  { screenId: 'MOD-02', inertiaName: 'Moderator/VerificationQueue', title: 'Antrean verifikasi', owner: 'EAAA', pattern: ROUTES.modVerification, examplePath: ROUTES.modVerification, component: VerificationQueuePage,
    captures: [cap('default', 'Default', 'verified_browsing', { persona: 'moderator', viewports: deskAndMobile }), cap('empty', 'Kosong', 'moderator_queue_empty', { viewports: desk })] },
  { screenId: 'MOD-03', inertiaName: 'Moderator/VerificationCase', title: 'Kasus verifikasi', owner: 'EAAA', pattern: '/moderator/verifikasi/:id', examplePath: ROUTES.modVerificationCase('vc-101'), component: VerificationCasePage,
    captures: [cap('default', 'Default', 'verified_browsing', { persona: 'moderator', viewports: desk }), cap('mobile-blocked', 'Layar kecil', 'verified_browsing', { persona: 'moderator', viewports: ['mobile'] })] },
  { screenId: 'MOD-04', inertiaName: 'Moderator/Reports', title: 'Laporan', owner: 'EAAA', pattern: ROUTES.modReports, examplePath: ROUTES.modReports, component: ReportsQueuePage,
    captures: [cap('default', 'Default', 'verified_browsing', { persona: 'moderator', viewports: desk })] },
  { screenId: 'MOD-05', inertiaName: 'Moderator/ReportCase', title: 'Kasus laporan', owner: 'EAAA', pattern: '/moderator/laporan/:id', examplePath: ROUTES.modReport('rc-201'), component: ReportCasePage,
    captures: [cap('default', 'Default', 'verified_browsing', { persona: 'moderator', viewports: deskAndMobile }), cap('action-dialog', 'Dialog tindakan', 'verified_browsing', { persona: 'moderator', viewports: desk, click: 'Tangguhkan akun' })] },
  { screenId: 'MOD-06', inertiaName: 'Moderator/Actions', title: 'Riwayat aksi', owner: 'EAAA', pattern: ROUTES.modActions, examplePath: ROUTES.modActions, component: ModActionsPage,
    captures: [cap('default', 'Default', 'verified_browsing', { persona: 'moderator', viewports: desk })] },
  { screenId: 'ADM-01', inertiaName: 'Admin/Overview', title: 'Ringkasan platform', owner: 'EAAA', pattern: ROUTES.admin, examplePath: ROUTES.admin, component: AdminOverviewPage,
    captures: [cap('default', 'Default', 'verified_browsing', { persona: 'admin', viewports: deskAndMobile })] },
  { screenId: 'ADM-02', inertiaName: 'Admin/Users', title: 'Pengguna', owner: 'EAAA', pattern: ROUTES.adminUsers, examplePath: ROUTES.adminUsers, component: AdminUsersPage,
    captures: [cap('default', 'Default', 'verified_browsing', { persona: 'admin', viewports: deskAndMobile }), cap('suspend-dialog', 'Dialog tangguhkan', 'verified_browsing', { persona: 'admin', viewports: desk, click: 'Tangguhkan' })] },
  { screenId: 'ADM-03', inertiaName: 'Admin/Access', title: 'Peran & akses', owner: 'EAAA', pattern: ROUTES.adminAccess, examplePath: ROUTES.adminAccess, component: AdminAccessPage,
    captures: [cap('default', 'Default', 'verified_browsing', { persona: 'admin', viewports: desk })] },
  { screenId: 'ADM-04', inertiaName: 'Admin/Audit', title: 'Log audit', owner: 'EAAA', pattern: ROUTES.adminAudit, examplePath: ROUTES.adminAudit, component: AdminAuditPage,
    captures: [cap('default', 'Default', 'verified_browsing', { persona: 'admin', viewports: desk })] },

  { screenId: 'SYS-01', inertiaName: 'System/Forbidden', title: 'Akses ditolak', owner: 'Shared', pattern: ROUTES.forbidden, examplePath: ROUTES.forbidden, component: ForbiddenPage, captures: [cap('default', 'Default', 'verified_browsing')] },
  { screenId: 'SYS-02', inertiaName: 'System/NotFound', title: 'Tidak ditemukan', owner: 'Shared', pattern: ROUTES.notFound, examplePath: ROUTES.notFound, component: NotFoundPage, captures: [cap('default', 'Default', 'verified_browsing')] },
  { screenId: 'SYS-03', inertiaName: 'System/Error', title: 'Layanan bermasalah', owner: 'Shared', pattern: ROUTES.error, examplePath: ROUTES.error, component: ServiceErrorPage, captures: [cap('default', 'Default', 'verified_browsing')] },
];

/** Default viewports for a capture: staff screens are desktop-primary. */
export function captureViewports(s: ScreenEntry, c: Capture): Viewport[] {
  return c.viewports ?? (s.owner === 'EAAA' ? desk : both);
}

/** Inertia resolver map: `resolve: (name) => INERTIA_PAGES[name]`. */
export const INERTIA_PAGES: Record<string, ComponentType> = Object.fromEntries(SCREENS.map((s) => [s.inertiaName, s.component]));
