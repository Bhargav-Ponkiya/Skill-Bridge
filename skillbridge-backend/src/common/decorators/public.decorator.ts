import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Attach to any resolver or controller to bypass JWT authentication */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
