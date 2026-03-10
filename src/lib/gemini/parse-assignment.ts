import { getGeminiClient } from "./client";

export type ParsedTask = {
  title: string;
  estimatedMinutes: number;
};

export type ParsedAssignment = {
  title: string;
  deliverables: string[];
  requirements: string[];
  tasks: ParsedTask[];
  totalEstimatedMinutes: number;
};

const SYSTEM_PROMPT = `You are Ryvola, an AI study planner. Analyze this assignment screenshot/image and extract a structured plan.

Return ONLY valid JSON (no markdown fences, no extra text) with this exact shape:
{
  "title": "Short descriptive title for the assignment",
  "deliverables": ["List of what needs to be turned in"],
  "requirements": ["Key requirements, constraints, or rubric criteria"],
  "tasks": [
    {"title": "Step-by-step task description", "estimatedMinutes": 30}
  ],
  "totalEstimatedMinutes": 120
}

Guidelines:
- Break the work into actionable steps a student can check off
- Be specific in task titles (e.g. "Read Chapter 5 sections 5.1-5.3" not "Read chapter")
- Estimate time realistically for a college student
- Order tasks in the sequence they should be done
- Include research, drafting, editing, and review as separate steps for papers
- Include testing and debugging as separate steps for code assignments
- If you can't read the image clearly, give your best interpretation and note any uncertainty in the title`;

export async function parseAssignmentFromImage(
  imageData: Buffer,
  mimeType: string
): Promise<ParsedAssignment> {
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
    const parsed = JSON.parse(cleaned) as ParsedAssignment;
    return {
      title: parsed.title || "Untitled Assignment",
      deliverables: parsed.deliverables || [],
      requirements: parsed.requirements || [],
      tasks: (parsed.tasks || []).map((t) => ({
        title: t.title || "Untitled task",
        estimatedMinutes: t.estimatedMinutes || 30,
      })),
      totalEstimatedMinutes:
        parsed.totalEstimatedMinutes ||
        (parsed.tasks || []).reduce(
          (sum, t) => sum + (t.estimatedMinutes || 30),
          0
        ),
    };
  } catch {
    return {
      title: "Assignment (could not fully parse)",
      deliverables: [],
      requirements: [],
      tasks: [
        { title: "Review assignment prompt manually", estimatedMinutes: 15 },
      ],
      totalEstimatedMinutes: 15,
    };
  }
}
