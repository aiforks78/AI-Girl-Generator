export type GalleryFeaturedCharacter = {
  slug: string;
  name: string;
  avatar_url: string | null;
  image_count: number;
  like_count: number;
  view_count: number;
  description?: string | null;
  tags?: string[];
};

export type GallerySceneItem = {
  id: number;
  work_slug: string | null;
  prompt: string | null;
  model_id: string | null;
  action: string | null;
  status: string;
  image_url: string | null;
  hd_url: string | null;
  image_width?: number | null;
  image_height?: number | null;
  aspect_ratio?: string | null;
  created_at?: string;
  public_id?: string | null;
  is_public?: boolean | null;
  like_count?: number;
  view_count?: number;
  video_url?: string | null;
};

export type GalleryCharacterDetail = {
  slug: string;
  name: string;
  avatar_url: string | null;
  description?: string | null;
  image_count: number;
  like_count: number;
  view_count: number;
  tags?: string[];
};

export type GalleryPagination = {
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
};
