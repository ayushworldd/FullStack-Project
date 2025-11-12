import { useEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldKeymap } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import socketService from '../services/socket';

// Basic setup extensions
const basicSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
    ...lintKeymap
  ])
];

const CollaborativeEditor = ({ documentId, userColor, username }) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!documentId || !editorRef.current) return;

    let mounted = true;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('content');
    ytextRef.current = ytext;

    const initializeEditor = async () => {
      try {
        console.log('[Editor] Initializing editor for document:', documentId);
        console.log('[Editor] Socket connected:', socketService.isConnected());
        
        // Check if socket is connected
        if (!socketService.isConnected()) {
          console.log('[Editor] Socket not connected, waiting...');
          // Wait a bit for socket to connect
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!socketService.isConnected()) {
            throw new Error('WebSocket not connected. Please refresh the page.');
          }
        }
        
        console.log('[Editor] Joining document room...');
        // Join document room and get initial state
        const syncData = await socketService.joinDocument(documentId);
        console.log('[Editor] Joined document, sync data:', syncData);
        
        if (!mounted) return;

        // Apply initial state
        if (syncData.state && syncData.state.length > 0) {
          console.log('[Editor] Applying initial state');
          const update = new Uint8Array(syncData.state);
          Y.applyUpdate(ydoc, update);
        } else {
          console.log('[Editor] No initial state to apply');
        }

        // Create CodeMirror extensions
        const extensions = [
          basicSetup,
          markdown(),
          javascript(),
          yCollab(ytext, syncData.presence?.map(p => ({
            name: p.user?.displayName || p.user?.username || 'Anonymous',
            color: p.user?.color || userColor,
            light: p.user?.color + '33' || userColor + '33'
          })) || [])
        ];

        // Create editor state
        const state = EditorState.create({
          doc: ytext.toString(),
          extensions
        });

        // Create editor view
        const view = new EditorView({
          state,
          parent: editorRef.current
        });

        viewRef.current = view;

        // Listen for Yjs updates
        ydoc.on('update', (update, origin) => {
          // Don't send updates that came from remote
          if (origin !== 'remote') {
            socketService.sendUpdate(documentId, Array.from(update));
          }
        });

        // Listen for remote updates
        socketService.on('yjs-update', (data) => {
          if (data.documentId === documentId) {
            const update = new Uint8Array(data.update);
            Y.applyUpdate(ydoc, update, 'remote');
          }
        });

        // Listen for user presence
        socketService.on('user-joined', (data) => {
          setOnlineUsers(prev => {
            if (!prev.find(u => u.userId === data.userId)) {
              return [...prev, data];
            }
            return prev;
          });
        });

        socketService.on('user-left', (data) => {
          setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
        });

        // Send cursor updates (throttled)
        let cursorTimeout;
        view.dom.addEventListener('selectionchange', () => {
          clearTimeout(cursorTimeout);
          cursorTimeout = setTimeout(() => {
            const selection = view.state.selection.main;
            socketService.sendCursor(documentId, {
              from: selection.from,
              to: selection.to
            });
          }, 50);
        });

        // Handle reconnection
        socketService.on('connected', async () => {
          console.log('Reconnected, syncing...');
          try {
            await socketService.joinDocument(documentId);
            socketService.requestSync(documentId);
          } catch (err) {
            console.error('Reconnection sync failed:', err);
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Editor initialization failed:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initializeEditor();

    // Cleanup
    return () => {
      mounted = false;
      
      if (viewRef.current) {
        viewRef.current.destroy();
      }
      
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
      
      socketService.leaveDocument(documentId);
      socketService.off('yjs-update');
      socketService.off('user-joined');
      socketService.off('user-left');
      socketService.off('connected');
    };
  }, [documentId, userColor, username]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">
          <p className="text-lg font-semibold">Error loading editor</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">
          <p className="text-lg">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Online users indicator */}
      <div className="bg-gray-100 border-b px-4 py-2 flex items-center gap-2">
        <span className="text-sm text-gray-600">Online:</span>
        <div className="flex gap-1">
          {onlineUsers.map(user => (
            <div
              key={user.userId}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ backgroundColor: user.user?.color || '#999' }}
              title={user.user?.displayName || user.user?.username}
            >
              {(user.user?.displayName || user.user?.username || 'A')[0].toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div 
        ref={editorRef} 
        className="flex-1 overflow-auto"
        style={{ height: 'calc(100% - 48px)' }}
      />
    </div>
  );
};

export default CollaborativeEditor;
