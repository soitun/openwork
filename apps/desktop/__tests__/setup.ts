/**
 * Vitest setup file for tests
 * Configures testing-library matchers and global test utilities
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock scrollIntoView for jsdom (not implemented in jsdom)
// Only apply when running in jsdom environment (Element is defined)
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = () => {};
}

// Mock better-sqlite3 native module (not available in test environment)
vi.mock('better-sqlite3', () => {
  const mockDb = {
    pragma: vi.fn().mockReturnThis(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn().mockReturnValue(null),
      all: vi.fn().mockReturnValue([]),
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: () => unknown) => fn),
    close: vi.fn(),
  };
  return {
    default: vi.fn(() => mockDb),
  };
});

// Mock the db module to avoid native module loading
vi.mock('@main/store/db', () => ({
  getDatabase: vi.fn(() => ({
    pragma: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn().mockReturnValue(null),
      all: vi.fn().mockReturnValue([]),
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: () => unknown) => fn),
    close: vi.fn(),
  })),
  closeDatabase: vi.fn(),
  resetDatabase: vi.fn(),
  getDatabasePath: vi.fn(() => '/mock/path/openwork-dev.db'),
  databaseExists: vi.fn(() => false),
  initializeDatabase: vi.fn(),
}));

// Mock the provider settings repository
vi.mock('@main/store/providerSettings', () => ({
  getProviderSettings: vi.fn(() => ({
    activeProviderId: null,
    connectedProviders: {},
    debugMode: false,
  })),
  setActiveProvider: vi.fn(),
  getActiveProviderId: vi.fn(() => null),
  getConnectedProvider: vi.fn(() => null),
  setConnectedProvider: vi.fn(),
  removeConnectedProvider: vi.fn(),
  updateProviderModel: vi.fn(),
  setProviderDebugMode: vi.fn(),
  getProviderDebugMode: vi.fn(() => false),
  clearProviderSettings: vi.fn(),
  getActiveProviderModel: vi.fn(() => null),
  hasReadyProvider: vi.fn(() => false),
  getConnectedProviderIds: vi.fn(() => []),
}));

// Mock the app settings repository
vi.mock('@main/store/appSettings', () => ({
  getDebugMode: vi.fn(() => false),
  setDebugMode: vi.fn(),
  getOnboardingComplete: vi.fn(() => false),
  setOnboardingComplete: vi.fn(),
  getSelectedModel: vi.fn(() => null),
  setSelectedModel: vi.fn(),
  getOllamaConfig: vi.fn(() => null),
  setOllamaConfig: vi.fn(),
  getLiteLLMConfig: vi.fn(() => null),
  setLiteLLMConfig: vi.fn(),
  getAppSettings: vi.fn(() => ({
    debugMode: false,
    onboardingComplete: false,
    selectedModel: null,
    ollamaConfig: null,
    litellmConfig: null,
  })),
  clearAppSettings: vi.fn(),
}));

// Mock the task history repository
vi.mock('@main/store/taskHistory', () => ({
  getTasks: vi.fn(() => []),
  getTask: vi.fn(() => null),
  saveTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  addTaskMessage: vi.fn(),
  updateTaskSessionId: vi.fn(),
  updateTaskSummary: vi.fn(),
  deleteTask: vi.fn(),
  clearHistory: vi.fn(),
  setMaxHistoryItems: vi.fn(),
  clearTaskHistoryStore: vi.fn(),
  flushPendingTasks: vi.fn(),
}));

// Extend global types for test utilities
declare global {
  // Add any global test utilities here if needed
}

export {};
