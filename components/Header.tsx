import React from 'react';
import { LogoIcon, SettingsIcon } from './icons';

interface HeaderProps {
    onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  return (
    <header className="bg-gray-900/50 border-b border-gray-700/50 p-4 flex items-center justify-between shadow-md z-10">
      <div className="flex items-center space-x-3">
        <LogoIcon className="h-8 w-8 text-cyan-400" />
        <h1 className="text-xl font-bold tracking-tight text-white">
          Gemini Website Builder
        </h1>
      </div>
      <button 
        onClick={onSettingsClick} 
        className="p-2 rounded-md hover:bg-gray-700 transition-colors"
        aria-label="Settings"
        title="Settings"
      >
        <SettingsIcon className="h-6 w-6 text-gray-400" />
      </button>
    </header>
  );
};
