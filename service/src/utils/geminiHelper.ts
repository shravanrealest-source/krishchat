import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { normalizeAndExtractNumbers, saveContacts, processAndSaveContacts } from './contactHelper';
import { saveTemplate } from './templateHelper';

// Initialize client
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Uses Gemini to refine a WhatsApp template text to make it more engaging and concise.
 */
export async function refineTemplate(content: string): Promise<string> {
  if (!content) return '';
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in the environment.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  const prompt = `System: You are an expert WhatsApp copywriter. Refine the following message to make it more engaging, concise, and conversion-focused. Keep it under 500 characters. CRITICAL INSTRUCTION: You must return ONLY the final refined message text. Do not include any conversational filler, introductory text, markdown formatting, or multiple options. Just the exact text the user should send.
  
Message to refine: "${content}"`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

/**
 * Uses Gemini to extract any hidden phone numbers from a raw block of text (even if spelled out).
 */
export async function extractSmartNumbers(rawText: string): Promise<string> {
  if (!rawText) return '';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in the environment.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `System: Find and extract any hidden phone numbers from this text, even if spelled out in words. CRITICAL INSTRUCTION: Return the phone number as a single, contiguous string of digits (e.g., '9876543210'). If there are multiple phone numbers, separate each full number with a comma (e.g., '9876543210,1234567890'). Do not separate individual digits with commas. Do not include any conversational text.
  
Text to analyze: "${rawText}"`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

// --- Gemini Tool Definitions (Function Calling) ---

const saveContactsTool = {
  name: 'saveContactsTool',
  description: 'Use this to save phone numbers when a user asks to add or save contacts.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      rawText: {
        type: SchemaType.STRING,
        description: 'The raw text containing one or more phone numbers to extract and save.'
      }
    },
    required: ['rawText']
  }
};

const saveTemplateTool = {
  name: 'saveTemplateTool',
  description: 'Use this to create and save a new WhatsApp template when a user asks for promotional copy.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'The name of the template.'
      },
      type: {
        type: SchemaType.STRING,
        enum: ['text', 'text_button', 'image_text_button'],
        description: 'The type of the template: text, text_button, or image_text_button.'
      },
      content: {
        type: SchemaType.STRING,
        description: 'The main message content of the template.'
      },
      buttons: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING
        },
        description: 'An array of up to 3 button labels (required for text_button and image_text_button type).'
      },
      imageUrl: {
        type: SchemaType.STRING,
        description: 'The URL of the image (required for image_text_button type).'
      }
    },
    required: ['name', 'type', 'content']
  }
};

const tools: any = [{
  functionDeclarations: [saveContactsTool, saveTemplateTool]
}];

/**
 * Handles a multi-turn chat interaction with the user.
 * Supports tool calling (function calling) for saving contacts and creating templates.
 */
export async function handleChatInteraction(messages: any[]): Promise<string> {
  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty.');
  }

  // Extract previous history (all except the last user message)
  let history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: msg.parts.map((p: any) => ({ text: p.text }))
  }));

  // Gemini API startChat history MUST start with 'user' role
  while (history.length > 0 && history[0].role === 'model') {
    history.shift();
  }

  // Get the last message containing the user prompt
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user') {
    throw new Error('The last message in history must be from the user.');
  }

  const userPrompt = lastMessage.parts?.[0]?.text;
  if (!userPrompt) {
    throw new Error('The user prompt text is required.');
  }

  // Initialize model with tools configuration
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools
  });

  // Start chat session with history
  const chat = model.startChat({ history });

  // Send the user prompt
  const result = await chat.sendMessage(userPrompt);
  const response = await result.response;

  // Retrieve function calls recommended by Gemini
  const functionCalls = response.functionCalls();

  if (functionCalls && functionCalls.length > 0) {
    const functionResponses = [];

    for (const call of functionCalls) {
      let toolResult: any;

      if (call.name === 'saveContactsTool') {
        const args = call.args as { rawText: string };
        try {
          const saveResult = processAndSaveContacts(args.rawText);
          toolResult = {
            success: true,
            message: `Processed contacts successfully. Stored ${saveResult.added.length} new numbers, found ${saveResult.duplicates.length} duplicates and ${saveResult.invalids.length} invalid items.`,
            ...saveResult
          };
        } catch (err: any) {
          toolResult = { success: false, error: err.message };
        }
      } else if (call.name === 'saveTemplateTool') {
        const args = call.args as any;
        try {
          const saveResult = saveTemplate(args);
          toolResult = {
            success: true,
            message: 'Successfully created and saved template.',
            template: saveResult
          };
        } catch (err: any) {
          toolResult = { success: false, error: err.message };
        }
      } else {
        toolResult = { success: false, error: `Unknown tool: ${call.name}` };
      }

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: toolResult
        }
      });
    }

    // Send the execution results back to the model
    const finalResult = await chat.sendMessage(functionResponses);
    const finalResponse = await finalResult.response;
    return finalResponse.text();
  }

  return response.text();
}
