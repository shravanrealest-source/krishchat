import { ref } from 'vue';
import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export function useChat() {
  const messages = ref<ChatMessage[]>([
    {
      role: 'model',
      text: 'Hello! I am your AI assistant. I can save contacts and build WhatsApp message templates for you. Try saying: "Save contacts: 9123456789, 9876543210" or "Create a discount template named promo".\n\nYou can also click the paperclip icon below to attach a file (like contacts.txt) and ask me to process it!'
    }
  ]);
  const loading = ref(false);

  const sendMessage = async (text: string, fileContent?: string, fileName?: string) => {
    if (!text.trim() && !fileContent) return;

    let displayMessage = text;
    let payloadMessage = text;

    if (fileContent && fileName) {
      displayMessage = `📎 [Attached File: ${fileName}]\n${text}`;
      payloadMessage = `[Attached File: ${fileName}]\n${fileContent}\n\nUser Message: ${text}`;
    }

    // 1. Pushes the user's text to the messages array
    messages.value.push({
      role: 'user',
      text: displayMessage
    });

    loading.value = true;
    try {
      // 2. Formats the entire chat history into the payload required by the backend
      // We map each previous message. For the last user message, we use the payloadMessage containing the attachment contents
      const payloadMessages = messages.value.map((msg, index) => {
        const isLastUserMsg = index === messages.value.length - 1;
        return {
          role: msg.role,
          parts: [{ text: isLastUserMsg ? payloadMessage : msg.text }]
        };
      });

      // 3. Sends an Axios POST request to http://localhost:3000/api/chat
      const response = await axios.post('http://localhost:3000/api/chat', {
        messages: payloadMessages
      });

      // 4. Extracts the text from the backend's response and pushes it as model role
      if (response.data && response.data.success && response.data.text) {
        messages.value.push({
          role: 'model',
          text: response.data.text
        });
      } else {
        throw new Error(response.data?.error || 'Empty or invalid response from chat agent.');
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || error.message || 'Connection to conversational agent failed.';
      messages.value.push({
        role: 'model',
        text: `Error: ${errMsg}`
      });
    } finally {
      loading.value = false;
    }
  };

  return {
    messages,
    loading,
    sendMessage
  };
}
