import { selectNextModuleId, selectNextTopic } from "./topicSelector.js";
import { isoNow, uniqStrings } from "./normalizers.js";

function buildLessonResultTemplate({ projectId, moduleId, topic }) {
  return {
    schemaVersion: "1.0.0",
    resultId: "result-<unique-id>",
    projectId,
    lessonTimestamp: "YYYY-MM-DDTHH:mm:ss.sssZ",
    durationMin: 16,
    moduleId,
    topic,
    lessonCoverage: {
      topics: ["<topic-1>"],
      grammar: [
        {
          id: "<grammar-id>",
          name: "<grammar-name>",
          example: "<grammar-example-sentence>",
        },
      ],
      verbs: [
        {
          infinitive: "<verb-infinitive>",
          present: {
            ich: "<ich-form>",
            du: "<du-form>",
            er_sie_es: "<er-sie-es-form>",
            wir: "<wir-form>",
            ihr: "<ihr-form>",
            sie_Sie: "<sie-sie-form>",
          },
        },
      ],
      vocabulary: [
        {
          term: "<word>",
          translation: "<translation>",
          context: "<example-sentence>",
        },
      ],
    },
    exercisePerformance: [
      {
        exerciseType: "fill-in-the-blank",
        prompt: "<exercise-prompt>",
        userAnswer: "<user-answer>",
        correctAnswer: "<correct-answer>",
        isCorrect: true,
      },
    ],
    mistakes: [
      {
        key: "<mistake-key>",
        category: "grammar",
        severity: "minor",
        message: "<what-was-wrong>",
        correction: "<correct-form>",
        needsPractice: false,
      },
    ],
    teacherFeedback: {
      summary: "<short-summary-of-performance>",
      strengths: ["<strength-1>"],
      improvementFocus: ["<improvement-1>"],
    },
    recommendedNextFocus: {
      moduleId,
      topic: "<next-topic>",
      grammar: ["<next-grammar-id>"],
      verbs: ["<next-verb-infinitive>"],
      vocabulary: ["<next-word>"],
      notes: "<short-note-for-next-lesson>",
    },
    scoring: {
      grammar: 70,
      verbs: 70,
      vocabulary: 70,
      fluency: 70,
      composite: 70,
    },
    cefrEstimate: {
      band: "A1.1",
      confidence: 0.6,
    },
  };
}

export function buildNextLessonPacket(progress, plan) {
  const nextModuleId = selectNextModuleId(plan, progress);
  const module = (plan.modules || []).find((item) => item.moduleId === nextModuleId) || plan.modules?.[0];

  const moduleTopics = uniqStrings(module?.vocabThemes || []);
  const topic = selectNextTopic({
    moduleTopics,
    lessonHistory: progress.lessonHistory,
    mistakePatterns: progress.mistakePatterns,
    recommendedTopic: progress.nextLesson?.topic,
  });

  const weakAreas = (progress.mistakePatterns || [])
    .filter((item) => item.needsPractice)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item) => `${item.category}: ${item.key}`);
  const lessonResultTemplate = buildLessonResultTemplate({
    projectId: progress.projectId,
    moduleId: nextModuleId,
    topic,
  });

  return {
    packetVersion: "1.0.0",
    generatedAt: isoNow(),
    projectSnapshot: {
      projectId: progress.projectId,
      targetLanguage: progress.learnerProfile.targetLanguage,
      currentModuleId: nextModuleId,
      overallScore: progress.scorecard.overallScore,
      cefrEstimate: progress.scorecard.cefrEstimate.band,
    },
    teacherContract: {
      persona: "Friendly, focused language teacher persona",
      lessonLengthMin: {
        min: 15,
        max: 20,
      },
      openingGuidance:
        "Start with a short, warm teacher greeting in your own words and quickly set the lesson goal.",
      contentBreadth:
        "Use 4 to 7 varied activities (drills, short dialogue, correction loops, free response) with gradual difficulty increase.",
      offTopicPolicy:
        "Politely redirect off-topic requests back to lesson completion while allowing relevant language-learning clarifications.",
      closingFormat: [
        "Mini recap paragraph",
        "Two bullets: strengths and next focus",
        "One fenced JSON block only, valid LessonResultData, and no text after",
      ],
      resultGuarantee:
        "Self-check required keys and value types before outputting final JSON. If uncertain, correct internally before sending.",
    },
    lessonContext: {
      moduleId: nextModuleId,
      topic,
      grammarFocus: progress.nextLesson?.grammarFocus?.length
        ? progress.nextLesson.grammarFocus
        : (module?.grammarTargets || []).slice(0, 2).map((item) => item.id),
      verbFocus: progress.nextLesson?.verbFocus?.length
        ? progress.nextLesson.verbFocus
        : (module?.verbTargets || []).slice(0, 2).map((item) => item.infinitive),
      vocabularyFocus: progress.nextLesson?.vocabularyFocus?.length
        ? progress.nextLesson.vocabularyFocus
        : (module?.vocabThemes || []).slice(0, 5),
      weakAreas,
    },
    responseContract: {
      format: "fenced-json",
      jsonSchemaRef: "embedded-inline-template",
      lessonResultTemplate,
      mustInclude: [
        "schemaVersion=1.0.0",
        "resultId",
        "projectId",
        "lessonCoverage",
        "mistakes",
        "recommendedNextFocus",
        "scoring",
        "cefrEstimate",
      ],
      mustNotInclude: [
        "Text after final JSON block",
        "Missing required fields",
        "Extra unknown root properties",
        "External file references for schema/template",
      ],
    },
  };
}

export function renderNextLessonPrompt(packet) {
  const lessonContext = packet.lessonContext;
  const responseContract = packet.responseContract;
  const templateJson = JSON.stringify(responseContract.lessonResultTemplate, null, 2);

  return [
    "# Portable AI Teacher - Next Lesson Packet",
    "",
    "You are teaching one lesson only. Follow the contract exactly.",
    "",
    "## Lesson Opening",
    `- ${packet.teacherContract.openingGuidance}`,
    "",
    "## Teacher Mode Rules",
    `- Persona: ${packet.teacherContract.persona}`,
    `- Duration: ${packet.teacherContract.lessonLengthMin.min}-${packet.teacherContract.lessonLengthMin.max} minutes`,
    `- Content breadth: ${packet.teacherContract.contentBreadth}`,
    `- Off-topic policy: ${packet.teacherContract.offTopicPolicy}`,
    "- Include one fun micro-element linked to the topic (tip, mnemonic, short riddle, quote, or joke).",
    "- Keep the flow practical and interactive with enough learner turns before closing.",
    "",
    "## Lesson Context",
    `- Project: ${packet.projectSnapshot.projectId}`,
    `- Target language: ${packet.projectSnapshot.targetLanguage}`,
    `- Current module: ${lessonContext.moduleId}`,
    `- Topic: ${lessonContext.topic}`,
    `- Grammar focus: ${lessonContext.grammarFocus.join(", ") || "none"}`,
    `- Verb focus: ${lessonContext.verbFocus.join(", ") || "none"}`,
    `- Vocabulary focus: ${lessonContext.vocabularyFocus.join(", ") || "none"}`,
    `- Weak areas to reinforce: ${lessonContext.weakAreas.join(", ") || "none"}`,
    "",
    "## Required Lesson Ending Format",
    "1. One short recap paragraph.",
    "2. Two bullet points: strengths and next focus.",
    "3. One fenced JSON block with LessonResultData and no text after.",
    "",
    "## ResultData Reliability Rules",
    `- Output format: ${responseContract.format}`,
    "- Do NOT reference external files, links, or local paths for schema/template resolution.",
    `- Schema source: ${responseContract.jsonSchemaRef}`,
    "- Before final output, self-check all required keys and numeric types.",
    "- Ensure final JSON parses correctly (double quotes, commas, brackets, and no trailing text).",
    `- Must include: ${responseContract.mustInclude.join("; ")}`,
    `- Must avoid: ${responseContract.mustNotInclude.join("; ")}`,
    "",
    "## Embedded LessonResultData JSON Template (use this exact structure)",
    "```json",
    templateJson,
    "```",
    "",
    "You may add more items to arrays where needed, but keep field names and data types consistent.",
    "Return the final lesson output with one fenced JSON block only and no text after it.",
    "",
    "## Scoring Fields",
    "- Provide grammar, verbs, vocabulary, fluency, and composite in range 0..100.",
    "- Provide cefrEstimate.band and cefrEstimate.confidence (0..1).",
  ].join("\n");
}
