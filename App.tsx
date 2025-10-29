
import React, { useState, useEffect } from 'react';
import Section1 from './components/Section1';
import Section2 from './components/Section2';
import Section3 from './components/Section3';
import Dashboard from './components/Dashboard';
import ApiKeyModal from './components/ApiKeyModal';
import { initializeGenAI, getApiKey } from './services/geminiClient';
import Section4 from './components/Section4';

export type SectionId = 'dashboard' | 'expert' | 'search' | 'troubleshoot' | 'locked';

const App: React.FC = () => {
    const [isKeyRequired, setIsKeyRequired] = useState(true);
    const [activeSection, setActiveSection] = useState<SectionId>('dashboard');

    useEffect(() => {
        const storedKey = getApiKey();
        if (storedKey) {
            try {
                initializeGenAI(storedKey);
                setIsKeyRequired(false);
            } catch (error) {
                console.error("Failed to initialize with stored API key:", error);
                setIsKeyRequired(true);
            }
        } else {
            setIsKeyRequired(true);
        }
    }, []);

    const handleApiKeySubmit = (key: string) => {
        try {
            initializeGenAI(key);
            setIsKeyRequired(false);
        } catch (error) {
            console.error("Failed to initialize GenAI:", error);
        }
    };

    const renderContent = () => {
        if (isKeyRequired) {
            return <ApiKeyModal onApiKeySubmit={handleApiKeySubmit} />;
        }

        switch (activeSection) {
            case 'expert':
                return <Section1 onBack={() => setActiveSection('dashboard')} />;
            case 'search':
                return <Section2 onBack={() => setActiveSection('dashboard')} />;
            case 'troubleshoot':
                return <Section3 onBack={() => setActiveSection('dashboard')} />;
            case 'locked':
                 return <Section4 onBack={() => setActiveSection('dashboard')} />;
            case 'dashboard':
            default:
                return <Dashboard onSectionSelect={(section) => setActiveSection(section)} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-cyan-900/20 opacity-50 z-0"></div>
            <main className="container mx-auto py-8 relative z-10">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;