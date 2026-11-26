/**
 * Proposed frontend routes (design.md §3). Confirm Laravel/Inertia route names with backend teams.
 * Components use these constants; never hardcode path strings elsewhere.
 */
export const ROUTES = {
  publicHome: '/',
  login: '/masuk',
  register: '/daftar',
  start: '/mulai',
  verification: '/verifikasi',
  cvNew: '/cv/baru',
  invitePendamping: '/pendamping/undang',

  home: '/beranda',
  catalog: '/jelajahi',
  catalogAlias: '/katalog',
  candidate: (id: string) => `/calon/${encodeURIComponent(id)}`,
  requests: '/taaruf/pengajuan',
  approvals: (id: string) => `/taaruf/${encodeURIComponent(id)}/persetujuan`,
  chat: (id: string) => `/taaruf/${encodeURIComponent(id)}/obrolan`,
  account: '/akun',
  myCv: '/cv-saya',
  privacy: '/privasi',
  safety: '/keamanan',
  reportNew: '/laporan/baru',
  history: '/riwayat-taaruf',

  guardianHome: '/pendamping/beranda',
  guardianInvitations: '/pendamping/undangan',
  guardianInvitation: (id: string) => `/pendamping/undangan/${encodeURIComponent(id)}`,
  guardianApproval: (id: string) => `/pendamping/persetujuan/${encodeURIComponent(id)}`,
  guardianAssignments: '/pendamping/taaruf',
  guardianRoom: (id: string) => `/pendamping/taaruf/${encodeURIComponent(id)}`,
  guardianSettings: '/pendamping/pengaturan',

  moderator: '/moderator',
  modVerification: '/moderator/verifikasi',
  modVerificationCase: (id: string) => `/moderator/verifikasi/${encodeURIComponent(id)}`,
  modReports: '/moderator/laporan',
  modReport: (id: string) => `/moderator/laporan/${encodeURIComponent(id)}`,
  modActions: '/moderator/riwayat',

  admin: '/admin',
  adminUsers: '/admin/pengguna',
  adminAccess: '/admin/akses',
  adminAudit: '/admin/audit',

  forbidden: '/403',
  notFound: '/404',
  error: '/error',
} as const;

/** Route patterns for the standalone router (Inertia resolves pages by name instead). */
export const ROUTE_PATTERNS = {
  candidate: '/calon/:id',
  approvals: '/taaruf/:id/persetujuan',
  chat: '/taaruf/:id/obrolan',
  guardianInvitation: '/pendamping/undangan/:id',
  guardianApproval: '/pendamping/persetujuan/:id',
  guardianRoom: '/pendamping/taaruf/:id',
  modVerificationCase: '/moderator/verifikasi/:id',
  modReport: '/moderator/laporan/:id',
} as const;
