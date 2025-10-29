

import React from 'react';
import { ChemicalIcon, FilePdfIcon, GearIcon, LockIcon } from './Icons';
import { SectionId } from '../App';

interface DashboardProps {
    onSectionSelect: (section: SectionId) => void;
}

const sections = [
    { id: 'expert', title: 'خبير الهندسة الكيميائية', description: 'احصل على استشارات فورية حول العمليات الكيميائية ومعالجة المياه.', icon: <ChemicalIcon />, enabled: true },
    { id: 'search', title: 'باحث PDF', description: 'ابحث في ملايين الوثائق الفنية والعلمية للعثور على المعلومات التي تحتاجها.', icon: <FilePdfIcon />, enabled: true },
    { id: 'troubleshoot', title: 'مساعد الصيانة', description: 'تشخيص المشكلات وإيجاد حلول خطوة بخطوة لمعدات المحطة.', icon: <GearIcon />, enabled: true },
    { id: 'locked', title: 'قادم قريباً', description: 'ميزات وأدوات جديدة قيد التطوير لتعزيز قدراتك.', icon: <LockIcon />, enabled: false },
];

const Dashboard: React.FC<DashboardProps> = ({ onSectionSelect }) => {
    return (
        <div className="p-4 md:p-8 animate-fade-in">
            <header className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-100">مساعد محطة المياه الذكي</h1>
                <p className="text-lg text-gray-400 mt-4">اختر الأداة التي تناسب مهمتك اليوم.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {sections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => section.enabled && onSectionSelect(section.id as SectionId)}
                        disabled={!section.enabled}
                        className={`bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center transition-all duration-300 transform 
                                    hover:border-cyan-400 hover:shadow-2xl hover:shadow-cyan-400/20 hover:-translate-y-2
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none disabled:border-gray-700`}
                    >
                        <div className="flex justify-center items-center text-cyan-400 mb-4">
                            {React.cloneElement(section.icon, { className: "h-16 w-16" })}
                        </div>
                        <h2 className="text-xl font-bold text-gray-100 mb-2">{section.title}</h2>
                        <p className="text-gray-400 text-sm">{section.description}</p>
                    </button>
                ))}
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.6s ease-in-out forwards;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;