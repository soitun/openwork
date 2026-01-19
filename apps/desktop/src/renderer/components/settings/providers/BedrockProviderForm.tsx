// apps/desktop/src/renderer/components/settings/providers/BedrockProviderForm.tsx

import { useState } from 'react';
import { getAccomplish } from '@/lib/accomplish';
import type { ConnectedProvider, BedrockProviderCredentials } from '@accomplish/shared';
import { ModelSelector, RegionSelector } from '../shared';

// Import Bedrock logo
import bedrockLogo from '/assets/ai-logos/bedrock.svg';

interface BedrockProviderFormProps {
  connectedProvider?: ConnectedProvider;
  onConnect: (provider: ConnectedProvider) => void;
  onDisconnect: () => void;
  onModelChange: (modelId: string) => void;
  showModelError: boolean;
}

export function BedrockProviderForm({
  connectedProvider,
  onConnect,
  onDisconnect,
  onModelChange,
  showModelError,
}: BedrockProviderFormProps) {
  const [authTab, setAuthTab] = useState<'accessKey' | 'profile'>('accessKey');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [profileName, setProfileName] = useState('default');
  const [region, setRegion] = useState('us-east-1');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);

  const isConnected = connectedProvider?.connectionStatus === 'connected';

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const accomplish = getAccomplish();

      const credentials = authTab === 'accessKey'
        ? {
            authType: 'accessKeys' as const,
            accessKeyId: accessKeyId.trim(),
            secretAccessKey: secretKey.trim(),
            sessionToken: sessionToken.trim() || undefined,
            region,
          }
        : {
            authType: 'profile' as const,
            profileName: profileName.trim() || 'default',
            region,
          };

      const validation = await accomplish.validateBedrockCredentials(credentials);

      if (!validation.valid) {
        setError(validation.error || 'Invalid credentials');
        setConnecting(false);
        return;
      }

      // Save credentials
      await accomplish.saveBedrockCredentials(credentials);

      // Preset Bedrock models
      const models = [
        { id: 'amazon-bedrock/anthropic.claude-opus-4-5-20251101-v1:0', name: 'Claude Opus 4.5' },
        { id: 'amazon-bedrock/anthropic.claude-sonnet-4-5-20250929-v1:0', name: 'Claude Sonnet 4.5' },
        { id: 'amazon-bedrock/anthropic.claude-haiku-4-5-20251001-v1:0', name: 'Claude Haiku 4.5' },
      ];
      setAvailableModels(models);

      const provider: ConnectedProvider = {
        providerId: 'bedrock',
        connectionStatus: 'connected',
        selectedModelId: null,
        credentials: {
          type: 'bedrock',
          authMethod: authTab,
          region,
          ...(authTab === 'accessKey'
            ? { accessKeyIdPrefix: accessKeyId.substring(0, 8) + '...' }
            : { profileName: profileName.trim() || 'default' }
          ),
        } as BedrockProviderCredentials,
        lastConnectedAt: new Date().toISOString(),
        availableModels: models,
      };

      onConnect(provider);
      setSecretKey('');
      setSessionToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const models = connectedProvider?.availableModels || availableModels;

  return (
    <div className="rounded-xl border border-border bg-card p-5" data-testid="provider-settings-panel">
      {/* Header with Logo */}
      <div className="flex items-center gap-3 mb-5">
        <img
          src={bedrockLogo}
          alt="Bedrock logo"
          className="h-6 w-6 object-contain"
        />
        <span className="text-base font-medium text-foreground">Bedrock Settings</span>
      </div>

      <div className="space-y-3">
        {!isConnected ? (
          <>
            {/* Auth tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setAuthTab('accessKey')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  authTab === 'accessKey'
                    ? 'bg-[#4A7C59] text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Access Key
              </button>
              <button
                onClick={() => setAuthTab('profile')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  authTab === 'profile'
                    ? 'bg-[#4A7C59] text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                AWS Profile
              </button>
            </div>

            {authTab === 'accessKey' ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Access Key ID</label>
                  <input
                    type="text"
                    value={accessKeyId}
                    onChange={(e) => setAccessKeyId(e.target.value)}
                    placeholder="AKIA..."
                    data-testid="bedrock-access-key-id"
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Secret Access Key</label>
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter secret access key"
                    data-testid="bedrock-secret-key"
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Session Token <span className="text-muted-foreground">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    value={sessionToken}
                    onChange={(e) => setSessionToken(e.target.value)}
                    placeholder="For temporary credentials"
                    data-testid="bedrock-session-token"
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Profile Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="default"
                  data-testid="bedrock-profile-name"
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                />
              </div>
            )}

            <RegionSelector value={region} onChange={setRegion} />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              onClick={handleConnect}
              disabled={connecting}
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
