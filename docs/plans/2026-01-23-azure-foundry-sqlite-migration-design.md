# Azure Foundry SQLite Migration Design

## Context

Branch `feature/azure-ai-foundry-support` adds Azure AI Foundry provider support using `electron-store`. Main has since migrated all storage to SQLite (#152). This design covers merging main and adapting Azure Foundry to use SQLite.

## Merge Strategy

1. Merge `main` into `feature/azure-ai-foundry-support`
2. Resolve conflicts by taking main's SQLite architecture
3. Re-implement Azure Foundry config on top of SQLite

### Expected Conflicts

| File | Resolution |
|------|------------|
| `appSettings.ts` | Take main's 2-line re-export, adapt repository |
| `adapter.ts` | Manual merge - keep Azure proxy + main's SQLite imports |
| `config-generator.ts` | Manual merge - keep Azure config generation + main's import style |
| `package.json` | Keep `@azure/identity` dependency |
| `pnpm-lock.yaml` | Regenerate with `pnpm install` |

## Implementation

### 1. Migration v002-azure-foundry.ts

Add `azure_foundry_config` column to existing `app_settings` table.

```typescript
// apps/desktop/src/main/store/migrations/v002-azure-foundry.ts
import type Database from 'better-sqlite3';

export const version = 2;

export function up(db: Database.Database): void {
  db.exec(`
    ALTER TABLE app_settings
    ADD COLUMN azure_foundry_config TEXT
  `);
}

export function down(db: Database.Database): void {
  // SQLite doesn't support DROP COLUMN directly
  // Column stays but unused on rollback (safe - nullable)
}
```

Register in `migrations/index.ts`:
```typescript
import * as v001 from './v001-initial';
import * as v002 from './v002-azure-foundry';

const migrations = [v001, v002];
```

### 2. Repository Changes (appSettings.ts)

**Type updates:**
```typescript
import type { SelectedModel, OllamaConfig, LiteLLMConfig, AzureFoundryConfig } from '@accomplish/shared';

interface AppSettingsRow {
  // ... existing fields
  azure_foundry_config: string | null;
}

interface AppSettings {
  // ... existing fields
  azureFoundryConfig: AzureFoundryConfig | null;
}
```

**New functions:**
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

**Update existing functions:**
- `getAppSettings()` - include `azureFoundryConfig` in returned object
- `clearAppSettings()` - reset `azure_foundry_config` to NULL

### 3. Files Unchanged

These files need no modifications after merge:
- `azure-foundry-proxy.ts` - Standalone, no storage dependencies
- `AzureFoundryProviderForm.tsx` - Calls IPC, doesn't touch storage
- `packages/shared/src/types/*` - Additive changes only, no conflicts

## Tests

### appSettings.integration.test.ts additions

- `getAzureFoundryConfig()` returns null when not set
- `setAzureFoundryConfig()` stores and retrieves config correctly
- `getAzureFoundryConfig()` handles malformed JSON gracefully (returns null)
- `getAppSettings()` includes `azureFoundryConfig` field
- `clearAppSettings()` resets `azureFoundryConfig` to null

### v002-azure-foundry.test.ts (new file)

- Migration adds `azure_foundry_config` column
- Existing data in `app_settings` preserved after migration
- Column accepts null and JSON string values

## Storage Pattern

Following existing pattern for Ollama and LiteLLM:
- Config stored in `app_settings` table (SQLite)
- API keys stored in `secureStorage` (encrypted electron-store)
- For `entra-id` auth: no secret storage (runtime token via `@azure/identity`)
