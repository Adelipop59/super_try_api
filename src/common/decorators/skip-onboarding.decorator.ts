import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to skip onboarding check for specific routes
 * Use this on routes that OAuth users should be able to access before completing onboarding
 *
 * Example:
 * @SkipOnboarding()
 * @Get('profile')
 * getProfile() { ... }
 */
export const SkipOnboarding = () => SetMetadata('skipOnboarding', true);
