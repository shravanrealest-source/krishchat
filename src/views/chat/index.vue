<template>
  <div class="chat-page-container max-w-4xl mx-auto my-10 px-6">
    <n-card title="AI Conversational Agent" class="glass-card shadow-lg border border-slate-200">
      <template #header-extra>
        <n-tag type="primary" size="medium" round>
          <template #icon>🤖</template>
          Gemini 2.5
        </n-tag>
      </template>
      
      <div class="flex flex-col h-[600px]">
        <!-- Scrollable Messages Window -->
        <div 
          ref="scrollContainer"
          class="flex-1 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/50 p-6 space-y-4 mb-4"
        >
          <div 
            v-for="(msg, index) in messages" 
            :key="index"
            :class="[
              'flex w-full',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            ]"
          >
            <div 
              :class="[
                'max-w-[75%] rounded-2xl px-5 py-3 shadow-sm text-[15px] leading-relaxed',
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
              ]"
            >
              <div class="whitespace-pre-wrap">{{ msg.text }}</div>
            </div>
          </div>
          
          <!-- Thinking Spinner -->
          <div v-if="loading" class="flex justify-start items-center space-x-2 text-slate-400">
            <div class="bg-white border border-slate-100 rounded-2xl px-5 py-3 rounded-bl-none shadow-sm flex items-center space-x-2">
              <n-spin size="small" />
              <span class="text-[14px]">AI is thinking...</span>
            </div>
          </div>
        </div>

        <!-- Input Bar Area -->
        <div class="flex items-center gap-3">
          <n-input
            v-model:value="inputText"
            type="textarea"
            placeholder="Type your message... (e.g. 'Save contact 9999911111' or 'create template named discount')"
            :autosize="{ minRows: 1, maxRows: 3 }"
            class="flex-1"
            @keypress="handleKeyPress"
          />
          <n-button
            type="primary"
            :loading="loading"
            :disabled="!inputText.trim()"
            @click="handleSend"
            class="h-10 px-6 font-semibold rounded-lg"
          >
            Send
          </n-button>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, nextTick, onMounted } from 'vue';
import { useChat } from './useChat';

export default defineComponent({
  name: 'ChatAgent',
  setup() {
    const { messages, loading, sendMessage } = useChat();
    const inputText = ref('');
    const scrollContainer = ref<HTMLDivElement | null>(null);

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

    // Watch for new messages or loading state changing (to scroll to bottom when AI starts thinking)
    watch([() => messages.value.length, loading], () => {
      scrollToBottom();
    });

    const handleSend = async () => {
      const text = inputText.value.trim();
      if (!text || loading.value) return;
      inputText.value = '';
      await sendMessage(text);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    onMounted(() => {
      scrollToBottom();
    });

    return {
      messages,
      loading,
      inputText,
      scrollContainer,
      handleSend,
      handleKeyPress
    };
  }
});
</script>

<style scoped>
.glass-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
}
</style>
