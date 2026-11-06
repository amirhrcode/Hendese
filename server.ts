import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '5mb' }));

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint 1: Complex Geometry Proof & Deep Reasoning (gemini-4-argon with High Thinking)
app.post('/api/gemini/think', async (req, res) => {
  try {
    const { prompt, chapterContext } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'لطفاً صورت مسئله یا پرسش هندسی را وارد کنید.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        offlineFallback: true,
        error: 'کلید API تنظیم نشده است؛ پاسخ از موتور استدلال آفلاین کتاب هندسه ۱ تولید شد.',
      });
      return;
    }

    const systemInstruction =
      'تو یک دبیر برجسته هندسه پایه دهم (رشته ریاضی و فیزیک) هستی. مسائل و قضایای کتاب هندسه ۱ (ترسیم‌های هندسی، استقرا و استنتاج، برهان خلف، مثال نقض، قضیه تالس، تشابه مثلث‌ها، چندضلعی‌ها، مساحت، فرمول پیک، و تجسم فضایی) را گام‌به‌گام با نوشتن دقیق «فرض»، «حکم» و «مراحل اثبات» به زبان فارسی سلیس و علمی توضیح بده.';

    const fullContents = chapterContext
      ? `زمینه درس: ${chapterContext}\n\nپرسش دانش‌آموز یا دبیر: ${prompt}`
      : prompt;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: fullContents,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });
      res.json({
        text: response.text ?? '',
        modelUsed: 'gemini-4-argon (High Thinking)',
      });
    } catch (innerErr: unknown) {
      // Fallback to gemini-3.8-flash with HIGH thinking if user declined paid API key for gemini-4-argon
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullContents,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });
      res.json({
        text: fallbackResponse.text ?? '',
        modelUsed: 'gemini-3.8-flash (High Thinking)',
        note: innerErr instanceof Error ? innerErr.message : undefined,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'خطا در ارتباط با سرور هوش مصنوعی';
    res.status(500).json({ error: message, offlineFallback: true });
  }
});

// Endpoint 2: Google Search Grounding (gemini-3.8-flash with googleSearch tool)
app.post('/api/gemini/search', async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'لطفاً عبارت جستجو را وارد کنید.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        offlineFallback: true,
        error: 'کلید API در دسترس نیست؛ نمایش نتایج از پایگاه دانش محلی هندسه ۱.',
      });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `درباره این موضوع هندسی یا ریاضی اطلاعات دقیق، کاربردهای واقعی و تاریخی و منابع آموزشی معتبر ارائه بده: ${query}`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c: { web?: { uri?: string; title?: string } }) =>
        c.web?.uri ? { uri: c.web.uri, title: c.web.title || c.web.uri } : null
      )
      .filter(Boolean);

    res.json({
      text: response.text ?? '',
      sources,
      modelUsed: 'gemini-3.8-flash + Google Search',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'خطا در جستجوی وب';
    res.status(500).json({ error: message, offlineFallback: true });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`HendeseNegar server listening on http://localhost:${port}`);
  });
}

startServer();
