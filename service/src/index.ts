import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { extractPhoneNumbers, saveContacts } from './utils/contactHelper';
import { getTemplates, saveTemplate } from './utils/templateHelper';
import { refineTemplate, extractSmartNumbers, handleChatInteraction } from './utils/geminiHelper';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK' });
});

// Task 3: POST route at /api/contacts/upload
app.post('/api/contacts/upload', (req: Request, res: Response) => {
  const { rawText } = req.body;

  if (rawText === undefined || typeof rawText !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Invalid request body. Please provide a "rawText" string field.'
    });
    return;
  }

  try {
    // 1. Extract phone numbers from rawText
    const extractedNumbers = extractPhoneNumbers(rawText);

    // 2. Save extracted numbers to local storage
    const { addedCount, totalCount } = saveContacts(extractedNumbers);

    // 3. Return success response
    res.json({
      success: true,
      added: addedCount,
      total: totalCount
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while processing contacts.'
    });
  }
});

// GET /api/templates
app.get('/api/templates', (req: Request, res: Response) => {
  try {
    const templates = getTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while retrieving templates.'
    });
  }
});

// POST /api/templates
app.post('/api/templates', (req: Request, res: Response) => {
  try {
    const savedTemplate = saveTemplate(req.body);
    res.json(savedTemplate);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'An error occurred while saving the template.'
    });
  }
});

// POST /api/ai/refine
app.post('/api/ai/refine', async (req: Request, res: Response) => {
  const { content } = req.body;
  if (content === undefined || typeof content !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Invalid request body. Please provide a "content" string field.'
    });
    return;
  }

  try {
    const refinedText = await refineTemplate(content);
    res.json({
      success: true,
      refined: refinedText
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while refining the template.'
    });
  }
});

// POST /api/ai/extract
app.post('/api/ai/extract', async (req: Request, res: Response) => {
  const { rawText } = req.body;
  if (rawText === undefined || typeof rawText !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Invalid request body. Please provide a "rawText" string field.'
    });
    return;
  }

  try {
    const extractedText = await extractSmartNumbers(rawText);
    res.json({
      success: true,
      extracted: extractedText
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while extracting smart numbers.'
    });
  }
});

// POST /api/chat
app.post('/api/chat', async (req: Request, res: Response) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({
      success: false,
      error: 'Invalid request body. Please provide a "messages" array.'
    });
    return;
  }

  try {
    const reply = await handleChatInteraction(messages);
    res.json({
      success: true,
      text: reply
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during chat interaction.'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
