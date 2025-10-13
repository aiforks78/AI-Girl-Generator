export interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { cachedEncodeURIComponent } from "./url-cache";

const JSON_HEADERS = {
  "Content-Type": "application/json"
};

export class SupabaseAdminClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly env: SupabaseEnv) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment is not fully configured");
    }
    this.baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
    this.headers = {
      ...JSON_HEADERS,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    };
  }

  private restUrl(path: string): string {
    const normalized = path.replace(/^\/+/, "");
    return `${this.baseUrl}/rest/v1/${normalized}`;
  }

  private rpcUrl(fn: string): string {
    const name = fn.replace(/^\/+/, "");
    return `${this.baseUrl}/rest/v1/rpc/${name}`;
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    const headers = {
      ...this.headers,
      ...(init.headers as Record<string, string> | undefined)
    };
    return fetch(url, { ...init, headers });
  }

  async rpc<T = any>(fn: string, args: Record<string, unknown>): Promise<T> {
    const response = await this.request(this.rpcUrl(fn), {
      method: "POST",
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      const detail = await safeJson(response);
      const error = new Error(`supabase_rpc_failed:${fn}:${response.status}`);
      (error as any).status = response.status;
      (error as any).detail = detail;
      throw error;
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    return (await response.json()) as T;
  }

  async select<T = any>(path: string): Promise<T> {
    const response = await this.request(this.restUrl(path));
    if (!response.ok) {
      const detail = await safeJson(response);
      const error = new Error(`supabase_select_failed:${path}:${response.status}`);
      (error as any).status = response.status;
      (error as any).detail = detail;
      throw error;
    }
    return (await response.json()) as T;
  }

  async selectSingle<T = any>(path: string): Promise<T | null> {
    const separator = path.includes("?") ? "&" : "?";
    const rows = await this.select<T[]>(`${path}${separator}limit=1`);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0];
  }

  async patch(table: string, filter: string, data: Record<string, unknown>, options?: { prefer?: string }): Promise<Response> {
    const query = filter ? (filter.startsWith("?") ? filter : `?${filter}`) : "";
    const response = await this.request(this.restUrl(`${table}${query}`), {
      method: "PATCH",
      headers: options?.prefer ? { Prefer: options.prefer } : undefined,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const detail = await safeJson(response);
      console.error(`[supabase] PATCH ${table} failed:`, {
        status: response.status,
        filter: filter,
        data: data,
        detail: detail
      });
      const error = new Error(`supabase_patch_failed:${table}:${response.status}`);
      (error as any).status = response.status;
      (error as any).detail = detail;
      throw error;
    }

    return response;
  }

  async insert(table: string, payload: Record<string, unknown> | Record<string, unknown>[], options?: { prefer?: string }): Promise<Response> {
    const body = Array.isArray(payload) ? payload : [payload];
    const response = await this.request(this.restUrl(table), {
      method: "POST",
      headers: options?.prefer ? { Prefer: options.prefer } : undefined,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const detail = await safeJson(response);
      const error = new Error(`supabase_insert_failed:${table}:${response.status}`);
      (error as any).status = response.status;
      (error as any).detail = detail;
      throw error;
    }

    return response;
  }

  async delete(table: string, filter: string, options?: { prefer?: string }): Promise<Response> {
    const query = filter ? (filter.startsWith("?") ? filter : `?${filter}`) : "";
    const response = await this.request(this.restUrl(`${table}${query}`), {
      method: "DELETE",
      headers: options?.prefer ? { Prefer: options.prefer } : undefined
    });

    if (!response.ok) {
      const detail = await safeJson(response);
      const error = new Error(`supabase_delete_failed:${table}:${response.status}`);
      (error as any).status = response.status;
      (error as any).detail = detail;
      throw error;
    }

    return response;
  }

  async userCreditsExists(userId: string): Promise<boolean> {
    const url = `${this.baseUrl}/rest/v1/user_credits?select=user_id&user_id=eq.${cachedEncodeURIComponent(userId)}`;
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`supabase_user_credits_check_failed:${response.status}`);
    }
    const data = (await response.json()) as Array<{ user_id: string }>;
    return Array.isArray(data) && data.length > 0;
  }

  async initializeUserCredits(userId: string, credits: number, reason: string): Promise<void> {
    const url = `${this.baseUrl}/rest/v1/rpc/initialize_user_credits`;
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        p_user_id: userId,
        p_initial_credits: credits,
        p_reason: reason
      })
    });

    if (!response.ok) {
      const detail = await safeJson(response);
      throw new Error(`supabase_initialize_user_failed:${response.status}:${JSON.stringify(detail)}`);
    }

    const result = await response.json().catch(() => null);
    const success = Array.isArray(result) ? Boolean(result[0]?.success) : true;
    if (!success) {
      throw new Error(`supabase_initialize_user_failed:unexpected_response`);
    }
  }

  async fetchUserProfileId(userUuid: string): Promise<number | null> {
    const url = `${this.baseUrl}/rest/v1/users?select=id&uuid=eq.${cachedEncodeURIComponent(userUuid)}`;
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`supabase_users_query_failed:${response.status}`);
    }
    const rows = (await response.json()) as Array<{ id: number }>;
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0].id ?? null;
  }

  async insertUserProfile(data: {
    uuid: string;
    email: string | null;
    nickname: string;
    avatar_url: string | null;
    signin_type: string;
    signin_provider: string;
    signin_openid: string | null;
  }): Promise<void> {
    const url = `${this.baseUrl}/rest/v1/users`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers,
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        ...data,
        update_time: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const detail = await safeJson(response);
      throw new Error(`supabase_users_insert_failed:${response.status}:${JSON.stringify(detail)}`);
    }
  }

  async updateUserProfile(id: number, data: {
    email: string | null;
    nickname: string;
    avatar_url: string | null;
    signin_type: string;
    signin_provider: string;
  }): Promise<void> {
    const url = `${this.baseUrl}/rest/v1/users?id=eq.${id}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        ...this.headers,
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        ...data,
        update_time: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const detail = await safeJson(response);
      throw new Error(`supabase_users_update_failed:${response.status}:${JSON.stringify(detail)}`);
    }
  }

  async count(table: string, filter?: string): Promise<number | null> {
    const query = filter ? (filter.startsWith("?") ? filter : `?${filter}`) : "";
    const response = await this.request(this.restUrl(`${table}${query}`), {
      headers: {
        Prefer: "count=exact",
        Range: "0-0"
      }
    });

    if (!response.ok && response.status !== 206 && response.status !== 200) {
      const detail = await safeJson(response);
      const error = new Error(`supabase_count_failed:${table}:${response.status}`);
      (error as any).status = response.status;
      (error as any).detail = detail;
      throw error;
    }

    const range = response.headers.get("content-range");
    if (!range) return null;
    const [, total] = range.split("/");
    if (!total || total === "*") return null;
    const parsed = Number(total);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async touchUserCredits(userId: string): Promise<void> {
    const url = `${this.baseUrl}/rest/v1/user_credits?user_id=eq.${cachedEncodeURIComponent(userId)}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        ...this.headers,
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ updated_at: new Date().toISOString() })
    });

    if (!response.ok) {
      const detail = await safeJson(response);
      throw new Error(`supabase_touch_user_failed:${response.status}:${JSON.stringify(detail)}`);
    }
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

export async function ensureUserRecords(options: {
  env: SupabaseEnv;
  userId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: string;
  providerUserId: string;
  signupBonus: number;
}): Promise<{ isNewUser: boolean }> {
  const client = new SupabaseAdminClient(options.env);
  const nickname = deriveNickname(options.name, options.email);
  const avatar = options.avatarUrl || null;

  const exists = await client.userCreditsExists(options.userId);
  if (!exists) {
    const reason = `Signup bonus for ${options.provider} user: ${options.email}`;
    await client.initializeUserCredits(options.userId, options.signupBonus, reason);
  }

  const profileId = await client.fetchUserProfileId(options.userId);
  if (profileId) {
    await client.updateUserProfile(profileId, {
      email: options.email || null,
      nickname,
      avatar_url: avatar,
      signin_type: "oauth",
      signin_provider: options.provider
    });
  } else {
    await client.insertUserProfile({
      uuid: options.userId,
      email: options.email || null,
      nickname,
      avatar_url: avatar ?? "/white-logo-32.png",
      signin_type: "oauth",
      signin_provider: options.provider,
      signin_openid: options.providerUserId
    });
  }

  await client.touchUserCredits(options.userId);

  return { isNewUser: !exists };
}

function deriveNickname(name: string | undefined, email: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  if (email) {
    const [local] = email.split("@");
    if (local) return local;
  }
  return "User";
}
