/**
 * PROPOSED JSON endpoints for the HTTP adapters. Nothing here is agreed with the backend yet:
 * each group owner confirms or renames its routes (INTEGRATION_NOTES.md §"HTTP endpoints"),
 * then edits ONLY this file. Paths are relative to HttpClientOptions.baseUrl.
 * Auth routes match Laravel Fortify/Breeze defaults; everything else lives under /api.
 */
const id = (v: string) => encodeURIComponent(v);

export const API = {
  /* Marinasi */
  login: '/login',
  register: '/register',
  logout: '/logout',
  viewer: '/api/viewer',
  cvSchema: '/api/cv/schema',
  cv: '/api/cv',
  cvDraft: '/api/cv/draft',
  cvPublish: '/api/cv/publish',
  nomination: '/api/pendamping-nomination',

  /* BrandyKeun */
  identityStatus: '/api/identity/status',
  identityUploads: '/api/identity/uploads',
  identityVerifications: '/api/identity/verifications',
  candidate: (c: string) => `/api/candidates/${id(c)}`,
  photoGrants: '/api/photo-grants',
  photoGrantConfirm: (g: string) => `/api/photo-grants/${id(g)}/confirm`,
  photoGrantRevoke: (g: string) => `/api/photo-grants/${id(g)}/revoke`,
  reports: '/api/reports',
  blocks: '/api/blocks',

  /* Khaslana */
  taaruf: '/api/taaruf',
  taarufItem: (t: string) => `/api/taaruf/${id(t)}`,
  taarufAction: (t: string, action: 'accept' | 'decline' | 'cancel' | 'pendamping-approve' | 'pendamping-decline') => `/api/taaruf/${id(t)}/${action}`,
  room: (t: string) => `/api/taaruf/${id(t)}/room`,
  roomMessages: (t: string) => `/api/taaruf/${id(t)}/messages`,
  roomAction: (t: string, action: 'exit' | 'pause' | 'resume') => `/api/taaruf/${id(t)}/room/${action}`,
  pendampingHome: '/api/pendamping/home',
  invitation: (i: string) => `/api/pendamping/invitations/${id(i)}`,
  invitationAction: (i: string, action: 'accept' | 'decline') => `/api/pendamping/invitations/${id(i)}/${action}`,
  assignmentWithdraw: (a: string) => `/api/pendamping/assignments/${id(a)}/withdraw`,

  /* EAAA */
  modOverview: '/api/moderation/overview',
  verificationCases: '/api/moderation/verification-cases',
  verificationCase: (c: string) => `/api/moderation/verification-cases/${id(c)}`,
  verificationDecision: (c: string) => `/api/moderation/verification-cases/${id(c)}/decision`,
  reportCases: '/api/moderation/reports',
  reportCase: (c: string) => `/api/moderation/reports/${id(c)}`,
  reportCaseActions: (c: string) => `/api/moderation/reports/${id(c)}/actions`,
  myActions: '/api/moderation/my-actions',
  adminUsers: '/api/admin/users',
  adminUserActions: (u: string) => `/api/admin/users/${id(u)}/actions`,
  adminRoles: '/api/admin/roles',
  adminAudit: '/api/admin/audit',
} as const;
