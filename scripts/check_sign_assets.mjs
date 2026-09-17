import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/quiz_dev27/quiz_questions_430.json'), 'utf8'));
const mappingSource = fs.readFileSync(path.join(root, 'assets/road-signs/sign-map.js'), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(mappingSource, sandbox);

const { base, map } = sandbox.window.MACHIMAMO_SIGN_ASSETS;
const visualQuestions = bank.questions.filter((question) => question.visualRef);
const missingMappings = [];
const missingFiles = [];
for (const question of visualQuestions) {
  const name = question.visualRef.signName;
  const items = map[name];
  if (!items?.length) {
    missingMappings.push(`${question.id}: ${name}`);
    continue;
  }
  for (const item of items) {
    const file = path.join(root, base, item.file);
    if (!fs.existsSync(file) || fs.statSync(file).size < 100) missingFiles.push(file);
  }
}

const duplicateGroups = new Map();
for (const question of bank.questions) {
  const key = JSON.stringify([question.question, question.choices.map(choice => choice.label), question.correctValue]);
  duplicateGroups.set(key, [...(duplicateGroups.get(key) || []), question.id]);
}
const exactDuplicates = [...duplicateGroups.values()].filter(group => group.length > 1);

if (missingMappings.length || missingFiles.length || exactDuplicates.length) {
  console.error(JSON.stringify({ missingMappings, missingFiles, exactDuplicates }, null, 2));
  process.exit(1);
}

console.log(`OK: ${visualQuestions.length} visual questions, ${new Set(visualQuestions.map(q => q.visualRef.signName)).size} visual types, no missing assets or exact duplicates.`);
