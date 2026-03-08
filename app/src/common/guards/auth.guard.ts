import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Internal service-to-service calls bypass token auth
    const internalKey = request.headers['x-internal-key'];
    const expectedKey = process.env['INTERNAL_SERVICE_KEY'];
    if (expectedKey && internalKey && internalKey === expectedKey) {
      const internalOwnerId = request.headers['x-owner-id'] || request.query?.ownerId;
      request.user = { ownerId: internalOwnerId, email: 'internal', role: 'service' };
      return true;
    }

    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: '認証トークンが無効です',
      });
    }

    const token = authHeader.slice(7);
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { owner: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: '認証トークンが無効です',
      });
    }

    if (session.owner.status === 'DISABLED') {
      throw new ForbiddenException({
        error: 'ACCOUNT_DISABLED',
        message: 'アカウントが無効化されています',
      });
    }

    request.user = {
      ownerId: session.owner.id,
      email: session.owner.email,
      role: session.owner.role,
    };

    return true;
  }
}
