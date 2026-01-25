/**
 * Priority scoring for snapshot elements.
 * Higher priority elements are kept when truncating snapshots.
 */

/**
 * Base priority scores by ARIA role.
 * Primary interactive elements score highest.
 */
export const ROLE_PRIORITIES: Record<string, number> = {
  // Primary inputs - highest priority
  button: 100,
  textbox: 95,
  searchbox: 95,

  // Form controls
  checkbox: 90,
  radio: 90,
  switch: 90,
  combobox: 85,
  listbox: 85,
  slider: 85,
  spinbutton: 85,

  // Navigation
  link: 80,
  tab: 75,
  menuitem: 70,
  menuitemcheckbox: 70,
  menuitemradio: 70,
  option: 70,

  // Containers (lower priority - often redundant)
  navigation: 60,
  menu: 60,
  tablist: 55,
  form: 50,
  dialog: 50,
  alertdialog: 50,
};

/** Viewport visibility bonus */
const VIEWPORT_BONUS = 50;

/** Default priority for unknown roles */
const DEFAULT_PRIORITY = 50;

/**
 * Calculate priority score for an element.
 * @param role - ARIA role of the element
 * @param inViewport - Whether element is visible in viewport
 * @returns Priority score (higher = more important)
 */
export function getElementPriority(role: string, inViewport: boolean): number {
  const basePriority = ROLE_PRIORITIES[role] ?? DEFAULT_PRIORITY;
  return inViewport ? basePriority + VIEWPORT_BONUS : basePriority;
}
