import type { GeneratedQuestionItem } from './curatedQuestions.ts';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export async function generateQuestionsWithGroqModel(
  apiKey: string,
  model: string,
  prompt: string,
  expectedCount: number
): Promise<GeneratedQuestionItem[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `أنت مساعد تربوي خبير في صياغة أسئلة المسابقات التعليمية باللغة العربية.
يجب أن ترجع الإجابة حصراً بصيغة JSON Array فقط، دون أي مقدمات أو شروحات إضافية ودون كتل markdown.
الهيكل المطلوب لكل عنصر:
{
  "text": "نص السؤال",
  "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
  "correct_index": 0,
  "duration": 30,
  "explanation": "شرح تربوي موجز"
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn(`[Groq API Notice] Model ${model} returned HTTP ${res.status}: ${errBody.slice(0, 150)}`);
      return null;
    }

    const data = (await res.json()) as GroqChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    if (!content) {
      console.warn(`[Groq API Notice] Empty content from model ${model}`);
      return null;
    }

    // Clean markdown code blocks if model included them
    let cleaned = content;
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Find JSON array substring if model wrote text before/after
    const startIdx = cleaned.indexOf('[');
    const endIdx = cleaned.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }

    const parsed = JSON.parse(cleaned);
    let items: any[] = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && Array.isArray(parsed.questions)) {
      items = parsed.questions;
    }

    if (items.length === 0) {
      return null;
    }

    // Validate and sanitize questions
    const validQuestions: GeneratedQuestionItem[] = items
      .filter(item => item && typeof item.text === 'string' && Array.isArray(item.options) && item.options.length >= 2)
      .map(item => ({
        text: String(item.text).trim(),
        options: item.options.slice(0, 4).map((o: any) => String(o).trim()),
        correct_index: Math.max(0, Math.min(Number(item.correct_index) || 0, item.options.length - 1)),
        duration: Math.max(15, Math.min(Number(item.duration) || 30, 90)),
        explanation: String(item.explanation || 'إجابة صحيحة وفق المعايير التعليمية').trim()
      }));

    if (validQuestions.length > 0) {
      console.log(`✅ [Groq] Successfully generated ${validQuestions.length} questions using model: ${model}`);
      return validQuestions.slice(0, expectedCount);
    }

    return null;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[Groq API Warning] Error with model ${model}:`, err?.name === 'AbortError' ? 'Timeout (18s)' : err.message);
    return null;
  }
}

export async function tryGroqFallbackChain(
  prompt: string,
  expectedCount: number
): Promise<{ questions: GeneratedQuestionItem[]; modelUsed: string } | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  const cleanKey = apiKey.trim();

  const questionsM1 = await generateQuestionsWithGroqModel(cleanKey, 'openai/gpt-oss-120b', prompt, expectedCount);
  if (questionsM1 && questionsM1.length > 0) {
    return { questions: questionsM1, modelUsed: 'openai/gpt-oss-120b' };
  }

  const questionsM2 = await generateQuestionsWithGroqModel(cleanKey, 'qwen/qwen3.6-27b', prompt, expectedCount);
  if (questionsM2 && questionsM2.length > 0) {
    return { questions: questionsM2, modelUsed: 'qwen/qwen3.6-27b' };
  }

  return null;
}
