import type { EncryptedMessageEnvelope, MessageView, TaArufSummary } from '@/domain/types';
import type { MessageCodec } from '../interfaces';
import { MOCK_CIPHER_PREFIX } from './backend';

/**
 * DEVELOPMENT ONLY. This codec performs NO encryption: envelopes carry fictional plaintext
 * so the UI can be exercised. `isReviewedE2EE` is false, which keeps every E2EE claim hidden.
 * Replace with the reviewed client cryptographic adapter (BrandyKeun + Khaslana + security review).
 */
export class MockPlaintextCodec implements MessageCodec {
  readonly isReviewedE2EE = false;

  async decodeForViewer(envelopes: EncryptedMessageEnvelope[], room: TaArufSummary, viewerId: string): Promise<MessageView[]> {
    const names = new Map(room.members.map((m) => [m.accountId, m.displayName]));
    return envelopes.map((e) => ({
      id: e.id,
      roomId: e.roomId,
      senderId: e.senderId,
      senderDisplayName: names.get(e.senderId) ?? 'Anggota sebelumnya',
      senderRole: e.senderRole,
      sentAt: e.sentAt,
      displayBody: e.ciphertext.startsWith(MOCK_CIPHER_PREFIX) ? decodeURIComponent(e.ciphertext.slice(MOCK_CIPHER_PREFIX.length)) : '[Tidak dapat ditampilkan]',
      mayReport: e.senderId !== viewerId,
      deliveryState: 'sent',
    }));
  }

  async encodeForRoom(room: TaArufSummary, viewerId: string, body: string): Promise<EncryptedMessageEnvelope> {
    const self = room.members.find((m) => m.accountId === viewerId);
    return {
      id: `local-${Date.now()}`,
      roomId: room.id,
      senderId: viewerId,
      senderRole: self?.role ?? 'participant',
      sentAt: new Date().toISOString(),
      ciphertext: MOCK_CIPHER_PREFIX + encodeURIComponent(body),
      keyEpochId: 'mock-epoch',
    };
  }
}
