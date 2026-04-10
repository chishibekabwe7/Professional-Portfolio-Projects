import { Injectable, Logger } from '@nestjs/common';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export interface GoogleProfile {
  email: string;
  name: string;
}

@Injectable()
export class GoogleOAuthStrategy {
  private readonly logger = new Logger(GoogleOAuthStrategy.name);
  private readonly clientId?: string;
  private readonly client?: OAuth2Client;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;

    if (this.clientId) {
      this.client = new OAuth2Client(this.clientId);
    }
  }

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    if (!this.clientId || !this.client) {
      throw new Error('GOOGLE_CLIENT_ID is not configured.');
    }

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();
    const email = this.getEmailFromPayload(payload);
    const name = String(payload?.name || '');

    if (!email) {
      throw new Error('Google token payload missing email.');
    }

    this.logger.log(`[verifyIdToken] Verified Google token for ${email}`);
    return { email, name };
  }

  private getEmailFromPayload(payload: TokenPayload | undefined): string {
    const email = payload?.email;

    if (typeof email !== 'string') {
      return '';
    }

    return email.trim().toLowerCase();
  }
}