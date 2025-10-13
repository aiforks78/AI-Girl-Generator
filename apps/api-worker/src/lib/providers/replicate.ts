export interface ReplicateEnv {
  REPLICATE_API_BASE?: string;
}

export function getReplicateApiBase(env: ReplicateEnv): string {
  const raw = env.REPLICATE_API_BASE?.trim();
  const base = raw && raw.length > 0 ? raw : "https://api.replicate.com/v1";
  return base.replace(/\/$/, "");
}

export function getReplicateModelsUrl(env: ReplicateEnv): string {
  return `${getReplicateApiBase(env)}/models`;
}

export function getReplicateModelUrl(env: ReplicateEnv, modelSlug: string): string {
  const base = getReplicateModelsUrl(env);
  const normalized = modelSlug.replace(/^\/+/, "");
  return `${base}/${normalized}`;
}

export function getReplicatePredictionsUrl(env: ReplicateEnv): string {
  return `${getReplicateApiBase(env)}/predictions`;
}

export function getReplicatePredictionUrl(env: ReplicateEnv, predictionId: string): string {
  const base = getReplicatePredictionsUrl(env);
  const normalized = predictionId.trim();
  return `${base}/${normalized}`;
}
