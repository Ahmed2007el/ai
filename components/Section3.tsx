import React from 'react';
import { getTroubleshootingSteps } from '../services/geminiService';
import ChatInterface from './ChatInterface';

interface SectionProps {
    onBack: () => void;
}

const Section3: React.FC<SectionProps> = ({ onBack }) => {
    return (
        <ChatInterface
            onBack={onBack}
            title="مساعد الصيانة الذكي"
            subtitle="تحدث، اكتب، أو أرسل صورة للمشكلة للحصول على حلول دقيقة خطوة بخطوة."
            storageKey="section3_conversations"
            analyzeQueryFn={getTroubleshootingSteps}
            liveSessionSystemInstruction="أنت مساعد صيانة خبير في محطات معالجة المياه. هدفك هو مساعدة المستخدم على حل المشكلات خطوة بخطوة من خلال محادثة صوتية. كن واضحًا وموجزًا ​​وأعط الأولوية للسلامة."
            thinkingMessage="يفكر بعمق..."
        />
    );
};

export default Section3;