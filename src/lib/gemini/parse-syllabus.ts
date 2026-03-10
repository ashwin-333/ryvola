import { getGeminiClient } from "./client";

export type SyllabusAssignment = {
  title: string;
  dueDate: string | null;
  type: "assignment" | "exam" | "quiz" | "project" | "paper" | "other";
  weight: string | null;
  tasks: { title: string; estimatedMinutes: number }[];
  totalEstimatedMinutes: number;
};

export type ParsedSyllabus = {
  courseName: string;
  instructor: string | null;
  semester: string | null;
  assignments: SyllabusAssignment[];
  weeklySchedule: string | null;
  gradingBreakdown: string | null;
};

const SYSTEM_PROMPT = `You are Ryvola, an AI study planner. Analyze this course syllabus and extract ALL assignments, exams, quizzes, projects, and deadlines for the entire semester.

Return ONLY valid JSON (no markdown fences, no extra text) with this exact shape:
{
  "courseName": "Full course name and number (e.g. CS 201 Data Structures)",
  "instructor": "Professor name or null",
  "semester": "e.g. Spring 2026 or null",
  "assignments": [
    {
      "title": "Descriptive title (e.g. Problem Set 1: Arrays and Linked Lists)",
      "dueDate": "YYYY-MM-DDTHH:MM" or null if not specified,
      "type": "assignment|exam|quiz|project|paper|other",
      "weight": "Percentage of grade (e.g. 10%) or null",
      "tasks": [
        {"title": "Step description", "estimatedMinutes": 30}
      ],
      "totalEstimatedMinutes": 120
    }
  ],
  "weeklySchedule": "Brief description of recurring weekly commitments (e.g. Lectures MWF 10-11am, Lab Thursdays 2-4pm) or null",
  "gradingBreakdown": "Brief summary of grade weights or null"
}

Guidelines:
- Extract EVERY graded item: homework, problem sets, exams, midterms, finals, projects, papers, presentations, quizzes, labs
- For recurring assignments (e.g. "weekly problem sets"), create individual entries for each one if specific dates are given. If only "weekly" is mentioned, create representative entries for the first few weeks with estimated dates.
- For exams, include study/review tasks in the task breakdown
- For papers, break into research, outline, drafting, editing, proofreading
- For coding projects, break into design, implementation, testing, documentation
- Be realistic with time estimates for a college student
- If a date format in the syllabus is ambiguous, assume the current academic year (2025-2026)
- Preserve the order assignments appear in the syllabus
- If you can't determine exact dates, set dueDate to null and note it in the title`;

export async function parseSyllabusFromImage(
  imageData: Buffer,
  mimeType: string
): Promise<ParsedSyllabus> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const imagePart = {
    inlineData: {
      data: imageData.toString("base64"),
      mimeType,
    },
  };

  const result = await model.generateContent([SYSTEM_PROMPT, imagePart]);
  const text = result.response.text();

  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as ParsedSyllabus;
    return {
      courseName: parsed.courseName || "Unknown Course",
      instructor: parsed.instructor || null,
      semester: parsed.semester || null,
      weeklySchedule: parsed.weeklySchedule || null,
      gradingBreakdown: parsed.gradingBreakdown || null,
      assignments: (parsed.assignments || []).map((a) => ({
        title: a.title || "Untitled",
        dueDate: a.dueDate || null,
        type: a.type || "assignment",
        weight: a.weight || null,
        tasks: (a.tasks || []).map((t) => ({
          title: t.title || "Untitled task",
          estimatedMinutes: t.estimatedMinutes || 30,
        })),
        totalEstimatedMinutes:
          a.totalEstimatedMinutes ||
          (a.tasks || []).reduce(
            (sum, t) => sum + (t.estimatedMinutes || 30),
            0
          ),
      })),
    };
  } catch {
    return {
      courseName: "Could not parse syllabus",
      instructor: null,
      semester: null,
      weeklySchedule: null,
      gradingBreakdown: null,
      assignments: [],
    };
  }
}
