

import React, { useState, useEffect, useRef } from 'react';
import { searchPdfs } from '../services/geminiService';
import { DownloadIcon, ExternalLinkIcon, SearchIcon, ArrowRightIcon, XIcon } from './Icons';

interface PdfResult {
    title: string;
    url: string;
}

interface SectionProps {
    onBack: () => void;
}

const HISTORY_STORAGE_KEY = 'section2_search_history';
const POPULAR_QUERIES = [
    'تحلية المياه بالتناضح العكسي',
    'حساب جرعة الكلور',
    'معالجة مياه الصرف الصحي',
    'صيانة فلاتر الرمل',
    'مشاكل غشاء التناضح العكسي',
    'تحليل عكارة المياه',
    'معايرة أجهزة قياس pH',
    'أنواع مضخات المياه',
];


const Section2: React.FC<SectionProps> = ({ onBack }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PdfResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchHistory, setSearchHistory] = useState<string[]>(() => {
        try {
            const localData = localStorage.getItem(HISTORY_STORAGE_KEY);
            return localData ? JSON.parse(localData) : [];
        } catch (error) {
            console.error("Failed to load search history:", error);
            return [];
        }
    });
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(searchHistory));
        } catch (error) {
            console.error("Failed to save search history:", error);
        }
    }, [searchHistory]);

    useEffect(() => {
        // Combine history and popular queries, ensuring no duplicates
        const allSuggestions = Array.from(new Set([...searchHistory, ...POPULAR_QUERIES]));
        
        if (query.trim() === '' || !isInputFocused) {
            setFilteredSuggestions([]);
        } else {
            const suggestions = allSuggestions.filter(item => 
                item.toLowerCase().includes(query.toLowerCase()) && item.toLowerCase() !== query.toLowerCase()
            ).slice(0, 5); // Limit suggestions to 5
            setFilteredSuggestions(suggestions);
        }
    }, [query, searchHistory, isInputFocused]);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsInputFocused(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchContainerRef]);

    const performSearch = async (currentQuery: string) => {
        if (!currentQuery.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);
        setIsInputFocused(false);

        try {
            const pdfResults = await searchPdfs(currentQuery);
            setResults(pdfResults);
            // Add to history on successful search
            if (!searchHistory.includes(currentQuery)) {
                setSearchHistory(prev => {
                    const newHistory = [currentQuery, ...prev];
                    return newHistory.slice(0, 10); // Limit to 10 items
                });
            }
        } catch (err) {
            setError('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(query);
    };

    const handleHistoryClick = (historicalQuery: string) => {
        setQuery(historicalQuery);
        performSearch(historicalQuery);
    };

    const handleSuggestionClick = (suggestion: string) => {
        setQuery(suggestion);
        performSearch(suggestion);
    };

    const handleRemoveHistoryItem = (e: React.MouseEvent, itemToRemove: string) => {
        e.stopPropagation();
        setSearchHistory(prev => prev.filter(item => item !== itemToRemove));
    };

    return (
        <div className="h-full flex flex-col bg-gray-800/50 rounded-lg p-6 shadow-xl border border-gray-700 relative">
             <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-white transition z-10 p-2 rounded-full hover:bg-gray-700" title="عودة إلى لوحة التحكم">
                <ArrowRightIcon className="h-6 w-6" />
                <span className="sr-only">عودة إلى لوحة التحكم</span>
            </button>
            <div className="flex-shrink-0 mb-6 text-center">
                <h2 className="text-2xl font-bold text-cyan-400">باحث ملفات PDF</h2>
                <p className="text-gray-400">ابحث عن وثائق وملفات PDF علمية وتقنية.</p>
            </div>
            
            <div ref={searchContainerRef} className="relative z-20">
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        placeholder="اكتب عن ماذا تريد البحث... (مثال: 'تناضح عكسي في تحلية المياه')"
                        className="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-400 focus:outline-none transition text-gray-100 placeholder-gray-400"
                        disabled={isLoading}
                        autoComplete="off"
                    />
                    <button 
                        type="submit" 
                        className="bg-cyan-500 text-white p-3 rounded-lg hover:bg-cyan-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center w-14"
                        disabled={isLoading || !query.trim()}
                        aria-label="Search"
                    >
                        {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <SearchIcon />}
                    </button>
                </form>
                 {isInputFocused && filteredSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg animate-fade-in-fast">
                        <ul className="py-2">
                            {filteredSuggestions.map((suggestion, index) => (
                                <li 
                                    key={index}
                                    className="px-4 py-2 text-gray-300 hover:bg-cyan-400/10 cursor-pointer transition-colors"
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            
            {searchHistory.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm text-gray-400 font-bold shrink-0">آخر عمليات البحث:</h3>
                    {searchHistory.map(item => (
                         <div key={item} className="flex items-center bg-gray-700 rounded-full text-sm group transition-colors duration-200">
                            <span 
                                className="px-4 py-1.5 text-cyan-400 cursor-pointer hover:bg-gray-600/70 rounded-l-full" 
                                onClick={() => handleHistoryClick(item)}
                                title={`بحث عن: "${item}"`}
                            >
                                {item}
                            </span>
                            <button 
                                onClick={(e) => handleRemoveHistoryItem(e, item)} 
                                className="px-3 py-1.5 text-gray-500 hover:text-white hover:bg-red-500/50 rounded-r-full transition-colors"
                                title={`إزالة "${item}" من السجل`}
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-grow overflow-y-auto">
                {error && <p className="text-red-400 text-center">{error}</p>}
                {results.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {results.map((result, index) => (
                            <div key={index} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-cyan-400 mb-2 line-clamp-2" title={result.title}>{result.title}</h3>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex-1 bg-gray-600 hover:bg-gray-500 text-gray-200 text-sm py-2 px-3 rounded-md flex items-center justify-center gap-2 transition">
                                        <ExternalLinkIcon />
                                        <span>فتح</span>
                                    </a>
                                    <a href={result.url} download={result.title.replace(/ /g, '_') + '.pdf'} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white text-sm py-2 px-3 rounded-md flex items-center justify-center gap-2 transition">
                                        <DownloadIcon />
                                        <span>تحميل</span>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                 {!isLoading && results.length === 0 && !error && (
                    <div className="text-center text-gray-500 pt-10">
                        <p>ستظهر نتائج البحث هنا.</p>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fade-in-fast {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-fast {
                    animation: fade-in-fast 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default Section2;