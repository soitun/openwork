# Skills Implementation Design

> Design document for implementing the Skills system in Openwork.

## Overview

Add backend logic for the Skills tab to replace mock data with a persistent, cross-platform skills system. Skills are SKILL.md files containing instructions/prompts that the AI can read on-demand.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RENDERER (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  SkillsPanel.tsx                                                 │
│    ├─ Fetches skills via IPC: getSkills()                       │
│    ├─ Toggle enabled: setSkillEnabled(id, enabled)              │
│    ├─ Add skill: addSkillFromFile() / addSkillFromGitHub()      │
│    └─ Delete skill: deleteSkill(id)                             │
└─────────────────────────────────────────────────────────────────┘
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MAIN PROCESS (Electron)                     │
├─────────────────────────────────────────────────────────────────┤
│  IPC Handlers (skills:*)                                         │
│    ├─ skills:list → SkillsManager.getAll()                      │
│    ├─ skills:list-enabled → SkillsManager.getEnabled()          │
│    ├─ skills:set-enabled → SkillsManager.setEnabled()           │
│    ├─ skills:add-from-file → SkillsManager.addFromFile()        │
│    ├─ skills:add-from-github → SkillsManager.addFromGitHub()    │
│    └─ skills:delete → SkillsManager.delete()                    │
├─────────────────────────────────────────────────────────────────┤
│  SkillsManager (new service)                                     │
│    ├─ Scans bundled skills: resources/skills/*/SKILL.md         │
│    ├─ Scans user skills: userData/skills/*/SKILL.md             │
│    ├─ Stores enabled state in SQLite                            │
│    └─ Provides skill list for system prompt                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         STORAGE                                  │
├─────────────────────────────────────────────────────────────────┤
│  SQLite (skills table):                                          │
│    id, name, command, description, source, is_enabled,          │
│    is_verified, file_path, github_url, updated_at               │
│                                                                  │
│  Filesystem:                                                     │
│    bundled: resources/skills/<name>/SKILL.md (read-only)        │
│    user: userData/skills/<name>/SKILL.md (read-write)           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### SQLite Migration (v002-skills.ts)

```sql
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL,            -- 'official' | 'community' | 'custom'
  is_enabled INTEGER NOT NULL DEFAULT 1,
  is_verified INTEGER NOT NULL DEFAULT 0,
  file_path TEXT NOT NULL,
  github_url TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_skills_enabled ON skills(is_enabled);
CREATE INDEX idx_skills_source ON skills(source);
```

### Skill Interface

```typescript
// packages/shared/src/types/skills.ts
export type SkillSource = 'official' | 'community' | 'custom';

export interface Skill {
  id: string;
  name: string;
  command: string;           // e.g., "/dev-browser"
  description: string;
  source: SkillSource;
  isEnabled: boolean;
  isVerified: boolean;
  filePath: string;          // Absolute path to SKILL.md
  githubUrl?: string;        // Original URL if imported
  updatedAt: string;
}
```

### SKILL.md Frontmatter

```yaml
---
name: dev-browser
description: Browser automation via MCP tools...
command: /dev-browser        # Optional, defaults to /name
verified: true               # Only for official skills
---

# Instructions here...
```

## SkillsManager Service

```typescript
// src/main/skills/SkillsManager.ts

class SkillsManager {
  // Initialization - called on app startup
  async initialize(): Promise<void>
    // 1. Run migration if needed
    // 2. Scan bundled skills from getSkillsPath()
    // 3. Scan user skills from getUserSkillsPath()
    // 4. Sync found skills to database

  // Core operations
  async getAll(): Promise<Skill[]>
  async getEnabled(): Promise<Skill[]>
  async setEnabled(id: string, enabled: boolean): Promise<void>

  // Skill management
  async addFromFile(filePath: string): Promise<Skill>
  async addFromGitHub(rawUrl: string): Promise<Skill>
  async delete(id: string): Promise<void>

  // Helpers
  private getBundledSkillsPath(): string
  private getUserSkillsPath(): string
  private scanDirectory(dir: string, source: SkillSource): Skill[]
  private parseFrontmatter(content: string): SkillFrontmatter
  private generateId(name: string, source: SkillSource): string
}
```

## AI Integration

Skills are listed in the system prompt. OpenCode reads SKILL.md files on-demand using its built-in Read tool.

### System Prompt Addition

```typescript
// In generateOpenCodeConfig()

const enabledSkills = await skillsManager.getEnabled();

const skillsSection = enabledSkills.length > 0 ? `
<available-skills>
The following skills are available. When a task matches a skill's description,
read its SKILL.md file for detailed instructions.

${enabledSkills.map(s => `- **${s.name}** (${s.command}): ${s.description}
  File: ${s.filePath}`).join('\n\n')}

To use a skill, read its SKILL.md file using the Read tool when needed.
</available-skills>
` : '';
```

### Flow

1. User asks: "Help me automate filling this form"
2. OpenCode sees in system prompt: "dev-browser: Browser automation..."
3. OpenCode: "This matches dev-browser skill"
4. OpenCode uses Read tool on the file path
5. OpenCode follows the SKILL.md instructions

## IPC API

### Handlers (src/main/ipc/handlers.ts)

```typescript
ipcMain.handle('skills:list', async () => skillsManager.getAll());
ipcMain.handle('skills:list-enabled', async () => skillsManager.getEnabled());
ipcMain.handle('skills:set-enabled', async (_, id, enabled) =>
  skillsManager.setEnabled(id, enabled));
ipcMain.handle('skills:add-from-file', async (_, filePath) =>
  skillsManager.addFromFile(filePath));
ipcMain.handle('skills:add-from-github', async (_, rawUrl) =>
  skillsManager.addFromGitHub(rawUrl));
ipcMain.handle('skills:delete', async (_, id) => skillsManager.delete(id));
```

### Preload API (src/preload/index.ts)

```typescript
getSkills: () => ipcRenderer.invoke('skills:list'),
getEnabledSkills: () => ipcRenderer.invoke('skills:list-enabled'),
setSkillEnabled: (id, enabled) => ipcRenderer.invoke('skills:set-enabled', id, enabled),
addSkillFromFile: (filePath) => ipcRenderer.invoke('skills:add-from-file', filePath),
addSkillFromGitHub: (rawUrl) => ipcRenderer.invoke('skills:add-from-github', rawUrl),
deleteSkill: (id) => ipcRenderer.invoke('skills:delete', id),
```

## UI Updates

### SkillsPanel.tsx

- Replace `MOCK_SKILLS` with IPC call to `getSkills()`
- Update `handleToggle` to call `setSkillEnabled()`
- Update `handleDelete` to call `deleteSkill()`
- Add loading state

### AddSkillDropdown.tsx

- **Upload**: File picker → `addSkillFromFile()`
- **Import from GitHub**: Input dialog → `addSkillFromGitHub()`
- **Build with AI**: Future feature (show "Coming soon")
- **Add from official**: Future feature (skills catalog)

### SkillCard.tsx

- Disable delete button for `source === 'official'`
- Show source-specific icons

## File Structure

### New Files

```
apps/desktop/src/main/skills/
├── SkillsManager.ts
└── index.ts

apps/desktop/src/main/store/migrations/
└── v002-skills.ts
```

### Modified Files

```
apps/desktop/src/main/
├── index.ts                      # Initialize SkillsManager
├── ipc/handlers.ts               # Add skills:* handlers
├── opencode/config-generator.ts  # Add skills to system prompt
└── store/migrations/index.ts     # Register v002

apps/desktop/src/preload/index.ts # Add skills API

apps/desktop/src/renderer/components/settings/skills/
├── SkillsPanel.tsx              # Use IPC instead of mock
├── SkillCard.tsx                # Source-based restrictions
└── AddSkillDropdown.tsx         # Implement actions

packages/shared/src/types/skills.ts  # Add filePath, githubUrl
```

### Files to Delete

```
apps/desktop/src/renderer/components/settings/skills/mockSkills.ts
```

## Cross-Platform Considerations

- Use `path.join()` for all path construction
- Use `app.getPath('userData')` for user data directory
- Handle Windows vs Unix path separators
- Use Node.js `fs` module (works on both platforms)

## Implementation Order

1. Create database migration (v002-skills.ts)
2. Create SkillsManager service
3. Add IPC handlers
4. Update preload API
5. Update system prompt in config-generator
6. Update SkillsPanel to use IPC
7. Implement AddSkillDropdown actions
8. Add delete restrictions to SkillCard
9. Remove mockSkills.ts
10. Test on Windows and Mac

## Sources

- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Claude Agent Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Agent Skills Standard](https://agentskills.io)
