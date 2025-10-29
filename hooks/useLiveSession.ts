import { useState, useRef, useCallback } from 'react';
import { LiveServerMessage, Modality } from '@google/genai';
import { createBlob, Blob } from '../utils/audioUtils';
import { getGenAI } from '../services/geminiClient';

interface UseLiveSessionProps {
    onMessage: (message: LiveServerMessage) => void;
    systemInstruction: string;
}

export const useLiveSession = ({ onMessage, systemInstruction }: UseLiveSessionProps) => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // The type for sessionRef is now defined inline to only include the `close` method, as the full `LiveSession` type is not available.
    const sessionRef = useRef<{ close: () => void } | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const stopSession = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if(sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsSessionActive(false);
    }, []);

    const startSession = useCallback(async () => {
        if (isSessionActive) return;
        
        setError(null);
        setIsSessionActive(true);

        try {
            const ai = getGenAI();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        sourceRef.current = source;
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = createBlob(inputData);
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        onMessage(message);
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setError("حدث خطأ في الاتصال.");
                        stopSession();
                    },
                    onclose: (e: CloseEvent) => {
                        stopSession();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    systemInstruction: systemInstruction,
                },
            });

            sessionRef.current = await sessionPromise;
        } catch (err) {
            console.error("Failed to start live session:", err);
            setError("لم نتمكن من الوصول إلى الميكروفون. يرجى التحقق من الأذونات.");
            stopSession();
        }
    }, [isSessionActive, onMessage, systemInstruction, stopSession]);

    return { isSessionActive, startSession, stopSession, error };
};