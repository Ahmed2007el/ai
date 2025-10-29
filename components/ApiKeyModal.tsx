

import React, { useState } from 'react';

interface ApiKeyModalProps {
    onApiKeySubmit: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onApiKeySubmit }) => {
    const [apiKey, setApiKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim()) {
            onApiKeySubmit(apiKey.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-cyan-400/10 rounded-lg shadow-2xl p-8 max-w-md w-full text-center transform transition-all animate-fade-in-up">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">مطلوب مفتاح API</h2>
                <p className="text-gray-400 mb-6">
                    الرجاء إدخال مفتاح Google AI API الخاص بك للمتابعة. لن يتمكن التطبيق من العمل بدونه.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="أدخل مفتاح API هنا"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 mb-6 focus:ring-2 focus:ring-cyan-400 focus:outline-none transition text-gray-100 text-center placeholder-gray-400"
                    />
                    <button
                        type="submit"
                        disabled={!apiKey.trim()}
                        className="w-full bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        حفظ وبدء الاستخدام
                    </button>
                </form>
                <p className="text-xs text-gray-500 mt-4">
                    يتم تخزين مفتاحك محليًا في متصفحك فقط.
                </p>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default ApiKeyModal;