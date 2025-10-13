export type Action = 'txt2img' | 'img2img' | 'img2vid';

export type JobLite = {
  id: number;
  image_url: string | null;
  model_id: string | null;
  action: Action | null;
  status?: string | null;
  created_at?: string | null;
};

export type Related = {
  parents: JobLite[];
  children: JobLite[];
  external_sources?: string[];
};

export interface ProcessedVariants {
  urls: string[];
  selectedIndex: number;
  externalSources: string[];
  rawMap: Record<string, string>;
}

export interface ProStatus {
  isPro: boolean;
  loading: boolean;
  error?: string;
}

export type Job = {
  id: number;
  prompt: string;
  prompt_enhanced?: string | null;
  model_id: string | null;
  replicate_id?: string | null;
  action: Action;
  status: string;
  image_url: string | null;
  image_variants?: string[];
  img2img_variants?: string[];
  output_count?: number | null;
  video_url?: string | null;
  video_thumbnail_url?: string | null;
  aspect_ratio?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  created_at?: string;
  updated_at?: string;
  user_name?: string | null;
  user_avatar?: string | null;
  is_public?: boolean | null;
  public_id?: string | null;
  related?: Related;
};

export type JobListItem = Pick<Job,
  | 'id'
  | 'prompt'
  | 'model_id'
  | 'action'
  | 'status'
  | 'image_url'
  | 'image_variants'
  | 'output_count'
  | 'video_url'
  | 'aspect_ratio'
  | 'image_width'
  | 'image_height'
  | 'created_at'
  | 'related'
> & {
  error_message?: string | null;
};

// Extended fields that may be attached in some endpoints (e.g., history)
export type JobListItemExtended = JobListItem & {
  thumbnail_url?: string | null;
};
