import type { AccountRole } from '@/domain/types';
import { ROUTES } from './routes';

export function roleHome(roles: AccountRole[]): string {
  if (roles.includes('participant')) return ROUTES.home;
  if (roles.includes('pendamping')) return ROUTES.guardianHome;
  if (roles.includes('moderator')) return ROUTES.moderator;
  if (roles.includes('admin')) return ROUTES.admin;
  return ROUTES.publicHome;
}
