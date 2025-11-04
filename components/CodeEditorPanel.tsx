import React from 'react';
import { DownloadIcon } from './icons';

interface CodeEditorPanelProps {
  code: string;
  setCode: (code: string) => void;
  onDownload: () => void;
}

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({ code, setCode, onDownload }) => {
  return (
    <div className="h-full flex flex-col bg-gray-900">
        <div className="flex items-center justify-between bg-gray-950/70 p-2 text-xs font-mono text-gray-400 border-b border-gray-700/50">
            <span>HTML Code Editor</span>
            <button 
              onClick={onDownload}
              className="flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors"
              title="Download Code"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Download</span>
            </button>
        </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="flex-grow w-full bg-transparent text-gray-300 font-mono text-sm p-4 resize-none focus:outline-none"
        placeholder="Generated HTML will appear here..."
        spellCheck="false"
      />
    </div>
  );
};
