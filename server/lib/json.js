/**
 * Parse JSON from a string that may carry a UTF-8 byte-order mark (BOM).
 *
 * Windows editors (Notepad, some VS Code saves) prepend a BOM (﻿) to
 * UTF-8 files. JSON.parse rejects it with "Unexpected token", which is a
 * common and confusing failure when admins upload hand-edited exam files.
 * We strip a single leading BOM before parsing.
 */
export function parseJsonLoose(text) {
  const clean = typeof text === 'string' && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return JSON.parse(clean);
}

/** Read + parse a JSON file from disk, tolerating a UTF-8 BOM. */
export function readJsonFile(fs, filePath) {
  return parseJsonLoose(fs.readFileSync(filePath, 'utf-8'));
}
