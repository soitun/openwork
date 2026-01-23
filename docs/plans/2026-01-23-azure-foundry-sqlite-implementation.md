# Azure Foundry SQLite Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge main branch (SQLite storage) into azure-foundry feature branch and adapt Azure Foundry config to use SQLite.

**Architecture:** Add new migration (v002) to extend app_settings table with azure_foundry_config column. Update repository layer with getter/setter functions following existing Ollama/LiteLLM pattern.

**Tech Stack:** SQLite (better-sqlite3), TypeScript, Vitest

---

## Task 1: Merge Main into Feature Branch

**Files:**
- Conflict: `apps/desktop/src/main/store/appSettings.ts`
- Conflict: `apps/desktop/src/main/opencode/adapter.ts`
- Conflict: `apps/desktop/src/main/opencode/config-generator.ts`
- Conflict: `apps/desktop/package.json`
- Conflict: `pnpm-lock.yaml`

**Step 1: Start the merge**

```bash
git merge main
```

Expected: Merge conflicts in files listed above.

**Step 2: Resolve appSettings.ts conflict**

Take main's version (2-line re-export):
```typescript
// Re-export from SQLite repository for backward compatibility
export * from './repositories/appSettings';
```

**Step 3: Resolve adapter.ts conflict**

Keep both:
- Main's imports from SQLite modules
- Your branch's Azure proxy integration (`startAzureProxy`, `stopAzureProxy`)

Key imports to preserve from your branch:
```typescript
import { startAzureProxy, stopAzureProxy } from './azure-foundry-proxy';
```

**Step 4: Resolve config-generator.ts conflict**

Keep both:
- Main's import style (from `../store/appSettings`)
- Your branch's `getAzureFoundryConfig` import and Azure config generation logic

**Step 5: Resolve package.json conflict**

Keep `@azure/identity` dependency from your branch alongside main's new dependencies.

**Step 6: Complete merge and regenerate lockfile**

```bash
git add .
pnpm install
git add pnpm-lock.yaml
git commit -m "merge: main into feature/azure-ai-foundry-support"
```

---

## Task 2: Create Migration v002

**Files:**
- Create: `apps/desktop/src/main/store/migrations/v002-azure-foundry.ts`
- Modify: `apps/desktop/src/main/store/migrations/index.ts:8,17`

**Step 1: Write the migration file**

Create `apps/desktop/src/main/store/migrations/v002-azure-foundry.ts`:

```typescript
// apps/desktop/src/main/store/migrations/v002-azure-foundry.ts

import type { Database } from 'better-sqlite3';
import type { Migration } from './index';

/**
 * Migration v002: Add Azure Foundry configuration column
 */
export const migration: Migration = {
  version: 2,
  up(db: Database): void {
    db.exec(`
      ALTER TABLE app_settings
      ADD COLUMN azure_foundry_config TEXT
    `);
    console.log('[v002] Added azure_foundry_config column');
  },
};
```

**Step 2: Register migration in index.ts**

Update `apps/desktop/src/main/store/migrations/index.ts`:

Add import after v001:
```typescript
import { migration as v002 } from './v002-azure-foundry';
```

Update migrations array:
```typescript
const migrations: Migration[] = [
  v001,
  v002,
];
```

Update CURRENT_VERSION:
```typescript
export const CURRENT_VERSION = 2;
```

**Step 3: Verify build compiles**

```bash
pnpm -F @accomplish/desktop build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add apps/desktop/src/main/store/migrations/
git commit -m "feat(db): add migration v002 for azure_foundry_config column"
```

---

## Task 3: Update Repository - Types

**Files:**
- Modify: `apps/desktop/src/main/store/repositories/appSettings.ts:3,6-12,14-20`

**Step 1: Add AzureFoundryConfig import**

Update import line:
```typescript
import type { SelectedModel, OllamaConfig, LiteLLMConfig, AzureFoundryConfig } from '@accomplish/shared';
```

**Step 2: Update AppSettingsRow interface**

Add field after `litellm_config`:
```typescript
interface AppSettingsRow {
  id: number;
  debug_mode: number;
  onboarding_complete: number;
  selected_model: string | null;
  ollama_config: string | null;
  litellm_config: string | null;
  azure_foundry_config: string | null;
}
```

**Step 3: Update AppSettings interface**

Add field after `litellmConfig`:
```typescript
interface AppSettings {
  debugMode: boolean;
  onboardingComplete: boolean;
  selectedModel: SelectedModel | null;
  ollamaConfig: OllamaConfig | null;
  litellmConfig: LiteLLMConfig | null;
  azureFoundryConfig: AzureFoundryConfig | null;
}
```

**Step 4: Verify TypeScript compiles**

```bash
pnpm -F @accomplish/desktop typecheck
```

Expected: Type errors for missing functions (expected at this stage).

**Step 5: Commit**

```bash
git add apps/desktop/src/main/store/repositories/appSettings.ts
git commit -m "feat(db): add AzureFoundryConfig types to repository"
```

---

## Task 4: Update Repository - Functions

**Files:**
- Modify: `apps/desktop/src/main/store/repositories/appSettings.ts`

**Step 1: Add getAzureFoundryConfig function**

Add after `setLiteLLMConfig`:
```typescript
export function getAzureFoundryConfig(): AzureFoundryConfig | null {
  const row = getRow();
  if (!row.azure_foundry_config) return null;
  try {
    return JSON.parse(row.azure_foundry_config) as AzureFoundryConfig;
  } catch {
    return null;
  }
}

export function setAzureFoundryConfig(config: AzureFoundryConfig | null): void {
  const db = getDatabase();
  db.prepare('UPDATE app_settings SET azure_foundry_config = ? WHERE id = 1').run(
    config ? JSON.stringify(config) : null
  );
}
```

**Step 2: Update getAppSettings function**

Add `azureFoundryConfig` to returned object:
```typescript
export function getAppSettings(): AppSettings {
  const row = getRow();
  return {
    debugMode: row.debug_mode === 1,
    onboardingComplete: row.onboarding_complete === 1,
    selectedModel: safeParseJson<SelectedModel>(row.selected_model),
    ollamaConfig: safeParseJson<OllamaConfig>(row.ollama_config),
    litellmConfig: safeParseJson<LiteLLMConfig>(row.litellm_config),
    azureFoundryConfig: safeParseJson<AzureFoundryConfig>(row.azure_foundry_config),
  };
}
```

**Step 3: Update clearAppSettings function**

Add `azure_foundry_config = NULL` to the UPDATE statement:
```typescript
export function clearAppSettings(): void {
  const db = getDatabase();
  db.prepare(
    `UPDATE app_settings SET
      debug_mode = 0,
      onboarding_complete = 0,
      selected_model = NULL,
      ollama_config = NULL,
      litellm_config = NULL,
      azure_foundry_config = NULL
    WHERE id = 1`
  ).run();
}
```

**Step 4: Verify TypeScript compiles**

```bash
pnpm -F @accomplish/desktop typecheck
```

Expected: No type errors.

**Step 5: Commit**

```bash
git add apps/desktop/src/main/store/repositories/appSettings.ts
git commit -m "feat(db): add Azure Foundry config getter/setter functions"
```

---

## Task 5: Write Integration Tests

**Files:**
- Modify: `apps/desktop/__tests__/integration/main/appSettings.integration.test.ts`

**Step 1: Update mock data to include azure_foundry_config**

Find `mockAppSettingsData` and add:
```typescript
let mockAppSettingsData = {
  debug_mode: 0,
  onboarding_complete: 0,
  selected_model: null as string | null,
  ollama_config: null as string | null,
  litellm_config: null as string | null,
  azure_foundry_config: null as string | null,
};
```

**Step 2: Update resetMockData function**

Add `azure_foundry_config: null` to the reset object.

**Step 3: Update mock prepare handler**

Add handling for azure_foundry_config updates:
```typescript
if (sql.includes('azure_foundry_config = ?')) {
  mockAppSettingsData.azure_foundry_config = args[0] as string | null;
}
```

**Step 4: Add test cases**

Add new describe block:
```typescript
describe('azureFoundryConfig', () => {
  it('should return null when azure foundry config is not set', async () => {
    const { getAzureFoundryConfig } = await import('@main/store/appSettings');
    const result = getAzureFoundryConfig();
    expect(result).toBeNull();
  });

  it('should store and retrieve azure foundry config', async () => {
    const { getAzureFoundryConfig, setAzureFoundryConfig } = await import('@main/store/appSettings');

    const config = {
      baseUrl: 'https://myendpoint.openai.azure.com',
      deploymentName: 'gpt-4',
      authType: 'api-key' as const,
      enabled: true,
    };

    setAzureFoundryConfig(config);
    const result = getAzureFoundryConfig();

    expect(result).toEqual(config);
  });

  it('should handle malformed JSON gracefully', async () => {
    const { getAzureFoundryConfig } = await import('@main/store/appSettings');

    // Set invalid JSON directly in mock
    mockAppSettingsData.azure_foundry_config = 'invalid-json';

    const result = getAzureFoundryConfig();
    expect(result).toBeNull();
  });

  it('should clear azure foundry config with clearAppSettings', async () => {
    const { setAzureFoundryConfig, clearAppSettings, getAzureFoundryConfig } = await import('@main/store/appSettings');

    setAzureFoundryConfig({
      baseUrl: 'https://test.openai.azure.com',
      deploymentName: 'test',
      authType: 'api-key',
      enabled: true,
    });

    clearAppSettings();

    const result = getAzureFoundryConfig();
    expect(result).toBeNull();
  });
});
```

**Step 5: Run tests**

```bash
pnpm -F @accomplish/desktop test:unit
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add apps/desktop/__tests__/integration/main/appSettings.integration.test.ts
git commit -m "test: add Azure Foundry config integration tests"
```

---

## Task 6: Verify Full Build and Tests

**Step 1: Run full typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

**Step 2: Run all tests**

```bash
pnpm -F @accomplish/desktop test:unit
```

Expected: All tests pass.

**Step 3: Run full build**

```bash
pnpm build:desktop
```

Expected: Build succeeds.

**Step 4: Test the app manually**

```bash
pnpm dev
```

Verify:
1. App starts without errors
2. Azure Foundry provider appears in settings
3. Can configure Azure Foundry (endpoint, deployment name)
4. Config persists after app restart

---

## Task 7: Final Commit and Cleanup

**Step 1: Verify git status is clean**

```bash
git status
```

**Step 2: Review all commits**

```bash
git log --oneline main..HEAD
```

Expected: Clean commit history with merge + incremental feature commits.
