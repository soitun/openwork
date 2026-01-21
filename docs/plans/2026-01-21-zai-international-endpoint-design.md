# Z.AI International Endpoint Support

**Issue:** [#136](https://github.com/accomplish-ai/openwork/issues/136)
**Date:** 2026-01-21
**Status:** Ready for implementation

## Problem

Z.AI provider currently hardcodes the Chinese endpoint (`https://open.bigmodel.cn/api/paas/v4`). International subscription users get rate-limited because their API keys are meant for the international endpoint (`https://api.z.ai/api/coding/paas/v4`).

## Solution

Add a region selector to the Z.AI provider form allowing users to choose between China and International endpoints.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approach | Single provider with region toggle | Cleaner than two separate providers; matches Bedrock pattern |
| UI Pattern | Segmented control | Consistent with Bedrock auth tabs; optimal for binary choice |
| Default | International | Most GitHub users are international; reduces friction for bug reporters |
| Labeling | "Region" with "China" / "International" | Clear and concise |

## UI Design

```
┌─────────────────────────────────────────┐
│ [Z.AI Logo]  Z-AI Coding Plan           │
├─────────────────────────────────────────┤
│ Region                                  │
│ ┌──────────────┬───────────────────┐    │
│ │    China     │  International ●  │    │
│ └──────────────┴───────────────────┘    │
│                                         │
│ API Key                    How to find? │
│ ┌─────────────────────────────────┬──┐  │
│ │ Enter API Key                   │🗑│  │
│ └─────────────────────────────────┴──┘  │
│                                         │
│        [ Connect ]                      │
└─────────────────────────────────────────┘
```

- Region selector appears above API key input
- "International" pre-selected by default
- Uses same styling as Bedrock auth tabs (`bg-[#4A7C59]` for active)

## Data Model

### New Types

```typescript
// packages/shared/src/types/providerSettings.ts

export type ZaiRegion = 'china' | 'international';

export interface ZaiCredentials {
  type: 'zai';
  keyPrefix: string;
  region: ZaiRegion;
}

// Add to ProviderCredentials union
export type ProviderCredentials =
  | ApiKeyCredentials
  | BedrockProviderCredentials
  | OllamaCredentials
  | OpenRouterCredentials
  | LiteLLMCredentials
  | ZaiCredentials;
```

### Endpoint Mapping

```typescript
// packages/shared/src/types/provider.ts

export const ZAI_ENDPOINTS: Record<ZaiRegion, string> = {
  china: 'https://open.bigmodel.cn/api/paas/v4',
  international: 'https://api.z.ai/api/coding/paas/v4',
};
```

## Implementation

### Files to Modify

| File | Change |
|------|--------|
| `packages/shared/src/types/providerSettings.ts` | Add `ZaiRegion`, `ZaiCredentials` types |
| `packages/shared/src/types/provider.ts` | Add `ZAI_ENDPOINTS` constant |
| `apps/desktop/src/main/ipc/handlers.ts` | Update Z.AI validation to accept region parameter |
| `apps/desktop/src/main/opencode/config-generator.ts` | Use dynamic endpoint based on stored region |
| `apps/desktop/src/renderer/components/settings/ProviderSettingsPanel.tsx` | Route `zai` to `ZaiProviderForm` |

### New Files

| File | Purpose |
|------|---------|
| `apps/desktop/src/renderer/components/settings/providers/ZaiProviderForm.tsx` | Dedicated form with region selector |

### API Key Validation

```typescript
// apps/desktop/src/main/ipc/handlers.ts

case 'zai':
  const zaiRegion = options?.region || 'international';
  const zaiEndpoint = zaiRegion === 'china'
    ? 'https://open.bigmodel.cn/api/paas/v4/models'
    : 'https://api.z.ai/api/coding/paas/v4/models';

  response = await fetchWithTimeout(
    zaiEndpoint,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sanitizedKey}` },
    },
    API_KEY_VALIDATION_TIMEOUT_MS
  );
  break;
```

### Config Generation

```typescript
// apps/desktop/src/main/opencode/config-generator.ts

const zaiCredentials = connectedProviders.zai?.credentials as ZaiCredentials;
const zaiEndpoint = zaiCredentials?.region === 'china'
  ? 'https://open.bigmodel.cn/api/paas/v4'
  : 'https://api.z.ai/api/coding/paas/v4';

providerConfig['zai-coding-plan'] = {
  npm: '@ai-sdk/openai-compatible',
  name: 'Z.AI Coding Plan',
  options: { baseURL: zaiEndpoint },
  models: zaiModels,
};
```

## Testing

1. Connect with International endpoint + international API key → should work
2. Connect with China endpoint + China API key → should work
3. Connect with mismatched endpoint/key → should fail validation
4. Reconnect after changing region → should use new endpoint
5. Verify stored region persists across app restarts
