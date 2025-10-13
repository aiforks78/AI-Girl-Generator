interface GoogleTokens {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string, cfg: {
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  if (!response.ok) {
    const detail = await safeJson(response);
    throw new Error(`google_token_exchange_failed:${JSON.stringify(detail)}`);
  }

  return response.json() as Promise<GoogleTokens>;
}

export async function fetchGoogleUser(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const detail = await safeJson(response);
    throw new Error(`google_userinfo_failed:${JSON.stringify(detail)}`);
  }

  return response.json() as Promise<GoogleUserInfo>;
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

