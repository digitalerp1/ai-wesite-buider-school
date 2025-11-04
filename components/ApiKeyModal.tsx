import React, { useState } from 'react';
import { KeyIcon } from './icons';

interface ApiKeyModalProps {
    currentApiKey: string | null;
    onSave: (apiKey: string) => void;
    onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ currentApiKey, onSave, onClose }) => {
    const [key, setKey] = useState(currentApiKey || '');
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        if (!key.trim()) {
            setError('API Key cannot be empty.');
            return;
        }
        setError(null);
        onSave(key);
    };

    return (
        <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md border border-gray-700">
                <div className="flex items-center mb-4">
                    <KeyIcon className="h-6 w-6 text-cyan-400 mr-3"/>
                    <h3 className="text-xl font-bold text-cyan-400">Gemini API Key</h3>
                </div>
                <p className="text-gray-400 mb-4 text-sm">
                    Please enter your Gemini API key to use the app. You can get your key from Google AI Studio.
                </p>
                <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 p-3 transition"
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                <div className="flex justify-end space-x-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 text-white font-bold transition"
                    >
                        Save Key
                    </button>
                </div>
            </div>
        </div>
    );
};
