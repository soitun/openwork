# Plus Menu Design - "Use Skills" Feature

> **Date:** 2026-01-29
> **Branch:** `feat/add-skills`
> **Status:** Design Complete

---

## Overview

Add a "+" button to the TaskInputBar that opens an extensible dropdown menu. The first menu item is "Use Skills" which opens a submenu flyout allowing users to browse and insert skill commands into their task input.

---

## Component Structure

```
TaskInputBar.tsx
├── PlusMenu/index.tsx            <- "+" button + main dropdown
│   └── SkillsSubmenu.tsx         <- Flyout with skills list
├── <textarea>                    <- Existing
├── SpeechInputButton             <- Existing
└── Submit button                 <- Existing
```

### New Components

| Component | Purpose |
|-----------|---------|
| `PlusMenu/index.tsx` | "+" button that triggers dropdown with extensible menu items |
| `PlusMenu/SkillsSubmenu.tsx` | Flyout panel with search, skills list, "Manage Skills" link |

---

## UI Layout

### Plus Button
- Position: Left of the textarea (before text input)
- Style: `rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground`
- Icon: "+" (Plus icon)

### Main Dropdown
- Width: ~200px
- Appears below the "+" button
- Menu items with icon + label + arrow for submenu

```
┌────────────────────────┐
│ ⚡ Use Skills      →   │
├────────────────────────┤
│ (future items...)      │
└────────────────────────┘
```

### Skills Submenu Flyout
- Width: ~280px
- Appears to the right of main dropdown
- Max height: ~300px with scroll

```
┌─────────────────────────────┐
│ 🔍 Search Skills...         │
├─────────────────────────────┤
│ code-review                 │
│ ┌─────────────┐             │
│ │ 🟠 By Openwork │          │
│ └─────────────┘             │
│ Perform thorough code...    │
├─────────────────────────────┤
│ git-commit                  │
│ ┌─────────────┐             │
│ │ 🟠 By Openwork │          │
│ └─────────────┘             │
│ Create well-formatted...    │
├─────────────────────────────┤
│ ...more skills...           │
├─────────────────────────────┤
│ Manage Skills            ↗  │
└─────────────────────────────┘
```

---

## Styling (from SkillCard)

### Skill Item in Submenu
```
- Name: text-[13px] font-semibold text-foreground
- Badge: rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium
- Description: text-[11px] text-muted-foreground line-clamp-2
```

### Badge Icons
| Source | Icon | Label |
|--------|------|-------|
| `official` | `openwork-icon.png` | "By Openwork" |
| `community` | GitHub SVG | "GitHub" |
| `custom` | Person SVG | "Built By You" |

---

## Interaction Flow

### State in TaskInputBar
```typescript
const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
const [enabledSkills, setEnabledSkills] = useState<Skill[]>([]);
const [skillSearchQuery, setSkillSearchQuery] = useState('');
```

### Flow
1. **Mount:** Fetch enabled skills via `window.accomplish.getEnabledSkills()`
2. **Click "+":** Dropdown opens
3. **Hover/click "Use Skills":** Submenu flies out to the right
4. **Type in search:** Filters skills by name, description, command
5. **Click a skill:**
   - Prepends `/{command} ` to input (with trailing space)
   - Closes both menus
   - Focuses textarea
6. **Click "Manage Skills":**
   - Closes menus
   - Opens Settings dialog on Skills tab

---

## API Changes

### TaskInputBar Props (new)
```typescript
interface TaskInputBarProps {
  // ... existing props
  onOpenSettings?: (tab: 'providers' | 'voice' | 'skills') => void;
}
```

### SettingsDialog Props (modify)
```typescript
interface SettingsDialogProps {
  initialTab?: 'providers' | 'voice' | 'skills';  // Add 'skills'
}
```

---

## File Changes

### New Files
```
apps/desktop/src/renderer/components/landing/PlusMenu/
├── index.tsx           <- Main dropdown with "+" button
└── SkillsSubmenu.tsx   <- Skills list flyout
```

### Modified Files
| File | Changes |
|------|---------|
| `TaskInputBar.tsx` | Add PlusMenu, `onOpenSettings` prop, fetch skills on mount |
| `Home.tsx` | Pass `onOpenSettings` handler to TaskInputBar |
| `SettingsDialog.tsx` | Accept `'skills'` as `initialTab` option |

---

## Data Flow

```
Home.tsx
    │
    ├── onOpenSettings(tab) ──→ setSettingsInitialTab(tab)
    │                          setShowSettingsDialog(true)
    │
    └── TaskInputBar
            │
            ├── getEnabledSkills() ──→ enabledSkills state
            │
            └── PlusMenu
                    │
                    ├── onSkillSelect(command) ──→ prepend to input
                    │
                    └── SkillsSubmenu
                            │
                            └── onManageSkills() ──→ onOpenSettings('skills')
```

---

## Summary

| Aspect | Decision |
|--------|----------|
| Trigger | "+" button left of textarea |
| Menu structure | Dropdown → "Use Skills" → Submenu flyout |
| Skill selection | Prepends `/command ` to input start |
| Styling | Matches existing SkillCard badges/colors |
| "Manage Skills" | Opens Settings > Skills tab |
| Extensibility | Menu structure ready for future items |
| Backend changes | None - uses existing `getEnabledSkills()` |

---

## Future Extensibility

The "+" menu is designed to accommodate future items:
- Add from local files
- Add from Google Drive
- Add from Figma
- etc.

Each would be a new menu item in the main dropdown.
