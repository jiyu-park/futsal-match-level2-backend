import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { readUser } from './auth.util.js';

// 로그인한 사람(없으면 null)을 컨트롤러에서 바로 받는다
export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) =>
  readUser(context.switchToHttp().getRequest()),
);
