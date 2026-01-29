# Skills Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Skills tab to the Settings dialog that allows users to view, enable/disable, and add skills with the same UX as the approved HTML design.

**Architecture:** Create a `SkillsPanel` component with a scrollable 2-column grid of skill cards. The Add button lives in the tab row (always visible). Skills data will be mocked for now (no backend integration yet). Follow existing patterns from `ProviderCard` and `ProviderSettingsPanel`.

**Tech Stack:** React, TypeScript, Tailwind CSS, Framer Motion, Radix UI (DropdownMenu)

**Design Reference:** `apps/desktop/src/renderer/components/settings/skills-designs/design-final.html`

---

## Task 1: Create Skill Type Definitions

**Files:**
- Create: `packages/shared/src/types/skills.ts`
- Modify: `packages/shared/src/types/index.ts`

**Step 1: Create the skill types file**

```typescript
// packages/shared/src/types/skills.ts

export type SkillSource = 'official' | 'community' | 'custom';

export interface Skill {
  id: string;
  name: string;
  command: string; // e.g., "/skill-creator"
  description: string;
  source: SkillSource;
  isEnabled: boolean;
  isVerified: boolean;
  updatedAt: string; // ISO date string
}

export interface SkillsState {
  skills: Skill[];
  filter: 'all' | 'active' | 'official';
  searchQuery: string;
}
```

**Step 2: Export from shared types index**

Add to `packages/shared/src/types/index.ts`:

```typescript
export * from './skills';
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/shared build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add packages/shared/src/types/skills.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): add Skill type definitions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Mock Skills Data

**Files:**
- Create: `apps/desktop/src/renderer/components/settings/skills/mockSkills.ts`

**Step 1: Create mock data file**

```typescript
// apps/desktop/src/renderer/components/settings/skills/mockSkills.ts

import type { Skill } from '@accomplish/shared';

export const MOCK_SKILLS: Skill[] = [
  {
    id: '1',
    name: 'skill-creator',
    command: '/skill-creator',
    description: 'Guide for creating effective skills. This skill should be used when users want to create a new custom skill.',
    source: 'official',
    isEnabled: true,
    isVerified: true,
    updatedAt: '2026-01-23',
  },
  {
    id: '2',
    name: 'code-review',
    command: '/code-review',
    description: 'Automated code review with best practices enforcement and security vulnerability detection.',
    source: 'official',
    isEnabled: true,
    isVerified: true,
    updatedAt: '2026-01-20',
  },
  {
    id: '3',
    name: 'similarweb-analytics',
    command: '/similarweb',
    description: 'Analyze websites and domains using SimilarWeb traffic data. Get traffic metrics and competitive insights.',
    source: 'official',
    isEnabled: false,
    isVerified: true,
    updatedAt: '2026-01-23',
  },
  {
    id: '4',
    name: 'git-commit',
    command: '/git-commit',
    description: 'Generate meaningful commit messages based on staged changes with conventional commit format support.',
    source: 'official',
    isEnabled: true,
    isVerified: false,
    updatedAt: '2026-01-18',
  },
  {
    id: '5',
    name: 'test-generator',
    command: '/test-gen',
    description: 'Automatically generate unit tests for your code with comprehensive coverage and edge cases.',
    source: 'official',
    isEnabled: false,
    isVerified: false,
    updatedAt: '2026-01-15',
  },
  {
    id: '6',
    name: 'doc-generator',
    command: '/doc-gen',
    description: 'Generate documentation from code comments, function signatures, and inline annotations.',
    source: 'official',
    isEnabled: false,
    isVerified: false,
    updatedAt: '2026-01-14',
  },
  {
    id: '7',
    name: 'api-designer',
    command: '/api-design',
    description: 'Design RESTful APIs with OpenAPI spec generation, endpoint planning, and schema validation.',
    source: 'community',
    isEnabled: false,
    isVerified: false,
    updatedAt: '2026-01-12',
  },
  {
    id: '8',
    name: 'sql-optimizer',
    command: '/sql-opt',
    description: 'Analyze and optimize SQL queries for better performance with index recommendations.',
    source: 'community',
    isEnabled: false,
    isVerified: false,
    updatedAt: '2026-01-10',
  },
  {
    id: '9',
    name: 'refactor-assist',
    command: '/refactor',
    description: 'Intelligent code refactoring suggestions with safe transformation patterns and previews.',
    source: 'community',
    isEnabled: false,
    isVerified: false,
    updatedAt: '2026-01-08',
  },
  {
    id: '10',
    name: 'debug-helper',
    command: '/debug',
    description: 'Analyze stack traces, suggest fixes for common errors, and help with debugging workflows.',
    source: 'community',
    isEnabled: false,
    isVerified: false,
    updatedAt: '2026-01-05',
  },
];
```

**Step 2: Commit**

```bash
git add apps/desktop/src/renderer/components/settings/skills/mockSkills.ts
git commit -m "feat(desktop): add mock skills data for development

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create SkillCard Component

**Files:**
- Create: `apps/desktop/src/renderer/components/settings/skills/SkillCard.tsx`

**Step 1: Create the SkillCard component**

```typescript
// apps/desktop/src/renderer/components/settings/skills/SkillCard.tsx

import { memo, useCallback } from 'react';
import type { Skill } from '@accomplish/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SkillCardProps {
  skill: Skill;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onConfigure: (id: string) => void;
}

export const SkillCard = memo(function SkillCard({
  skill,
  onToggle,
  onDelete,
  onConfigure,
}: SkillCardProps) {
  const handleToggle = useCallback(() => {
    onToggle(skill.id);
  }, [onToggle, skill.id]);

  const handleDelete = useCallback(() => {
    onDelete(skill.id);
  }, [onDelete, skill.id]);

  const handleConfigure = useCallback(() => {
    onConfigure(skill.id);
  }, [onConfigure, skill.id]);

  const formattedDate = new Date(skill.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="group rounded-xl border border-border bg-card p-3.5 transition-all duration-200 hover:border-primary hover:shadow-md">
      {/* Header: Name + Toggle */}
      <div className="mb-1.5 flex items-start justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
          {skill.name}
          {skill.isVerified && (
            <svg
              className="h-3.5 w-3.5 text-blue-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </span>
        <button
          onClick={handleToggle}
          className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
            skill.isEnabled ? 'bg-primary' : 'bg-muted'
          }`}
          aria-label={skill.isEnabled ? 'Disable skill' : 'Enable skill'}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              skill.isEnabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Description */}
      <p className="mb-2.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
        {skill.description}
      </p>

      {/* Footer: Badge + Date + Menu */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium capitalize text-secondary-foreground">
            {skill.source === 'official' && (
              <svg
                className="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            )}
            {skill.source}
          </span>
          <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              aria-label="Skill options"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleConfigure}>
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              Configure
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/components/settings/skills/SkillCard.tsx
git commit -m "feat(desktop): create SkillCard component

- Toggle switch for enable/disable
- Dropdown menu with Configure and Delete
- Badge showing source (official/community)
- Verified checkmark for verified skills
- Hover state reveals menu button

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create AddSkillDropdown Component

**Files:**
- Create: `apps/desktop/src/renderer/components/settings/skills/AddSkillDropdown.tsx`

**Step 1: Create the AddSkillDropdown component**

```typescript
// apps/desktop/src/renderer/components/settings/skills/AddSkillDropdown.tsx

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface AddSkillDropdownProps {
  onBuildWithAI: () => void;
  onUpload: () => void;
  onAddFromOfficial: () => void;
  onImportFromGitHub: () => void;
}

export function AddSkillDropdown({
  onBuildWithAI,
  onUpload,
  onAddFromOfficial,
  onImportFromGitHub,
}: AddSkillDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={onBuildWithAI} className="flex-col items-start gap-0.5 py-2.5">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8M12 8v8" />
            </svg>
            <span className="font-medium">Build with AI</span>
          </div>
          <span className="pl-6 text-xs text-muted-foreground">
            Create skills through conversation
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onUpload} className="flex-col items-start gap-0.5 py-2.5">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="font-medium">Upload a skill</span>
          </div>
          <span className="pl-6 text-xs text-muted-foreground">
            Upload .zip, .skill, or folder
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onAddFromOfficial} className="flex-col items-start gap-0.5 py-2.5">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="font-medium">Add from official</span>
          </div>
          <span className="pl-6 text-xs text-muted-foreground">
            Pre-built skills by Openwork
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onImportFromGitHub} className="flex-col items-start gap-0.5 py-2.5">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
            </svg>
            <span className="font-medium">Import from GitHub</span>
          </div>
          <span className="pl-6 text-xs text-muted-foreground">
            Paste a repository link
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/components/settings/skills/AddSkillDropdown.tsx
git commit -m "feat(desktop): create AddSkillDropdown component

- Dropdown with 4 options: Build with AI, Upload, Official, GitHub
- Each option has icon, title, and description
- Uses existing Button and DropdownMenu components

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create SkillsPanel Component

**Files:**
- Create: `apps/desktop/src/renderer/components/settings/skills/SkillsPanel.tsx`
- Create: `apps/desktop/src/renderer/components/settings/skills/index.ts`

**Step 1: Create the SkillsPanel component**

```typescript
// apps/desktop/src/renderer/components/settings/skills/SkillsPanel.tsx

import { useState, useCallback, useMemo } from 'react';
import type { Skill } from '@accomplish/shared';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SkillCard } from './SkillCard';
import { MOCK_SKILLS } from './mockSkills';

type FilterType = 'all' | 'active' | 'official';

export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>(MOCK_SKILLS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter and search skills
  const filteredSkills = useMemo(() => {
    let result = skills;

    // Apply filter
    if (filter === 'active') {
      result = result.filter((s) => s.isEnabled);
    } else if (filter === 'official') {
      result = result.filter((s) => s.source === 'official');
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.command.toLowerCase().includes(query)
      );
    }

    return result;
  }, [skills, filter, searchQuery]);

  // Handlers
  const handleToggle = useCallback((id: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleConfigure = useCallback((id: string) => {
    // TODO: Open configuration modal
    console.log('Configure skill:', id);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const filterLabel = filter === 'all' ? 'All types' : filter === 'active' ? 'Active' : 'Official';

  return (
    <div className="flex flex-col">
      {/* Toolbar: Filter + Search */}
      <div className="mb-4 flex gap-3">
        {/* Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted">
              <svg
                className="h-3.5 w-3.5 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              {filterLabel}
              <svg
                className="h-3 w-3 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setFilter('all')}>All types</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('active')}>Active</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('official')}>Official</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search Input */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <Input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
      </div>

      {/* Scrollable Skills Grid */}
      <div className="max-h-[280px] min-h-[280px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
        {filteredSkills.length === 0 && (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No skills found
          </div>
        )}
      </div>

      {/* Scroll Indicator */}
      {filteredSkills.length > 4 && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <svg
            className="h-3.5 w-3.5 animate-bounce"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          Scroll for more skills
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create index barrel file**

```typescript
// apps/desktop/src/renderer/components/settings/skills/index.ts

export { SkillsPanel } from './SkillsPanel';
export { SkillCard } from './SkillCard';
export { AddSkillDropdown } from './AddSkillDropdown';
export { MOCK_SKILLS } from './mockSkills';
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: No type errors

**Step 4: Commit**

```bash
git add apps/desktop/src/renderer/components/settings/skills/SkillsPanel.tsx apps/desktop/src/renderer/components/settings/skills/index.ts
git commit -m "feat(desktop): create SkillsPanel component

- Scrollable 2-column grid (280px height, shows 2 rows)
- Filter dropdown (All/Active/Official)
- Search input with icon
- Scroll indicator when more than 4 skills
- Empty state message

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Integrate Skills Tab into SettingsDialog

**Files:**
- Modify: `apps/desktop/src/renderer/components/layout/SettingsDialog.tsx`

**Step 1: Add imports at top of file**

Add after other imports:

```typescript
import { SkillsPanel, AddSkillDropdown } from '@/components/settings/skills';
```

**Step 2: Update activeTab state type**

Change line ~45:

```typescript
const [activeTab, setActiveTab] = useState<'providers' | 'voice' | 'skills'>(initialTab);
```

**Step 3: Update SettingsDialogProps interface**

Change initialTab type:

```typescript
initialTab?: 'providers' | 'voice' | 'skills';
```

**Step 4: Add Skills tab button and Add dropdown in tab navigation**

Replace the tab navigation section (lines ~288-310) with:

```typescript
{/* Tab Navigation */}
<div className="flex items-end justify-between border-b border-border">
  <div className="flex gap-4">
    <button
      onClick={() => setActiveTab('providers')}
      className={`pb-3 px-1 font-medium text-sm transition-colors ${
        activeTab === 'providers'
          ? 'text-foreground border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      Providers
    </button>
    <button
      onClick={() => setActiveTab('voice')}
      className={`pb-3 px-1 font-medium text-sm transition-colors ${
        activeTab === 'voice'
          ? 'text-foreground border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      Voice Input
    </button>
    <button
      onClick={() => setActiveTab('skills')}
      className={`pb-3 px-1 font-medium text-sm transition-colors ${
        activeTab === 'skills'
          ? 'text-foreground border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      Skills
    </button>
  </div>
  {activeTab === 'skills' && (
    <div className="pb-2">
      <AddSkillDropdown
        onBuildWithAI={() => console.log('Build with AI')}
        onUpload={() => console.log('Upload')}
        onAddFromOfficial={() => console.log('Add from official')}
        onImportFromGitHub={() => console.log('Import from GitHub')}
      />
    </div>
  )}
</div>
```

**Step 5: Add Skills tab content section**

Add after the Voice Input tab content (after line ~463):

```typescript
{/* Skills Tab */}
{activeTab === 'skills' && (
  <div className="space-y-6">
    <SkillsPanel />
  </div>
)}
```

**Step 6: Verify TypeScript compiles**

Run: `pnpm -F @accomplish/desktop typecheck`
Expected: No type errors

**Step 7: Verify app runs**

Run: `pnpm dev`
Expected: App starts, Settings dialog opens, Skills tab visible and functional

**Step 8: Commit**

```bash
git add apps/desktop/src/renderer/components/layout/SettingsDialog.tsx
git commit -m "feat(desktop): add Skills tab to SettingsDialog

- New 'Skills' tab in tab navigation
- Add button shows only on Skills tab (in tab row)
- Skills tab renders SkillsPanel component
- Updated activeTab type to include 'skills'

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Final Testing and Polish

**Step 1: Manual testing checklist**

Run: `pnpm dev`

Test the following:
- [ ] Skills tab appears in Settings dialog
- [ ] Add button appears only on Skills tab
- [ ] Add dropdown opens with 4 options
- [ ] Filter dropdown works (All/Active/Official)
- [ ] Search filters skills by name/description/command
- [ ] Toggle switches enable/disable skills
- [ ] 3-dot menu appears on hover
- [ ] Configure and Delete options in menu
- [ ] Scroll indicator appears when >4 skills
- [ ] Skills grid scrolls properly
- [ ] Empty state shows when no results

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Run lint**

Run: `pnpm lint`
Expected: No errors (or fix any that appear)

**Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(desktop): polish Skills tab implementation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Component | Files |
|------|-----------|-------|
| 1 | Type definitions | `packages/shared/src/types/skills.ts` |
| 2 | Mock data | `apps/desktop/.../skills/mockSkills.ts` |
| 3 | SkillCard | `apps/desktop/.../skills/SkillCard.tsx` |
| 4 | AddSkillDropdown | `apps/desktop/.../skills/AddSkillDropdown.tsx` |
| 5 | SkillsPanel | `apps/desktop/.../skills/SkillsPanel.tsx` |
| 6 | Integration | `apps/desktop/.../layout/SettingsDialog.tsx` |
| 7 | Testing | Manual testing + fixes |

**Total estimated commits:** 7
