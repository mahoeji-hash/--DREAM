import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Lazy initializer for Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment. AI features will fallback gracefully.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Question Solver endpoint for "모르는 문제가 있어요!" (Photo or Text)
app.post('/api/solve-question', async (req, res) => {
  try {
    const { imageBase64, mimeType, questionText, subject, grade } = req.body;

    if (!imageBase64 && !questionText) {
      return res.status(400).json({ error: '문제 사진이나 텍스트를 입력해주세요.' });
    }

    const ai = getAI();

    const systemInstruction = `당신은 대한민국 중·고등학교 학생들을 위한 친절하고 명쾌한 수학/과학 튜터 '풀어 DREAM'의 마스코트 선생님입니다.
학생들이 교과서, 익힘책, 문제집에서 모르는 문제를 사진으로 찍거나 적어 올렸을 때, 학생들이 스스로 원리를 깨우칠 수 있도록 쉽고 친절하며 단계별로 자세하게 설명해줍니다.

반드시 다음 JSON 형식에 맞추어 응답하세요:
- subject: '수학' 또는 '과학'
- problemTitle: 문제의 핵심 주제나 단원 (예: '이차방정식의 근과 계수의 관계', '뉴턴 제2법칙 (가속도 법칙)')
- extractedProblemText: 사진이나 텍스트에서 인식한 실제 문제 내용
- summary: 문제의 핵심 포인트 1-2문장 요약
- steps: 단계별 풀이 과정 배열 (각 항목: { stepNumber: number, title: string, explanation: string, formulaOrKey: string })
- finalAnswer: 최종 정답 (깔끔하고 명확한 수식/답)
- dreamTip: '풀어 DREAM' 마스코트 친구가 전하는 특별 꿀팁 (시험에 자주 나오는 함정, 계산 실수 줄이는 비법, 실생활 비유 등)
- keyConcepts: 이 문제를 풀기 위해 꼭 알아야 하는 핵심 공식이나 개념 태그 목록 (예: ['근의 공식', '판별식 D', '인수분해'])

어투는 학생에게 친근하고 다정한 존댓말(해요체)로 작성하며, 특수문자나 줄바꿈, 수식 표현을 읽기 편하게 정리해주세요.`;

    const parts: any[] = [];

    if (imageBase64) {
      // Clean base64 string if it contains data URI header
      const cleanedBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanedBase64,
        },
      });
    }

    const promptText = `[과목]: ${subject || '수학/과학'}
[학년/과정]: ${grade || '중·고등학교'}
[사용자 입력 설명/질문]: ${questionText || '첨부된 사진 속 문제를 정확하게 분석하고 단계별 풀이를 제공해주세요.'}

위 문제의 사진(또는 텍스트)을 분석하여 학생들이 완벽히 이해할 수 있는 단계별 풀이를 JSON으로 생성해주세요.`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            problemTitle: { type: Type.STRING },
            extractedProblemText: { type: Type.STRING },
            summary: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  formulaOrKey: { type: Type.STRING },
                },
                required: ['stepNumber', 'title', 'explanation'],
              },
            },
            finalAnswer: { type: Type.STRING },
            dreamTip: { type: Type.STRING },
            keyConcepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['problemTitle', 'extractedProblemText', 'summary', 'steps', 'finalAnswer', 'dreamTip'],
        },
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error in /api/solve-question:', error);
    res.status(500).json({
      error: '문제를 분석하는 도중 오류가 발생했습니다.',
      details: error.message || String(error),
    });
  }
});

// Follow-up chat endpoint for questions
app.post('/api/ask-followup', async (req, res) => {
  try {
    const { problemContext, userQuestion, history } = req.body;

    if (!userQuestion) {
      return res.status(400).json({ error: '질문 내용을 입력해주세요.' });
    }

    const ai = getAI();

    const systemInstruction = `당신은 '풀어 DREAM'의 다정하고 똑똑한 학습 튜터입니다.
학생이 이전에 푼 문제에 대해 추가 질문이나 이해가 안 가는 점을 물어봤습니다.
학생의 눈높이에 맞춰 친절하고 이해하기 쉽게 설명해주세요.
이모지와 쉬운 비유를 곁들여 용기를 북돋아주세요.`;

    const prompt = `[이전 문제 문맥]:
문제: ${problemContext?.problemTitle || ''}
내용: ${problemContext?.extractedProblemText || ''}
정답: ${problemContext?.finalAnswer || ''}

[학생의 추가 질문]:
"${userQuestion}"

위 질문에 대해 학생이 명쾌하게 이해할 수 있도록 친절히 답변해주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    res.json({
      success: true,
      answer: response.text || '이해하기 쉬운 설명을 준비 중이에요. 다시 한 번 질문해주세요!',
    });
  } catch (error: any) {
    console.error('Error in /api/ask-followup:', error);
    res.status(500).json({
      error: '답변을 생성하는 도중 오류가 발생했습니다.',
      details: error.message || String(error),
    });
  }
});

// Start Express server and mount Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`풀어 DREAM Server running on http://localhost:${PORT}`);
  });
}

startServer();
