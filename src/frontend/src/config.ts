interface AppConfig {
  backend_canister_id: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

const PLACEHOLDER = "$BACKEND_CANISTER_ID";

function isValid(id: string | undefined): id is string {
  return typeof id === "string" && id.length > 0 && id !== PLACEHOLDER;
}

export async function loadConfig(): Promise<AppConfig> {
  // 1. Check runtime-injected config first (e.g. from a <script> tag setting window.__APP_CONFIG__)
  const runtimeId = window.__APP_CONFIG__?.backend_canister_id;
  if (isValid(runtimeId)) {
    return { backend_canister_id: runtimeId };
  }

  // 2. Fetch /env.json at runtime — built by canister.yaml and copied to dist/
  //    so it always contains the real canister ID after deployment.
  try {
    const res = await fetch("/env.json");
    if (res.ok) {
      const json = (await res.json()) as Partial<AppConfig>;
      if (isValid(json.backend_canister_id)) {
        return { backend_canister_id: json.backend_canister_id };
      }
    }
  } catch {
    // env.json missing or unparseable — fall through to dead fallback
  }

  // 3. Last-resort fallback for local dev (placeholder, never reaches production)
  return { backend_canister_id: PLACEHOLDER };
}
