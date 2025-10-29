import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fileToBase64 } from '../utils/audioUtils';
import { useLiveSession } from '../hooks/useLiveSession';
import { CameraIcon, MicrophoneIcon, StopCircleIcon, PaperPlaneIcon, ArrowRightIcon, PlusIcon, TrashIcon, HistoryIcon, XIcon } from './Icons';

interface VideoResult {
    title: string;
    url: string;
}

interface ChatMessage {
    id: number;
    role: 'user' | 'model';
    text?: string;
    image?: string;
    videos?: VideoResult[];
    isLoading?: boolean;
}

interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    timestamp: number;
}

interface ChatInterfaceProps {
    onBack: () => void;
    title: string;
    subtitle: string;
    storageKey: string;
    analyzeQueryFn: (prompt: string, imageBase64?: string) => Promise<{ text: string; videos: VideoResult[] }>;
    liveSessionSystemInstruction: string;
    thinkingMessage: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack, title, subtitle, storageKey, analyzeQueryFn, liveSessionSystemInstruction, thinkingMessage }) => {
    const [conversations, setConversations] = useState<Conversation[]>(() => {
        try {
            const localData = localStorage.getItem(storageKey);
            const parsedData = localData ? JSON.parse(localData) : [];
            return parsedData.sort((a: Conversation, b: Conversation) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error("Failed to load conversations:", error);
            return [];
        }
    });
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
    const activeConversationIdRef = useRef(activeConversationId);
    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [imagePreview, setImagePreview] = useState<{ file: File, url: string } | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const stopSessionRef = useRef<() => void>();

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(conversations));
        } catch (error) {
            console.error("Failed to save conversations:", error);
        }
    }, [conversations, storageKey]);
    
    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview.url);
            }
        };
    }, [imagePreview]);

    useEffect(() => {
        const activeConversationExists = conversations.find(c => c.id === activeConversationId);

        if (!activeConversationExists && conversations.length > 0) {
            setActiveConversationId(conversations[0].id);
        } else if (conversations.length === 0) {
            setActiveConversationId(null);
        }
    }, [conversations, activeConversationId]);

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const chatHistory = activeConversation ? activeConversation.messages : [];

    const updateChatHistory = useCallback((updater: (prevHistory: ChatMessage[]) => ChatMessage[]) => {
        const currentId = activeConversationIdRef.current;
    
        if (!currentId) {
            const newId = crypto.randomUUID();
            const initialMessages = updater([]);
            const firstUserMessage = initialMessages.find(m => m.role === 'user')?.text || 'محادثة جديدة';
            const newConversation: Conversation = {
                id: newId,
                title: firstUserMessage.substring(0, 40) + (firstUserMessage.length > 40 ? '...' : ''),
                messages: initialMessages,
                timestamp: Date.now()
            };
            setConversations(prev => [newConversation, ...prev]);
            setActiveConversationId(newId);
        } else {
            setConversations(prev => {
                const updatedConversations = prev.map(c => {
                    if (c.id === currentId) {
                         const newMessages = updater(c.messages);
                         const firstUserMessage = newMessages.find(m => m.role === 'user')?.text || c.title;
                         return { 
                             ...c, 
                             messages: newMessages, 
                             timestamp: Date.now(),
                             title: c.messages.length === 0 ? firstUserMessage.substring(0, 40) + (firstUserMessage.length > 40 ? '...' : '') : c.title
                        };
                    }
                    return c;
                });
                return updatedConversations.sort((a, b) => b.timestamp - a.timestamp);
            });
        }
    }, []);

    const handleLiveMessage = useCallback(async (message: any) => {
        let userText = message.serverContent?.inputTranscription?.text;
        let modelText = message.serverContent?.outputTranscription?.text;
        
        updateChatHistory(prev => {
            let newHistory = [...prev];
            if (userText) {
                const last = newHistory[newHistory.length - 1];
                if (last && last.role === 'user' && !last.image) {
                    last.text = (last.text || '') + userText;
                } else {
                    newHistory.push({ id: Date.now(), role: 'user', text: userText });
                }
            }
            if (modelText) {
                const last = newHistory[newHistory.length - 1];
                 if (last && last.role === 'model' && !last.isLoading) {
                    last.text = (last.text || '') + modelText;
                } else {
                    newHistory.push({ id: Date.now() + 1, role: 'model', text: modelText });
                }
            }
            return newHistory;
        });

        if (message.serverContent?.turnComplete) {
            stopSessionRef.current?.();
        }
    }, [updateChatHistory]);

    const { isSessionActive, startSession, stopSession, error: liveError } = useLiveSession({
        onMessage: handleLiveMessage,
        systemInstruction: liveSessionSystemInstruction,
    });
    
    stopSessionRef.current = stopSession;
    
    const toggleSession = async () => {
        if (isSessionActive) {
            stopSession();
        } else {
            startSession();
        }
    };
    
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [chatHistory]);
    
    const removeImagePreview = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setImagePreview(null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview.url);
        }
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImagePreview({ file, url: URL.createObjectURL(file) });
        } else {
            setImagePreview(null);
        }
    };
    
    const analyzeQuery = async (text: string, imageFile?: File | null) => {
        if (!text && !imageFile) return;

        let imageBase64: string | undefined;
        if (imageFile) {
            setIsUploading(true);
            setUploadProgress(0);
            try {
                imageBase64 = await fileToBase64(imageFile, setUploadProgress);
            } catch (error) {
                console.error("Error uploading file:", error);
                const errorMessage = { id: Date.now(), role: 'model' as const, text: 'عذراً، فشل تحميل الصورة. يرجى المحاولة مرة أخرى.' };
                updateChatHistory(prev => [...prev, errorMessage]);
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        setIsThinking(true);

        const userMessageText = text || 'لقد أرفقت صورة، الرجاء تحليلها.';
        const userMessage: ChatMessage = { 
            id: Date.now(), 
            role: 'user', 
            text: userMessageText, 
            image: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined
        };
        const modelLoadingMessage: ChatMessage = {
            id: Date.now() + 1,
            role: 'model',
            isLoading: true
        };

        updateChatHistory(prev => [...prev, userMessage, modelLoadingMessage]);

        try {
            const prompt = text || 'حلل الصورة المرفقة وقدم نصيحة كيميائية ذات صلة بمحطة معالجة المياه.';
            const response = await analyzeQueryFn(prompt, imageBase64);
            const modelResponseMessage = { ...modelLoadingMessage, text: response.text, videos: response.videos, isLoading: false };
            updateChatHistory(prev => prev.map(msg => msg.id === modelLoadingMessage.id ? modelResponseMessage : msg));

        } catch (error) {
            console.error("Error analyzing query:", error);
            const errorMessage = { id: modelLoadingMessage.id, role: 'model' as const, text: 'عذراً، حدث خطأ أثناء تحليل طلبك.', isLoading: false };
            updateChatHistory(prev => prev.map(msg => msg.id === modelLoadingMessage.id ? errorMessage : msg));
        } finally {
            setIsThinking(false);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        const textToSend = textInput.trim();
        const imageFileToSend = imagePreview?.file;

        if ((!textToSend && !imageFileToSend) || isSessionActive || isUploading) return;

        analyzeQuery(textToSend, imageFileToSend);

        setTextInput('');
        removeImagePreview();
    };

    const handleNewConversation = () => {
        const newConversation: Conversation = {
            id: crypto.randomUUID(),
            title: 'محادثة جديدة',
            messages: [],
            timestamp: Date.now()
        };
        
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
        setTextInput('');
        removeImagePreview();
        setIsHistoryPanelOpen(false);
    };
    
    const handleSelectConversation = (id: string) => {
        setActiveConversationId(id);
        setIsHistoryPanelOpen(false);
    };

    const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConversationToDelete(id);
    };

    const confirmDelete = () => {
        if (!conversationToDelete) return;
        setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
        setConversationToDelete(null);
    };

    const cancelDelete = () => {
        setConversationToDelete(null);
    };

    return (
        <div className="flex h-full max-h-[calc(100vh-4rem)] lg:gap-4 relative overflow-hidden">
             <aside className={`
                absolute lg:relative inset-y-0 right-0 z-30 flex flex-col 
                bg-gray-800/80 backdrop-blur-md border-l lg:border border-gray-700
                w-80 lg:w-72 rounded-r-none lg:rounded-lg p-4 shadow-2xl lg:shadow-xl
                transition-transform duration-300 ease-in-out
                ${isHistoryPanelOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0
                flex-shrink-0
            `}>
                 <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="text-lg font-bold text-white">سجل المحادثات</h3>
                    <button 
                        onClick={() => setIsHistoryPanelOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-white p-1"
                        title="إغلاق السجل"
                    >
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <button 
                    onClick={handleNewConversation}
                    className="flex items-center justify-center gap-2 w-full p-2 mb-4 text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition flex-shrink-0"
                >
                    <PlusIcon />
                    <span>محادثة جديدة</span>
                </button>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    {conversations.map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv.id)}
                            className={`flex items-center justify-between p-2 my-1 rounded-lg cursor-pointer transition group ${activeConversationId === conv.id ? 'bg-cyan-400/20' : 'hover:bg-gray-700'}`}
                        >
                            <p className="text-sm truncate text-gray-300">{conv.title}</p>
                            <button 
                                onClick={(e) => handleDeleteConversation(e, conv.id)}
                                className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition flex-shrink-0 ml-2"
                                title="حذف المحادثة"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    ))}
                </div>
            </aside>
            
            {isHistoryPanelOpen && <div onClick={() => setIsHistoryPanelOpen(false)} className="lg:hidden fixed inset-0 bg-black/50 z-20"></div>}

            <div className="flex-1 h-full flex flex-col bg-gray-800/50 rounded-lg p-2 sm:p-6 shadow-xl border border-gray-700 relative">
                 <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-white transition z-10 p-2 rounded-full hover:bg-gray-700" title="عودة إلى لوحة التحكم">
                    <ArrowRightIcon className="h-6 w-6" />
                    <span className="sr-only">عودة إلى لوحة التحكم</span>
                </button>
                <div className="flex-shrink-0 mb-4 text-center">
                    <button 
                        onClick={() => setIsHistoryPanelOpen(true)}
                        className="lg:hidden absolute top-4 left-4 text-gray-400 hover:text-white transition p-2 rounded-full hover:bg-gray-700"
                        title="عرض السجل"
                    >
                        <HistoryIcon className="h-6 w-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-cyan-400">{title}</h2>
                    <p className="text-gray-400">{subtitle}</p>
                </div>

                <div className="flex-grow bg-gray-900 rounded-lg p-4 overflow-y-auto mb-4 min-h-[400px]">
                    {!activeConversationId && (
                        <div className="flex-1 flex items-center justify-center text-gray-500 h-full">
                           <p>ابدأ محادثة جديدة أو اختر واحدة من السجل.</p>
                        </div>
                    )}
                    {chatHistory.map((msg) => (
                        <div key={msg.id} className={`flex my-3 items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-2xl p-3 rounded-xl shadow ${msg.role === 'user' ? 'bg-cyan-500 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                {msg.image && <img src={msg.image} alt="uploaded content" className="rounded-lg mb-2 max-h-60" />}
                                {msg.isLoading ? (
                                     <div className="flex items-center space-x-2 space-x-reverse text-gray-400">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                                        <span>{thinkingMessage}</span>
                                    </div>
                                ) : (
                                    <>
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                        {msg.videos && msg.videos.length > 0 && (
                                            <div className="mt-4 border-t border-gray-600 pt-3">
                                                <h4 className="font-bold text-sm mb-2 text-cyan-400">فيديوهات ذات صلة:</h4>
                                                <div className="space-y-2">
                                                    {msg.videos.map((video, index) => (
                                                        <a 
                                                            key={index}
                                                            href={video.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-3 bg-gray-600/50 p-2 rounded-lg hover:bg-gray-600 transition"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                            </svg>
                                                            <span className="text-sm text-gray-300 line-clamp-2">{video.title}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                   </>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef}></div>
                </div>
                
                {liveError && <p className="text-red-400 text-center text-sm mb-2">{liveError}</p>}

                <div className="flex-shrink-0">
                     {imagePreview && (
                        <div className="relative self-start mb-2 ml-16 transform transition-all duration-300 ease-out animate-fade-in-up-sm">
                            <img src={imagePreview.url} alt="معاينة الصورة" className="h-20 w-20 rounded-lg object-cover border-2 border-gray-600 shadow-md" />
                             {isUploading && (
                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg text-white text-xs font-mono">
                                    <div className="w-16 bg-gray-400 rounded-full h-1.5 mb-1">
                                        <div className="bg-cyan-500 h-1.5 rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                                    </div>
                                    <span>{uploadProgress}%</span>
                                </div>
                            )}
                            <button
                                onClick={removeImagePreview}
                                disabled={isUploading}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 transition transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                title="إزالة الصورة"
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2 p-2 bg-gray-700 rounded-lg">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                            accept="image/*"
                            disabled={isThinking || isSessionActive || isUploading}
                        />
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 rounded-lg bg-gray-600 text-gray-200 hover:bg-gray-500 transition disabled:opacity-50 flex-shrink-0"
                            disabled={isThinking || isSessionActive || isUploading}
                            title="رفع صورة"
                        >
                            <CameraIcon />
                        </button>
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder={isSessionActive ? "المحادثة الصوتية جارية..." : "اكتب سؤالك هنا..."}
                            className="flex-grow bg-gray-800 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-400 focus:outline-none transition resize-none text-gray-100 placeholder-gray-400"
                            rows={1}
                            style={{maxHeight: '120px'}}
                            disabled={isThinking || isSessionActive || isUploading}
                        />
                         <button 
                            type="submit"
                            className="p-3 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition disabled:opacity-50 flex-shrink-0"
                            disabled={isThinking || isSessionActive || isUploading || (!textInput.trim() && !imagePreview)}
                            title="إرسال رسالة"
                        >
                            <PaperPlaneIcon />
                        </button>
                         <button 
                            type="button"
                            onClick={toggleSession}
                            className={`p-3 rounded-lg transition flex-shrink-0 text-white ${isSessionActive ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-gray-600 hover:bg-gray-500'} disabled:opacity-50`}
                            disabled={isThinking || isUploading}
                            title={isSessionActive ? "إيقاف المحادثة الصوتية" : "بدء محادثة صوتية"}
                        >
                            {isSessionActive ? <StopCircleIcon /> : <MicrophoneIcon />}
                        </button>
                    </form>
                </div>
            </div>

            {conversationToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-red-500/20 rounded-lg shadow-2xl p-6 max-w-sm w-full text-center transform transition-all animate-fade-in-up">
                        <h3 className="text-lg font-bold text-gray-100 mb-2">تأكيد الحذف</h3>
                        <p className="text-gray-400 mb-6">هل أنت متأكد أنك تريد حذف هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={cancelDelete}
                                className="px-6 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-gray-200 font-bold transition focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-6 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition focus:outline-none focus:ring-2 focus:ring-red-400"
                            >
                                حذف
                            </button>
                        </div>
                    </div>
                     <style>{`
                        @keyframes fade-in-up {
                            from { opacity: 0; transform: translateY(20px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        .animate-fade-in-up {
                            animation: fade-in-up 0.3s ease-out forwards;
                        }
                        @keyframes fade-in-up-sm {
                            from { opacity: 0; transform: translateY(10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        .animate-fade-in-up-sm {
                            animation: fade-in-up-sm 0.3s ease-out forwards;
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default ChatInterface;