import React from 'react';
import type { GeminiModel, ModelOption } from '../types';
import { GenerateIcon, EditIcon } from './icons';

interface ControlPanelProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
  error: string | null;
  selectedModel: GeminiModel;
  setSelectedModel: (model: GeminiModel) => void;
  isEditMode: boolean;
  setIsEditMode: (isEditMode: boolean) => void;
  versionHistory: string[];
  currentVersionIndex: number;
  setCurrentVersionIndex: (index: number) => void;
  isApiKeySet: boolean;
}

const modelOptions: ModelOption[] = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Most capable model for complex tasks.' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast and efficient for general tasks.' },
  { value: 'gemini-flash-latest', label: 'Gemini Flash (Latest)', description: 'The latest version of the Flash model.'},
];

const VersionHistory: React.FC<{
    versions: string[],
    currentIndex: number,
    onSelect: (index: number) => void
}> = ({ versions, currentIndex, onSelect }) => {
    return (
        <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Version History</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-950/50 p-2 rounded-md border border-gray-700/50">
                {versions.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => onSelect(index)}
                        className={`w-full text-left p-2 rounded-md text-sm transition ${
                            currentIndex === index
                                ? 'bg-cyan-600 text-white font-semibold'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                    >
                        Version {index + 1} {currentIndex === index && '(current)'}
                    </button>
                ))}
            </div>
        </div>
    )
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  prompt,
  setPrompt,
  isLoading,
  onGenerate,
  error,
  selectedModel,
  setSelectedModel,
  isEditMode,
  setIsEditMode,
  versionHistory,
  currentVersionIndex,
  setCurrentVersionIndex,
  isApiKeySet
}) => {
  return (
    <div className="p-2 space-y-6 flex-grow flex flex-col">
        <div className="space-y-6">
            <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                Website Description
                </label>
                <textarea
                id="prompt"
                rows={8}
                className="w-full bg-gray-950/50 border border-gray-700/50 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 p-3 transition"
                placeholder="e.g., A modern landing page for a new coffee shop in San Francisco called 'The Daily Grind'. Include a hero section, an 'about us' section, and a contact form."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-2">
                AI Model
                </label>
                <select
                id="model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
                className="w-full bg-gray-950/50 border border-gray-700/50 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 p-3 transition"
                >
                {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                    {option.label}
                    </option>
                ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                    {modelOptions.find(opt => opt.value === selectedModel)?.description}
                </p>
            </div>
            
            {error && <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-md border border-red-500/50">{error}</p>}
        </div>

        <div className="flex-grow"></div>

        <div className="space-y-4">
            <VersionHistory
                versions={versionHistory}
                currentIndex={currentVersionIndex}
                onSelect={setCurrentVersionIndex}
            />

            <div className="flex space-x-2">
                <button
                    onClick={onGenerate}
                    disabled={isLoading || isEditMode || !isApiKeySet}
                    title={!isApiKeySet ? "Please set your API key in settings" : "Generate Website"}
                    className="w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
                >
                    {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                    ) : (
                    <>
                        <GenerateIcon className="h-5 w-5 mr-2"/>
                        Generate Website
                    </>
                    )}
                </button>
                <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    disabled={isLoading || !isApiKeySet}
                    title={!isApiKeySet ? "Please set your API key in settings" : (isEditMode ? "Exit Edit Mode" : "Enter Edit Mode")}
                    className={`p-3 rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed ${
                        isEditMode ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                >
                    <EditIcon className="h-5 w-5 text-white"/>
                </button>
            </div>
        </div>
    </div>
  );
};
