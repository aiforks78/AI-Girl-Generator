export interface User {
  id?: number;
  uuid: string;
  email: string;
  nickname: string;
  avatar_url: string;
  created_at?: string;
  locale?: string;
  signin_type?: string;
  signin_ip?: string;
  signin_provider?: string;
  signin_openid?: string;
  update_time?: Date;
}
