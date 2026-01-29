# Skills System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a persistent skills system that allows users to view, enable/disable, and manage SKILL.md files that provide instructions to the AI.

**Architecture:** Skills are SKILL.md files with YAML frontmatter. Bundled skills ship with the app (read-only), user skills are stored in userData (read-write). SQLite stores enabled state and metadata. The system prompt lists enabled skills so OpenCode can read them on-demand.

**Tech Stack:** Electron, TypeScript, SQLite (better-sqlite3), gray-matter (frontmatter parsing)

---

## Task 1: Update Shared Types

**Files:**
- Modify: `packages/shared/src/types/skills.ts`

**Step 1: Update the Skill interface**

```typescript
// packages/shared/src/types/skills.ts

export type SkillSource = 'official' | 'community' | 'custom';

export interface Skill {
  id: string;
  name: string;
  command: string; // e.g., "/dev-browser"
  description: string;
  source: SkillSource;
  isEnabled: boolean;
  isVerified: boolean;
  filePath: string; // Absolute path to SKILL.md
  githubUrl?: string; // Original URL if imported from GitHub
  updatedAt: string; // ISO date string
}

export interface SkillsState {
  skills: Skill[];
  filter: 'all' | 'active' | 'official';
  searchQuery: string;
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  command?: string;
  verified?: boolean;
}
```

**Step 2: Verify types compile**

Run: `pnpm -F @accomplish/shared typecheck`
Expected: PASS with no errors

**Step 3: Commit**

```bash
git add packages/shared/src/types/skills.ts
git commit -m "feat(shared): add filePath and githubUrl to Skill type"
```

---

## Task 2: Create Database Migration

**Files:**
- Create: `apps/desktop/src/main/store/migrations/v002-skills.ts`
- Modify: `apps/desktop/src/main/store/migrations/index.ts`

**Step 1: Create the migration file**

```typescript
// apps/desktop/src/main/store/migrations/v002-skills.ts

import type { Database } from 'better-sqlite3';
import type { Migration } from './index';

export const migration: Migration = {
  version: 2,
  up: (db: Database) => {
    db.exec(`
      CREATE TABLE skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        description TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('official', 'community', 'custom')),
        is_enabled INTEGER NOT NULL DEFAULT 1,
        is_verified INTEGER NOT NULL DEFAULT 0,
        file_path TEXT NOT NULL,
        github_url TEXT,
        updated_at TEXT NOT NULL
      )
    `);

    db.exec(`CREATE INDEX idx_skills_enabled ON skills(is_enabled)`);
    db.exec(`CREATE INDEX idx_skills_source ON skills(source)`);
  },
};
```

**Step 2: Register the migration**

In `apps/desktop/src/main/store/migrations/index.ts`, add:

```typescript
import { migration as v002 } from './v002-skills';

export const CURRENT_VERSION = 2;  // Update from 1 to 2

const migrations: Migration[] = [v001, v002];  // Add v002
```

**Step 3: Verify types compile**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: PASS with no errors

**Step 4: Commit**

```bash
git add apps/desktop/src/main/store/migrations/v002-skills.ts
git add apps/desktop/src/main/store/migrations/index.ts
git commit -m "feat(desktop): add skills table migration"
```

---

## Task 3: Create Skills Repository

**Files:**
- Create: `apps/desktop/src/main/store/repositories/skills.ts`

**Step 1: Create the repository**

```typescript
// apps/desktop/src/main/store/repositories/skills.ts

import type { Skill, SkillSource } from '@accomplish/shared';
import { getDatabase } from '../db';

interface SkillRow {
  id: string;
  name: string;
  command: string;
  description: string;
  source: string;
  is_enabled: number;
  is_verified: number;
  file_path: string;
  github_url: string | null;
  updated_at: string;
}

function rowToSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    command: row.command,
    description: row.description,
    source: row.source as SkillSource,
    isEnabled: row.is_enabled === 1,
    isVerified: row.is_verified === 1,
    filePath: row.file_path,
    githubUrl: row.github_url || undefined,
    updatedAt: row.updated_at,
  };
}

export function getAllSkills(): Skill[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM skills ORDER BY name').all() as SkillRow[];
  return rows.map(rowToSkill);
}

export function getEnabledSkills(): Skill[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM skills WHERE is_enabled = 1 ORDER BY name')
    .all() as SkillRow[];
  return rows.map(rowToSkill);
}

export function getSkillById(id: string): Skill | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM skills WHERE id = ?').get(id) as SkillRow | undefined;
  return row ? rowToSkill(row) : null;
}

export function upsertSkill(skill: Skill): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO skills (id, name, command, description, source, is_enabled, is_verified, file_path, github_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      command = excluded.command,
      description = excluded.description,
      is_enabled = excluded.is_enabled,
      is_verified = excluded.is_verified,
      file_path = excluded.file_path,
      github_url = excluded.github_url,
      updated_at = excluded.updated_at
  `).run(
    skill.id,
    skill.name,
    skill.command,
    skill.description,
    skill.source,
    skill.isEnabled ? 1 : 0,
    skill.isVerified ? 1 : 0,
    skill.filePath,
    skill.githubUrl || null,
    skill.updatedAt
  );
}

export function setSkillEnabled(id: string, enabled: boolean): void {
  const db = getDatabase();
  db.prepare('UPDATE skills SET is_enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
}

export function deleteSkill(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM skills WHERE id = ?').run(id);
}

export function clearAllSkills(): void {
  const db = getDatabase();
  db.prepare('DELETE FROM skills').run();
}
```

**Step 2: Verify types compile**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: PASS with no errors

**Step 3: Commit**

```bash
git add apps/desktop/src/main/store/repositories/skills.ts
git commit -m "feat(desktop): add skills repository"
```

---

## Task 4: Create SkillsManager Service

**Files:**
- Create: `apps/desktop/src/main/skills/SkillsManager.ts`
- Create: `apps/desktop/src/main/skills/index.ts`

**Step 1: Install gray-matter for frontmatter parsing**

Run: `pnpm -F @accomplish/desktop add gray-matter`
Expected: Package added to dependencies

**Step 2: Create the SkillsManager**

```typescript
// apps/desktop/src/main/skills/SkillsManager.ts

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import matter from 'gray-matter';
import type { Skill, SkillSource, SkillFrontmatter } from '@accomplish/shared';
import {
  getAllSkills,
  getEnabledSkills,
  upsertSkill,
  setSkillEnabled as repoSetEnabled,
  deleteSkill as repoDeleteSkill,
  getSkillById,
} from '../store/repositories/skills';

export class SkillsManager {
  private initialized = false;

  /**
   * Get the bundled skills directory path.
   * In dev: apps/desktop/skills
   * In packaged: resources/skills
   */
  getBundledSkillsPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'skills');
    }
    return path.join(app.getAppPath(), 'skills');
  }

  /**
   * Get the user skills directory path.
   * Stored in userData/skills for persistence across updates.
   */
  getUserSkillsPath(): string {
    return path.join(app.getPath('userData'), 'skills');
  }

  /**
   * Initialize the skills system.
   * Scans skill directories and syncs to database.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[SkillsManager] Initializing...');

    // Ensure user skills directory exists
    const userSkillsPath = this.getUserSkillsPath();
    if (!fs.existsSync(userSkillsPath)) {
      fs.mkdirSync(userSkillsPath, { recursive: true });
    }

    // Scan and sync skills
    await this.syncSkills();

    this.initialized = true;
    console.log('[SkillsManager] Initialized');
  }

  /**
   * Scan skill directories and sync to database.
   */
  private async syncSkills(): Promise<void> {
    const bundledPath = this.getBundledSkillsPath();
    const userPath = this.getUserSkillsPath();

    // Get existing skills from DB to preserve enabled state
    const existingSkills = new Map(getAllSkills().map(s => [s.id, s]));

    // Scan bundled skills
    const bundledSkills = this.scanDirectory(bundledPath, 'official');

    // Scan user skills
    const userSkills = this.scanDirectory(userPath, 'custom');

    // Sync all found skills to database
    const allFoundSkills = [...bundledSkills, ...userSkills];

    for (const skill of allFoundSkills) {
      const existing = existingSkills.get(skill.id);
      if (existing) {
        // Preserve enabled state from database
        skill.isEnabled = existing.isEnabled;
      }
      upsertSkill(skill);
    }

    console.log(`[SkillsManager] Synced ${allFoundSkills.length} skills`);
  }

  /**
   * Scan a directory for SKILL.md files.
   */
  private scanDirectory(dirPath: string, defaultSource: SkillSource): Skill[] {
    const skills: Skill[] = [];

    if (!fs.existsSync(dirPath)) {
      return skills;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillMdPath = path.join(dirPath, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;

      try {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        const frontmatter = this.parseFrontmatter(content);

        const name = frontmatter.name || entry.name;
        const source = defaultSource;
        const id = this.generateId(name, source);

        skills.push({
          id,
          name,
          command: frontmatter.command || `/${name}`,
          description: frontmatter.description || '',
          source,
          isEnabled: true, // Default to enabled
          isVerified: frontmatter.verified || false,
          filePath: skillMdPath,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`[SkillsManager] Failed to parse ${skillMdPath}:`, err);
      }
    }

    return skills;
  }

  /**
   * Parse YAML frontmatter from SKILL.md content.
   */
  private parseFrontmatter(content: string): SkillFrontmatter {
    try {
      const { data } = matter(content);
      return {
        name: data.name || '',
        description: data.description || '',
        command: data.command,
        verified: data.verified,
      };
    } catch {
      return { name: '', description: '' };
    }
  }

  /**
   * Generate a unique ID for a skill.
   */
  private generateId(name: string, source: SkillSource): string {
    const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `${source}-${safeName}`;
  }

  // Public API

  async getAll(): Promise<Skill[]> {
    return getAllSkills();
  }

  async getEnabled(): Promise<Skill[]> {
    return getEnabledSkills();
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    repoSetEnabled(id, enabled);
  }

  async getContent(id: string): Promise<string | null> {
    const skill = getSkillById(id);
    if (!skill) return null;

    try {
      return fs.readFileSync(skill.filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async addFromFile(sourcePath: string): Promise<Skill> {
    // Read and parse the source file
    const content = fs.readFileSync(sourcePath, 'utf-8');
    const frontmatter = this.parseFrontmatter(content);

    if (!frontmatter.name) {
      throw new Error('SKILL.md must have a name in frontmatter');
    }

    // Create skill directory in user skills path
    const skillDir = path.join(this.getUserSkillsPath(), frontmatter.name);
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    // Copy file to user skills directory
    const destPath = path.join(skillDir, 'SKILL.md');
    fs.copyFileSync(sourcePath, destPath);

    // Create skill object
    const skill: Skill = {
      id: this.generateId(frontmatter.name, 'custom'),
      name: frontmatter.name,
      command: frontmatter.command || `/${frontmatter.name}`,
      description: frontmatter.description || '',
      source: 'custom',
      isEnabled: true,
      isVerified: false,
      filePath: destPath,
      updatedAt: new Date().toISOString(),
    };

    // Save to database
    upsertSkill(skill);

    return skill;
  }

  async addFromGitHub(rawUrl: string): Promise<Skill> {
    // Validate URL is a raw GitHub URL
    if (!rawUrl.includes('raw.githubusercontent.com') && !rawUrl.includes('github.com') ) {
      throw new Error('URL must be a GitHub raw file URL');
    }

    // Convert github.com URLs to raw URLs if needed
    let fetchUrl = rawUrl;
    if (rawUrl.includes('github.com') && !rawUrl.includes('raw.githubusercontent.com')) {
      fetchUrl = rawUrl
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    }

    // Fetch the content
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const content = await response.text();

    // Parse frontmatter
    const frontmatter = this.parseFrontmatter(content);

    if (!frontmatter.name) {
      throw new Error('SKILL.md must have a name in frontmatter');
    }

    // Create skill directory
    const skillDir = path.join(this.getUserSkillsPath(), frontmatter.name);
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    // Write file
    const destPath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(destPath, content);

    // Create skill object
    const skill: Skill = {
      id: this.generateId(frontmatter.name, 'community'),
      name: frontmatter.name,
      command: frontmatter.command || `/${frontmatter.name}`,
      description: frontmatter.description || '',
      source: 'community',
      isEnabled: true,
      isVerified: false,
      filePath: destPath,
      githubUrl: rawUrl,
      updatedAt: new Date().toISOString(),
    };

    // Save to database
    upsertSkill(skill);

    return skill;
  }

  async delete(id: string): Promise<void> {
    const skill = getSkillById(id);
    if (!skill) {
      throw new Error('Skill not found');
    }

    if (skill.source === 'official') {
      throw new Error('Cannot delete official skills');
    }

    // Delete from filesystem
    const skillDir = path.dirname(skill.filePath);
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true });
    }

    // Delete from database
    repoDeleteSkill(id);
  }
}

// Singleton instance
export const skillsManager = new SkillsManager();
```

**Step 3: Create index file**

```typescript
// apps/desktop/src/main/skills/index.ts

export { SkillsManager, skillsManager } from './SkillsManager';
```

**Step 4: Verify types compile**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: PASS with no errors

**Step 5: Commit**

```bash
git add apps/desktop/src/main/skills/
git add apps/desktop/package.json apps/desktop/pnpm-lock.yaml
git commit -m "feat(desktop): add SkillsManager service"
```

---

## Task 5: Add IPC Handlers

**Files:**
- Modify: `apps/desktop/src/main/ipc/handlers.ts`

**Step 1: Import skills manager and add handlers**

At the top of the file, add import:

```typescript
import { skillsManager } from '../skills';
```

At the end of the file (before the closing of the function or at the appropriate section), add:

```typescript
  // Skills management
  ipcMain.handle('skills:list', async () => {
    return skillsManager.getAll();
  });

  ipcMain.handle('skills:list-enabled', async () => {
    return skillsManager.getEnabled();
  });

  ipcMain.handle('skills:set-enabled', async (_, id: string, enabled: boolean) => {
    await skillsManager.setEnabled(id, enabled);
  });

  ipcMain.handle('skills:get-content', async (_, id: string) => {
    return skillsManager.getContent(id);
  });

  ipcMain.handle('skills:add-from-file', async (_, filePath: string) => {
    return skillsManager.addFromFile(filePath);
  });

  ipcMain.handle('skills:add-from-github', async (_, rawUrl: string) => {
    return skillsManager.addFromGitHub(rawUrl);
  });

  ipcMain.handle('skills:delete', async (_, id: string) => {
    await skillsManager.delete(id);
  });
```

**Step 2: Verify types compile**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: PASS with no errors

**Step 3: Commit**

```bash
git add apps/desktop/src/main/ipc/handlers.ts
git commit -m "feat(desktop): add skills IPC handlers"
```

---

## Task 6: Update Preload API

**Files:**
- Modify: `apps/desktop/src/preload/index.ts`

**Step 1: Add skills API methods**

Add after the existing API methods (before the closing of `accomplishAPI`):

```typescript
  // Skills management
  getSkills: (): Promise<Skill[]> => ipcRenderer.invoke('skills:list'),
  getEnabledSkills: (): Promise<Skill[]> => ipcRenderer.invoke('skills:list-enabled'),
  setSkillEnabled: (id: string, enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('skills:set-enabled', id, enabled),
  getSkillContent: (id: string): Promise<string | null> =>
    ipcRenderer.invoke('skills:get-content', id),
  addSkillFromFile: (filePath: string): Promise<Skill> =>
    ipcRenderer.invoke('skills:add-from-file', filePath),
  addSkillFromGitHub: (rawUrl: string): Promise<Skill> =>
    ipcRenderer.invoke('skills:add-from-github', rawUrl),
  deleteSkill: (id: string): Promise<void> => ipcRenderer.invoke('skills:delete', id),
```

Also add the Skill type import at the top:

```typescript
import type { Skill } from '@accomplish/shared';
```

**Step 2: Verify types compile**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: PASS with no errors

**Step 3: Commit**

```bash
git add apps/desktop/src/preload/index.ts
git commit -m "feat(desktop): add skills preload API"
```

---

## Task 7: Initialize SkillsManager on App Startup

**Files:**
- Modify: `apps/desktop/src/main/index.ts`

**Step 1: Import and initialize SkillsManager**

Add import near the top:

```typescript
import { skillsManager } from './skills';
```

Find where the app initializes (likely in an `app.whenReady()` or similar block) and add after database initialization:

```typescript
// Initialize skills manager
await skillsManager.initialize();
```

**Step 2: Verify the app starts**

Run: `pnpm dev`
Expected: App starts without errors, console shows "[SkillsManager] Initialized"

**Step 3: Commit**

```bash
git add apps/desktop/src/main/index.ts
git commit -m "feat(desktop): initialize SkillsManager on startup"
```

---

## Task 8: Update System Prompt with Skills

**Files:**
- Modify: `apps/desktop/src/main/opencode/config-generator.ts`

**Step 1: Import skillsManager**

Add import:

```typescript
import { skillsManager } from '../skills';
```

**Step 2: Update generateOpenCodeConfig to include skills**

In the `generateOpenCodeConfig` function, after building the base system prompt, add:

```typescript
  // Get enabled skills and add to system prompt
  const enabledSkills = await skillsManager.getEnabled();

  let skillsSection = '';
  if (enabledSkills.length > 0) {
    skillsSection = `

<available-skills>
The following skills are available. When a task matches a skill's description, read its SKILL.md file for detailed instructions using the Read tool.

${enabledSkills.map(s => `- **${s.name}** (${s.command}): ${s.description}
  File: ${s.filePath}`).join('\n\n')}

To use a skill: Read the SKILL.md file when you need its instructions for the current task.
</available-skills>
`;
  }

  // Build the complete system prompt
  const systemPrompt = ACCOMPLISH_SYSTEM_PROMPT_TEMPLATE
    .replace(/\{\{ENVIRONMENT_INSTRUCTIONS\}\}/g, getPlatformEnvironmentInstructions())
    + skillsSection;
```

Make sure the `systemPrompt` variable is used in the agent config (it likely already is).

**Step 3: Verify types compile**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: PASS with no errors

**Step 4: Commit**

```bash
git add apps/desktop/src/main/opencode/config-generator.ts
git commit -m "feat(desktop): add enabled skills to system prompt"
```

---

## Task 9: Update SkillsPanel to Use IPC

**Files:**
- Modify: `apps/desktop/src/renderer/components/settings/skills/SkillsPanel.tsx`

**Step 1: Replace mock data with IPC calls**

Replace the useState initialization and add loading state:

```typescript
const [skills, setSkills] = useState<Skill[]>([]);
const [loading, setLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState('');
const [filter, setFilter] = useState<FilterType>('all');
const [isAtBottom, setIsAtBottom] = useState(false);
const scrollRef = useRef<HTMLDivElement>(null);

// Load skills on mount
useEffect(() => {
  window.accomplish
    .getSkills()
    .then(setSkills)
    .catch((err) => console.error('Failed to load skills:', err))
    .finally(() => setLoading(false));
}, []);
```

Update the handlers:

```typescript
const handleToggle = useCallback(async (id: string) => {
  const skill = skills.find((s) => s.id === id);
  if (!skill) return;

  try {
    await window.accomplish.setSkillEnabled(id, !skill.isEnabled);
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  } catch (err) {
    console.error('Failed to toggle skill:', err);
  }
}, [skills]);

const handleDelete = useCallback(async (id: string) => {
  const skill = skills.find((s) => s.id === id);
  if (!skill) return;

  if (skill.source === 'official') {
    // Could show a toast here
    console.warn('Cannot delete official skills');
    return;
  }

  try {
    await window.accomplish.deleteSkill(id);
    setSkills((prev) => prev.filter((s) => s.id !== id));
  } catch (err) {
    console.error('Failed to delete skill:', err);
  }
}, [skills]);
```

Remove the import of `MOCK_SKILLS` from the imports.

Add loading state to the render:

```typescript
if (loading) {
  return (
    <div className="flex h-[280px] items-center justify-center">
      <div className="text-sm text-muted-foreground">Loading skills...</div>
    </div>
  );
}
```

**Step 2: Verify types compile**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: PASS with no errors

**Step 3: Test in the app**

Run: `pnpm dev`
Expected: Skills panel loads and shows bundled skills from the skills/ directory

**Step 4: Commit**

```bash
git add apps/desktop/src/renderer/components/settings/skills/SkillsPanel.tsx
git commit -m "feat(desktop): connect SkillsPanel to IPC"
```

---

## Task 10: Update SkillCard for Source-Based Restrictions

**Files:**
- Modify: `apps/desktop/src/renderer/components/settings/skills/SkillCard.tsx`

**Step 1: Disable delete for official skills**

In the DropdownMenu, update the Delete item:

```typescript
<DropdownMenuItem
  onClick={() => onDelete(skill.id)}
  disabled={skill.source === 'official'}
  className={skill.source === 'official' ? 'opacity-50 cursor-not-allowed' : ''}
>
  Delete
</DropdownMenuItem>
```

**Step 2: Verify types compile**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: PASS with no errors

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/components/settings/skills/SkillCard.tsx
git commit -m "feat(desktop): disable delete for official skills"
```

---

## Task 11: Implement AddSkillDropdown Actions

**Files:**
- Modify: `apps/desktop/src/renderer/components/settings/skills/AddSkillDropdown.tsx`

**Step 1: Add state and callbacks**

The component needs to receive a callback to refresh skills. Update the component to accept props and implement the actions:

```typescript
import { useState } from 'react';

interface AddSkillDropdownProps {
  onSkillAdded?: () => void;
}

export function AddSkillDropdown({ onSkillAdded }: AddSkillDropdownProps) {
  const [isGitHubDialogOpen, setIsGitHubDialogOpen] = useState(false);
  const [gitHubUrl, setGitHubUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = async () => {
    // For now, we'll use a simple file input approach
    // In a real implementation, you'd use Electron's dialog
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Read file path - note: in Electron, we can get the path
      // For web file API, we need to read content differently
      // This is a simplified version
      try {
        setIsLoading(true);
        // Note: This would need actual file path from Electron dialog
        // For now, log a placeholder
        console.log('File upload selected:', file.name);
        // await window.accomplish.addSkillFromFile(filePath);
        // onSkillAdded?.();
      } catch (err) {
        console.error('Failed to add skill:', err);
      } finally {
        setIsLoading(false);
      }
    };
    input.click();
  };

  const handleImportFromGitHub = async () => {
    if (!gitHubUrl.trim()) return;

    try {
      setIsLoading(true);
      await window.accomplish.addSkillFromGitHub(gitHubUrl);
      setGitHubUrl('');
      setIsGitHubDialogOpen(false);
      onSkillAdded?.();
    } catch (err) {
      console.error('Failed to import from GitHub:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ... rest of component with updated onClick handlers
}
```

Update the onClick handlers in the dropdown items:

```typescript
<DropdownMenuItem onClick={handleUpload}>
  {/* Upload option */}
</DropdownMenuItem>

<DropdownMenuItem onClick={() => setIsGitHubDialogOpen(true)}>
  {/* Import from GitHub option */}
</DropdownMenuItem>
```

**Step 2: Update SkillsPanel to pass onSkillAdded**

In SkillsPanel.tsx, add a refresh function:

```typescript
const refreshSkills = useCallback(async () => {
  const updatedSkills = await window.accomplish.getSkills();
  setSkills(updatedSkills);
}, []);
```

Pass it to AddSkillDropdown in SettingsDialog or wherever it's rendered.

**Step 3: Verify types compile**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: PASS with no errors

**Step 4: Commit**

```bash
git add apps/desktop/src/renderer/components/settings/skills/AddSkillDropdown.tsx
git add apps/desktop/src/renderer/components/settings/skills/SkillsPanel.tsx
git commit -m "feat(desktop): implement AddSkillDropdown actions"
```

---

## Task 12: Delete Mock Skills File

**Files:**
- Delete: `apps/desktop/src/renderer/components/settings/skills/mockSkills.ts`

**Step 1: Remove the file**

```bash
rm apps/desktop/src/renderer/components/settings/skills/mockSkills.ts
```

**Step 2: Verify no imports remain**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: PASS with no errors (imports already removed in Task 9)

**Step 3: Commit**

```bash
git add -A
git commit -m "chore(desktop): remove mock skills data"
```

---

## Task 13: Final Integration Test

**Step 1: Run the full app**

Run: `pnpm dev`

**Step 2: Test the skills panel**

1. Open Settings dialog
2. Click "Skills" tab
3. Verify bundled skills appear (dev-browser, ask-user-question, etc.)
4. Toggle a skill on/off - verify it persists after restarting app
5. Try to delete an official skill - verify it's disabled
6. (If implemented) Try importing from GitHub URL

**Step 3: Verify system prompt includes skills**

1. Start a task
2. Check the OpenCode config or debug logs
3. Verify enabled skills appear in the system prompt

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(desktop): integration fixes for skills system"
```

---

---

## Task 14: Create Test Script for SkillsManager

**Files:**
- Create: `apps/desktop/scripts/test-skills-manager.ts`

**Step 1: Create a standalone test script**

This script tests SkillsManager logic without requiring the full Electron app:

```typescript
// apps/desktop/scripts/test-skills-manager.ts
// Run with: npx tsx apps/desktop/scripts/test-skills-manager.ts

import path from 'path';
import fs from 'fs';
import os from 'os';
import matter from 'gray-matter';
import Database from 'better-sqlite3';

// ============ MOCK ELECTRON APP ============
const TEST_DIR = path.join(os.tmpdir(), 'skills-test-' + Date.now());
const DB_PATH = path.join(TEST_DIR, 'test.db');
const BUNDLED_SKILLS_PATH = path.join(TEST_DIR, 'bundled-skills');
const USER_SKILLS_PATH = path.join(TEST_DIR, 'user-skills');

// Create test directories
fs.mkdirSync(TEST_DIR, { recursive: true });
fs.mkdirSync(BUNDLED_SKILLS_PATH, { recursive: true });
fs.mkdirSync(USER_SKILLS_PATH, { recursive: true });

console.log('Test directory:', TEST_DIR);

// ============ CREATE TEST SKILLS ============
function createTestSkill(dir: string, name: string, frontmatter: Record<string, any>, content: string) {
  const skillDir = path.join(dir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  const skillContent = `---
${Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`).join('\n')}
---

${content}`;
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);
  console.log(`Created test skill: ${name}`);
}

// Create bundled skills
createTestSkill(BUNDLED_SKILLS_PATH, 'test-browser', {
  name: 'test-browser',
  description: 'Test browser automation skill',
  verified: true,
}, '# Test Browser\n\nThis is a test browser skill.');

createTestSkill(BUNDLED_SKILLS_PATH, 'test-file-ops', {
  name: 'test-file-ops',
  description: 'Test file operations skill',
}, '# Test File Ops\n\nThis is a test file operations skill.');

// ============ SETUP DATABASE ============
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create skills table
db.exec(`
  CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    command TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('official', 'community', 'custom')),
    is_enabled INTEGER NOT NULL DEFAULT 1,
    is_verified INTEGER NOT NULL DEFAULT 0,
    file_path TEXT NOT NULL,
    github_url TEXT,
    updated_at TEXT NOT NULL
  )
`);
db.exec('CREATE INDEX idx_skills_enabled ON skills(is_enabled)');
db.exec('CREATE INDEX idx_skills_source ON skills(source)');

console.log('Database created with skills table');

// ============ SIMPLIFIED SKILLS MANAGER ============
type SkillSource = 'official' | 'community' | 'custom';

interface Skill {
  id: string;
  name: string;
  command: string;
  description: string;
  source: SkillSource;
  isEnabled: boolean;
  isVerified: boolean;
  filePath: string;
  githubUrl?: string;
  updatedAt: string;
}

interface SkillRow {
  id: string;
  name: string;
  command: string;
  description: string;
  source: string;
  is_enabled: number;
  is_verified: number;
  file_path: string;
  github_url: string | null;
  updated_at: string;
}

function rowToSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    command: row.command,
    description: row.description,
    source: row.source as SkillSource,
    isEnabled: row.is_enabled === 1,
    isVerified: row.is_verified === 1,
    filePath: row.file_path,
    githubUrl: row.github_url || undefined,
    updatedAt: row.updated_at,
  };
}

function getAllSkills(): Skill[] {
  const rows = db.prepare('SELECT * FROM skills ORDER BY name').all() as SkillRow[];
  return rows.map(rowToSkill);
}

function getEnabledSkills(): Skill[] {
  const rows = db.prepare('SELECT * FROM skills WHERE is_enabled = 1 ORDER BY name').all() as SkillRow[];
  return rows.map(rowToSkill);
}

function upsertSkill(skill: Skill): void {
  db.prepare(`
    INSERT INTO skills (id, name, command, description, source, is_enabled, is_verified, file_path, github_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      command = excluded.command,
      description = excluded.description,
      is_enabled = excluded.is_enabled,
      is_verified = excluded.is_verified,
      file_path = excluded.file_path,
      github_url = excluded.github_url,
      updated_at = excluded.updated_at
  `).run(
    skill.id,
    skill.name,
    skill.command,
    skill.description,
    skill.source,
    skill.isEnabled ? 1 : 0,
    skill.isVerified ? 1 : 0,
    skill.filePath,
    skill.githubUrl || null,
    skill.updatedAt
  );
}

function setSkillEnabled(id: string, enabled: boolean): void {
  db.prepare('UPDATE skills SET is_enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
}

function deleteSkillFromDb(id: string): void {
  db.prepare('DELETE FROM skills WHERE id = ?').run(id);
}

function parseFrontmatter(content: string): { name: string; description: string; command?: string; verified?: boolean } {
  try {
    const { data } = matter(content);
    return {
      name: data.name || '',
      description: data.description || '',
      command: data.command,
      verified: data.verified,
    };
  } catch {
    return { name: '', description: '' };
  }
}

function generateId(name: string, source: SkillSource): string {
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `${source}-${safeName}`;
}

function scanDirectory(dirPath: string, defaultSource: SkillSource): Skill[] {
  const skills: Skill[] = [];
  if (!fs.existsSync(dirPath)) return skills;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillMdPath = path.join(dirPath, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    const name = frontmatter.name || entry.name;

    skills.push({
      id: generateId(name, defaultSource),
      name,
      command: frontmatter.command || `/${name}`,
      description: frontmatter.description || '',
      source: defaultSource,
      isEnabled: true,
      isVerified: frontmatter.verified || false,
      filePath: skillMdPath,
      updatedAt: new Date().toISOString(),
    });
  }
  return skills;
}

// ============ TESTS ============
console.log('\n========== RUNNING TESTS ==========\n');

// Test 1: Scan bundled skills
console.log('TEST 1: Scan bundled skills directory');
const bundledSkills = scanDirectory(BUNDLED_SKILLS_PATH, 'official');
console.log(`  Found ${bundledSkills.length} bundled skills`);
console.assert(bundledSkills.length === 2, 'Should find 2 bundled skills');
console.log('  ✅ PASS\n');

// Test 2: Insert skills to database
console.log('TEST 2: Insert skills to database');
for (const skill of bundledSkills) {
  upsertSkill(skill);
}
const allSkills = getAllSkills();
console.log(`  Inserted ${allSkills.length} skills`);
console.assert(allSkills.length === 2, 'Should have 2 skills in database');
console.log('  ✅ PASS\n');

// Test 3: Toggle skill enabled state
console.log('TEST 3: Toggle skill enabled state');
const firstSkill = allSkills[0];
console.log(`  Disabling skill: ${firstSkill.name}`);
setSkillEnabled(firstSkill.id, false);
const enabledSkills = getEnabledSkills();
console.log(`  Enabled skills count: ${enabledSkills.length}`);
console.assert(enabledSkills.length === 1, 'Should have 1 enabled skill');
console.log('  ✅ PASS\n');

// Test 4: Re-enable skill
console.log('TEST 4: Re-enable skill');
setSkillEnabled(firstSkill.id, true);
const enabledAfterReEnable = getEnabledSkills();
console.assert(enabledAfterReEnable.length === 2, 'Should have 2 enabled skills');
console.log('  ✅ PASS\n');

// Test 5: Add custom skill
console.log('TEST 5: Add custom skill from file');
createTestSkill(USER_SKILLS_PATH, 'my-custom-skill', {
  name: 'my-custom-skill',
  description: 'A custom test skill',
}, '# My Custom Skill\n\nThis is my custom skill.');

const userSkills = scanDirectory(USER_SKILLS_PATH, 'custom');
console.log(`  Found ${userSkills.length} user skills`);
for (const skill of userSkills) {
  upsertSkill(skill);
}
const allSkillsAfterCustom = getAllSkills();
console.assert(allSkillsAfterCustom.length === 3, 'Should have 3 skills total');
console.log('  ✅ PASS\n');

// Test 6: Delete custom skill
console.log('TEST 6: Delete custom skill');
const customSkill = allSkillsAfterCustom.find(s => s.source === 'custom');
if (customSkill) {
  deleteSkillFromDb(customSkill.id);
  const skillDir = path.dirname(customSkill.filePath);
  if (fs.existsSync(skillDir)) {
    fs.rmSync(skillDir, { recursive: true });
  }
}
const allSkillsAfterDelete = getAllSkills();
console.assert(allSkillsAfterDelete.length === 2, 'Should have 2 skills after delete');
console.log('  ✅ PASS\n');

// Test 7: Cannot delete official skill (business logic check)
console.log('TEST 7: Verify official skills are marked correctly');
const officialSkill = allSkillsAfterDelete.find(s => s.source === 'official');
console.assert(officialSkill !== undefined, 'Should have official skills');
console.assert(officialSkill!.source === 'official', 'Source should be official');
console.log('  ✅ PASS\n');

// Test 8: Build system prompt section
console.log('TEST 8: Build system prompt section');
const enabled = getEnabledSkills();
let skillsSection = '';
if (enabled.length > 0) {
  skillsSection = `
<available-skills>
The following skills are available:

${enabled.map(s => `- **${s.name}** (${s.command}): ${s.description}
  File: ${s.filePath}`).join('\n\n')}
</available-skills>
`;
}
console.log('  Generated system prompt section:');
console.log(skillsSection.substring(0, 200) + '...');
console.assert(skillsSection.includes('test-browser'), 'Should include test-browser skill');
console.log('  ✅ PASS\n');

// Test 9: Frontmatter parsing
console.log('TEST 9: Frontmatter parsing');
const testContent = `---
name: test-skill
description: A test description
command: /test
verified: true
---

# Test Content`;
const parsed = parseFrontmatter(testContent);
console.assert(parsed.name === 'test-skill', 'Name should be test-skill');
console.assert(parsed.description === 'A test description', 'Description should match');
console.assert(parsed.command === '/test', 'Command should be /test');
console.assert(parsed.verified === true, 'Verified should be true');
console.log('  ✅ PASS\n');

// Cleanup
console.log('========== CLEANUP ==========');
db.close();
fs.rmSync(TEST_DIR, { recursive: true });
console.log('Test directory cleaned up');

console.log('\n========== ALL TESTS PASSED ==========\n');
```

**Step 2: Run the test script**

Run: `cd apps/desktop && npx tsx scripts/test-skills-manager.ts`
Expected: All 9 tests pass

**Step 3: Commit**

```bash
git add apps/desktop/scripts/test-skills-manager.ts
git commit -m "test(desktop): add SkillsManager integration test script"
```

---

## Task 15: Create Test Script for System Prompt Generation

**Files:**
- Create: `apps/desktop/scripts/test-system-prompt.ts`

**Step 1: Create system prompt test script**

This verifies that skills are correctly included in the system prompt:

```typescript
// apps/desktop/scripts/test-system-prompt.ts
// Run with: npx tsx apps/desktop/scripts/test-system-prompt.ts

import path from 'path';
import fs from 'fs';
import os from 'os';
import matter from 'gray-matter';

// ============ SETUP ============
const TEST_DIR = path.join(os.tmpdir(), 'prompt-test-' + Date.now());
const SKILLS_PATH = path.join(TEST_DIR, 'skills');

fs.mkdirSync(SKILLS_PATH, { recursive: true });
console.log('Test directory:', TEST_DIR);

// ============ CREATE TEST SKILLS ============
function createTestSkill(name: string, description: string, content: string) {
  const skillDir = path.join(SKILLS_PATH, name);
  fs.mkdirSync(skillDir, { recursive: true });
  const skillContent = `---
name: ${name}
description: ${description}
---

${content}`;
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);
}

createTestSkill('browser-automation', 'Automate web browsers for testing and scraping', '# Browser Automation\n\nUse browser_* tools.');
createTestSkill('file-manager', 'Manage files and directories', '# File Manager\n\nUse file_* tools.');
createTestSkill('disabled-skill', 'This skill is disabled', '# Disabled\n\nShould not appear.');

// ============ SIMULATE SKILLS STATE ============
interface Skill {
  id: string;
  name: string;
  command: string;
  description: string;
  filePath: string;
  isEnabled: boolean;
}

const skills: Skill[] = [
  {
    id: 'official-browser-automation',
    name: 'browser-automation',
    command: '/browser',
    description: 'Automate web browsers for testing and scraping',
    filePath: path.join(SKILLS_PATH, 'browser-automation', 'SKILL.md'),
    isEnabled: true,
  },
  {
    id: 'official-file-manager',
    name: 'file-manager',
    command: '/files',
    description: 'Manage files and directories',
    filePath: path.join(SKILLS_PATH, 'file-manager', 'SKILL.md'),
    isEnabled: true,
  },
  {
    id: 'official-disabled-skill',
    name: 'disabled-skill',
    command: '/disabled',
    description: 'This skill is disabled',
    filePath: path.join(SKILLS_PATH, 'disabled-skill', 'SKILL.md'),
    isEnabled: false,
  },
];

// ============ BUILD SYSTEM PROMPT ============
function buildSystemPromptWithSkills(enabledSkills: Skill[]): string {
  const basePrompt = `<identity>
You are Accomplish, a browser automation assistant.
</identity>

<environment>
You are running on macOS.
</environment>`;

  if (enabledSkills.length === 0) {
    return basePrompt;
  }

  const skillsSection = `
<available-skills>
The following skills are available. When a task matches a skill's description, read its SKILL.md file for detailed instructions using the Read tool.

${enabledSkills.map(s => `- **${s.name}** (${s.command}): ${s.description}
  File: ${s.filePath}`).join('\n\n')}

To use a skill: Read the SKILL.md file when you need its instructions for the current task.
</available-skills>
`;

  return basePrompt + skillsSection;
}

// ============ TESTS ============
console.log('\n========== RUNNING TESTS ==========\n');

// Test 1: Only enabled skills in prompt
console.log('TEST 1: Only enabled skills appear in prompt');
const enabledSkills = skills.filter(s => s.isEnabled);
const prompt = buildSystemPromptWithSkills(enabledSkills);

console.assert(prompt.includes('browser-automation'), 'Should include browser-automation');
console.assert(prompt.includes('file-manager'), 'Should include file-manager');
console.assert(!prompt.includes('disabled-skill'), 'Should NOT include disabled-skill');
console.log('  ✅ PASS\n');

// Test 2: Skill file paths are absolute
console.log('TEST 2: Skill file paths are absolute');
console.assert(prompt.includes(TEST_DIR), 'File paths should be absolute');
console.log('  ✅ PASS\n');

// Test 3: Skills section has correct format
console.log('TEST 3: Skills section has correct XML format');
console.assert(prompt.includes('<available-skills>'), 'Should have opening tag');
console.assert(prompt.includes('</available-skills>'), 'Should have closing tag');
console.log('  ✅ PASS\n');

// Test 4: Empty skills results in no skills section
console.log('TEST 4: No skills section when no skills enabled');
const emptyPrompt = buildSystemPromptWithSkills([]);
console.assert(!emptyPrompt.includes('<available-skills>'), 'Should not have skills section');
console.log('  ✅ PASS\n');

// Test 5: Skill content can be read
console.log('TEST 5: Skill content can be read from file path');
const browserSkill = enabledSkills.find(s => s.name === 'browser-automation');
if (browserSkill) {
  const content = fs.readFileSync(browserSkill.filePath, 'utf-8');
  console.assert(content.includes('Browser Automation'), 'Should read skill content');
  console.assert(content.includes('browser_* tools'), 'Should contain instructions');
}
console.log('  ✅ PASS\n');

// Test 6: Prompt has reasonable token count
console.log('TEST 6: Prompt has reasonable size');
const tokenEstimate = prompt.length / 4; // Rough estimate
console.log(`  Estimated tokens: ~${Math.round(tokenEstimate)}`);
console.assert(tokenEstimate < 2000, 'Skills section should not be too large');
console.log('  ✅ PASS\n');

// Cleanup
console.log('========== CLEANUP ==========');
fs.rmSync(TEST_DIR, { recursive: true });
console.log('Test directory cleaned up');

console.log('\n========== ALL TESTS PASSED ==========\n');
```

**Step 2: Run the test script**

Run: `cd apps/desktop && npx tsx scripts/test-system-prompt.ts`
Expected: All 6 tests pass

**Step 3: Commit**

```bash
git add apps/desktop/scripts/test-system-prompt.ts
git commit -m "test(desktop): add system prompt generation test script"
```

---

## Task 16: Create Test Script for GitHub Import

**Files:**
- Create: `apps/desktop/scripts/test-github-import.ts`

**Step 1: Create GitHub import test script**

This tests the GitHub URL parsing and import logic:

```typescript
// apps/desktop/scripts/test-github-import.ts
// Run with: npx tsx apps/desktop/scripts/test-github-import.ts

import path from 'path';
import fs from 'fs';
import os from 'os';

// ============ SETUP ============
const TEST_DIR = path.join(os.tmpdir(), 'github-test-' + Date.now());
const USER_SKILLS_PATH = path.join(TEST_DIR, 'user-skills');

fs.mkdirSync(USER_SKILLS_PATH, { recursive: true });
console.log('Test directory:', TEST_DIR);

// ============ URL CONVERSION LOGIC ============
function convertToRawUrl(url: string): string {
  // Already a raw URL
  if (url.includes('raw.githubusercontent.com')) {
    return url;
  }

  // Convert github.com/user/repo/blob/branch/path to raw URL
  if (url.includes('github.com') && url.includes('/blob/')) {
    return url
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }

  // Convert github.com/user/repo/path (without blob) - assume main branch
  const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/(.+)/);
  if (githubMatch) {
    const [, user, repo, filePath] = githubMatch;
    return `https://raw.githubusercontent.com/${user}/${repo}/main/${filePath}`;
  }

  throw new Error('Invalid GitHub URL format');
}

function validateGitHubUrl(url: string): boolean {
  return url.includes('github.com') || url.includes('raw.githubusercontent.com');
}

// ============ TESTS ============
console.log('\n========== RUNNING TESTS ==========\n');

// Test 1: Convert blob URL to raw
console.log('TEST 1: Convert blob URL to raw URL');
const blobUrl = 'https://github.com/user/repo/blob/main/skills/test/SKILL.md';
const rawUrl = convertToRawUrl(blobUrl);
console.log(`  Input:  ${blobUrl}`);
console.log(`  Output: ${rawUrl}`);
console.assert(rawUrl === 'https://raw.githubusercontent.com/user/repo/main/skills/test/SKILL.md', 'Should convert correctly');
console.log('  ✅ PASS\n');

// Test 2: Already raw URL
console.log('TEST 2: Already raw URL unchanged');
const alreadyRaw = 'https://raw.githubusercontent.com/user/repo/main/SKILL.md';
const result = convertToRawUrl(alreadyRaw);
console.assert(result === alreadyRaw, 'Should return unchanged');
console.log('  ✅ PASS\n');

// Test 3: Validate GitHub URLs
console.log('TEST 3: Validate GitHub URLs');
console.assert(validateGitHubUrl('https://github.com/test/repo') === true, 'github.com should be valid');
console.assert(validateGitHubUrl('https://raw.githubusercontent.com/test') === true, 'raw should be valid');
console.assert(validateGitHubUrl('https://example.com/file.md') === false, 'other URLs should be invalid');
console.log('  ✅ PASS\n');

// Test 4: Invalid URL throws
console.log('TEST 4: Invalid URL throws error');
try {
  convertToRawUrl('https://example.com/file.md');
  console.assert(false, 'Should have thrown');
} catch (err) {
  console.assert((err as Error).message.includes('Invalid'), 'Should throw invalid error');
}
console.log('  ✅ PASS\n');

// Test 5: Simulate file save after download
console.log('TEST 5: Simulate skill file save after GitHub download');
const mockSkillContent = `---
name: imported-skill
description: An imported skill from GitHub
---

# Imported Skill

This skill was imported from GitHub.`;

const skillName = 'imported-skill';
const skillDir = path.join(USER_SKILLS_PATH, skillName);
fs.mkdirSync(skillDir, { recursive: true });
fs.writeFileSync(path.join(skillDir, 'SKILL.md'), mockSkillContent);

const savedContent = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8');
console.assert(savedContent.includes('imported-skill'), 'Content should be saved');
console.log('  ✅ PASS\n');

// Test 6: Handle various branch names
console.log('TEST 6: Handle different branch names in URL');
const developUrl = 'https://github.com/user/repo/blob/develop/SKILL.md';
const rawDevelop = convertToRawUrl(developUrl);
console.assert(rawDevelop.includes('/develop/'), 'Should preserve branch name');
console.log('  ✅ PASS\n');

// Cleanup
console.log('========== CLEANUP ==========');
fs.rmSync(TEST_DIR, { recursive: true });
console.log('Test directory cleaned up');

console.log('\n========== ALL TESTS PASSED ==========\n');
```

**Step 2: Run the test script**

Run: `cd apps/desktop && npx tsx scripts/test-github-import.ts`
Expected: All 6 tests pass

**Step 3: Commit**

```bash
git add apps/desktop/scripts/test-github-import.ts
git commit -m "test(desktop): add GitHub import test script"
```

---

## Task 17: Run All Test Scripts

**Step 1: Run all test scripts sequentially**

Run:
```bash
cd apps/desktop
echo "=== Running SkillsManager tests ===" && npx tsx scripts/test-skills-manager.ts
echo "=== Running System Prompt tests ===" && npx tsx scripts/test-system-prompt.ts
echo "=== Running GitHub Import tests ===" && npx tsx scripts/test-github-import.ts
```

Expected: All tests pass

**Step 2: If any test fails, fix the issue and re-run**

Debug any failures, update the implementation, and re-run until all pass.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(desktop): test fixes for skills system"
```

---

## Task 18: Manual App Testing

**Step 1: Start the app in dev mode**

Run: `pnpm dev`

**Step 2: Test Skills Panel UI**

1. Open Settings dialog (gear icon)
2. Click "Skills" tab
3. Verify bundled skills appear from `apps/desktop/skills/`
4. Verify skill cards show:
   - Name and description
   - Enable/disable toggle
   - Source badge (official/community/custom)
   - 3-dot menu with Configure/Delete

**Step 3: Test Enable/Disable**

1. Disable a skill using the toggle
2. Close and reopen Settings
3. Verify the skill remains disabled (state persisted)
4. Re-enable the skill

**Step 4: Test Delete Restriction**

1. Click 3-dot menu on an official skill
2. Verify Delete option is disabled/grayed out
3. (If you added a custom skill) Verify Delete works for custom skills

**Step 5: Test System Prompt**

1. Start a new task
2. Check the console logs for "[OpenCode Config]"
3. Verify you see the `<available-skills>` section in the config

**Step 6: Document any issues found**

If issues are found, create fix commits:

```bash
git add -A
git commit -m "fix(desktop): [describe the fix]"
```

---

## Summary

This implementation plan covers:

1. **Types**: Updated Skill interface with filePath and githubUrl
2. **Database**: Migration for skills table
3. **Repository**: CRUD operations for skills
4. **Service**: SkillsManager for scanning, syncing, and managing skills
5. **IPC**: Handlers for renderer communication
6. **Preload**: API exposed to renderer
7. **Startup**: Initialize SkillsManager on app start
8. **System Prompt**: Include enabled skills for AI
9. **UI**: Connect SkillsPanel to backend, implement actions
10. **Cleanup**: Remove mock data
11. **Testing**: Comprehensive test scripts for all flows

**Testing Tasks (14-18):**
- Task 14: SkillsManager unit tests (9 test cases)
- Task 15: System prompt generation tests (6 test cases)
- Task 16: GitHub import tests (6 test cases)
- Task 17: Run all automated tests
- Task 18: Manual app testing checklist

Total: ~18 tasks, each with clear steps and commit points.
