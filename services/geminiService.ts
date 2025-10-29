import { GoogleGenAI, Type, Part, GenerateContentResponse } from "@google/genai";
import { getGenAI } from './geminiClient';

// Helper function to combine content generation with video search
async function generateContentWithVideos(
    contentGenerationPromise: Promise<GenerateContentResponse>,
    videoSearchQuery: string
) {
    // searchVideos is already an async function that returns a promise
    const videoPromise = searchVideos(videoSearchQuery);

    // Run both promises in parallel for better performance
    const [contentResponse, videoResults] = await Promise.all([contentGenerationPromise, videoPromise]);
    
    return {
        text: contentResponse.text,
        videos: videoResults
    };
}

// Section 1: Chemical Expert
export async function getChemicalAdvice(prompt: string, imageBase64?: string) {
    const ai = getGenAI();
    
    const textPart = { text: prompt };
    const parts: Part[] = [];

    if (imageBase64) {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
            },
        };
        parts.push(imagePart);
    }
    parts.push(textPart);
    
    const advicePromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: parts },
        config: {
            systemInstruction: "أنت خبير في الهندسة الكيميائية متخصص في محطات معالجة المياه. أجب على أسئلة المستخدم بدقة ووضوح. كن احترافيا ومساعدا. قم بتحليل أي صور مقدمة في إجابتك. لا تذكر أنك تبحث عن فيديوهات.",
        }
    });

    return generateContentWithVideos(advicePromise, prompt);
}

// Section 2: PDF Search
export async function searchPdfs(query: string) {
    const ai = getGenAI();
    const prompt = `Find up to 12 relevant PDF documents about "${query}". Focus on scientific papers, technical manuals, and official reports. Respond ONLY with a markdown list. Each item must be a link with the document title. Example: - [Document Title](URL_to_PDF)`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const text = response.text.trim();
    const pdfResults = text.split('\n')
        .map(line => {
            const match = line.match(/\[(.*?)\]\((.*?)\)/);
            if (match && match[1] && match[2]) {
                return { title: match[1], url: match[2] };
            }
            return null;
        })
        .filter((item): item is { title: string; url: string } => item !== null);
    
    if (pdfResults.length === 0 && text.length > 0) {
        // Fallback if markdown parsing fails
        return [{ title: "Could not parse Gemini's response, showing raw text", url: "#" }];
    }

    return pdfResults;
}


// Section 3: Troubleshooting with Thinking
export async function getTroubleshootingSteps(prompt: string, imageBase64?: string) {
    const ai = getGenAI();
    
    const textPart = { text: prompt };
    const parts: Part[] = [];

    if (imageBase64) {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
            },
        };
        parts.push(imagePart);
    }
    parts.push(textPart);
    
    const troubleshootingPromise = ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: parts },
        config: {
            systemInstruction: "You are a master technician for water treatment plants. Provide clear, step-by-step, safe, and accurate troubleshooting advice. Be thorough. Do not mention that you are searching for videos.",
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });

    return generateContentWithVideos(troubleshootingPromise, prompt);
}


// Section 3: Video Search
export async function searchVideos(query: string) {
    const ai = getGenAI();
    const prompt = `مهمتك هي العثور على ما يصل إلى 3 فيديوهات يوتيوب وثيقة الصلة بالموضوع لفني أو مهندس في محطة معالجة مياه بناءً على استعلامه.

1.  **تحليل استعلام المستخدم**: أولاً، حدد المشكلة الفنية الرئيسية، أو المعدات، أو العملية الكيميائية المذكورة في استعلام المستخدم التالي: "${query}".
2.  **البحث عن الفيديوهات**: استخدم المصطلحات الرئيسية التي حددتها للبحث عن فيديوهات تعليمية وعملية بأسلوب "كيفية التنفيذ".
3.  **أولوية اللغة**: هدفك الأساسي هو العثور على فيديوهات باللغة **العربية**. إذا لم تتمكن من العثور على فيديوهات عربية عالية الجودة وذات صلة، يمكنك تقديم أفضل الفيديوهات المتاحة باللغة **الإنجليزية**.
4.  **التنسيق**: يجب أن ترد **فقط** بقائمة ماركداون تحتوي على روابط الفيديوهات. لا تقم بتضمين أي نص آخر أو شروحات أو مقدمات أو ملخصات.

مثال على التنسيق المطلوب:
- [عنوان الفيديو الأول](https://www.youtube.com/watch?v=...)
- [عنوان الفيديو الثاني](https://www.youtube.com/watch?v=...)`;

     const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const text = response.text.trim();
    const videoResults = text.split('\n')
        .map(line => {
            const match = line.match(/\[(.*?)\]\((.*?)\)/);
            if (match && match[1] && match[2]) {
                return { title: match[1], url: match[2] };
            }
            return null;
        })
        .filter((item): item is { title: string; url: string } => item !== null);

    return videoResults;
}