import Ajv2020 from "ajv/dist/2020.js";
import learningPlanSchema from "../../data/schemas/learning-plan.schema.json";
import progressDataSchema from "../../data/schemas/progress-data.schema.json";
import lessonResultSchema from "../../data/schemas/lesson-result.schema.json";
import nextLessonPacketSchema from "../../data/schemas/next-lesson-packet.schema.json";

const SCHEMAS = {
  learningPlan: learningPlanSchema,
  progressData: progressDataSchema,
  lessonResult: lessonResultSchema,
  nextLessonPacket: nextLessonPacketSchema,
};

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false,
});

for (const [key, schema] of Object.entries(SCHEMAS)) {
  ajv.addSchema(schema, key);
}

export function validateBySchema(schemaKey, payload) {
  const validate = ajv.getSchema(schemaKey);
  if (!validate) {
    throw new Error(`Unknown schema key: ${schemaKey}`);
  }

  const valid = validate(payload);
  const errors = (validate.errors || []).map((error) => ({
    path: error.instancePath || "/",
    message: error.message || "Invalid value",
    keyword: error.keyword,
    params: error.params,
  }));

  return {
    valid: Boolean(valid),
    errors,
  };
}

export function assertValid(schemaKey, payload) {
  const result = validateBySchema(schemaKey, payload);
  if (!result.valid) {
    const head = result.errors[0];
    throw new Error(`Validation failed at ${head.path}: ${head.message}`);
  }

  return payload;
}

export function schemaKeys() {
  return Object.keys(SCHEMAS);
}
