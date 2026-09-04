import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

import { askAi } from "../services/openRouter.service.js";
import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";


// ============================================================
// ANALYZE RESUME
// ============================================================

export const analyzeResume = async (req, res) => {
  let filepath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Resume required"
      });
    }

    filepath = req.file.path;

    const fileBuffer = await fs.promises.readFile(filepath);
    const uint8Array = new Uint8Array(fileBuffer);

    const pdf = await pdfjsLib
      .getDocument({ data: uint8Array })
      .promise;

    let resumeText = "";

    // Extract text from all pages
    for (
      let pageNum = 1;
      pageNum <= pdf.numPages;
      pageNum++
    ) {
      const page = await pdf.getPage(pageNum);

      const content = await page.getTextContent();

      const pageText = content.items
        .map((item) => item.str)
        .join(" ");

      resumeText += pageText + "\n";
    }

    resumeText = resumeText
      .replace(/\s+/g, " ")
      .trim();

    if (!resumeText) {
      return res.status(400).json({
        message: "Could not extract text from resume."
      });
    }

    // --------------------------------------------------------
    // Resume AI analysis
    // --------------------------------------------------------

    const messages = [
      {
        role: "system",
        content: `
You are a resume parser.

Extract structured information from the provided resume.

Return ONLY valid JSON.

Use exactly this structure:

{
  "role": "string",
  "experience": "string",
  "projects": [
    "project1",
    "project2"
  ],
  "skills": [
    "skill1",
    "skill2"
  ]
}

Rules:

- Extract only information actually present in the resume.
- Do not invent information.
- Keep project names and technologies accurate.
- If something is unavailable, return an empty string or empty array.
`
      },
      {
        role: "user",
        content: resumeText
      }
    ];

    const aiResponse = await askAi(messages);

    if (!aiResponse || !aiResponse.trim()) {
      return res.status(500).json({
        message: "AI returned empty response."
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(aiResponse);
    } catch (error) {
      console.error("Resume JSON parsing error:", error);
      console.error("AI response:", aiResponse);

      return res.status(500).json({
        message: "AI returned invalid resume data."
      });
    }

    return res.status(200).json({
      role: parsed.role || "",
      experience: parsed.experience || "",
      projects: Array.isArray(parsed.projects)
        ? parsed.projects
        : [],
      skills: Array.isArray(parsed.skills)
        ? parsed.skills
        : [],
      resumeText
    });

  } catch (error) {
    console.error("Resume analysis error:", error);

    return res.status(500).json({
      message: `Failed to analyze resume: ${error.message}`
    });

  } finally {

    // --------------------------------------------------------
    // Always delete uploaded resume
    // --------------------------------------------------------

    if (filepath && fs.existsSync(filepath)) {
      try {
        await fs.promises.unlink(filepath);
      } catch (deleteError) {
        console.error(
          "Failed to delete uploaded resume:",
          deleteError
        );
      }
    }
  }
};


// ============================================================
// GENERATE INTERVIEW QUESTIONS
// ============================================================

export const generateQuestion = async (req, res) => {
  try {

    let {
      role,
      experience,
      mode,
      resumeText,
      projects,
      skills
    } = req.body;

    // --------------------------------------------------------
    // Clean input
    // --------------------------------------------------------

    role = role?.trim();
    experience = experience?.trim();
    mode = mode?.trim();

    // --------------------------------------------------------
    // Validate input
    // --------------------------------------------------------

    if (!role || !experience || !mode) {
      return res.status(400).json({
        message: "Role, Experience and Mode are required."
      });
    }

    // --------------------------------------------------------
    // Find user
    // --------------------------------------------------------

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    // --------------------------------------------------------
    // Check credits
    // --------------------------------------------------------

    if (user.credits < 50) {
      return res.status(400).json({
        message: "Not enough credits. Minimum 50 required."
      });
    }

    // --------------------------------------------------------
    // Prepare resume data
    // --------------------------------------------------------

    const projectText =
      Array.isArray(projects) && projects.length > 0
        ? projects.join(", ")
        : "None";

    const skillsText =
      Array.isArray(skills) && skills.length > 0
        ? skills.join(", ")
        : "None";

    const safeResume =
      resumeText?.trim() || "None";

    // --------------------------------------------------------
    // User prompt
    // --------------------------------------------------------

    const userPrompt = `
Role:
${role}

Experience:
${experience}

Interview Mode:
${mode}

Projects:
${projectText}

Skills:
${skillsText}

Resume:
${safeResume}
`;

    // --------------------------------------------------------
    // AI prompt
    // --------------------------------------------------------

    const messages = [
      {
        role: "system",
        content: `
You are a professional human interviewer conducting a realistic interview.

Speak in simple, natural English as if you are directly talking to the candidate.

Generate exactly 10 interview questions.

IMPORTANT RULES:

- Generate exactly 10 questions.
- Do not generate fewer than 10.
- Do not generate more than 10.
- Questions must be realistic and practical.
- Questions must match the candidate's role and experience.
- Questions must be based on the provided resume, projects and skills.
- Do not invent projects, technologies, companies or experience.
- Avoid repetitive questions.
- Test actual understanding rather than memorization.
- Use simple conversational English.
- Each question should normally contain 10 to 25 words.
- Each question must be a complete sentence.

QUESTION PROGRESSION:

Q1:
Difficulty: easy
Category: technical fundamentals

Ask about an important fundamental technical concept related to the candidate's role.

Q2:
Difficulty: easy
Category: project

Ask about one specific project or experience from the candidate's resume.

Q3:
Difficulty: easy
Category: technical

Ask another important technical question related to the candidate's listed skills.

Q4:
Difficulty: medium
Category: project

Ask how the candidate implemented or handled something in one of their projects.

Q5:
Difficulty: medium
Category: implementation

Ask how the candidate would implement a realistic technical requirement.

Q6:
Difficulty: medium
Category: problem-solving

Present a realistic technical problem and ask how the candidate would solve it.

Q7:
Difficulty: medium
Category: troubleshooting

Ask how the candidate would debug or troubleshoot a realistic technical issue.

Q8:
Difficulty: hard
Category: technical reasoning

Ask a deeper technical question that requires the candidate to explain why a particular approach should be used.

Q9:
Difficulty: hard
Category: architecture

Ask a realistic architecture, system design, scalability or design-decision question appropriate for the candidate's experience.

Q10:
Difficulty: hard
Category: trade-offs

Ask a challenging question involving optimization, scalability, reliability, architecture or technical trade-offs.

RESUME USAGE:

- At least 3 questions should clearly reference the candidate's projects, skills or experience.
- Do not repeatedly ask about the same project detail.
- Do not invent technologies.
- Adjust difficulty according to the candidate's experience.

INTERVIEW MODE:

Technical:
Focus mainly on technical knowledge, implementation, troubleshooting and reasoning.

HR:
Focus mainly on communication, behavioral situations, experience and workplace scenarios.

Mixed:
Balance technical, project, problem-solving and behavioral questions.

OUTPUT:

Return ONLY valid JSON.

Do not return Markdown.
Do not return explanations.
Do not return text outside JSON.

Use exactly this structure:

{
  "questions": [
    {
      "question": "string",
      "difficulty": "easy",
      "category": "technical"
    },
    {
      "question": "string",
      "difficulty": "easy",
      "category": "project"
    },
    {
      "question": "string",
      "difficulty": "easy",
      "category": "technical"
    },
    {
      "question": "string",
      "difficulty": "medium",
      "category": "project"
    },
    {
      "question": "string",
      "difficulty": "medium",
      "category": "implementation"
    },
    {
      "question": "string",
      "difficulty": "medium",
      "category": "problem-solving"
    },
    {
      "question": "string",
      "difficulty": "medium",
      "category": "troubleshooting"
    },
    {
      "question": "string",
      "difficulty": "hard",
      "category": "technical"
    },
    {
      "question": "string",
      "difficulty": "hard",
      "category": "architecture"
    },
    {
      "question": "string",
      "difficulty": "hard",
      "category": "trade-offs"
    }
  ]
}
`
      },
      {
        role: "user",
        content: userPrompt
      }
    ];

    // --------------------------------------------------------
    // Ask AI
    // --------------------------------------------------------

    const aiResponse = await askAi(messages);

    if (!aiResponse || !aiResponse.trim()) {
      return res.status(500).json({
        message: "AI returned empty response."
      });
    }

    // --------------------------------------------------------
    // Parse AI JSON
    // --------------------------------------------------------

    let parsed;

    try {
      parsed = JSON.parse(aiResponse);
    } catch (error) {

      console.error(
        "Question JSON parsing error:",
        error
      );

      console.error(
        "AI response:",
        aiResponse
      );

      return res.status(500).json({
        message: "AI returned invalid question format."
      });
    }

    // --------------------------------------------------------
    // Validate questions
    // --------------------------------------------------------

    if (
      !parsed.questions ||
      !Array.isArray(parsed.questions)
    ) {
      return res.status(500).json({
        message: "AI did not return questions."
      });
    }

    if (parsed.questions.length !== 10) {
      return res.status(500).json({
        message:
          "AI failed to generate exactly 10 questions."
      });
    }

    // --------------------------------------------------------
    // Interview configuration
    // --------------------------------------------------------

    const difficulties = [
      "easy",
      "easy",
      "easy",
      "medium",
      "medium",
      "medium",
      "medium",
      "hard",
      "hard",
      "hard"
    ];

    const categories = [
      "technical",
      "project",
      "technical",
      "project",
      "implementation",
      "problem-solving",
      "troubleshooting",
      "technical",
      "architecture",
      "trade-offs"
    ];

    const timeLimits = [
      60,   // Q1
      60,   // Q2
      60,   // Q3
      90,   // Q4
      90,   // Q5
      90,   // Q6
      90,   // Q7
      120,  // Q8
      120,  // Q9
      120   // Q10
    ];

    // --------------------------------------------------------
    // Validate every question
    // --------------------------------------------------------

    const invalidQuestion =
      parsed.questions.some((item) => {

        if (!item) {
          return true;
        }

        if (
          typeof item.question !== "string" ||
          !item.question.trim()
        ) {
          return true;
        }

        return false;
      });

    if (invalidQuestion) {
      return res.status(500).json({
        message: "AI generated invalid questions."
      });
    }

    // --------------------------------------------------------
    // Deduct credits
    // --------------------------------------------------------

    user.credits -= 50;

    await user.save();

    // --------------------------------------------------------
    // Create interview
    // --------------------------------------------------------

    const interview = await Interview.create({

      userId: user._id,

      role,

      experience,

      mode,

      resumeText: safeResume,

      questions:
        parsed.questions.map((item, index) => ({

          question:
            item.question.trim(),

          difficulty:
            difficulties[index],

          category:
            categories[index],

          timeLimit:
            timeLimits[index],

          answer: "",

          score: 0,

          confidence: 0,

          communication: 0,

          correctness: 0,

          feedback: ""
        }))
    });

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({

      interviewId:
        interview._id,

      creditsLeft:
        user.credits,

      userName:
        user.name,

      questions:
        interview.questions
    });

  } catch (error) {

    console.error(
      "Generate interview error:",
      error
    );

    return res.status(500).json({
      message:
        `Failed to create interview: ${error.message}`
    });
  }
};


// ============================================================
// SUBMIT ANSWER
// ============================================================

export const submitAnswer = async (req, res) => {

  try {

    const {
      interviewId,
      questionIndex,
      answer,
      timeTaken
    } = req.body;

    // --------------------------------------------------------
    // Validate interview ID
    // --------------------------------------------------------

    if (!interviewId) {
      return res.status(400).json({
        message: "Interview ID is required."
      });
    }

    // --------------------------------------------------------
    // Validate question index
    // --------------------------------------------------------

    if (
      questionIndex === undefined ||
      questionIndex === null ||
      !Number.isInteger(
        Number(questionIndex)
      )
    ) {
      return res.status(400).json({
        message: "Invalid question index."
      });
    }

    const index =
      Number(questionIndex);

    // --------------------------------------------------------
    // Find user's interview
    // --------------------------------------------------------

    const interview =
      await Interview.findOne({
        _id: interviewId,
        userId: req.userId
      });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found."
      });
    }

    // --------------------------------------------------------
    // Check interview status
    // --------------------------------------------------------

    if (
      interview.status === "completed"
    ) {
      return res.status(400).json({
        message:
          "Interview is already completed."
      });
    }

    // --------------------------------------------------------
    // Validate question index
    // --------------------------------------------------------

    if (
      index < 0 ||
      index >= interview.questions.length
    ) {
      return res.status(400).json({
        message: "Invalid question index."
      });
    }

    const question =
      interview.questions[index];

    // --------------------------------------------------------
    // Prevent duplicate answer
    // --------------------------------------------------------

    if (
      question.answer &&
      question.answer.trim()
    ) {
      return res.status(400).json({
        message:
          "This question has already been answered."
      });
    }

    // --------------------------------------------------------
    // No answer
    // --------------------------------------------------------

    if (
      !answer ||
      !answer.trim()
    ) {

      question.answer = "";

      question.score = 0;

      question.feedback =
        "No answer submitted for this question.";

      await interview.save();

      return res.status(200).json({

        feedback:
          question.feedback,

        score: 0
      });
    }

    // --------------------------------------------------------
    // Check time
    // --------------------------------------------------------

    const numericTime =
      Number(timeTaken);

    if (
      Number.isFinite(numericTime) &&
      numericTime > question.timeLimit
    ) {

      question.answer =
        answer.trim();

      question.score = 0;

      question.feedback =
        "Time limit exceeded. Answer was not evaluated.";

      await interview.save();

      return res.status(200).json({

        feedback:
          question.feedback,

        score: 0
      });
    }

    // --------------------------------------------------------
    // AI Evaluation
    // --------------------------------------------------------

    const messages = [

      {
        role: "system",

        content: `
You are a professional human interviewer evaluating a candidate's answer.

Evaluate the answer fairly and realistically.

Score every category from 0 to 10.

1. Technical Accuracy
- Is the technical information correct?
- Are concepts explained accurately?

2. Relevance
- Does the answer directly address the question?
- Does the candidate avoid unrelated information?

3. Communication
- Is the answer understandable?
- Is the explanation structured and clear?
- Do not heavily penalize minor grammar mistakes.

4. Completeness
- Does the candidate cover the important parts?
- Does the answer contain enough explanation for the question?

SCORING:

0-2 = Very poor
3-4 = Weak
5-6 = Partially correct
7-8 = Good
9-10 = Excellent

IMPORTANT:

- Technical accuracy is the most important factor.
- Do not give high scores simply because the answer is long.
- Do not penalize short answers if they correctly answer the question.
- Do not invent information.
- Be realistic and unbiased.
- Focus on what the candidate actually said.

FINAL SCORE:

Calculate using:

Technical Accuracy × 0.40
+
Relevance × 0.25
+
Communication × 0.20
+
Completeness × 0.15

Return the individual scores.

Feedback:

- 15 to 30 words.
- Sound like natural interviewer feedback.
- Mention a specific strength or weakness.
- Give an actionable improvement when appropriate.
- Do not repeat the question.
- Do not explain the scoring system.

Strengths:
Provide 1 or 2 specific strengths.

Improvements:
Provide 1 or 2 specific improvements.

Return ONLY valid JSON.

Use exactly this structure:

{
  "technicalAccuracy": 8,
  "relevance": 8,
  "communication": 7,
  "completeness": 8,
  "strengths": [
    "string"
  ],
  "improvements": [
    "string"
  ],
  "feedback": "string"
}
`
      },

      {
        role: "user",

        content: `
Question:

${question.question}

Candidate Answer:

${answer}
`
      }

    ];

    const aiResponse =
      await askAi(messages);

    if (
      !aiResponse ||
      !aiResponse.trim()
    ) {
      return res.status(500).json({
        message:
          "AI returned empty evaluation."
      });
    }

    // --------------------------------------------------------
    // Parse AI response
    // --------------------------------------------------------

    let parsed;

    try {

      parsed =
        JSON.parse(aiResponse);

    } catch (error) {

      console.error(
        "Evaluation JSON parsing error:",
        error
      );

      console.error(
        "AI response:",
        aiResponse
      );

      return res.status(500).json({
        message:
          "AI returned invalid evaluation format."
      });
    }

    // --------------------------------------------------------
    // Validate and clamp scores
    // --------------------------------------------------------

    const technicalAccuracy =
      Math.max(
        0,
        Math.min(
          10,
          Number(parsed.technicalAccuracy) || 0
        )
      );

    const relevance =
      Math.max(
        0,
        Math.min(
          10,
          Number(parsed.relevance) || 0
        )
      );

    const communication =
      Math.max(
        0,
        Math.min(
          10,
          Number(parsed.communication) || 0
        )
      );

    const completeness =
      Math.max(
        0,
        Math.min(
          10,
          Number(parsed.completeness) || 0
        )
      );

    // --------------------------------------------------------
    // Calculate final score in backend
    // --------------------------------------------------------

    const finalScore =
      technicalAccuracy * 0.40 +
      relevance * 0.25 +
      communication * 0.20 +
      completeness * 0.15;

    const roundedScore =
      Number(
        finalScore.toFixed(1)
      );

    // --------------------------------------------------------
    // Save answer
    // --------------------------------------------------------

    question.answer =
      answer.trim();

    /*
      Existing schema fields are being reused here.

      correctness    -> technicalAccuracy
      communication  -> communication
      confidence     -> completeness

      Later you can rename these fields
      in your Mongoose schema.
    */

    question.correctness =
      technicalAccuracy;

    question.communication =
      communication;

    question.confidence =
      completeness;

    question.score =
      roundedScore;

    question.feedback =
      parsed.feedback ||
      "Good attempt. Focus on providing clearer and more complete explanations.";

    await interview.save();

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({

      feedback:
        question.feedback,

      score:
        roundedScore,

      technicalAccuracy,

      relevance,

      communication,

      completeness,

      strengths:
        Array.isArray(parsed.strengths)
          ? parsed.strengths
          : [],

      improvements:
        Array.isArray(parsed.improvements)
          ? parsed.improvements
          : []
    });

  } catch (error) {

    console.error(
      "Submit answer error:",
      error
    );

    return res.status(500).json({
      message:
        `Failed to submit answer: ${error.message}`
    });
  }
};


// ============================================================
// FINISH INTERVIEW
// ============================================================

export const finishInterview = async (
  req,
  res
) => {

  try {

    const {
      interviewId
    } = req.body;

    // --------------------------------------------------------
    // Validate
    // --------------------------------------------------------

    if (!interviewId) {
      return res.status(400).json({
        message:
          "Interview ID is required."
      });
    }

    // --------------------------------------------------------
    // Find user's interview
    // --------------------------------------------------------

    const interview =
      await Interview.findOne({
        _id: interviewId,
        userId: req.userId
      });

    if (!interview) {
      return res.status(404).json({
        message:
          "Interview not found."
      });
    }

    // --------------------------------------------------------
    // Prevent duplicate finish
    // --------------------------------------------------------

    if (
      interview.status === "completed"
    ) {
      return res.status(400).json({
        message:
          "Interview is already completed."
      });
    }

    // --------------------------------------------------------
    // Calculate scores
    // --------------------------------------------------------

    const totalQuestions =
      interview.questions.length;

    let totalScore = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach(
      (question) => {

        totalScore +=
          question.score || 0;

        totalConfidence +=
          question.confidence || 0;

        totalCommunication +=
          question.communication || 0;

        totalCorrectness +=
          question.correctness || 0;
      }
    );

    // --------------------------------------------------------
    // Average
    // --------------------------------------------------------

    const finalScore =
      totalQuestions
        ? totalScore / totalQuestions
        : 0;

    const avgConfidence =
      totalQuestions
        ? totalConfidence / totalQuestions
        : 0;

    const avgCommunication =
      totalQuestions
        ? totalCommunication / totalQuestions
        : 0;

    const avgCorrectness =
      totalQuestions
        ? totalCorrectness / totalQuestions
        : 0;

    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------

    interview.finalScore =
      Number(
        finalScore.toFixed(1)
      );

    interview.status =
      "completed";

    await interview.save();

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({

      finalScore:
        Number(
          finalScore.toFixed(1)
        ),

      confidence:
        Number(
          avgConfidence.toFixed(1)
        ),

      communication:
        Number(
          avgCommunication.toFixed(1)
        ),

      correctness:
        Number(
          avgCorrectness.toFixed(1)
        ),

      totalQuestions,

      questionWiseScore:
        interview.questions.map(
          (question, index) => ({

            questionNumber:
              index + 1,

            question:
              question.question,

            difficulty:
              question.difficulty,

            category:
              question.category,

            score:
              question.score || 0,

            feedback:
              question.feedback || "",

            confidence:
              question.confidence || 0,

            communication:
              question.communication || 0,

            correctness:
              question.correctness || 0
          })
        )
    });

  } catch (error) {

    console.error(
      "Finish interview error:",
      error
    );

    return res.status(500).json({
      message:
        `Failed to finish interview: ${error.message}`
    });
  }
};


// ============================================================
// GET MY INTERVIEWS
// ============================================================

export const getMyInterviews = async (
  req,
  res
) => {

  try {

    const interviews =
      await Interview.find({
        userId: req.userId
      })
        .sort({
          createdAt: -1
        })
        .select(
          "role experience mode finalScore status createdAt"
        );

    return res.status(200).json(
      interviews
    );

  } catch (error) {

    console.error(
      "Get interviews error:",
      error
    );

    return res.status(500).json({
      message:
        `Failed to find current user interviews: ${error.message}`
    });
  }
};


// ============================================================
// GET INTERVIEW REPORT
// ============================================================

export const getInterviewReport = async (
  req,
  res
) => {

  try {

    // --------------------------------------------------------
    // Find only user's interview
    // --------------------------------------------------------

    const interview =
      await Interview.findOne({

        _id: req.params.id,

        userId: req.userId

      });

    if (!interview) {
      return res.status(404).json({
        message:
          "Interview not found."
      });
    }

    // --------------------------------------------------------
    // Calculate averages
    // --------------------------------------------------------

    const totalQuestions =
      interview.questions.length;

    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach(
      (question) => {

        totalConfidence +=
          question.confidence || 0;

        totalCommunication +=
          question.communication || 0;

        totalCorrectness +=
          question.correctness || 0;
      }
    );

    const avgConfidence =
      totalQuestions
        ? totalConfidence / totalQuestions
        : 0;

    const avgCommunication =
      totalQuestions
        ? totalCommunication / totalQuestions
        : 0;

    const avgCorrectness =
      totalQuestions
        ? totalCorrectness / totalQuestions
        : 0;

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({

      finalScore:
        interview.finalScore || 0,

      totalQuestions,

      confidence:
        Number(
          avgConfidence.toFixed(1)
        ),

      communication:
        Number(
          avgCommunication.toFixed(1)
        ),

      correctness:
        Number(
          avgCorrectness.toFixed(1)
        ),

      questionWiseScore:
        interview.questions.map(
          (question, index) => ({

            questionNumber:
              index + 1,

            question:
              question.question,

            difficulty:
              question.difficulty,

            category:
              question.category,

            score:
              question.score || 0,

            feedback:
              question.feedback || "",

            confidence:
              question.confidence || 0,

            communication:
              question.communication || 0,

            correctness:
              question.correctness || 0,

            answer:
              question.answer || ""
          })
        )
    });

  } catch (error) {

    console.error(
      "Interview report error:",
      error
    );

    return res.status(500).json({
      message:
        `Failed to find interview report: ${error.message}`
    });
  }
};
