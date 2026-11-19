import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const SRC_DIR = resolve('src');

interface BoundaryRule {
  from: string;
  forbidden: string[];
}

const RULES: BoundaryRule[] = [
  { from: 'api', forbidden: ['lambda'] },
  { from: 'contracts', forbidden: ['api', 'lambda'] },
  { from: 'lambda', forbidden: ['api'] },
];

const ALIAS_ROOTS: Record<string, string> = {
  '@api': 'api',
  '@contracts': 'contracts',
  '@lambda': 'lambda',
};

const IMPORT_PATTERN =
  /(?:import|export)\s+(?:type\s+)?[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const listTypeScriptFiles = (directory: string): string[] => {
  const entries = readdirSync(directory);

  return entries.flatMap((entry) => {
    const fullPath = join(directory, entry);

    if (statSync(fullPath).isDirectory()) {
      return listTypeScriptFiles(fullPath);
    }

    return fullPath.endsWith('.ts') ? [fullPath] : [];
  });
};

const resolveTargetFolder = (
  filePath: string,
  specifier: string,
): string | undefined => {
  if (specifier.startsWith('.')) {
    const target = resolve(filePath, '..', specifier);
    const relativeTarget = relative(SRC_DIR, target);

    if (relativeTarget.startsWith('..')) {
      return undefined;
    }

    return relativeTarget.split(sep)[0];
  }

  const alias = Object.keys(ALIAS_ROOTS).find((candidate) =>
    specifier.startsWith(`${candidate}/`),
  );

  return alias ? ALIAS_ROOTS[alias] : undefined;
};

const violations: string[] = [];

for (const rule of RULES) {
  const ruleDirectory = join(SRC_DIR, rule.from);

  for (const filePath of listTypeScriptFiles(ruleDirectory)) {
    const content = readFileSync(filePath, 'utf8');

    for (const match of content.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1] ?? match[2];

      if (!specifier) {
        continue;
      }

      const targetFolder = resolveTargetFolder(filePath, specifier);

      if (targetFolder && rule.forbidden.includes(targetFolder)) {
        violations.push(
          `${relative(SRC_DIR, filePath)} imports "${specifier}" from the forbidden "${targetFolder}" layer`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Boundary violations detected:\n');
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

console.log('Architecture boundaries respected.');
