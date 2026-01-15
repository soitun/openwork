/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ApiKeyConfig } from '@accomplish/shared';

const mockRemoveApiKey = vi.fn();
const mockValidateApiKeyForProvider = vi.fn();
const mockAddApiKey = vi.fn();

vi.mock('@/lib/accomplish', () => ({
  getAccomplish: () => ({
    removeApiKey: mockRemoveApiKey,
    validateApiKeyForProvider: mockValidateApiKeyForProvider,
    addApiKey: mockAddApiKey,
  }),
}));

vi.mock('@/lib/analytics', () => ({
  analytics: { trackSaveApiKey: vi.fn(), trackSelectProvider: vi.fn() },
}));

// Mock react-i18next to return interpolated strings
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string, options?: Record<string, string>) => {
      if (options && typeof defaultValue === 'string') {
        return defaultValue.replace(/\{\{(\w+)\}\}/g, (_, name) => options[name] || '');
      }
      return typeof defaultValue === 'string' ? defaultValue : key;
    },
    i18n: { language: 'en' },
  }),
}));

import ApiKeysSection from '@/components/layout/settings/ApiKeysSection';

describe('ApiKeysSection', () => {
  const savedKeys: ApiKeyConfig[] = [
    { id: 'key-1', provider: 'anthropic', keyPrefix: 'sk-ant-...' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRemoveApiKey.mockResolvedValue(undefined);
    mockValidateApiKeyForProvider.mockResolvedValue({ valid: true });
    mockAddApiKey.mockResolvedValue({ id: '2', provider: 'openai', keyPrefix: 'sk-...' });
  });

  describe('rendering', () => {
    it('should render section title', () => {
      render(<ApiKeysSection savedKeys={savedKeys} onKeysChange={vi.fn()} />);

      expect(screen.getByText('API Keys')).toBeInTheDocument();
    });

    it('should render saved keys', () => {
      render(<ApiKeysSection savedKeys={savedKeys} onKeysChange={vi.fn()} />);

      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByText('sk-ant-...')).toBeInTheDocument();
    });

    it('should render Add API Key button', () => {
      render(<ApiKeysSection savedKeys={savedKeys} onKeysChange={vi.fn()} />);

      expect(screen.getByRole('button', { name: /add api key/i })).toBeInTheDocument();
    });
  });

  describe('add key flow', () => {
    it('should show add form when Add API Key is clicked', () => {
      render(<ApiKeysSection savedKeys={savedKeys} onKeysChange={vi.fn()} />);

      fireEvent.click(screen.getByRole('button', { name: /add api key/i }));

      // Provider selection should be visible
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Google AI')).toBeInTheDocument();
    });
  });
});
