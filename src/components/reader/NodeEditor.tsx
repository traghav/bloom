import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { useTreeStore } from '../../stores';

interface NodeEditorProps {
  nodeId: string;
  initialText: string;
  onSave?: (text: string) => void;
  readOnly?: boolean;
}

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function NodeEditor({
  nodeId,
  initialText,
  onSave,
  readOnly = false,
}: NodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { updateNodeText } = useTreeStore();

  // Debounced save
  const debouncedSave = useCallback(
    debounce((text: string) => {
      if (onSave) {
        onSave(text);
      } else {
        updateNodeText(nodeId, text);
      }
    }, 1500),
    [nodeId, onSave, updateNodeText]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // Create editor state
    const state = EditorState.create({
      doc: initialText,
      extensions: [
        markdown(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        placeholder('Start typing...'),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': {
            fontSize: '14px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          },
          '.cm-content': {
            padding: '12px',
            minHeight: '100px',
          },
          '.cm-line': {
            padding: '0',
          },
          '.cm-focused': {
            outline: 'none',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          },
          '.cm-cursor': {
            borderLeftColor: 'var(--color-accent)',
          },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !readOnly) {
            debouncedSave(update.state.doc.toString());
          }
        }),
        EditorState.readOnly.of(readOnly),
      ],
    });

    // Create editor view
    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [nodeId]); // Re-create editor when nodeId changes

  // Update content when initialText changes (e.g., from streaming)
  useEffect(() => {
    if (viewRef.current) {
      const currentText = viewRef.current.state.doc.toString();
      if (currentText !== initialText) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentText.length,
            insert: initialText,
          },
        });
      }
    }
  }, [initialText]);

  return (
    <div
      ref={containerRef}
      className={`
        border border-[var(--color-border)] bg-white
        ${readOnly ? 'opacity-75' : ''}
      `}
    />
  );
}
