import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/gemini/generate-questions' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { topic, category, difficulty, count = 5, audience = 'students' } = JSON.parse(body || '{}');

              const apiKey = process.env.GEMINI_API_KEY;
              if (!apiKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  error: 'خدمة التوليد غير مهيأة حالياً.'
                }));
                return;
              }

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                  headers: {
                    'User-Agent': 'tanafas-platform',
                  }
                }
              });

              const prompt = `قم بتوليد ${count} أسئلة مسابقة اختيار من متعدد باللغة العربية.
التصنيف: ${category || 'تعليمي'}
الموضوع: ${topic || 'مسابقة عامة'}
الفئة المستهدفة: ${audience === 'teachers' ? 'معلمون (رخصة مهنية / كفايات / مهارات تربوية)' : 'طلاب (منصة مدرستي / مناهج تعليمية)'}
مستوى الصعوبة: ${difficulty || 'متوسط'}

شروط الإجابة:
- كل سؤال يحتوي على 4 خيارات حصرية ودقيقة.
- تحديد مؤشر الإجابة الصحيحة correct_index من 0 إلى 3.
- شرح تربوي موجز للإجابة الصحيحة.
- وقت مناسب لحل السؤال بالثواني (مثلاً من 20 إلى 40 ثانية).`;

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.ARRAY,
                    description: 'قائمة الأسئلة المولدة',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING, description: 'نص السؤال' },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: 'أربعة خيارات للسؤال'
                        },
                        correct_index: { type: Type.INTEGER, description: 'مؤشر الإجابة الصحيحة (0-3)' },
                        duration: { type: Type.INTEGER, description: 'مدة السؤال بالثواني' },
                        explanation: { type: Type.STRING, description: 'توضيح تربوي للإجابة' }
                      },
                      required: ['text', 'options', 'correct_index', 'duration']
                    }
                  }
                }
              });

              const text = response.text || '[]';
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(text);
            } catch (err: any) {
              console.error('Gemini API error:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message || 'فشل توليد الأسئلة' }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: true as const,
    },
  };
});
