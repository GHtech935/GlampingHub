import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  createOrUpdateCustomerFromOAuth,
  OAuthCustomerProfile,
  setSession,
} from '@/lib/auth';

type OAuthProvider = 'google' | 'facebook';

const OAUTH_STATE_COOKIE = 'oauth_state';
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);

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

interface OAuthStateCookie {
  state: string;
  provider: OAuthProvider;
  returnUrl: string;
}

function isSupportedProvider(value: string): value is OAuthProvider {
  return value === 'google' || value === 'facebook';
}

function buildLoginRedirect(origin: string, error?: string) {
  const url = new URL('/login', origin);
  if (error) {
    url.searchParams.set('error', error);
  }
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: '/' });
  return response;
}

function getRedirectUri(origin: string, provider: OAuthProvider) {
  return `${origin}/api/auth/customer/oauth/${provider}/callback`;
}

async function fetchGoogleProfile(code: string, origin: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID/SECRET are not configured');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(origin, 'google'),
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(
      `Failed to exchange Google OAuth code (${tokenResponse.status}): ${errorText}`
    );
  }

  const tokenData = await tokenResponse.json();
  const idToken = tokenData.id_token;

  if (!idToken) {
    throw new Error('Google response is missing ID token');
  }

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience: clientId,
  });

  const email = payload.email as string | undefined;

  if (!email) {
    throw new Error('Google account did not return an email address');
  }

  const profile: OAuthCustomerProfile = {
    email,
    firstName: (payload.given_name as string) || null,
    lastName: (payload.family_name as string) || null,
    emailVerified:
      payload.email_verified === true || payload.email_verified === 'true',
    provider: 'google',
  };

  return profile;
}

async function fetchFacebookProfile(code: string, origin: string) {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('FACEBOOK_APP_ID/SECRET are not configured');
  }

  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('redirect_uri', getRedirectUri(origin, 'facebook'));
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('code', code);

  const tokenResponse = await fetch(tokenUrl.toString());
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(
      `Failed to exchange Facebook OAuth code (${tokenResponse.status}): ${errorText}`
    );
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token as string | undefined;

  if (!accessToken) {
    throw new Error('Facebook response is missing access token');
  }

  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.searchParams.set('fields', 'id,email,first_name,last_name');
  profileUrl.searchParams.set('access_token', accessToken);

  const profileResponse = await fetch(profileUrl.toString());
  if (!profileResponse.ok) {
    const errorText = await profileResponse.text();
    throw new Error(
      `Failed to fetch Facebook profile (${profileResponse.status}): ${errorText}`
    );
  }

  const profileData = await profileResponse.json();
  const email = profileData.email as string | undefined;

  if (!email) {
    throw new Error('Facebook account did not provide an email address');
  }

  const profile: OAuthCustomerProfile = {
    email,
    firstName: (profileData.first_name as string) || null,
    lastName: (profileData.last_name as string) || null,
    emailVerified: false,
    provider: 'facebook',
  };

  return profile;
}

interface RouteContext {
  params: Promise<{ provider: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { provider: rawProvider } = await context.params;
  const provider = (rawProvider || '').toLowerCase();
  const origin = getAppOrigin(request);

  if (!isSupportedProvider(provider)) {
    return buildLoginRedirect(origin, 'unsupported_provider');
  }

  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');

  if (providerError) {
    return buildLoginRedirect(
      origin,
      providerError === 'access_denied' ? 'oauth_cancelled' : providerError
    );
  }

  if (!code || !state) {
    return buildLoginRedirect(origin, 'invalid_oauth_response');
  }

  const cookieStore = await cookies();
  const storedStateRaw = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!storedStateRaw) {
    return buildLoginRedirect(origin, 'missing_oauth_state');
  }

  let storedState: OAuthStateCookie | null = null;
  try {
    storedState = JSON.parse(storedStateRaw);
  } catch (error) {
    console.error('Failed to parse OAuth state cookie:', error);
  }

  if (
    !storedState ||
    storedState.state !== state ||
    storedState.provider !== provider
  ) {
    return buildLoginRedirect(origin, 'state_mismatch');
  }

  let profile: OAuthCustomerProfile;
  try {
    profile =
      provider === 'google'
        ? await fetchGoogleProfile(code, origin)
        : await fetchFacebookProfile(code, origin);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return buildLoginRedirect(origin, 'oauth_exchange_failed');
  }

  try {
    const customerSession =
      await createOrUpdateCustomerFromOAuth(profile);
    await setSession(customerSession);
  } catch (error) {
    console.error('Failed to create session from OAuth login:', error);
    return buildLoginRedirect(origin, 'oauth_session_failed');
  }

  const destination = new URL(storedState.returnUrl || '/', origin);
  const response = NextResponse.redirect(destination);
  response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: '/' });

  return response;
}
