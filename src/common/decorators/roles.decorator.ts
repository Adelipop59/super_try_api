import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * Usage: @Roles('ADMIN', 'PRO')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
