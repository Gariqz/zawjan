import type { Services } from '../interfaces';
import { MockBackend } from './backend';
import { MockPlaintextCodec } from './codec';
import { CV_SCHEMA, DEMO_LOGINS, type PersonaId } from './fixtures';
import { buildWorld } from './scenarios';

export interface MockHandle {
  services: Services;
  backend: MockBackend;
}

/** Builds the full service facade on top of the in-memory mock backend. */
export function createMockServices(opts: { scenarioId: string; persona?: PersonaId; latencyMs?: number }): MockHandle {
  const backend = new MockBackend(buildWorld(opts.scenarioId, opts.persona), { latencyMs: opts.latencyMs ?? 180 });
  const b = backend;
  const services: Services = {
    mode: 'mock',
    demo: { logins: DEMO_LOGINS.map(({ email, label }) => ({ email, label })) },
    auth: {
      getViewer: () => b.run(() => ({ ok: true, data: b.viewer() })),
      login: (i) => b.login(i.email, i.password),
      register: (i) => b.register(i),
      logout: () => b.logout(),
    },
    identity: {
      getStatus: () => b.run(() => ({ ok: true, data: b.viewer().identityStatus })),
      upload: (kind, file) => b.upload(kind, file),
      submitVerification: (i) => b.submitVerification(i.documentUploadId, i.selfieUploadId),
    },
    profile: {
      getCvSchema: () => b.run(() => ({ ok: true, data: CV_SCHEMA })),
      getCv: () => b.run(() => ({ ok: true, data: b.world.cv })),
      saveCvDraft: (v) => b.saveCv(v),
      publishCv: () => b.publishCv(),
      getNomination: () => b.run(() => ({ ok: true, data: b.world.nomination })),
      invitePendamping: (c) => b.invitePendamping(c),
      cancelNomination: () => b.cancelNomination(),
    },
    candidates: {
      browse: (preferences) => b.browse(preferences),
      getDetail: (id) => b.getDetail(id),
      getVisibility: () => b.getVisibility(),
      setVisibility: (input) => b.setVisibility(input),
    },
    introductions: {
      listRequests: () => b.listRequests(),
      get: (id) => b.getTaaruf(id),
      request: (id) => b.request(id),
      accept: (id) => b.accept(id),
      decline: (id) => b.decline(id),
      cancel: (id) => b.cancel(id),
      approveAsPendamping: (id) => b.approveAsPendamping(id),
      declineAsPendamping: (id) => b.declineAsPendamping(id),
    },
    conversations: {
      getRoom: (id) => b.getRoom(id),
      listEncryptedMessages: (id) => b.listEnvelopes(id),
      sendEncryptedMessage: (id, env) => b.sendEnvelope(id, env),
      exit: (id) => b.exit(id),
      pause: () => b.pauseOrResume(),
      resume: () => b.pauseOrResume(),
    },
    codec: new MockPlaintextCodec(),
    photos: {
      getOverview: () => b.getPhotoOverview(),
      requestGrant: (ids) => b.requestGrant(ids),
      confirmAsOwnerPendamping: (id) => b.confirmGrant(id),
      revoke: (id) => b.revokeGrant(id),
    },
    safety: { submitReport: (i) => b.submitReport(i), blockUser: (id) => b.block(id) },
    pendamping: {
      getHome: () => b.pendampingHome(),
      getInvitation: (id) => b.getInvitation(id),
      acceptInvitation: (id) => b.respondInvitation(id, true),
      declineInvitation: (id) => b.respondInvitation(id, false),
      withdraw: (id) => b.withdraw(id),
    },
    moderator: {
      getOverview: () => b.staffOverview(),
      listVerificationCases: (f) => b.listVerification(f),
      getVerificationCase: (id) => b.getVerification(id),
      reviewVerification: (id, d) => b.reviewVerification(id, d),
      listReports: (f) => b.listReportCases(f),
      getReportEvidence: (id) => b.getReportCase(id),
      updateReportCase: (id, a) => b.updateReport(id, a),
      listMyActions: (p) => b.listMyActions(p),
    },
    admin: {
      listUsers: (q, p) => b.listUsers(q, p),
      actOnUser: (id, a) => b.actOnUser(id, a),
      listRoleAssignments: () => b.listRoles(),
      listAudit: (f) => b.listAudit(f),
    },
    events: { subscribe: (l) => b.subscribe(l) },
  };
  return { services, backend };
}
