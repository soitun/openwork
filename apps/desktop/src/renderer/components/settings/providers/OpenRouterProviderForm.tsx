// apps/desktop/src/renderer/components/settings/providers/OpenRouterProviderForm.tsx

import { useState } from 'react';
import { getAccomplish } from '@/lib/accomplish';
import type { ConnectedProvider, OpenRouterCredentials } from '@accomplish/shared';
import { ApiKeyInput, ConnectionStatus, ModelSelector } from '../shared';
import { PROVIDER_META } from '@accomplish/shared';

interface OpenRouterProviderFormProps {
  connectedProvider?: ConnectedProvider;
  onConnect: (provider: ConnectedProvider) => void;
  onDisconnect: () => void;
  onModelChange: (modelId: string) => void;
  showModelError: boolean;
}

export function OpenRouterProviderForm({
  connectedProvider,
  onConnect,
  onDisconnect,
  onModelChange,
  showModelError,
}: OpenRouterProviderFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);

  const meta = PROVIDER_META.openrouter;
  const isConnected = connectedProvider?.connectionStatus === 'connected';

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const accomplish = getAccomplish();

      // Validate key
      const validation = await accomplish.validateApiKeyForProvider('openrouter', apiKey.trim());
      if (!validation.valid) {
        setError(validation.error || 'Invalid API key');
        setConnecting(false);
        return;
      }

      // Save key
      await accomplish.addApiKey('openrouter', apiKey.trim());

      // Fetch models
      const result = await accomplish.fetchOpenRouterModels();
      if (!result.success) {
        setError(result.error || 'Failed to fetch models');
        setConnecting(false);
        return;
      }

      const models = result.models?.map(m => ({
        id: `openrouter/${m.id}`,
        name: m.name,
      })) || [];
      setAvailableModels(models);

      const provider: ConnectedProvider = {
        providerId: 'openrouter',
        connectionStatus: 'connected',
        selectedModelId: null,
        credentials: {
          type: 'openrouter',
          keyPrefix: apiKey.trim().substring(0, 10) + '...',
        } as OpenRouterCredentials,
        lastConnectedAt: new Date().toISOString(),
        availableModels: models,
      };

      onConnect(provider);
      setApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const models = connectedProvider?.availableModels || availableModels;

  return (
    <div className="space-y-4" data-testid="provider-settings-panel">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">OpenRouter Settings</span>
      </div>

      {!isConnected ? (
        <>
          <ApiKeyInput
            value={apiKey}
            onChange={setApiKey}
            placeholder="sk-or-..."
            helpUrl={meta.helpUrl}
            error={error}
            disabled={connecting}
          />
          <button
            onClick={handleConnect}
            disabled={connecting || !apiKey.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </>
      ) : (
        <>
          <ConnectionStatus status="connected" onDisconnect={onDisconnect} />
          <ModelSelector
            models={models}
            value={connectedProvider?.selectedModelId || null}
            onChange={onModelChange}
            error={showModelError && !connectedProvider?.selectedModelId}
          />
        </>
      )}
    </div>
  );
}
