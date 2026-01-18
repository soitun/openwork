# LiteLLM Proxy Integration Design

## Overview

Add LiteLLM as a proxy platform option alongside OpenRouter in the Settings > Proxy Platforms tab. LiteLLM is a self-hosted proxy that allows users to access multiple AI providers through a single endpoint.

## Key Differences from OpenRouter

| Aspect | OpenRouter | LiteLLM |
|--------|------------|---------|
| Hosting | Cloud service | Self-hosted |
| URL | Fixed (`https://openrouter.ai/api/v1`) | User-provided (e.g., `http://localhost:4000`) |
| API Key | Required (`sk-or-...`) | Optional (for authenticated instances) |
| Model Discovery | API returns all available models | Returns only models configured on user's proxy |

## Implementation Sections

### Section 1: Types and Storage (packages/shared + main/store)

**Files to modify:**
- `packages/shared/src/types/provider.ts` - Add `LiteLLMModel` and `LiteLLMConfig` types
- `apps/desktop/src/main/store/secureStorage.ts` - Add `'litellm'` to `ApiKeyProvider` type
- `apps/desktop/src/main/store/appSettings.ts` - Add `getLiteLLMConfig()` and `setLiteLLMConfig()` functions

**Types to add:**
```typescript
// In provider.ts
export interface LiteLLMModel {
  id: string;           // e.g., "openai/gpt-4"
  name: string;         // Display name
  provider: string;     // Extracted from model ID
  contextLength: number;
}

export interface LiteLLMConfig {
  baseUrl: string;      // e.g., "http://localhost:4000"
  enabled: boolean;
  lastValidated?: number;
  models?: LiteLLMModel[];
}
```

---

### Section 2: IPC Handlers (main/ipc/handlers.ts)

**Add handlers:**
1. `litellm:test-connection` - Test connection to LiteLLM proxy URL and fetch models
2. `litellm:fetch-models` - Fetch available models from a connected LiteLLM proxy
3. `litellm:get-config` - Get stored LiteLLM configuration
4. `litellm:set-config` - Save LiteLLM configuration

**Validation logic:**
- Validate URL format (http/https only)
- Make GET request to `${baseUrl}/v1/models` with optional Bearer token
- Parse response: `{ data: [{ id, object, created, owned_by }] }`
- Return success with models list or error message

**Add 'litellm' to `ALLOWED_API_KEY_PROVIDERS`:**
```typescript
const ALLOWED_API_KEY_PROVIDERS = new Set([
  'anthropic', 'openai', 'openrouter', 'google', 'xai', 'deepseek', 'zai', 'custom', 'bedrock', 'litellm'
]);
```

---

### Section 3: Preload API (preload/index.ts)

**Add IPC methods:**
```typescript
// LiteLLM configuration
testLiteLLMConnection: (url: string, apiKey?: string): Promise<{
  success: boolean;
  models?: Array<{ id: string; name: string; provider: string; contextLength: number }>;
  error?: string;
}> => ipcRenderer.invoke('litellm:test-connection', url, apiKey),

fetchLiteLLMModels: (): Promise<{
  success: boolean;
  models?: Array<{ id: string; name: string; provider: string; contextLength: number }>;
  error?: string;
}> => ipcRenderer.invoke('litellm:fetch-models'),

getLiteLLMConfig: (): Promise<{ baseUrl: string; enabled: boolean; lastValidated?: number; models?: Array<...> } | null> =>
  ipcRenderer.invoke('litellm:get-config'),

setLiteLLMConfig: (config: { baseUrl: string; enabled: boolean; lastValidated?: number; models?: Array<...> } | null): Promise<void> =>
  ipcRenderer.invoke('litellm:set-config', config),
```

---

### Section 4: Renderer API Wrapper (renderer/lib/accomplish.ts)

**Add typed methods to match preload:**
- `testLiteLLMConnection(url: string, apiKey?: string)`
- `fetchLiteLLMModels()`
- `getLiteLLMConfig()`
- `setLiteLLMConfig(config)`

---

### Section 5: Settings Dialog UI (renderer/components/layout/SettingsDialog.tsx)

**Enable LiteLLM button** (currently shows "Coming soon"):
- Remove `disabled` attribute from LiteLLM platform button
- Add state variables for LiteLLM (similar to Ollama):
  - `litellmUrl`, `litellmApiKey`, `litellmModels`, `litellmConnected`, `litellmError`
  - `testingLiteLLM`, `selectedLiteLLMModel`, `savingLiteLLM`

**UI Flow (matches Ollama pattern):**
1. Show URL input field (default: `http://localhost:4000`)
2. Show optional API Key input field (placeholder: "Optional - leave empty if not required")
3. "Test Connection" button
4. On success: Show model dropdown, "Use This Model" button
5. On error: Show error message

---

### Section 6: Config Generator (main/opencode/config-generator.ts)

**Add LiteLLM provider configuration:**
```typescript
// Add LiteLLM provider configuration if enabled
const litellmConfig = getLiteLLMConfig();
const litellmApiKey = getApiKey('litellm');

if (litellmConfig?.enabled && litellmConfig.models && litellmConfig.models.length > 0) {
  const litellmModels: Record<string, LiteLLMProviderModelConfig> = {};
  for (const model of litellmConfig.models) {
    litellmModels[model.id] = {
      name: model.name,
      tools: true,
    };
  }

  providerConfig.litellm = {
    npm: '@ai-sdk/openai-compatible',
    name: 'LiteLLM',
    options: {
      baseURL: `${litellmConfig.baseUrl}/v1`,
    },
    models: litellmModels,
  };
}
```

**Add 'litellm' to enabled_providers list.**

---

### Section 7: E2E Tests (e2e/specs/settings.spec.ts)

**Add tests:**
1. `should display LiteLLM as enabled option in Proxy Platforms tab`
2. `should show URL and API key inputs when LiteLLM is selected`
3. `should validate LiteLLM URL format`
4. `should handle LiteLLM connection test flow`
5. `should allow selecting LiteLLM model after successful connection`

**Update settings.page.ts:**
- Add `litellmPlatformButton` selector (update existing one to not be disabled)
- Add `litellmUrlInput`, `litellmApiKeyInput`, `litellmTestButton`, `litellmModelSelect`

---

### Section 8: Integration Tests

**Update `secureStorage.integration.test.ts`:**
- Add `'litellm'` to `getAllApiKeys()` test expectations

---

## Implementation Order

1. **Types & Storage** - Foundation for the feature
2. **IPC Handlers** - Backend logic
3. **Preload & Renderer API** - Bridge to UI
4. **Settings Dialog UI** - User-facing interface
5. **Config Generator** - Runtime configuration
6. **Run 1 E2E test** - Verify basic flow works
7. **Full E2E tests** - Complete test coverage
8. **Integration tests** - Update existing tests
9. **CI validation** - Run lint, typecheck, all tests

## Testing Strategy

1. After implementing each section, run typecheck: `pnpm typecheck`
2. After completing backend (sections 1-3): Test manually with mock LiteLLM endpoint
3. After UI (sections 4-5): Manual UI testing
4. After E2E tests: Run single test first, then full suite
5. Final: Full CI validation (`pnpm lint && pnpm typecheck && pnpm -F @accomplish/desktop test:e2e`)

## API Details

**LiteLLM /v1/models Response Format:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "openai/gpt-4",
      "object": "model",
      "created": 1234567890,
      "owned_by": "openai"
    }
  ]
}
```

**Authentication Header (optional):**
```
Authorization: Bearer <api_key>
```
