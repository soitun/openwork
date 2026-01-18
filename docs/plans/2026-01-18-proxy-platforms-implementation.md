# Proxy Platforms Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Proxy Platforms" tab to Settings that fetches OpenRouter models dynamically with search and grouping.

**Architecture:** Three-tab layout (Cloud Providers, Local Models, Proxy Platforms). OpenRouter fetches models from API on demand, groups by provider, and allows search filtering. Remove hardcoded OpenRouter models from DEFAULT_PROVIDERS.

**Tech Stack:** React, TypeScript, Electron IPC, OpenRouter REST API

---

## Task 1: Add OpenRouterModel Type to Shared Package

**Files:**
- Modify: `packages/shared/src/types/provider.ts:35-49`

**Step 1: Add the type definition**

Add after `OllamaConfig` interface (around line 49):

```typescript
/**
 * OpenRouter model info from API
 */
export interface OpenRouterModel {
  id: string;           // e.g., "anthropic/claude-3.5-sonnet"
  name: string;         // e.g., "Claude 3.5 Sonnet"
  provider: string;     // e.g., "anthropic" (extracted from id)
  contextLength: number;
}

/**
 * OpenRouter configuration
 */
export interface OpenRouterConfig {
  models: OpenRouterModel[];
  lastFetched?: number;
}
```

**Step 2: Verify types compile**

Run: `pnpm -F @accomplish/shared build`
Expected: Success, no errors

**Step 3: Commit**

```bash
git add packages/shared/src/types/provider.ts
git commit -m "feat(shared): add OpenRouterModel and OpenRouterConfig types"
```

---

## Task 2: Remove Hardcoded OpenRouter from DEFAULT_PROVIDERS

**Files:**
- Modify: `packages/shared/src/types/provider.ts:241-273`

**Step 1: Remove the OpenRouter provider entry**

Delete the entire OpenRouter block from `DEFAULT_PROVIDERS` array (lines 241-273):

```typescript
// DELETE THIS ENTIRE BLOCK:
  {
    id: 'openrouter',
    name: 'OpenRouter',
    requiresApiKey: true,
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      {
        id: 'anthropic/claude-opus-4.5',
        displayName: 'Claude Opus 4.5',
        provider: 'openrouter',
        fullId: 'openrouter/anthropic/claude-opus-4.5',
        contextWindow: 200000,
        supportsVision: true,
      },
      // ... rest of models
    ],
  },
```

**Step 2: Verify types compile**

Run: `pnpm -F @accomplish/shared build`
Expected: Success, no errors

**Step 3: Commit**

```bash
git add packages/shared/src/types/provider.ts
git commit -m "refactor(shared): remove hardcoded OpenRouter from DEFAULT_PROVIDERS

OpenRouter models will be fetched dynamically from the API instead."
```

---

## Task 3: Add IPC Handler for Fetching OpenRouter Models

**Files:**
- Modify: `apps/desktop/src/main/ipc/handlers.ts`

**Step 1: Add the handler after Ollama handlers (around line 1153)**

```typescript
  // OpenRouter: Fetch available models
  handle('openrouter:fetch-models', async (_event: IpcMainInvokeEvent) => {
    const apiKey = getApiKey('openrouter');
    if (!apiKey) {
      return { success: false, error: 'No OpenRouter API key configured' };
    }

    try {
      const response = await fetchWithTimeout(
        'https://openrouter.ai/api/v1/models',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        },
        API_KEY_VALIDATION_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || `API returned status ${response.status}`;
        return { success: false, error: errorMessage };
      }

      const data = await response.json() as { data?: Array<{ id: string; name: string; context_length?: number }> };
      const models = (data.data || []).map((m) => {
        // Extract provider from model ID (e.g., "anthropic/claude-3.5-sonnet" -> "anthropic")
        const provider = m.id.split('/')[0] || 'unknown';
        return {
          id: m.id,
          name: m.name || m.id,
          provider,
          contextLength: m.context_length || 0,
        };
      });

      console.log(`[OpenRouter] Fetched ${models.length} models`);
      return { success: true, models };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch models';
      console.warn('[OpenRouter] Fetch failed:', message);

      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Request timed out. Check your internet connection.' };
      }
      return { success: false, error: `Failed to fetch models: ${message}` };
    }
  });
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: Success, no errors

**Step 3: Commit**

```bash
git add apps/desktop/src/main/ipc/handlers.ts
git commit -m "feat(ipc): add openrouter:fetch-models handler

Fetches available models from OpenRouter API and extracts provider grouping."
```

---

## Task 4: Expose OpenRouter Fetch in Preload

**Files:**
- Modify: `apps/desktop/src/preload/index.ts`

**Step 1: Add the method to accomplishAPI object (after Ollama methods, around line 111)**

```typescript
  // OpenRouter configuration
  fetchOpenRouterModels: (): Promise<{
    success: boolean;
    models?: Array<{ id: string; name: string; provider: string; contextLength: number }>;
    error?: string;
  }> => ipcRenderer.invoke('openrouter:fetch-models'),
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: Success, no errors

**Step 3: Commit**

```bash
git add apps/desktop/src/preload/index.ts
git commit -m "feat(preload): expose fetchOpenRouterModels IPC method"
```

---

## Task 5: Add Typed Wrapper in accomplish.ts

**Files:**
- Modify: `apps/desktop/src/renderer/lib/accomplish.ts`

**Step 1: Add to AccomplishAPI interface (after Ollama methods, around line 84)**

```typescript
  // OpenRouter configuration
  fetchOpenRouterModels(): Promise<{
    success: boolean;
    models?: Array<{ id: string; name: string; provider: string; contextLength: number }>;
    error?: string;
  }>;
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: Success, no errors

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/lib/accomplish.ts
git commit -m "feat(renderer): add fetchOpenRouterModels to AccomplishAPI interface"
```

---

## Task 6: Update SettingsDialog - Add Proxy Platforms Tab

**Files:**
- Modify: `apps/desktop/src/renderer/components/layout/SettingsDialog.tsx`

**Step 1: Update activeTab state type (line 51)**

Change:
```typescript
const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');
```

To:
```typescript
const [activeTab, setActiveTab] = useState<'cloud' | 'local' | 'proxy'>('cloud');
```

**Step 2: Add OpenRouter state variables (after line 68)**

```typescript
  // OpenRouter state
  const [selectedProxyPlatform, setSelectedProxyPlatform] = useState<'openrouter' | 'litellm'>('openrouter');
  const [openrouterModels, setOpenrouterModels] = useState<Array<{ id: string; name: string; provider: string; contextLength: number }>>([]);
  const [openrouterLoading, setOpenrouterLoading] = useState(false);
  const [openrouterError, setOpenrouterError] = useState<string | null>(null);
  const [openrouterSearch, setOpenrouterSearch] = useState('');
  const [selectedOpenrouterModel, setSelectedOpenrouterModel] = useState<string>('');
  const [savingOpenrouter, setSavingOpenrouter] = useState(false);
```

**Step 3: Add third tab button (after Local Models button, around line 398)**

```typescript
                <button
                  onClick={() => setActiveTab('proxy')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'proxy'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Proxy Platforms
                </button>
```

**Step 4: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: Success, no errors

**Step 5: Commit**

```bash
git add apps/desktop/src/renderer/components/layout/SettingsDialog.tsx
git commit -m "feat(settings): add Proxy Platforms tab structure and state"
```

---

## Task 7: Add Proxy Platforms Tab Content

**Files:**
- Modify: `apps/desktop/src/renderer/components/layout/SettingsDialog.tsx`

**Step 1: Add handler functions (after handleSaveOllama, around line 312)**

```typescript
  const handleFetchOpenRouterModels = async () => {
    const accomplish = getAccomplish();
    setOpenrouterLoading(true);
    setOpenrouterError(null);
    setOpenrouterModels([]);

    try {
      const result = await accomplish.fetchOpenRouterModels();
      if (result.success && result.models) {
        setOpenrouterModels(result.models);
        if (result.models.length > 0) {
          setSelectedOpenrouterModel(result.models[0].id);
        }
      } else {
        setOpenrouterError(result.error || 'Failed to fetch models');
      }
    } catch (err) {
      setOpenrouterError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setOpenrouterLoading(false);
    }
  };

  const handleSaveOpenRouter = async () => {
    const accomplish = getAccomplish();
    setSavingOpenrouter(true);

    try {
      await accomplish.setSelectedModel({
        provider: 'openrouter',
        model: `openrouter/${selectedOpenrouterModel}`,
      });

      setSelectedModel({
        provider: 'openrouter',
        model: `openrouter/${selectedOpenrouterModel}`,
      });

      const modelName = openrouterModels.find(m => m.id === selectedOpenrouterModel)?.name || selectedOpenrouterModel;
      setModelStatusMessage(`Model updated to ${modelName}`);
    } catch (err) {
      setOpenrouterError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingOpenrouter(false);
    }
  };

  // Group OpenRouter models by provider
  const groupedOpenrouterModels = openrouterModels
    .filter(m =>
      openrouterSearch === '' ||
      m.name.toLowerCase().includes(openrouterSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(openrouterSearch.toLowerCase())
    )
    .reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, typeof openrouterModels>);

  const hasOpenRouterKey = savedKeys.some(k => k.provider === 'openrouter');
```

**Step 2: Add the tab content (after the local tab content closing tag, before the closing div of the tabs section)**

Add this as a third conditional block alongside the cloud and local tabs:

```typescript
              {activeTab === 'proxy' && (
                <>
                  <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                    Connect through proxy platforms to access multiple AI providers with a single API key.
                  </p>

                  {/* Platform Selector */}
                  <div className="flex gap-2 mb-5">
                    <button
                      onClick={() => setSelectedProxyPlatform('openrouter')}
                      className={`flex-1 rounded-xl border p-4 text-center transition-all duration-200 ${
                        selectedProxyPlatform === 'openrouter'
                          ? 'border-primary bg-muted'
                          : 'border-border hover:border-ring'
                      }`}
                    >
                      <div className="font-medium text-foreground">OpenRouter</div>
                      <div className="text-xs text-muted-foreground mt-1">200+ models</div>
                    </button>
                    <button
                      disabled
                      className="flex-1 rounded-xl border p-4 text-center border-border opacity-50 cursor-not-allowed"
                    >
                      <div className="font-medium text-muted-foreground">LiteLLM</div>
                      <div className="text-xs text-muted-foreground mt-1">Coming soon</div>
                    </button>
                  </div>

                  {selectedProxyPlatform === 'openrouter' && (
                    <>
                      {!hasOpenRouterKey ? (
                        <div className="rounded-lg bg-muted p-4">
                          <p className="text-sm text-muted-foreground mb-3">
                            Add an OpenRouter API key in the Cloud Providers section to use this feature.
                          </p>
                          <button
                            onClick={() => {
                              setActiveTab('cloud');
                              setProvider('openrouter');
                            }}
                            className="text-sm text-primary hover:underline"
                          >
                            Add OpenRouter API Key
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Connected Status */}
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-success">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              API key configured
                            </div>
                            <button
                              onClick={handleFetchOpenRouterModels}
                              disabled={openrouterLoading}
                              className="rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80 disabled:opacity-50"
                            >
                              {openrouterLoading ? 'Fetching...' : openrouterModels.length > 0 ? 'Refresh' : 'Fetch Models'}
                            </button>
                          </div>

                          {openrouterError && (
                            <div className="mb-4 flex items-center gap-2 text-sm text-destructive">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              {openrouterError}
                            </div>
                          )}

                          {openrouterModels.length > 0 && (
                            <>
                              {/* Search */}
                              <div className="mb-4">
                                <input
                                  type="text"
                                  value={openrouterSearch}
                                  onChange={(e) => setOpenrouterSearch(e.target.value)}
                                  placeholder="Search models..."
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                              </div>

                              {/* Grouped Model List */}
                              <div className="mb-4 max-h-64 overflow-y-auto rounded-md border border-input">
                                {Object.entries(groupedOpenrouterModels)
                                  .sort(([a], [b]) => a.localeCompare(b))
                                  .map(([provider, models]) => (
                                    <div key={provider}>
                                      <div className="sticky top-0 bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                                        {provider}
                                      </div>
                                      {models.map((model) => (
                                        <label
                                          key={model.id}
                                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 ${
                                            selectedOpenrouterModel === model.id ? 'bg-muted' : ''
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name="openrouter-model"
                                            value={model.id}
                                            checked={selectedOpenrouterModel === model.id}
                                            onChange={(e) => setSelectedOpenrouterModel(e.target.value)}
                                            className="h-4 w-4"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate">
                                              {model.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                              {model.id}
                                            </div>
                                          </div>
                                        </label>
                                      ))}
                                    </div>
                                  ))}
                              </div>

                              {/* Save Button */}
                              <button
                                onClick={handleSaveOpenRouter}
                                disabled={savingOpenrouter || !selectedOpenrouterModel}
                                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                              >
                                {savingOpenrouter ? 'Saving...' : 'Use This Model'}
                              </button>
                            </>
                          )}

                          {/* Current OpenRouter selection indicator */}
                          {selectedModel?.provider === 'openrouter' && (
                            <div className="mt-4 rounded-lg bg-muted p-3">
                              <p className="text-sm text-foreground">
                                <span className="font-medium">Currently using:</span>{' '}
                                {selectedModel.model.replace('openrouter/', '')}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: Success, no errors

**Step 4: Commit**

```bash
git add apps/desktop/src/renderer/components/layout/SettingsDialog.tsx
git commit -m "feat(settings): implement Proxy Platforms tab with OpenRouter

- Platform selector (OpenRouter active, LiteLLM coming soon)
- Fetch models from OpenRouter API
- Group models by provider with search filtering
- Select and save model"
```

---

## Task 8: Update Config Generator for Dynamic OpenRouter Models

**Files:**
- Modify: `apps/desktop/src/main/opencode/config-generator.ts`

**Step 1: Update the OpenRouter provider config (lines 447-471)**

Replace the hardcoded models block with dynamic model from selection:

```typescript
  // Add OpenRouter provider configuration if API key is set
  const openrouterKey = getApiKey('openrouter');
  if (openrouterKey) {
    // Get the selected model to configure OpenRouter
    const { getSelectedModel } = await import('../store/appSettings');
    const selectedModel = getSelectedModel();

    const openrouterModels: Record<string, OpenRouterProviderModelConfig> = {};

    // If a model is selected via OpenRouter, add it to the config
    if (selectedModel?.provider === 'openrouter' && selectedModel.model) {
      // Extract model ID from full ID (e.g., "openrouter/anthropic/claude-3.5-sonnet" -> "anthropic/claude-3.5-sonnet")
      const modelId = selectedModel.model.replace('openrouter/', '');
      openrouterModels[modelId] = {
        name: modelId,
        tools: true,
      };
    }

    // Only configure OpenRouter if we have at least one model
    if (Object.keys(openrouterModels).length > 0) {
      providerConfig.openrouter = {
        npm: '@ai-sdk/openai-compatible',
        name: 'OpenRouter',
        options: {
          baseURL: 'https://openrouter.ai/api/v1',
        },
        models: openrouterModels,
      };
      console.log('[OpenCode Config] OpenRouter provider configured with model:', Object.keys(openrouterModels));
    }
  }
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: Success, no errors

**Step 3: Commit**

```bash
git add apps/desktop/src/main/opencode/config-generator.ts
git commit -m "refactor(config): use dynamic OpenRouter model from selection

Instead of hardcoding Claude 4.5 models, use the model selected by the user
in the Proxy Platforms tab."
```

---

## Task 9: Manual Testing

**Step 1: Start the app in dev mode**

Run: `pnpm dev`

**Step 2: Test the Proxy Platforms tab**

1. Open Settings
2. Click "Proxy Platforms" tab
3. Verify you see OpenRouter and LiteLLM (disabled) buttons
4. If no OpenRouter API key: Verify link to add key works
5. If OpenRouter API key exists:
   - Click "Fetch Models"
   - Verify models load and are grouped by provider
   - Test search filtering
   - Select a model and click "Use This Model"
   - Verify the model is saved

**Step 3: Test model usage**

1. Start a new task
2. Verify the selected OpenRouter model is used

**Step 4: Commit any fixes**

```bash
git add .
git commit -m "fix(settings): address issues found in manual testing"
```

---

## Task 10: Final Verification and Cleanup

**Step 1: Run full type check**

Run: `pnpm typecheck`
Expected: Success, no errors

**Step 2: Run linting**

Run: `pnpm lint`
Expected: Success, no errors

**Step 3: Run build**

Run: `pnpm build`
Expected: Success, no errors

**Step 4: Final commit if needed**

```bash
git add .
git commit -m "chore: final cleanup for proxy platforms feature"
```
