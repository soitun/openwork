# Streaming Model Responses Design

**Issue:** [#66](https://github.com/accomplish-ai/openwork/issues/66)
**Date:** 2026-01-21
**Status:** Approved for implementation

## Problem

When using local Ollama models, responses show "Thinking" until complete, then output all at once instead of streaming progressively. This creates poor UX as users can't see the model's progress.

**Root Cause:** The current adapter uses `opencode run --format json` via PTY, which outputs complete NDJSON `text` messages only after the LLM finishes generating. No incremental token events are emitted in this mode.

## Solution

Switch from PTY/CLI mode to HTTP Server mode with SSE (Server-Sent Events) streaming using `opencode serve` and the `@opencode-ai/sdk`.

The server mode emits `message.part.updated` events with a `delta` field containing incremental text as tokens arrive from the LLM.

## Architecture

### Current Flow (No Streaming)

```
opencode run --format json → PTY stdout → NDJSON parser
    ↓
Complete "text" message (full response only)
    ↓
IPC: task:update → TaskStore adds message
    ↓
StreamingText animates already-complete text (fake streaming)
```

### New Flow (True Streaming)

```
opencode serve (HTTP server on random port)
    ↓
@opencode-ai/sdk connects via HTTP
    ↓
client.event.subscribe() → SSE stream
    ↓
"message.part.updated" events with delta?: string
    ↓
IPC: task:text-delta → TaskStore appends delta
    ↓
React re-renders with new text immediately
```

## Implementation Details

### 1. New Server Adapter

**File:** `apps/desktop/src/main/opencode/server-adapter.ts`

```typescript
import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk';
import { EventEmitter } from 'events';
import * as pty from 'node-pty';

export class OpenCodeServerAdapter extends EventEmitter {
  private serverProcess: pty.IPty | null = null;
  private client: OpencodeClient | null = null;
  private serverUrl: string | null = null;
  private currentSessionId: string | null = null;

  async connect(): Promise<void> {
    // 1. Spawn opencode serve on random port
    this.serverProcess = pty.spawn(opencodeCliPath, ['serve', '--port', '0'], {
      env: await this.buildEnvironment(),
    });

    // 2. Parse server URL from stdout
    this.serverUrl = await this.waitForServerUrl();

    // 3. Create SDK client
    this.client = createOpencodeClient({ baseUrl: this.serverUrl });

    // 4. Start event subscription
    this.subscribeToEvents();
  }

  private async subscribeToEvents(): Promise<void> {
    const events = await this.client.event.subscribe();

    for await (const event of events.stream) {
      switch (event.type) {
        case 'message.part.updated':
          this.handlePartUpdated(event.properties);
          break;
        case 'session.status':
          this.handleSessionStatus(event.properties);
          break;
        case 'session.idle':
          this.handleSessionIdle(event.properties);
          break;
        case 'permission.updated':
          this.handlePermission(event.properties);
          break;
      }
    }
  }

  private handlePartUpdated(props: { part: Part; delta?: string }): void {
    if (props.part.type === 'text' && props.delta) {
      this.emit('text-delta', {
        sessionId: props.part.sessionID,
        messageId: props.part.messageID,
        partId: props.part.id,
        delta: props.delta,
        fullText: props.part.text,
      });
    }
    // Also emit for tool parts, etc.
    this.emit('message', this.convertToOpenCodeMessage(props.part));
  }

  async startTask(config: TaskConfig): Promise<Task> {
    // Create or resume session
    const session = config.sessionId
      ? await this.client.session.get({ path: { id: config.sessionId } })
      : await this.client.session.create({ body: { ... } });

    this.currentSessionId = session.id;

    // Send prompt asynchronously (response comes via events)
    await this.client.session.prompt({
      path: { id: session.id },
      body: {
        parts: [{ type: 'text', text: config.prompt }],
      },
    });

    return { id: taskId, status: 'running', ... };
  }

  dispose(): void {
    this.serverProcess?.kill();
    this.client = null;
  }
}
```

### 2. IPC Layer

**New type in `packages/shared/src/types/task.ts`:**

```typescript
export interface TextDeltaEvent {
  taskId: string;
  sessionId: string;
  messageId: string;
  partId: string;
  delta: string;      // Incremental text chunk
  fullText: string;   // Accumulated full text
}

export interface TaskMessage {
  // ... existing fields
  isStreaming?: boolean;  // True while receiving deltas
  partId?: string;        // For matching deltas to messages
}
```

**In `apps/desktop/src/main/ipc/handlers.ts`:**

```typescript
adapter.on('text-delta', (event) => {
  forwardToRenderer('task:text-delta', {
    taskId: currentTaskId,
    ...event,
  });
});
```

**In `apps/desktop/src/preload/index.ts`:**

```typescript
onTextDelta: (callback: (event: TextDeltaEvent) => void) => {
  ipcRenderer.on('task:text-delta', (_, event) => callback(event));
},
```

### 3. Frontend State Management

**In `apps/desktop/src/renderer/stores/taskStore.ts`:**

```typescript
appendTextDelta: (event: TextDeltaEvent) => {
  set((state) => {
    const task = state.currentTask;
    if (!task || task.id !== event.taskId) return state;

    const messageIndex = task.messages.findIndex(
      m => m.partId === event.partId
    );

    if (messageIndex === -1) {
      // Create new streaming message
      return {
        currentTask: {
          ...task,
          messages: [...task.messages, {
            id: event.messageId,
            type: 'assistant',
            content: event.delta,
            partId: event.partId,
            timestamp: new Date().toISOString(),
            isStreaming: true,
          }],
        },
      };
    }

    // Append delta to existing message
    const messages = [...task.messages];
    messages[messageIndex] = {
      ...messages[messageIndex],
      content: messages[messageIndex].content + event.delta,
    };

    return { currentTask: { ...task, messages } };
  });
},

markStreamingComplete: (partId: string) => {
  set((state) => {
    // Set isStreaming: false for the message
  });
},
```

### 4. UI Changes

**Immediate text rendering with cursor:**

```tsx
// In MessageBubble.tsx
{message.type === 'assistant' && (
  <div className={proseClasses}>
    <ReactMarkdown>{message.content}</ReactMarkdown>
    {message.isStreaming && (
      <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse ml-0.5" />
    )}
  </div>
)}
```

The `StreamingText` component can be simplified or removed since we now render text immediately as it arrives.

### 5. Fallback Strategy

Server mode is used by default. If it fails to start (port conflict, etc.), fall back to CLI mode automatically:

```typescript
// In task-manager.ts
async createAdapter(taskId: string): Promise<Adapter> {
  try {
    const serverAdapter = new OpenCodeServerAdapter(taskId);
    await serverAdapter.connect();
    return serverAdapter;
  } catch (error) {
    console.warn('Server mode failed, falling back to CLI:', error);
    return new OpenCodeAdapter(taskId);  // Existing PTY adapter
  }
}
```

## Files to Change

### New Files

| File | Purpose |
|------|---------|
| `apps/desktop/src/main/opencode/server-adapter.ts` | HTTP/SSE adapter using SDK |

### Modified Files

| File | Changes |
|------|---------|
| `apps/desktop/package.json` | Add `@opencode-ai/sdk` dependency |
| `packages/shared/src/types/task.ts` | Add `TextDeltaEvent`, `isStreaming` flag |
| `apps/desktop/src/main/opencode/task-manager.ts` | Use server adapter with fallback |
| `apps/desktop/src/main/ipc/handlers.ts` | Forward `text-delta` events |
| `apps/desktop/src/preload/index.ts` | Expose `onTextDelta` |
| `apps/desktop/src/renderer/stores/taskStore.ts` | Add `appendTextDelta` action |
| `apps/desktop/src/renderer/pages/Execution.tsx` | Subscribe to text-delta events |
| `apps/desktop/src/renderer/components/ui/MessageBubble.tsx` | Immediate render + cursor |

## Dependencies

```json
{
  "dependencies": {
    "@opencode-ai/sdk": "^1.1.28"
  }
}
```

## Testing

1. **Unit tests** for server adapter (mock SSE stream)
2. **Integration test** with real Ollama to verify streaming
3. **Fallback test** - verify CLI mode works when server fails
4. **E2E test** - verify streaming UI renders correctly

## Success Criteria

- Text appears token-by-token as Ollama generates it
- Blinking cursor visible while streaming
- Fallback to CLI mode works transparently
- No regression for cloud providers (Anthropic, OpenAI, etc.)
