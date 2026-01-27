import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Code, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springs } from '../lib/animations';
import loadingSymbol from '/assets/loading-symbol.svg';

// Spinning Openwork icon component
const SpinningIcon = ({ className }: { className?: string }) => (
  <img
    src={loadingSymbol}
    alt=""
    className={cn('animate-spin-ccw', className)}
  />
);

interface BrowserRunCodeCardProps {
  code: string;
  isRunning?: boolean;
}

export const BrowserRunCodeCard = memo(function BrowserRunCodeCard({
  code,
  isRunning = false,
}: BrowserRunCodeCardProps) {
  const trimmedCode = code?.trim();
  if (!trimmedCode) return null;

  const [expanded, setExpanded] = useState(false);
  const lines = trimmedCode.split('\n');
  const visibleCount = 10;
  const hasMore = lines.length > visibleCount;
  const visibleLines = expanded ? lines : lines.slice(0, visibleCount);
  const displayCode = hasMore && !expanded ? `${visibleLines.join('\n')}\n...` : visibleLines.join('\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.gentle}
      className="bg-muted border border-border rounded-2xl px-4 py-3 max-w-[85%]"
    >
      <div className="flex items-center gap-2 mb-2">
        <Code className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">Run Code</span>
        {isRunning && <SpinningIcon className="h-3.5 w-3.5 ml-auto" />}
      </div>

      <pre className="bg-background/60 border border-border/60 rounded-lg p-3 text-xs text-foreground overflow-x-auto">
        <code>{displayCode}</code>
      </pre>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Show fewer lines' : 'Show more lines'}
          className={cn(
            'mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
            'bg-primary/10 text-primary cursor-pointer',
            'hover:bg-primary/20 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1'
          )}
        >
          {expanded ? 'Show less' : 'Show more'}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}
    </motion.div>
  );
});
