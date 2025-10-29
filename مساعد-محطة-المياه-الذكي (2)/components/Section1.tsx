import React from 'react';
import { getChemicalAdvice } from '../services/geminiService';
import ChatInterface from './ChatInterface';

interface SectionProps {
    onBack: () => void;
}

const Section1: React.FC<SectionProps> = ({ onBack }) => {
    return (
        <ChatInterface
            onBack={onBack}
            title="خبير الهندسة الكيميائية"
            subtitle="تحدث أو اكتب للحصول على استشارات دقيقة وفورية."
            storageKey="section1_conversations"
            analyzeQueryFn={getChemicalAdvice}
            liveSessionSystemInstruction="أنت خبير في الهندسة الكيميائية متخصص في محطات معالجة المياه. أجب على أسئلة المستخدم بدقة ووضوح. كن احترافيا ومساعدا."
            thinkingMessage="يفكر..."
        />
    );
};

export default Section1;