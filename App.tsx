import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { CodeEditorPanel } from './components/CodeEditorPanel';
import { generateWebsiteCodeStream, streamWebsiteEdit } from './services/geminiService';
import type { GeminiModel } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EditIcon, TextEditIcon } from './components/icons';
import { ApiKeyModal } from './components/ApiKeyModal';

const INITIAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Website Builder</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
    <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-gray-100 text-gray-800">
    <div class="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen text-center">
        <h1 class="text-5xl font-bold mb-4">Welcome to the AI Website Builder</h1>
        <p class="text-xl text-gray-600">Enter a prompt, select a model, and click "Generate" to create your website live!</p>
    </div>
</body>
</html>`;

type SelectionInfo = {
    type: 'element';
    selector: string;
} | {
    type: 'text';
    selector: string;
    text: string;
};

const App: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [versionHistory, setVersionHistory] = useState<string[]>([INITIAL_HTML]);
    const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-2.5-pro');

    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [selection, setSelection] = useState<SelectionInfo | null>(null);
    const [editInput, setEditInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('gemini_api_key'));
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!apiKey) {
            setIsApiKeyModalOpen(true);
        }
    }, [apiKey]);
    
    const handleSaveApiKey = (key: string) => {
        localStorage.setItem('gemini_api_key', key);
        setApiKey(key);
        setIsApiKeyModalOpen(false);
    };

    const handleSetCode = (newCode: string) => {
        setVersionHistory(prev => {
            const newHistory = [...prev];
            newHistory[currentVersionIndex] = newCode;
            return newHistory;
        });
    };

    const handleGenerate = useCallback(async () => {
        if (!prompt) {
            setError('Please enter a prompt to generate the website.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setIsEditMode(false);

        const newHistory = versionHistory.slice(0, currentVersionIndex + 1);
        const newVersionIndex = newHistory.length;
        setVersionHistory([...newHistory, '']);
        setCurrentVersionIndex(newVersionIndex);

        try {
            const stream = await generateWebsiteCodeStream(prompt, selectedModel);
            let htmlContent = '';
            for await (const chunk of stream) {
                htmlContent += chunk;
                setVersionHistory(prev => {
                    const newHist = [...prev];
                    newHist[newVersionIndex] = htmlContent;
                    return newHist;
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setVersionHistory(prev => prev.slice(0, -1));
            setCurrentVersionIndex(prev => prev - 1);
            console.error(err);
            if (err instanceof Error && (err.message.includes('API key') || err.message.includes('403'))) {
                setIsApiKeyModalOpen(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [prompt, selectedModel, versionHistory, currentVersionIndex]);

    const handleEdit = useCallback(async () => {
        if (!editInput || !selection) {
            setError("No edit instruction provided.");
            return;
        }
        setIsEditing(true);
        setError(null);

        const currentHtml = versionHistory[currentVersionIndex];
        const editRequest = selection.type === 'element'
            ? { type: 'element' as const, selector: selection.selector, prompt: editInput }
            : { type: 'text' as const, selector: selection.selector, originalText: selection.text, newText: editInput };

        try {
            const stream = await streamWebsiteEdit(currentHtml, editRequest, selectedModel);
            let originalHtmlBlock: string | null = null;
            let newHtmlBlock = '';
            let receivedOriginal = false;

            for await (const chunk of stream) {
                if (!receivedOriginal) {
                    originalHtmlBlock = chunk;
                    receivedOriginal = true;
                    if (!currentHtml.includes(originalHtmlBlock)) {
                        console.error("Original HTML block not found. AI output may be misaligned.", originalHtmlBlock);
                        throw new Error("Could not apply edit. The AI's response did not match the current code. Try again.");
                    }
                    // Create a new version for the edit
                    const newHistory = versionHistory.slice(0, currentVersionIndex + 1);
                    setVersionHistory([...newHistory, currentHtml]); // placeholder
                    setCurrentVersionIndex(newHistory.length);

                } else {
                    newHtmlBlock += chunk;
                    if (originalHtmlBlock) {
                        const updatedHtml = currentHtml.replace(originalHtmlBlock, newHtmlBlock);
                        setVersionHistory(prev => {
                            const newHist = [...prev];
                            newHist[prev.length - 1] = updatedHtml;
                            return newHist;
                        });
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during edit.');
            console.error(err);
        } finally {
            setIsEditing(false);
            setSelection(null);
            setEditInput('');
        }
    }, [editInput, selection, versionHistory, currentVersionIndex, selectedModel]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!isEditMode) return;
            
            const { type, selector, text } = event.data;
            if (type === 'elementSelected') {
                setSelection({ type: 'element', selector });
            } else if (type === 'textSelected') {
                setSelection({ type: 'text', selector, text });
                setEditInput(text);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isEditMode]);

    const handleDownload = () => {
        const blob = new Blob([currentCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const currentCode = versionHistory[currentVersionIndex] || '';

    return (
        <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans">
            <Header onSettingsClick={() => setIsApiKeyModalOpen(true)} />
            <main className="flex-grow flex flex-col lg:flex-row overflow-hidden">
                <div className="w-full lg:w-1/4 p-4 bg-gray-900/50 border-r border-gray-700/50 overflow-y-auto flex flex-col">
                    <ControlPanel
                        prompt={prompt}
                        setPrompt={setPrompt}
                        isLoading={isLoading}
                        onGenerate={handleGenerate}
                        error={error}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        isEditMode={isEditMode}
                        setIsEditMode={setIsEditMode}
                        versionHistory={versionHistory}
                        currentVersionIndex={currentVersionIndex}
                        setCurrentVersionIndex={setCurrentVersionIndex}
                        isApiKeySet={!!apiKey}
                    />
                </div>
                <div className="flex-grow w-full lg:w-3/4 flex flex-col relative" ref={previewRef}>
                    <div className="flex-1 w-full bg-gray-950">
                        <PreviewPanel htmlContent={currentCode} isEditMode={isEditMode} />
                    </div>
                    <div className="h-1/3 w-full border-t border-gray-700/50">
                        <CodeEditorPanel code={currentCode} setCode={handleSetCode} onDownload={handleDownload}/>
                    </div>
                    {isEditMode && !selection && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-10">
                            <div className="bg-cyan-900/80 text-white p-4 rounded-lg flex items-center space-x-3 backdrop-blur-sm border border-cyan-500 shadow-lg">
                                <EditIcon className="h-6 w-6" />
                                <span className="font-semibold text-lg">Edit Mode: Click an element or select text to modify.</span>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />

            {isApiKeyModalOpen && <ApiKeyModal currentApiKey={apiKey} onSave={handleSaveApiKey} onClose={() => setIsApiKeyModalOpen(false)} />}
            
            {selection && (
                <div className="absolute inset-0 bg-black/70 z-20 flex items-center justify-center backdrop-blur-sm" onClick={() => setSelection(null)}>
                    <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg border border-gray-700" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center mb-4">
                            {selection.type === 'element' ? <EditIcon className="h-6 w-6 text-cyan-400 mr-3"/> : <TextEditIcon className="h-6 w-6 text-cyan-400 mr-3"/>}
                            <h3 className="text-xl font-bold text-cyan-400">
                                {selection.type === 'element' ? 'Edit Element' : 'Edit Text'}
                            </h3>
                        </div>
                        <p className="text-xs font-mono bg-gray-900 p-2 rounded mb-4 text-gray-400 truncate" title={selection.selector}>
                            {selection.selector}
                        </p>
                        <textarea
                            value={editInput}
                            onChange={(e) => setEditInput(e.target.value)}
                            placeholder={selection.type === 'element' ? "e.g., 'Change the button color to purple'" : "Enter new text..."}
                            rows={selection.type === 'element' ? 4 : 6}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-gray-200 p-3 transition"
                        />
                        <div className="flex justify-end space-x-3 mt-4">
                            <button onClick={() => setSelection(null)} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition">Cancel</button>
                            <button
                                onClick={handleEdit}
                                disabled={isEditing || !editInput}
                                className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold transition flex items-center"
                            >
                                {isEditing && (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {isEditing ? 'Applying...' : 'Apply Edit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
