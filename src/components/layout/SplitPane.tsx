import { useCallback, useRef, useState, useEffect } from 'react';
import { useUiStore } from '../../stores';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  minLeftWidth?: number;
  minRightWidth?: number;
}

export function SplitPane({
  left,
  right,
  minLeftWidth = 300,
  minRightWidth = 250,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { leftPanelWidth, setLeftPanelWidth } = useUiStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const newLeftWidth = e.clientX - containerRect.left;

      // Calculate percentage
      const percentage = (newLeftWidth / containerWidth) * 100;

      // Enforce minimum widths
      const minLeftPercentage = (minLeftWidth / containerWidth) * 100;
      const maxLeftPercentage = 100 - (minRightWidth / containerWidth) * 100;

      const clampedPercentage = Math.max(
        minLeftPercentage,
        Math.min(maxLeftPercentage, percentage)
      );

      setLeftPanelWidth(clampedPercentage);
    },
    [isDragging, minLeftWidth, minRightWidth, setLeftPanelWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="flex h-full w-full overflow-hidden">
      {/* Left Panel */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${leftPanelWidth}%` }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        className={`
          w-1 h-full cursor-col-resize flex-shrink-0
          bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]
          transition-colors
          ${isDragging ? 'bg-[var(--color-accent)]' : ''}
        `}
        onMouseDown={handleMouseDown}
      />

      {/* Right Panel */}
      <div
        className="h-full overflow-hidden flex-1"
        style={{ width: `${100 - leftPanelWidth}%` }}
      >
        {right}
      </div>
    </div>
  );
}
