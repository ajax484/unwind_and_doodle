import { Role, Permission, ALL_PERMISSIONS } from '../types/admin-team';
import { AdminOrganizationContext } from './auth.service';

/**
 * Static mapping of roles to their permitted capabilities.
 * Easily extensible for future roles (e.g. manager, warehouse_operator, accountant).
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: [
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
  ],
  staff: [
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
    'storefront.read',
    'analytics.read',
    'organization.read',
  ],
};

/**
 * Checks if a given role possesses a specific permission.
 */
export function can(role: Role | string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase() as Role;
  const permissions = ROLE_PERMISSIONS[normalizedRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Returns the list of active permissions for a given role.
 */
export function getRolePermissions(role: Role | string | undefined | null): Permission[] {
  if (!role) return [];
  const normalizedRole = role.toLowerCase() as Role;
  return [...(ROLE_PERMISSIONS[normalizedRole] || [])];
}

/**
 * Verifies if an authenticated admin/member context has the required permission.
 */
export function hasPermission(
  context: AdminOrganizationContext,
  permission: Permission
): boolean {
  if (!context?.membership?.role) return false;
  return can(context.membership.role, permission);
}

/**
 * Asserts that the authenticated admin/member context has the required permission.
 * Throws a descriptive 403 Forbidden error if unauthorized.
 */
export function requirePermission(
  context: AdminOrganizationContext,
  permission: Permission
): void {
  if (!hasPermission(context, permission)) {
    throw new Error(
      `Forbidden: Insufficient privileges. Required permission '${permission}' for organization '${context.organization.name}'.`
    );
  }
}
