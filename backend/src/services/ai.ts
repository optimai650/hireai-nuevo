import axios from 'axios';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

interface CVAnalysisResult {
  name: string;
  email: string;
  phone: string;
  location: string;
  years_experience: number;
  overall_score: number;
  experience_score: number;
  skills_score: number;
  education_score: number;
  cultural_fit_score: number;
  ai_summary: string;
  ai_strengths: string;
  ai_concerns: string;
  extracted_skills: string;
  extracted_experience: string;
  extracted_education: string;
}

interface InterviewQuestion {
  question: string;
  type: string;
  expected_keywords: string;
}

interface ResponseEvaluation {
  score: number;
  feedback: string;
}

interface InterviewEvaluation {
  score: number;
  evaluation: string;
}

function cvFallback(): CVAnalysisResult {
  return {
    name: '',
    email: '',
    phone: '',
    location: '',
    years_experience: 0,
    overall_score: 0,
    experience_score: 0,
    skills_score: 0,
    education_score: 0,
    cultural_fit_score: 0,
    ai_summary: 'Analysis pending',
    ai_strengths: 'Analysis pending',
    ai_concerns: 'Analysis pending',
    extracted_skills: '',
    extracted_experience: '',
    extracted_education: '',
  };
}

async function callOpenRouter(messages: { role: string; content: string }[]): Promise<string> {
  const response = await axios.post(
    `${OPENROUTER_BASE}/chat/completions`,
    {
      model: MODEL,
      messages,
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hireai.app',
        'X-Title': 'HireAI',
      },
      timeout: 30000,
    }
  );
  return response.data.choices[0].message.content as string;
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    // Extract JSON from markdown code blocks if present
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = match ? match[1] : text;
    return JSON.parse(raw.trim()) as T;
  } catch {
    return fallback;
  }
}

export async function analyzeCV(
  cvText: string,
  positionTitle?: string,
  positionRequirements?: string
): Promise<CVAnalysisResult> {
  try {
    const positionContext = positionTitle
      ? `\nPosition: ${positionTitle}\nRequirements: ${positionRequirements || 'Not specified'}`
      : '';

    const prompt = `Analyze the following CV/resume and return a JSON object with candidate information and scores.${positionContext}

CV TEXT:
${cvText.slice(0, 8000)}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "name": "candidate full name or empty string",
  "email": "email or empty string",
  "phone": "phone or empty string",
  "location": "city/country or empty string",
  "years_experience": number,
  "overall_score": number 0-100,
  "experience_score": number 0-100,
  "skills_score": number 0-100,
  "education_score": number 0-100,
  "cultural_fit_score": number 0-100,
  "ai_summary": "2-3 sentence professional summary",
  "ai_strengths": "comma separated strengths",
  "ai_concerns": "comma separated concerns or gaps",
  "extracted_skills": "comma separated technical and soft skills",
  "extracted_experience": "brief summary of work experience",
  "extracted_education": "brief summary of education"
}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const result = parseJSON<CVAnalysisResult>(content, cvFallback());
    // Clamp scores to 0-100
    const scoreFields: (keyof CVAnalysisResult)[] = [
      'overall_score', 'experience_score', 'skills_score', 'education_score', 'cultural_fit_score'
    ];
    for (const field of scoreFields) {
      const val = result[field] as number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as unknown as Record<string, unknown>)[field] = Math.min(100, Math.max(0, Number(val) || 0));
    }
    return result;
  } catch (err) {
    console.error('analyzeCV error:', err);
    return cvFallback();
  }
}

export async function generateInterviewQuestions(
  candidateInfo: Record<string, unknown>,
  positionInfo: Record<string, unknown>,
  type: string,
  numQuestions: number
): Promise<InterviewQuestion[]> {
  try {
    const prompt = `Generate ${numQuestions} interview questions for a ${type} interview.

Candidate info: ${JSON.stringify(candidateInfo)}
Position info: ${JSON.stringify(positionInfo)}

Return ONLY a valid JSON array (no markdown) with this structure:
[
  {
    "question": "the interview question",
    "type": "open|technical|behavioral|situational",
    "expected_keywords": "comma separated keywords that a good answer should include"
  }
]

Make questions relevant to the candidate's background and position requirements.`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const result = parseJSON<InterviewQuestion[]>(content, []);
    if (!Array.isArray(result)) return [];
    return result.slice(0, numQuestions);
  } catch (err) {
    console.error('generateInterviewQuestions error:', err);
    return [];
  }
}

export async function evaluateResponse(
  question: string,
  expectedKeywords: string,
  responseText: string
): Promise<ResponseEvaluation> {
  try {
    const prompt = `Evaluate the following interview response.

Question: ${question}
Expected keywords/concepts: ${expectedKeywords}
Candidate response: ${responseText}

Return ONLY valid JSON (no markdown):
{
  "score": number 0-100,
  "feedback": "brief constructive feedback on the response"
}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const result = parseJSON<ResponseEvaluation>(content, { score: 0, feedback: 'Analysis pending' });
    result.score = Math.min(100, Math.max(0, Number(result.score) || 0));
    return result;
  } catch (err) {
    console.error('evaluateResponse error:', err);
    return { score: 0, feedback: 'Analysis pending' };
  }
}

export async function evaluateInterview(
  questions: { question: string; expected_keywords: string }[],
  responses: { response_text: string; response_score: number }[]
): Promise<InterviewEvaluation> {
  try {
    const avgScore =
      responses.length > 0
        ? responses.reduce((sum, r) => sum + (r.response_score || 0), 0) / responses.length
        : 0;

    const qa = questions.map((q, i) => ({
      question: q.question,
      response: responses[i]?.response_text || '(no answer)',
      score: responses[i]?.response_score || 0,
    }));

    const prompt = `Evaluate this complete interview and provide an overall assessment.

Interview Q&A:
${JSON.stringify(qa, null, 2)}

Average question score: ${avgScore.toFixed(1)}

Return ONLY valid JSON (no markdown):
{
  "score": number 0-100 (overall interview score),
  "evaluation": "2-4 sentences overall evaluation of the candidate's interview performance"
}`;

    const content = await callOpenRouter([{ role: 'user', content: prompt }]);
    const result = parseJSON<InterviewEvaluation>(content, { score: avgScore, evaluation: 'Analysis pending' });
    result.score = Math.min(100, Math.max(0, Number(result.score) || avgScore));
    return result;
  } catch (err) {
    console.error('evaluateInterview error:', err);
    const avg =
      responses.length > 0
        ? responses.reduce((sum, r) => sum + (r.response_score || 0), 0) / responses.length
        : 0;
    return { score: avg, evaluation: 'Analysis pending' };
  }
}
