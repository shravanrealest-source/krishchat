<template>
  <div class="flex flex-col h-[calc(100vh-80px)] bg-slate-50 font-sans">
    <!-- Chat Header -->
    <header class="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200/80 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 text-lg font-bold">
          🤖
        </div>
        <div>
          <h1 class="text-base font-semibold text-slate-800 m-0">Conversational AI Assistant</h1>
          <p class="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Gemini 2.5 Active (Function Calling Enabled)
          </p>
        </div>
      </div>
      <div>
        <n-tag type="success" size="small" round class="font-medium">Phase 5 & 6</n-tag>
      </div>
    </header>

    <!-- Messages Container -->
    <div 
      ref="scrollContainer" 
      class="flex-1 overflow-y-auto px-6 py-8 md:px-20 space-y-6"
    >
      <div class="max-w-3xl mx-auto space-y-6">
        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          :class="[
            'flex gap-4 items-start w-full',
            msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          ]"
        >
          <!-- Avatar Icon -->
          <div 
            :class="[
              'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold shrink-0 select-none shadow-sm',
              msg.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white border border-slate-200 text-slate-700'
            ]"
          >
            {{ msg.role === 'user' ? 'U' : 'AI' }}
          </div>

          <!-- Message Bubble -->
          <div 
            :class="[
              'max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed whitespace-pre-wrap',
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none font-medium' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
            ]"
          >
            {{ msg.text }}
          </div>
        </div>

        <!-- Thinking Loader -->
        <div v-if="loading" class="flex gap-4 items-start w-full">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold shrink-0 select-none shadow-sm bg-white border border-slate-200 text-slate-700">
            AI
          </div>
          <div class="bg-white border border-slate-100 rounded-2xl px-5 py-3.5 rounded-tl-none shadow-sm flex items-center gap-2 text-slate-500 text-sm">
            <n-spin size="small" />
            <span>Agent is typing...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Attachment & Input Control Area -->
    <footer class="bg-white border-t border-slate-200/80 px-6 py-4 md:px-20">
      <div class="max-w-3xl mx-auto flex flex-col gap-2">
        <!-- Attachment Preview Badge -->
        <div v-if="selectedFile" class="flex items-center self-start gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 shadow-sm transition-all">
          <span class="text-sm">📄</span>
          <span class="font-medium truncate max-w-[200px]">{{ selectedFile.name }}</span>
          <span class="text-slate-400">({{ formatFileSize(selectedFile.size) }})</span>
          <button 
            @click="clearAttachment" 
            class="text-slate-400 hover:text-rose-500 font-bold ml-1.5 cursor-pointer text-sm focus:outline-none transition-colors"
          >
            ×
          </button>
        </div>

        <!-- ChatGPT-like Capsule Input -->
        <div class="flex items-end gap-2 border border-slate-200 rounded-2xl p-2 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <!-- Attachment Trigger Button -->
          <button 
            type="button"
            @click="triggerFileInput"
            :disabled="loading"
            class="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer focus:outline-none"
            title="Attach a text document"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L12.763 12.763m0 0L8.839 8.839m3.924 3.924l5.48-5.48M12 12v9m0 0-3.75-3.75M12 21l3.75-3.75" />
            </svg>
          </button>
          
          <!-- Hidden File Input -->
          <input 
            type="file" 
            ref="fileInput" 
            @change="handleFileChange" 
            accept=".txt,.csv,.json,.log,.xml,.html"
            class="hidden" 
          />

          <!-- Text Area -->
          <textarea
            v-model="inputText"
            rows="1"
            placeholder="Send a message (e.g. 'Add contacts' or 'Draft a discount template')"
            class="flex-1 resize-none py-2 px-1 text-slate-800 bg-transparent text-sm focus:outline-none max-h-32 placeholder-slate-400"
            @keydown="handleKeyDown"
            ref="textareaRef"
          ></textarea>

          <!-- Submit Button -->
          <button 
            type="button"
            @click="handleSend"
            :disabled="loading || (!inputText.trim() && !selectedFile)"
            class="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all cursor-pointer focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
            </svg>
          </button>
        </div>
        <p class="text-[10px] text-slate-400 text-center mt-1">
          Agent can execute tools to save contacts and manage templates. Attach files to upload numbers.
        </p>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, nextTick, onMounted } from 'vue';
import { useChat } from './useChat';
import { useMessage } from 'naive-ui';

export default defineComponent({
  name: 'ChatAgentUI',
  setup() {
    const { messages, loading, sendMessage } = useChat();
    const inputText = ref('');
    const scrollContainer = ref<HTMLDivElement | null>(null);
    const fileInput = ref<HTMLInputElement | null>(null);
    const textareaRef = ref<HTMLTextAreaElement | null>(null);
    const messageAlert = useMessage();

    // Attachment State
    const selectedFile = ref<File | null>(null);
    const fileTextContent = ref('');

    const scrollToBottom = () => {
      nextTick(() => {
        if (scrollContainer.value) {
          scrollContainer.value.scrollTo({
            top: scrollContainer.value.scrollHeight,
            behavior: 'smooth'
          });
        }
      });
    };

    watch([() => messages.value.length, loading], () => {
      scrollToBottom();
    });

    const triggerFileInput = () => {
      if (fileInput.value) {
        fileInput.value.click();
      }
    };

    const handleFileChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        
        // Read file contents
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target && typeof event.target.result === 'string') {
            selectedFile.value = file;
            fileTextContent.value = event.target.result;
            messageAlert.success(`Successfully attached ${file.name}`);
            
            // Refocus text area
            nextTick(() => {
              if (textareaRef.value) textareaRef.value.focus();
            });
          }
        };
        reader.onerror = () => {
          messageAlert.error('Failed to read the file.');
        };
        reader.readAsText(file);
      }
    };

    const clearAttachment = () => {
      selectedFile.value = null;
      fileTextContent.value = '';
      if (fileInput.value) {
        fileInput.value.value = '';
      }
    };

    const handleSend = async () => {
      const text = inputText.value.trim();
      const fileContent = fileTextContent.value;
      const fileName = selectedFile.value?.name;

      if (!text && !fileContent) return;
      if (loading.value) return;

      inputText.value = '';
      clearAttachment();
      
      await sendMessage(text, fileContent, fileName);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    onMounted(() => {
      scrollToBottom();
    });

    return {
      messages,
      loading,
      inputText,
      scrollContainer,
      fileInput,
      textareaRef,
      selectedFile,
      triggerFileInput,
      handleFileChange,
      clearAttachment,
      handleSend,
      handleKeyDown,
      formatFileSize
    };
  }
});
</script>

<style scoped>
/* Glassmorphism visual styling */
.glass-card {
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.9);
}

/* Custom scrollbar aesthetics */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
