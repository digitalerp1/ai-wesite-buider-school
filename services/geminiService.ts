import { GoogleGenAI } from "@google/genai";
import type { GeminiModel } from '../types';

let ai: GoogleGenAI;
let currentApiKey: string | null = null;

const SEPARATOR = "_|||_";

function getAiClient(): GoogleGenAI {
    const apiKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API Key not found. Please set it in the settings.");
    }

    if (ai && apiKey === currentApiKey) {
        return ai;
    }

    currentApiKey = apiKey;
    ai = new GoogleGenAI({ apiKey });
    return ai;
}


const GENERATE_SYSTEM_INSTRUCTION = `You are an expert web developer specializing in creating beautiful, single-page websites using HTML and Tailwind CSS.
Your task is to generate a complete, self-contained HTML file based on the user's prompt.

**Requirements:**
1.  **Single File:** The entire output must be a single HTML file.
2.  **Tailwind CSS:** You MUST include the Tailwind CSS CDN script \`<script src="https://cdn.tailwindcss.com"></script>\` in the \`<head>\`. All styling must be done using Tailwind utility classes directly in the HTML elements. Do not use \`<style>\` blocks or external CSS files.
3.  **Content:** Use relevant placeholder text. For images, use \`https://picsum.photos/\` with appropriate dimensions (e.g., https://picsum.photos/1200/800).
4.  **Structure:** Use semantic HTML5 tags (\`<header>\`, \`<main>\`, \`<footer>\`, \`<section>\`, \`<nav>\`, etc.). Ensure the design is modern, visually appealing, and responsive.
5.  **Response Format:** Your response must be ONLY the raw HTML code. Do NOT wrap it in Markdown code blocks (like \`\`\`html) or provide any explanations. Start your response directly with \`<!DOCTYPE html>\` and end it with \`</html>\`.
`;

const EDIT_SYSTEM_INSTRUCTION = `You are an expert web developer editing an existing HTML file that uses Tailwind CSS. The user has provided the full current HTML and a request to modify it.

Your task is to identify the precise block of HTML corresponding to the user's request and provide the new HTML to replace it.

**Your response MUST be in the following format and nothing else:**
1.  The exact, original block of HTML to be replaced. This must be a contiguous substring of the original document.
2.  Followed by the exact separator string: "${SEPARATOR}"
3.  Followed by the new block of HTML code that will replace the original.

Do NOT include any other text, explanations, or markdown formatting. Your entire output must follow this 'original_html${SEPARATOR}new_html' structure.
`;


async function* streamToGenerator(stream: AsyncGenerator<any>) {
    for await (const chunk of stream) {
        yield chunk.text;
    }
}

export async function generateWebsiteCodeStream(prompt: string, model: GeminiModel): Promise<AsyncGenerator<string>> {
  try {
    const responseStream = await getAiClient().models.generateContentStream({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: GENERATE_SYSTEM_INSTRUCTION,
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
      }
    });
    return streamToGenerator(responseStream);
  } catch (error) {
    console.error("Error generating website code:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate website code. Details: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
}

export type EditRequest = {
    type: 'element';
    selector: string;
    prompt: string;
} | {
    type: 'text';
    selector: string;
    originalText: string;
    newText: string;
};

export async function* streamWebsiteEdit(currentHtml: string, editRequest: EditRequest, model: GeminiModel): AsyncGenerator<string> {
    let editPrompt: string;

    if (editRequest.type === 'element') {
        editPrompt = `The user wants to edit the element identified by the CSS selector: \`${editRequest.selector}\`. The user's instruction is: "${editRequest.prompt}"`;
    } else {
        editPrompt = `The user wants to edit text within the element identified by the CSS selector: \`${editRequest.selector}\`. The original text is: "${editRequest.originalText}". The new text should be: "${editRequest.newText}". Please replace the text while preserving the surrounding HTML structure.`;
    }

    const fullPrompt = `
Here is the current HTML of the website:
\`\`\`html
${currentHtml}
\`\`\`

${editPrompt}

Please apply this change and return the response in the required 'original_html${SEPARATOR}new_html' format.
`;

    try {
        const responseStream = await getAiClient().models.generateContentStream({
            model: model,
            contents: fullPrompt,
            config: {
                systemInstruction: EDIT_SYSTEM_INSTRUCTION,
                temperature: 0.5,
                topP: 0.95,
                topK: 64,
            }
        });

        let buffer = '';
        let separatorFound = false;

        for await (const chunk of responseStream) {
            if (separatorFound) {
                yield chunk.text;
                continue;
            }
            
            buffer += chunk.text;
            const separatorIndex = buffer.indexOf(SEPARATOR);

            if (separatorIndex !== -1) {
                separatorFound = true;
                const originalHtmlBlock = buffer.substring(0, separatorIndex);
                const remaining = buffer.substring(separatorIndex + SEPARATOR.length);
                yield originalHtmlBlock;
                if (remaining) {
                    yield remaining;
                }
            }
        }

        if (!separatorFound) {
            console.error("Separator not found in AI response", buffer);
            throw new Error("Could not apply edit. The AI returned an invalid response format.");
        }

    } catch (error) {
        console.error("Error streaming website edit:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get edit stream. Details: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the Gemini API.");
    }
}
