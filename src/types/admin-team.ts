import { z } from 'zod';

export const ADMIN_ROLES = ['owner', 'admin', 'staff'] as const;
export type Role = (typeof ADMIN_ROLES)[number];

export const RoleSchema = z.enum(ADMIN_ROLES);

export const ALL_PERMISSIONS = [
  'products.read',
  'products.manage',
  'bundles.read',
  'bundles.manage',
  'inventory.read',
  'inventory.manage',
  'orders.read',
  'orders.manage',
  'customers.read',
  'customers.manage',
  'discounts.read',
  'discounts.manage',
  'storefront.read',
  'storefront.manage',
  'analytics.read',
  'team.read',
  'team.manage',
  'organization.read',
  'organization.manage',
  'billing.read',
  'billing.manage',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export interface TeamMember {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  };
}

export interface TeamInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: Role;
  expiresAt: string;
  acceptedAt?: string | null;
  invitedBy?: string | null;
  createdAt: string;
  invitedByEmail?: string | null;
}

export const InviteTeamMemberSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  role: RoleSchema,
});

export type InviteTeamMemberInput = z.infer<typeof InviteTeamMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
  role: RoleSchema,
});

export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

export const AcceptInvitationSchema = z.object({
  token: z.string().trim().min(10, 'Invalid invitation token'),
});

export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;

export interface PublicInvitationDetail {
  organizationName: string;
  organizationSlug: string;
  email: string;
  role: Role;
  expiresAt: string;
  isExpired: boolean;
  isAccepted: boolean;
}
