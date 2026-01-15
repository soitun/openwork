import { test, expect } from '../fixtures';
import { SettingsPage } from '../pages';
import { captureForAI } from '../utils';
import { TEST_TIMEOUTS } from '../config';

test.describe('Settings Dialog', () => {
  test('should open settings dialog when clicking settings button', async ({ window }) => {
    const settingsPage = new SettingsPage(window);

    // Fixture already handles hydration, just ensure DOM is ready
    await window.waitForLoadState('domcontentloaded');

    // Click the settings button in sidebar
    await settingsPage.navigateToSettings();

    // Capture settings dialog
    await captureForAI(
      window,
      'settings-dialog',
      'dialog-open',
      [
        'Settings dialog is visible',
        'Dialog contains wizard with Cloud/Local options',
        'User can interact with settings'
      ]
    );

    // Verify dialog opened by checking for Cloud button (wizard first step)
    await expect(settingsPage.cloudButton).toBeVisible({ timeout: TEST_TIMEOUTS.NAVIGATION });
  });

  test('should display model type selection buttons', async ({ window }) => {
    const settingsPage = new SettingsPage(window);

    // Fixture already handles hydration, just ensure DOM is ready
    await window.waitForLoadState('domcontentloaded');

    // Open settings dialog
    await settingsPage.navigateToSettings();

    // Verify Cloud and Local buttons are visible
    await expect(settingsPage.cloudButton).toBeVisible({ timeout: TEST_TIMEOUTS.NAVIGATION });
    await expect(settingsPage.localButton).toBeVisible({ timeout: TEST_TIMEOUTS.NAVIGATION });

    // Capture model section
    await captureForAI(
      window,
      'settings-dialog',
      'model-type-selection',
      [
        'Cloud and Local model type buttons are visible',
        'User can select between cloud providers and local models',
        'Wizard first step is displayed'
      ]
    );
  });

  test('should navigate to provider selection when clicking Cloud', async ({ window }) => {
    const settingsPage = new SettingsPage(window);

    // Fixture already handles hydration, just ensure DOM is ready
    await window.waitForLoadState('domcontentloaded');

    // Open settings dialog
    await settingsPage.navigateToSettings();

    // Click Cloud button
    await settingsPage.selectCloudProvider();

    // Verify we're on provider selection step (look for provider names)
    await expect(window.getByText('Anthropic')).toBeVisible({ timeout: TEST_TIMEOUTS.NAVIGATION });

    // Capture provider selection
    await captureForAI(
      window,
      'settings-dialog',
      'provider-selection',
      [
        'Provider selection step is visible',
        'Cloud providers are listed',
        'User can select a provider'
      ]
    );
  });

  test('should display debug mode toggle', async ({ window }) => {
    const settingsPage = new SettingsPage(window);

    // Fixture already handles hydration, just ensure DOM is ready
    await window.waitForLoadState('domcontentloaded');

    // Open settings dialog
    await settingsPage.navigateToSettings();

    // Scroll to debug toggle
    await settingsPage.debugModeToggle.scrollIntoViewIfNeeded();

    // Verify debug toggle is visible
    await expect(settingsPage.debugModeToggle).toBeVisible({ timeout: TEST_TIMEOUTS.NAVIGATION });

    // Capture debug section
    await captureForAI(
      window,
      'settings-dialog',
      'debug-section',
      [
        'Debug mode toggle is visible',
        'Toggle is clickable',
        'Developer settings are accessible'
      ]
    );
  });

  test('should allow toggling debug mode', async ({ window }) => {
    const settingsPage = new SettingsPage(window);

    // Fixture already handles hydration, just ensure DOM is ready
    await window.waitForLoadState('domcontentloaded');

    // Open settings dialog
    await settingsPage.navigateToSettings();

    // Scroll to debug toggle
    await settingsPage.debugModeToggle.scrollIntoViewIfNeeded();

    // Capture initial state
    await captureForAI(
      window,
      'settings-dialog',
      'debug-before-toggle',
      [
        'Debug toggle in initial state',
        'Toggle is ready to click'
      ]
    );

    // Click toggle - state change is immediate in React
    await settingsPage.toggleDebugMode();

    // Capture toggled state
    await captureForAI(
      window,
      'settings-dialog',
      'debug-after-toggle',
      [
        'Debug toggle state changed',
        'UI reflects new state'
      ]
    );
  });

  test('should close dialog when pressing Escape', async ({ window }) => {
    const settingsPage = new SettingsPage(window);

    // Fixture already handles hydration, just ensure DOM is ready
    await window.waitForLoadState('domcontentloaded');

    // Open settings dialog
    await settingsPage.navigateToSettings();

    // Verify dialog is open
    await expect(settingsPage.cloudButton).toBeVisible({ timeout: TEST_TIMEOUTS.NAVIGATION });

    // Press Escape to close dialog - expect handles the wait
    await window.keyboard.press('Escape');

    // Verify dialog closed (cloud button should not be visible)
    await expect(settingsPage.cloudButton).not.toBeVisible({ timeout: TEST_TIMEOUTS.NAVIGATION });

    // Capture closed state
    await captureForAI(
      window,
      'settings-dialog',
      'dialog-closed',
      [
        'Dialog is closed',
        'Main app is visible again',
        'Settings are no longer shown'
      ]
    );
  });
});
