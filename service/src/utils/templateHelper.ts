import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface BaseTemplate {
  id: string;
  name: string;
  type: 'text' | 'text_button' | 'image_text_button';
}

export interface TextTemplate extends BaseTemplate {
  type: 'text';
  content: string;
}

export interface TextButtonTemplate extends BaseTemplate {
  type: 'text_button';
  content: string;
  buttons: string[];
}

export interface ImageTextButtonTemplate extends BaseTemplate {
  type: 'image_text_button';
  imageUrl: string;
  content: string;
  buttons: string[];
}

export type Template = TextTemplate | TextButtonTemplate | ImageTextButtonTemplate;

const TEMPLATES_DIR = path.resolve(__dirname, '../../data');
const TEMPLATES_FILE = path.join(TEMPLATES_DIR, 'templates.json');

/**
 * Ensures that the templates storage directory and file exist.
 * Returns the parsed array of templates.
 */
function ensureStorage(): Template[] {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }

  if (!fs.existsSync(TEMPLATES_FILE)) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify([]), 'utf8');
    return [];
  }

  try {
    const data = fs.readFileSync(TEMPLATES_FILE, 'utf8').trim();
    if (!data) {
      return [];
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

/**
 * Reads and returns all templates from templates.json.
 */
export function getTemplates(): Template[] {
  return ensureStorage();
}

/**
 * Saves a new template to templates.json.
 * Validates template data (e.g. max 3 buttons for button templates).
 * Generates a unique ID and returns the saved template.
 */
export function saveTemplate(templateData: Omit<Template, 'id'>): Template {
  // Validate input type and template properties
  if (!templateData.name || typeof templateData.name !== 'string') {
    throw new Error('Template name is required and must be a string.');
  }

  if (!templateData.type || !['text', 'text_button', 'image_text_button'].includes(templateData.type)) {
    throw new Error("Template type must be 'text', 'text_button', or 'image_text_button'.");
  }

  // Validate properties based on type
  if (templateData.type === 'text') {
    const t = templateData as Omit<TextTemplate, 'id'>;
    if (t.content === undefined || typeof t.content !== 'string') {
      throw new Error('Text template must contain a content string.');
    }
  } else if (templateData.type === 'text_button') {
    const t = templateData as Omit<TextButtonTemplate, 'id'>;
    if (t.content === undefined || typeof t.content !== 'string') {
      throw new Error('Text button template must contain a content string.');
    }
    if (!Array.isArray(t.buttons)) {
      throw new Error('Text button template must contain a buttons array.');
    }
    if (t.buttons.length > 3) {
      throw new Error('Text button template cannot have more than 3 buttons.');
    }
  } else if (templateData.type === 'image_text_button') {
    const t = templateData as Omit<ImageTextButtonTemplate, 'id'>;
    if (t.imageUrl === undefined || typeof t.imageUrl !== 'string') {
      throw new Error('Image text button template must contain an imageUrl string.');
    }
    if (t.content === undefined || typeof t.content !== 'string') {
      throw new Error('Image text button template must contain a content string.');
    }
    if (!Array.isArray(t.buttons)) {
      throw new Error('Image text button template must contain a buttons array.');
    }
    if (t.buttons.length > 3) {
      throw new Error('Image text button template cannot have more than 3 buttons.');
    }
  }

  const templates = ensureStorage();

  // Create saved template object with generated UUID
  const newTemplate: Template = {
    ...templateData,
    id: randomUUID()
  } as Template;

  templates.push(newTemplate);

  // Save back to file
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf8');

  return newTemplate;
}
