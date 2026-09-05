// tsc emits JavaScript only, so the Markdown backing the dice://guide/*
// resources never reaches dist/ and reading those resources fails at runtime.
// Copy it as part of the MCP build.
import { cp } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const from = join(root, 'src', 'documentation');
const to = join(root, 'dist', 'documentation');

await cp(from, to, { recursive: true });
console.log('Copied src/documentation -> dist/documentation');
