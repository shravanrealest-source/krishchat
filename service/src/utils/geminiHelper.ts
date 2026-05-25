import { processAndSaveContacts } from './contactHelper';
import { saveTemplate } from './templateHelper';

const OLLAMA_API_URL = 'http://localhost:11434/v1/chat/completions';
const OLLAMA_MODEL = 'qwen2.5:3b';

/**
 * Sends a chat completion request to local Ollama server.
 */
async function callOllama(payload: any): Promise<any> {
  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(`Failed to connect to local Ollama server. Ensure Ollama is running and has model '${OLLAMA_MODEL}' loaded. Details: ${error.message}`);
  }
}

/**
 * Uses Ollama to refine a WhatsApp template text to make it more engaging and concise.
 */
export async function refineTemplate(content: string): Promise<string> {
  if (!content) return '';

  const systemPrompt = `You are an expert WhatsApp copywriter. Refine the user's message to make it more engaging, concise, and conversion-focused. Keep it under 500 characters. CRITICAL INSTRUCTION: You must return ONLY the final refined message text. Do not include any conversational filler, introductory text, markdown formatting, or multiple options. Just the exact text.`;

  const payload = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ]
  };

  const data = await callOllama(payload);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Uses Ollama to extract any hidden phone numbers from a raw block of text (even if spelled out).
 */
export async function extractSmartNumbers(rawText: string): Promise<string> {
  if (!rawText) return '';

  const systemPrompt = `Find and extract any hidden phone numbers from the text, even if spelled out in words. CRITICAL INSTRUCTION: Return the phone numbers as a single comma-separated string of digits (e.g., '9876543210,1234567890'). Do not include any conversational text.`;

  const payload = {
    model: OLLAMA_MODEL,
    temperature: 0.1,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: rawText }
    ]
  };

  const data = await callOllama(payload);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// --- OpenAI-compatible Tool Definitions ---

const saveContactsTool = {
  type: 'function' as const,
  function: {
    name: 'saveContactsTool',
    description: 'Use this to save phone numbers when a user asks to add or save contacts.',
    parameters: {
      type: 'object',
      properties: {
        rawText: {
          type: 'string',
          description: 'The raw text containing one or more phone numbers to extract and save.'
        }
      },
      required: ['rawText']
    }
  }
};

const saveTemplateTool = {
  type: 'function' as const,
  function: {
    name: 'saveTemplateTool',
    description: 'Use this to create and save a new WhatsApp template when a user asks for promotional copy.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the template.'
        },
        type: {
          type: 'string',
          enum: ['text', 'text_button', 'image_text_button'],
          description: 'The type of the template: text, text_button, or image_text_button.'
        },
        content: {
          type: 'string',
          description: 'The main message content of the template.'
        },
        buttons: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'An array of up to 3 button labels (required for text_button and image_text_button type).'
        },
        imageUrl: {
          type: 'string',
          description: 'The URL of the image (required for image_text_button type).'
        }
      },
      required: ['name', 'type', 'content']
    }
  }
};

const tools = [saveContactsTool, saveTemplateTool];

/**
 * Handles a multi-turn chat interaction with the user.
 * Supports OpenAI-style tool calling (function calling) for saving contacts and templates.
 */
export async function handleChatInteraction(messages: any[]): Promise<string> {
  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty.');
  }

  // 1. Establish the system prompt
  const systemPrompt = `You are an expert WhatsApp promotion assistant. You can help users save contact numbers and create message templates. You have access to local tools (saveContactsTool and saveTemplateTool) to automate these tasks. When users request contact storage or template creation, call the appropriate tool.`;

  // 2. Map frontend history to OpenAI format
  const mappedMessages = messages.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.parts?.[0]?.text || msg.text || ''
  }));

  // Clean up any leading assistant messages (if any)
  while (mappedMessages.length > 0 && mappedMessages[0].role === 'assistant') {
    mappedMessages.shift();
  }

  const history = [
    { role: 'system', content: systemPrompt },
    ...mappedMessages
  ];

  // 3. Make initial request to Ollama with tools
  const payload = {
    model: OLLAMA_MODEL,
    messages: history,
    tools: tools
  };

  const responseData = await callOllama(payload);
  const responseMessage = responseData.choices?.[0]?.message;

  if (!responseMessage) {
    throw new Error('Invalid response received from local Ollama.');
  }

  // 4. Handle tool calls if returned
  if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    // Add the assistant's decision to call tools into the history
    history.push(responseMessage);

    for (const toolCall of responseMessage.tool_calls) {
      const functionName = toolCall.function.name;
      let args: any = {};
      try {
        args = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch (e) {
        // Fallback in case of parsing errors
        args = {};
      }

      let toolResult: any;

      if (functionName === 'saveContactsTool') {
        try {
          const saveResult = processAndSaveContacts(args.rawText || '');
          toolResult = {
            success: true,
            message: `Processed contacts successfully. Stored ${saveResult.added.length} new numbers, found ${saveResult.duplicates.length} duplicates and ${saveResult.invalids.length} invalid items.`,
            ...saveResult
          };
        } catch (err: any) {
          toolResult = { success: false, error: err.message };
        }
      } else if (functionName === 'saveTemplateTool') {
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
        toolResult = { success: false, error: `Unknown tool: ${functionName}` };
      }

      // Append the tool execution result to the history
      history.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: functionName,
        content: JSON.stringify(toolResult)
      } as any);
    }

    // Send second request to Ollama to summarize and conclude the response
    const secondPayload = {
      model: OLLAMA_MODEL,
      messages: history
    };

    const secondData = await callOllama(secondPayload);
    return secondData.choices?.[0]?.message?.content || '';
  }

  return responseMessage.content || '';
}
