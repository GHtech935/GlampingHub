import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

type OAuthProvider = 'google' | 'facebook';

const OAUTH_STATE_COOKIE = 'oauth_state';

function getAppOrigin(request: NextRequest) {
  const envOrigin = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envOrigin) {
    try {
      return new URL(envOrigin).origin;
    } catch (error) {
      console.error('Invalid NEXT_PUBLIC_BASE_URL:', error);
    }
  }
  return request.nextUrl.origin;
}

function normalizeReturnUrl(raw: string | null, origin: string) {
  if (!raw) {
    return '/';
  }

  try {
    const resolved = new URL(raw, origin);
    if (resolved.origin !== origin) {
      return '/';
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return raw.startsWith('/') ? raw : '/';
  }
}

function getGoogleAuthorizeUrl(origin: string, state: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID is not configured');
  }

  const redirectUri = `${origin}/api/auth/customer/oauth/google/callback`;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('access_type', 'online');

  return url.toString();
}

function getFacebookAuthorizeUrl(origin: string, state: string) {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    throw new Error('FACEBOOK_APP_ID is not configured');
  }

  const redirectUri = `${origin}/api/auth/customer/oauth/facebook/callback`;
  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'email,public_profile');

  return url.toString();
}

interface RouteContext {
  params: Promise<{ provider: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { provider: rawProvider } = await context.params;
  const provider = (rawProvider || '').toLowerCase() as OAuthProvider;
  const origin = getAppOrigin(request);

  if (provider !== 'google' && provider !== 'facebook') {
    return NextResponse.json(
      { error: 'Unsupported OAuth provider' },
      { status: 400 }
    );
  }

  const state = randomBytes(16).toString('hex');
  const returnUrl = normalizeReturnUrl(
    request.nextUrl.searchParams.get('returnUrl'),
    origin
  );

  let authorizeUrl: string;
  try {
    authorizeUrl =
      provider === 'google'
        ? getGoogleAuthorizeUrl(origin, state)
        : getFacebookAuthorizeUrl(origin, state);
  } catch (error: any) {
    console.error('OAuth start error:', error);
    return NextResponse.json(
      { error: error?.message || 'OAuth provider is not configured' },
      { status: 500 }
    );
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({
      state,
      provider,
      returnUrl,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    }
  );

  return response;
}
