# Plus Menu Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "+" button to TaskInputBar that opens a dropdown menu with "Use Skills" submenu for browsing and inserting skill commands.

**Architecture:** Create PlusMenu component with Radix DropdownMenu primitives. SkillsSubmenu uses DropdownMenuSubContent for flyout. Skills fetched via existing `getEnabledSkills()` IPC. Selected skill command prepended to input.

**Tech Stack:** React, Radix UI DropdownMenu, Tailwind CSS, existing IPC API

---

## Task 1: Create PlusMenu Component Structure

**Files:**
- Create: `apps/desktop/src/renderer/components/landing/PlusMenu/index.tsx`

**Step 1: Create the PlusMenu component with basic dropdown**

```tsx
// apps/desktop/src/renderer/components/landing/PlusMenu/index.tsx

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

interface PlusMenuProps {
  onSkillSelect: (command: string) => void;
  onOpenSettings: (tab: 'skills') => void;
  disabled?: boolean;
}

export function PlusMenu({ onSkillSelect, onOpenSettings, disabled }: PlusMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          disabled={disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          title="Add content"
        >
          <Plus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <svg
              className="h-4 w-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Use Skills
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-[280px] p-0">
            <div className="p-2 text-sm text-muted-foreground">
              Skills submenu placeholder
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Step 2: Verify file created**

Run: `ls -la apps/desktop/src/renderer/components/landing/PlusMenu/`
Expected: `index.tsx` exists

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/components/landing/PlusMenu/index.tsx
git commit -m "feat(desktop): add PlusMenu component structure"
```

---

## Task 2: Create SkillsSubmenu Component

**Files:**
- Create: `apps/desktop/src/renderer/components/landing/PlusMenu/SkillsSubmenu.tsx`

**Step 1: Create the SkillsSubmenu component**

```tsx
// apps/desktop/src/renderer/components/landing/PlusMenu/SkillsSubmenu.tsx

import { useState, useMemo } from 'react';
import type { Skill } from '@accomplish/shared';
import { Input } from '@/components/ui/input';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import openworkIcon from '/assets/openwork-icon.png';

interface SkillsSubmenuProps {
  skills: Skill[];
  onSkillSelect: (command: string) => void;
  onManageSkills: () => void;
}

export function SkillsSubmenu({ skills, onSkillSelect, onManageSkills }: SkillsSubmenuProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const query = searchQuery.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.command.toLowerCase().includes(query)
    );
  }, [skills, searchQuery]);

  return (
    <div className="flex flex-col">
      {/* Search Input */}
      <div className="p-2">
        <Input
          type="text"
          placeholder="Search Skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm"
          autoFocus
        />
      </div>

      <DropdownMenuSeparator />

      {/* Skills List */}
      <div className="max-h-[300px] overflow-y-auto">
        {filteredSkills.length === 0 ? (
          <div className="p-3 text-center text-sm text-muted-foreground">
            No skills found
          </div>
        ) : (
          filteredSkills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => onSkillSelect(skill.command)}
              className="w-full px-3 py-2 text-left hover:bg-accent transition-colors"
            >
              <div className="text-[13px] font-semibold text-foreground">
                {skill.name}
              </div>
              <div className="mt-0.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {skill.source === 'official' && (
                    <>
                      <img src={openworkIcon} alt="" className="h-2.5 w-2.5" />
                      By Openwork
                    </>
                  )}
                  {skill.source === 'community' && (
                    <>
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      GitHub
                    </>
                  )}
                  {skill.source === 'custom' && (
                    <>
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Built By You
                    </>
                  )}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                {skill.description}
              </div>
            </button>
          ))
        )}
      </div>

      <DropdownMenuSeparator />

      {/* Manage Skills Link */}
      <button
        onClick={onManageSkills}
        className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        Manage Skills
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M7 17L17 7M17 7H7M17 7V17" />
        </svg>
      </button>
    </div>
  );
}
```

**Step 2: Verify file created**

Run: `ls -la apps/desktop/src/renderer/components/landing/PlusMenu/`
Expected: `index.tsx` and `SkillsSubmenu.tsx` exist

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/components/landing/PlusMenu/SkillsSubmenu.tsx
git commit -m "feat(desktop): add SkillsSubmenu component with search and badges"
```

---

## Task 3: Integrate SkillsSubmenu into PlusMenu

**Files:**
- Modify: `apps/desktop/src/renderer/components/landing/PlusMenu/index.tsx`

**Step 1: Update PlusMenu to use SkillsSubmenu and fetch skills**

```tsx
// apps/desktop/src/renderer/components/landing/PlusMenu/index.tsx

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { Skill } from '@accomplish/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { SkillsSubmenu } from './SkillsSubmenu';

interface PlusMenuProps {
  onSkillSelect: (command: string) => void;
  onOpenSettings: (tab: 'skills') => void;
  disabled?: boolean;
}

export function PlusMenu({ onSkillSelect, onOpenSettings, disabled }: PlusMenuProps) {
  const [open, setOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);

  // Fetch enabled skills on mount
  useEffect(() => {
    if (window.accomplish) {
      window.accomplish
        .getEnabledSkills()
        .then(setSkills)
        .catch((err) => console.error('Failed to load skills:', err));
    }
  }, []);

  const handleSkillSelect = (command: string) => {
    onSkillSelect(command);
    setOpen(false);
  };

  const handleManageSkills = () => {
    setOpen(false);
    onOpenSettings('skills');
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          disabled={disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          title="Add content"
        >
          <Plus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <svg
              className="h-4 w-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Use Skills
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-[280px] p-0">
            <SkillsSubmenu
              skills={skills}
              onSkillSelect={handleSkillSelect}
              onManageSkills={handleManageSkills}
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Step 2: Commit**

```bash
git add apps/desktop/src/renderer/components/landing/PlusMenu/index.tsx
git commit -m "feat(desktop): integrate SkillsSubmenu into PlusMenu with data fetching"
```

---

## Task 4: Integrate PlusMenu into TaskInputBar

**Files:**
- Modify: `apps/desktop/src/renderer/components/landing/TaskInputBar.tsx`

**Step 1: Add PlusMenu to TaskInputBar**

Add import at top:
```tsx
import { PlusMenu } from './PlusMenu';
```

Add new prop to interface:
```tsx
interface TaskInputBarProps {
  // ... existing props
  /**
   * Called when user wants to open settings (e.g., from "Manage Skills")
   */
  onOpenSettings?: (tab: 'providers' | 'voice' | 'skills') => void;
}
```

Add to destructured props:
```tsx
export default function TaskInputBar({
  // ... existing props
  onOpenSettings,
}: TaskInputBarProps) {
```

Add skill select handler after other handlers:
```tsx
const handleSkillSelect = (command: string) => {
  // Prepend command to input with space
  const newValue = `${command} ${value}`.trim();
  onChange(newValue);
  // Focus textarea
  setTimeout(() => {
    textareaRef.current?.focus();
  }, 0);
};
```

Add PlusMenu before textarea in the JSX (inside the input container div, as first child):
```tsx
{/* Plus Menu */}
<PlusMenu
  onSkillSelect={handleSkillSelect}
  onOpenSettings={(tab) => onOpenSettings?.(tab)}
  disabled={isDisabled || speechInput.isRecording}
/>
```

**Step 2: Verify the app compiles**

Run: `cd apps/desktop && pnpm typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/components/landing/TaskInputBar.tsx
git commit -m "feat(desktop): integrate PlusMenu into TaskInputBar"
```

---

## Task 5: Update Home.tsx to Pass onOpenSettings

**Files:**
- Modify: `apps/desktop/src/renderer/pages/Home.tsx`

**Step 1: Add onOpenSettings handler to TaskInputBar**

Find the TaskInputBar component and add the prop:
```tsx
<TaskInputBar
  value={prompt}
  onChange={setPrompt}
  onSubmit={handleSubmit}
  isLoading={isLoading}
  placeholder="Describe a task and let AI handle the rest"
  large={true}
  autoFocus={true}
  onOpenSpeechSettings={handleOpenSpeechSettings}
  onOpenSettings={(tab) => {
    setSettingsInitialTab(tab);
    setShowSettingsDialog(true);
  }}
/>
```

**Step 2: Verify the app compiles**

Run: `cd apps/desktop && pnpm typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/pages/Home.tsx
git commit -m "feat(desktop): pass onOpenSettings to TaskInputBar for skills management"
```

---

## Task 6: Manual Testing

**Step 1: Start the dev server**

Run: `pnpm dev`

**Step 2: Test the Plus Menu**

1. Open the app
2. Click the "+" button in the task input bar
3. Verify dropdown appears with "Use Skills" option
4. Hover over "Use Skills"
5. Verify submenu flyout appears with search and skills list
6. Type in search to filter skills
7. Click a skill - verify command is prepended to input
8. Click "Manage Skills" - verify Settings opens on Skills tab

**Step 3: Test edge cases**

1. Test with empty skills list (disable all skills in Settings)
2. Test search with no results
3. Test that menu closes after selecting a skill
4. Test keyboard navigation if supported

**Step 4: Commit final changes if any tweaks needed**

```bash
git add -A
git commit -m "fix(desktop): polish PlusMenu interactions"
```

---

## Task 7: Push to Remote

**Step 1: Push all commits**

```bash
git push origin feat/add-skills
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Create PlusMenu component structure |
| 2 | Create SkillsSubmenu with search and badges |
| 3 | Integrate SkillsSubmenu into PlusMenu |
| 4 | Integrate PlusMenu into TaskInputBar |
| 5 | Update Home.tsx to pass onOpenSettings |
| 6 | Manual testing |
| 7 | Push to remote |

**Estimated time:** 20-30 minutes
