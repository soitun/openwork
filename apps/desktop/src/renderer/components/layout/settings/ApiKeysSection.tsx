'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Plus, ChevronUp } from 'lucide-react';
import { getAccomplish } from '@/lib/accomplish';
import { analytics } from '@/lib/analytics';
import type { ApiKeyConfig } from '@accomplish/shared';
import { API_KEY_PROVIDERS, type ProviderId } from './types';

interface ApiKeysSectionProps {
  savedKeys: ApiKeyConfig[];
  onKeysChange: (keys: ApiKeyConfig[]) => void;
}

export default function ApiKeysSection({ savedKeys, onKeysChange }: ApiKeysSectionProps) {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [provider, setProvider] = useState<ProviderId>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  const handleSaveApiKey = async () => {
    const accomplish = getAccomplish();
    const trimmedKey = apiKey.trim();
    const currentProvider = API_KEY_PROVIDERS.find((p) => p.id === provider)!;

    if (!trimmedKey) {
      setError(t('settings.apiKey.error', 'Please enter an API key.'));
      return;
    }

    if (!trimmedKey.startsWith(currentProvider.prefix)) {
      setError(t('settings.apiKey.invalidFormat', `Invalid API key format. Key should start with ${currentProvider.prefix}`));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const validation = await accomplish.validateApiKeyForProvider(provider, trimmedKey);
      if (!validation.valid) {
        setError(validation.error || 'Invalid API key');
        setIsSaving(false);
        return;
      }

      const savedKey = await accomplish.addApiKey(provider, trimmedKey);
      analytics.trackSaveApiKey(currentProvider.name);
      setApiKey('');
      setShowAddForm(false);

      const filtered = savedKeys.filter((k) => k.provider !== savedKey.provider);
      onKeysChange([...filtered, savedKey]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    const accomplish = getAccomplish();
    try {
      await accomplish.removeApiKey(id);
      onKeysChange(savedKeys.filter((k) => k.id !== id));
    } catch (err) {
      console.error('Failed to delete key:', err);
    }
  };

  return (
    <section>
      <h2 className="mb-4 text-base font-medium text-foreground">
        {t('settings.apiKeys.title', 'API Keys')}
      </h2>
      <div className="rounded-lg border border-border bg-card p-5">
        {savedKeys.length > 0 && (
          <div className="space-y-2 mb-4">
            {savedKeys.map((key) => {
              const providerConfig = API_KEY_PROVIDERS.find((p) => p.id === key.provider);
              return (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <span className="text-xs font-bold text-primary">
                        {providerConfig?.name.charAt(0) || key.provider.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {providerConfig?.name || key.provider}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {key.keyPrefix}
                      </div>
                    </div>
                  </div>
                  {keyToDelete === key.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {t('settings.apiKey.deleteConfirm', 'Are you sure?')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteApiKey(key.id);
                          setKeyToDelete(null);
                        }}
                        className="rounded px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('common.yes', 'Yes')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setKeyToDelete(null)}
                        className="rounded px-2 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80"
                      >
                        {t('common.no', 'No')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setKeyToDelete(key.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title={t('settings.apiKey.removeTitle', 'Remove API key')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showAddForm ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t('settings.apiKeys.addNew', 'Add New API Key')}
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {API_KEY_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    analytics.trackSelectProvider(p.name);
                    setProvider(p.id);
                  }}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    provider === p.id
                      ? 'border-primary bg-muted'
                      : 'border-border hover:border-ring'
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">{p.name}</div>
                </button>
              ))}
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={API_KEY_PROVIDERS.find((p) => p.id === provider)?.placeholder}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="button"
              onClick={handleSaveApiKey}
              disabled={isSaving}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving
                ? t('settings.apiKey.saving', 'Saving...')
                : t('settings.apiKey.saveButton', 'Save API Key')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            {t('settings.apiKeys.addButton', 'Add API Key')}
          </button>
        )}
      </div>
    </section>
  );
}
