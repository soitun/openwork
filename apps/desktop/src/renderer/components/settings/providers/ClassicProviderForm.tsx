// apps/desktop/src/renderer/components/settings/providers/ClassicProviderForm.tsx

import { useState } from 'react';
import { getAccomplish } from '@/lib/accomplish';
import type { ProviderId, ConnectedProvider, ApiKeyCredentials } from '@accomplish/shared';
import { PROVIDER_META, DEFAULT_PROVIDERS } from '@accomplish/shared';
import { ModelSelector } from '../shared';

// Import provider logos
import anthropicLogo from '/assets/ai-logos/anthropic.svg';
import openaiLogo from '/assets/ai-logos/openai.svg';
import googleLogo from '/assets/ai-logos/google.svg';
import xaiLogo from '/assets/ai-logos/xai.svg';
import deepseekLogo from '/assets/ai-logos/deepseek.svg';
import zaiLogo from '/assets/ai-logos/zai.svg';

const PROVIDER_LOGOS: Record<string, string> = {
  anthropic: anthropicLogo,
  openai: openaiLogo,
  google: googleLogo,
  xai: xaiLogo,
  deepseek: deepseekLogo,
  zai: zaiLogo,
};

interface ClassicProviderFormProps {
  providerId: ProviderId;
  connectedProvider?: ConnectedProvider;
  onConnect: (provider: ConnectedProvider) => void;
  onDisconnect: () => void;
  onModelChange: (modelId: string) => void;
  showModelError: boolean;
}

export function ClassicProviderForm({
  providerId,
  connectedProvider,
  onConnect,
  onDisconnect,
  onModelChange,
  showModelError,
}: ClassicProviderFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = PROVIDER_META[providerId];
  const providerConfig = DEFAULT_PROVIDERS.find(p => p.id === providerId);
  const models = providerConfig?.models.map(m => ({ id: m.fullId, name: m.displayName })) || [];
  const isConnected = connectedProvider?.connectionStatus === 'connected';
  const logoSrc = PROVIDER_LOGOS[providerId];

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const accomplish = getAccomplish();
      const validation = await accomplish.validateApiKeyForProvider(providerId, apiKey.trim());

      if (!validation.valid) {
        setError(validation.error || 'Invalid API key');
        setConnecting(false);
        return;
      }

      // Save the API key
      await accomplish.addApiKey(providerId as any, apiKey.trim());

      // Create connected provider - store longer key prefix for display
      const trimmedKey = apiKey.trim();
      const provider: ConnectedProvider = {
        providerId,
        connectionStatus: 'connected',
        selectedModelId: null,
        credentials: {
          type: 'api_key',
          keyPrefix: trimmedKey.length > 40
            ? trimmedKey.substring(0, 40) + '...'
            : trimmedKey.substring(0, Math.min(trimmedKey.length, 20)) + '...',
        } as ApiKeyCredentials,
        lastConnectedAt: new Date().toISOString(),
      };

      onConnect(provider);
      setApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5" data-testid="provider-settings-panel">
      {/* Header with Logo */}
      <div className="flex items-center gap-3 mb-5">
        {logoSrc && (
          <img
            src={logoSrc}
            alt={`${meta.name} logo`}
            className="h-6 w-6 object-contain"
          />
        )}
        <span className="text-base font-medium text-foreground">{meta.name} Settings</span>
      </div>

      {/* API Key Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">API Key</label>
          {meta.helpUrl && (
            <a
              href={meta.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary underline"
            >
              How can I find it?
            </a>
          )}
        </div>

        {!isConnected ? (
          <>
            {/* Disconnected: API Key input with trash */}
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API Key"
                disabled={connecting}
                data-testid="api-key-input"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-sm disabled:opacity-50"
              />
              <button
                onClick={() => setApiKey('')}
                className="rounded-md border border-border p-2.5 text-muted-foreground hover:text-foreground transition-colors"
                type="button"
                disabled={!apiKey}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={connecting || !apiKey.trim()}
              data-testid="connect-button"
              className="w-full flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Connect
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* Connected: Show masked key + Connected button + Model */}
            <input
              type="text"
              value={(() => {
                const creds = connectedProvider?.credentials as ApiKeyCredentials | undefined;
                if (creds?.keyPrefix) return creds.keyPrefix;
                // Fallback for old data without keyPrefix
                return 'API key saved (reconnect to see prefix)';
              })()}
              disabled
              data-testid="api-key-display"
              className="w-full rounded-md border border-input bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground"
            />

            {/* Connected Button + Trash */}
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-[#4A7C59] px-4 py-2.5 text-sm font-medium text-white"
                disabled
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Connected
              </button>
              <button
                onClick={onDisconnect}
                data-testid="disconnect-button"
                className="rounded-md border border-border p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Disconnect"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Model Selector */}
            <ModelSelector
              models={models}
              value={connectedProvider?.selectedModelId || null}
              onChange={onModelChange}
              error={showModelError && !connectedProvider?.selectedModelId}
            />
          </>
        )}
      </div>
    </div>
  );
}
