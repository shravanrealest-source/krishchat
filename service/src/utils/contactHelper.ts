import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts all potential phone numbers from a raw string of text.
 * - Strips out spaces, dashes, and hidden characters from each candidate.
 * - Ensures the cleaned candidate has only digits.
 * - Normalizes 10-digit numbers by prepending '91'.
 * - Filters out numbers that are less than 10 or more than 15 digits.
 * - Returns strictly unique numbers.
 */
export function extractPhoneNumbers(rawText: string): string[] {
  if (!rawText) return [];

  // Split the raw text by anything that cannot be part of a single phone number:
  // - Non-allowed characters: anything that is NOT a digit, single space, dash, parenthesis, or plus.
  // - Multiple spaces (2 or more spaces).
  const candidates = rawText.split(/[^\d \-\(\)\+]+| {2,}/g);
  const phoneNumbers: string[] = [];

  for (const candidate of candidates) {
    if (!candidate) continue;

    // Strip out all non-digit characters (this handles spaces, dashes, parentheses, plus signs, hidden chars, etc.)
    const cleaned = candidate.replace(/[^\d]/g, '');

    // Check if the resulting string is non-empty and has a valid length
    if (cleaned.length >= 10 && cleaned.length <= 15) {
      let normalized = cleaned;
      if (cleaned.length === 10) {
        normalized = '91' + cleaned;
      }
      phoneNumbers.push(normalized);
    }
  }

  // Return strictly unique numbers
  return Array.from(new Set(phoneNumbers));
}

// Path to store the contacts JSON file
const CONTACTS_DIR = path.resolve(__dirname, '../../data');
const CONTACTS_FILE = path.join(CONTACTS_DIR, 'contacts.json');

/**
 * Manages local storage for contacts.
 * Reads from contacts.json, merges new numbers, removes overall duplicates, and saves.
 * If directory or file doesn't exist, initializes with an empty array.
 */
export function saveContacts(newNumbers: string[]): { addedCount: number; totalCount: number } {
  // Ensure the directory exists
  if (!fs.existsSync(CONTACTS_DIR)) {
    fs.mkdirSync(CONTACTS_DIR, { recursive: true });
  }

  let existingNumbers: string[] = [];

  // Check if file exists, read and parse it, or initialize it
  if (fs.existsSync(CONTACTS_FILE)) {
    try {
      const fileData = fs.readFileSync(CONTACTS_FILE, 'utf8').trim();
      if (fileData) {
        existingNumbers = JSON.parse(fileData);
        if (!Array.isArray(existingNumbers)) {
          existingNumbers = [];
        }
      } else {
        existingNumbers = [];
      }
    } catch (error) {
      // In case of parsing error, default to empty array
      existingNumbers = [];
    }
  }

  // Merge numbers and remove duplicates
  const existingSet = new Set(existingNumbers);
  const initialSize = existingSet.size;

  for (const num of newNumbers) {
    existingSet.add(num);
  }

  const mergedNumbers = Array.from(existingSet);
  const addedCount = mergedNumbers.length - initialSize;
  const totalCount = mergedNumbers.length;

  // Save the updated contacts
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(mergedNumbers, null, 2), 'utf8');

  return { addedCount, totalCount };
}

/**
 * Parses raw text, extracts valid numbers, filters out duplicates (against both the input and existing DB),
 * collects invalid number sequences, saves the new valid numbers, and returns detailed stats.
 */
export function processAndSaveContacts(rawText: string): {
  added: string[];
  duplicates: string[];
  invalids: string[];
  total: number;
} {
  // Ensure the directory exists
  if (!fs.existsSync(CONTACTS_DIR)) {
    fs.mkdirSync(CONTACTS_DIR, { recursive: true });
  }

  let existingNumbers: string[] = [];

  // Check if file exists, read and parse it, or initialize it
  if (fs.existsSync(CONTACTS_FILE)) {
    try {
      const fileData = fs.readFileSync(CONTACTS_FILE, 'utf8').trim();
      if (fileData) {
        existingNumbers = JSON.parse(fileData);
        if (!Array.isArray(existingNumbers)) {
          existingNumbers = [];
        }
      }
    } catch {
      existingNumbers = [];
    }
  }

  const existingSet = new Set(existingNumbers);

  // Find all sequences containing digits and phone chars
  // Match any sequence of digits, plus, minus, parens, spaces of length >= 3
  const regex = /[+\d\-\(\)\s]{3,}/g;
  let match;

  const validSet = new Set<string>();
  const duplicatesSet = new Set<string>();
  const invalidsSet = new Set<string>();

  // Use a regex match loop to scan the entire input
  while ((match = regex.exec(rawText)) !== null) {
    const rawMatch = match[0].trim();
    if (!rawMatch) continue;

    // Clean all non-digits
    const cleaned = rawMatch.replace(/[^\d]/g, '');
    if (!cleaned) continue;

    if (cleaned.length >= 10 && cleaned.length <= 15) {
      let normalized = cleaned;
      if (cleaned.length === 10) {
        normalized = '91' + cleaned;
      }

      if (existingSet.has(normalized) || validSet.has(normalized)) {
        duplicatesSet.add(normalized);
      } else {
        validSet.add(normalized);
      }
    } else if (cleaned.length >= 5 && cleaned.length < 10) {
      invalidsSet.add(cleaned);
    } else if (cleaned.length > 15) {
      invalidsSet.add(cleaned);
    }
  }

  const added = Array.from(validSet);
  const updatedList = [...existingNumbers, ...added];

  // Save the updated contacts list
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(updatedList, null, 2), 'utf8');

  return {
    added,
    duplicates: Array.from(duplicatesSet),
    invalids: Array.from(invalidsSet),
    total: updatedList.length
  };
}

export const normalizeAndExtractNumbers = extractPhoneNumbers;

