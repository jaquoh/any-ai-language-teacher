import { selectNextModuleId } from "./topicSelector.js";

export function decideCurrentModule(plan, progress) {
  return selectNextModuleId(plan, progress);
}
