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
        <n-tag type="success" size="small" round class="font-medium">Single-Page Chat App</n-tag>
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
            <span>Agent is working...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action & Input Control Area -->
    <footer class="bg-white border-t border-slate-200/80 px-6 py-4 md:px-20">
      <div class="max-w-3xl mx-auto flex flex-col gap-2">
        <!-- ChatGPT-like Capsule Input -->
        <div class="flex items-end gap-2 border border-slate-200 rounded-2xl p-2 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          
          <!-- Dropdown Action Button (+) -->
          <n-dropdown
            trigger="click"
            :options="actionMenuOptions"
            @select="handleActionMenuSelect"
          >
            <button 
              type="button"
              :disabled="loading"
              class="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition-all cursor-pointer focus:outline-none text-2xl font-normal leading-none"
              title="Add attachment or action"
            >
              +
            </button>
          </n-dropdown>
          
          <!-- Hidden Contacts File Input -->
          <input 
            type="file" 
            ref="contactsFileInput" 
            @change="handleContactsFileChange" 
            accept=".csv,.txt,.xlsx"
            class="hidden" 
          />

          <!-- Text Area -->
          <textarea
            v-model="inputText"
            rows="1"
            placeholder="Send a message (e.g. 'Add contacts' or 'Draft a template')"
            class="flex-1 resize-none py-2 px-1 text-slate-800 bg-transparent text-sm focus:outline-none max-h-32 placeholder-slate-400"
            @keydown="handleKeyDown"
            ref="textareaRef"
          ></textarea>

          <!-- Submit Button -->
          <button 
            type="button"
            @click="handleSend"
            :disabled="loading || !inputText.trim()"
            class="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all cursor-pointer focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
            </svg>
          </button>
        </div>
        <p class="text-[10px] text-slate-400 text-center mt-1">
          Click "+" to upload contacts from TXT/CSV/XLSX or create templates directly.
        </p>
      </div>
    </footer>

    <!-- Create Template Modal -->
    <n-modal
      v-model:show="showTemplateModal"
      preset="card"
      style="width: 600px; max-width: 95vw; border-radius: 16px"
      title="Create Message Template"
      :bordered="false"
      class="glass-modal"
    >
      <n-form :model="templateForm" :rules="templateRules" label-placement="top" ref="templateFormRef">
        <n-form-item label="Template Name" path="name">
          <n-input v-model:value="templateForm.name" placeholder="E.g., Welcome Promo" />
        </n-form-item>

        <n-form-item label="Template Type" path="type">
          <n-select
            v-model:value="templateForm.type"
            :options="templateTypeOptions"
            placeholder="Select template type"
            @update:value="handleTemplateTypeChange"
          />
        </n-form-item>

        <!-- Dynamic Image URL -->
        <n-form-item
          v-if="templateForm.type === 'image_text_button'"
          label="Image URL"
          path="imageUrl"
        >
          <n-input
            v-model:value="templateForm.imageUrl"
            placeholder="https://images.unsplash.com/photo-..."
          />
        </n-form-item>

        <n-form-item label="Message Content" path="content">
          <div class="flex flex-col gap-2 w-full">
            <n-input
              v-model:value="templateForm.content"
              type="textarea"
              placeholder="Type your message here..."
              :rows="4"
            />
            <div class="flex justify-end">
              <n-button 
                size="small" 
                type="primary" 
                ghost
                :loading="refining"
                :disabled="!templateForm.content.trim()"
                @click="handleTemplateRefine"
              >
                ✨ Sparkle / Refine with AI
              </n-button>
            </div>
          </div>
        </n-form-item>

        <!-- Dynamic Buttons (Max 3) -->
        <div v-if="templateForm.type !== 'text'" class="border-t border-dashed border-slate-200 pt-4 mt-2 mb-4">
          <div class="flex justify-between items-center mb-3">
            <span class="font-semibold text-slate-700 text-sm">Buttons (Max 3)</span>
            <n-button size="small" type="dashed" @click="addTemplateButton" :disabled="templateForm.buttons.length >= 3">
              Add Button
            </n-button>
          </div>
          
          <div v-for="(_, index) in templateForm.buttons" :key="index" class="flex items-center gap-2 mb-2">
            <n-form-item :label="'Button ' + (index + 1)" class="flex-1 m-0" :show-label="false">
              <n-input v-model:value="templateForm.buttons[index]" placeholder="Button Label" />
            </n-form-item>
            <n-button type="error" size="small" @click="removeTemplateButton(index)" circle>
              -
            </n-button>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-4">
          <n-button @click="showTemplateModal = false">Cancel</n-button>
          <n-button
            type="primary"
            :loading="savingTemplate"
            @click="handleSaveTemplate"
          >
            Save Template
          </n-button>
        </div>
      </n-form>
    </n-modal>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, nextTick, onMounted, h } from 'vue';
import { useChat } from './useChat';
import { useMessage } from 'naive-ui';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default defineComponent({
  name: 'ChatAgentUI',
  setup() {
    const { messages, loading, sendMessage } = useChat();
    const inputText = ref('');
    const scrollContainer = ref<HTMLDivElement | null>(null);
    const textareaRef = ref<HTMLTextAreaElement | null>(null);
    const messageAlert = useMessage();

    // "+" Action Menu options
    const actionMenuOptions = [
      {
        label: 'Upload Contacts (CSV, TXT, XLSX)',
        key: 'upload_contacts',
        icon: () => h('span', { style: 'font-size: 16px; margin-right: 4px' }, '📞')
      },
      {
        label: 'Create Template',
        key: 'create_template',
        icon: () => h('span', { style: 'font-size: 16px; margin-right: 4px' }, '📝')
      }
    ];

    // Contacts File input ref
    const contactsFileInput = ref<HTMLInputElement | null>(null);

    // Modal state for template builder
    const showTemplateModal = ref(false);
    const savingTemplate = ref(false);
    const refining = ref(false);

    const templateForm = ref({
      name: '',
      type: 'text' as 'text' | 'text_button' | 'image_text_button',
      content: '',
      imageUrl: '',
      buttons: [] as string[]
    });

    const templateTypeOptions = [
      { label: 'Text Only', value: 'text' },
      { label: 'Text + Buttons', value: 'text_button' },
      { label: 'Image + Text + Buttons', value: 'image_text_button' }
    ];

    const templateRules = {
      name: { required: true, message: 'Please input template name', trigger: 'blur' },
      type: { required: true, message: 'Please select type', trigger: 'change' },
      content: { required: true, message: 'Please input message content', trigger: 'blur' }
    };

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

    const handleActionMenuSelect = (key: string) => {
      if (key === 'upload_contacts') {
        if (contactsFileInput.value) {
          contactsFileInput.value.click();
        }
      } else if (key === 'create_template') {
        showTemplateModal.value = true;
      }
    };

    const handleContactsFileChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        const reader = new FileReader();
        
        if (fileExtension === 'xlsx') {
          reader.onload = async (event) => {
            if (event.target && event.target.result) {
              try {
                const data = new Uint8Array(event.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Convert sheet cell data into CSV-like text representation for the parser
                let combinedText = '';
                workbook.SheetNames.forEach(sheetName => {
                  const worksheet = workbook.Sheets[sheetName];
                  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
                  combinedText += csvContent + '\n';
                });
                
                await uploadContactsContent(file.name, combinedText);
              } catch (error) {
                messageAlert.error('Failed to parse Excel file.');
              }
            }
          };
          reader.readAsArrayBuffer(file);
        } else {
          // txt, csv
          reader.onload = async (event) => {
            if (event.target && typeof event.target.result === 'string') {
              await uploadContactsContent(file.name, event.target.result);
            }
          };
          reader.onerror = () => {
            messageAlert.error('Failed to read file.');
          };
          reader.readAsText(file);
        }
      }
    };

    const uploadContactsContent = async (fileName: string, rawText: string) => {
      loading.value = true;
      
      // Append a user message indicating file attachment
      messages.value.push({
        role: 'user',
        text: `📎 [Uploaded Contacts File: ${fileName}] (Please import these contacts)`
      });
      
      try {
        const response = await axios.post('http://localhost:3000/api/contacts/upload', {
          rawText
        });
        
        if (response.data.success) {
          const { added, duplicates, invalids, total } = response.data;
          
          // Append confirmation card response in the chat
          messages.value.push({
            role: 'model',
            text: `✅ **${added.length} contacts imported successfully!**\n\n- **New Stored**: ${added.length}\n- **Duplicates Ignored**: ${duplicates.length}\n- **Invalid Entries Flagged**: ${invalids.length}\n- **Total Database Contacts**: ${total}`
          });
          messageAlert.success(`Successfully imported ${added.length} contacts.`);
        } else {
          throw new Error(response.data.error || 'Failed to parse contacts.');
        }
      } catch (error: any) {
        const errMsg = error.response?.data?.error || error.message || 'Connection to contact parser failed.';
        messages.value.push({
          role: 'model',
          text: `❌ **Failed to import contacts from ${fileName}**\n\nError: ${errMsg}`
        });
        messageAlert.error(errMsg);
      } finally {
        loading.value = false;
        if (contactsFileInput.value) {
          contactsFileInput.value.value = '';
        }
      }
    };

    const handleTemplateTypeChange = (value: 'text' | 'text_button' | 'image_text_button') => {
      if (value === 'text') {
        templateForm.value.buttons = [];
        templateForm.value.imageUrl = '';
      } else if (value === 'text_button') {
        templateForm.value.imageUrl = '';
        if (templateForm.value.buttons.length === 0) {
          templateForm.value.buttons = ['Click Here'];
        }
      } else if (value === 'image_text_button') {
        if (templateForm.value.buttons.length === 0) {
          templateForm.value.buttons = ['Click Here'];
        }
      }
    };

    const addTemplateButton = () => {
      if (templateForm.value.buttons.length < 3) {
        templateForm.value.buttons.push('');
      }
    };

    const removeTemplateButton = (index: number) => {
      templateForm.value.buttons.splice(index, 1);
    };

    const handleTemplateRefine = async () => {
      if (!templateForm.value.content.trim()) return;
      refining.value = true;
      try {
        const response = await axios.post('http://localhost:3000/api/ai/refine', {
          content: templateForm.value.content
        });
        if (response.data.success && response.data.refined) {
          templateForm.value.content = response.data.refined;
          messageAlert.success('Message refined successfully with Gemini!');
        } else {
          messageAlert.error(response.data.error || 'Failed to refine message.');
        }
      } catch (error: any) {
        const errMsg = error.response?.data?.error || error.message || 'An error occurred during refinement.';
        messageAlert.error(errMsg);
      } finally {
        refining.value = false;
      }
    };

    const handleSaveTemplate = async () => {
      if (!templateForm.value.name.trim() || !templateForm.value.content.trim()) {
        messageAlert.error('Please fill out all required fields.');
        return;
      }

      savingTemplate.value = true;
      try {
        const payload: any = {
          name: templateForm.value.name,
          type: templateForm.value.type,
          content: templateForm.value.content
        };

        if (templateForm.value.type !== 'text') {
          const validButtons = templateForm.value.buttons.filter(b => b.trim() !== '');
          if (validButtons.length === 0) {
            messageAlert.error('Please specify at least one button label.');
            savingTemplate.value = false;
            return;
          }
          payload.buttons = validButtons;
        }

        if (templateForm.value.type === 'image_text_button') {
          if (!templateForm.value.imageUrl.trim()) {
            messageAlert.error('Please provide an Image URL.');
            savingTemplate.value = false;
            return;
          }
          payload.imageUrl = templateForm.value.imageUrl;
        }

        await axios.post('http://localhost:3000/api/templates', payload);
        messageAlert.success('Template saved successfully!');
        showTemplateModal.value = false;

        // Append template request and creation bubbles to the chat thread
        messages.value.push({
          role: 'user',
          text: `📝 [Action: Create Template]\n**Name**: ${payload.name}\n**Type**: ${payload.type}\n**Description**: ${payload.content}`
        });

        messages.value.push({
          role: 'model',
          text: `✅ **Template "${payload.name}" created successfully!**\n\nThe template of type \`${payload.type}\` has been saved in the template database.`
        });

        // Reset form
        templateForm.value = {
          name: '',
          type: 'text',
          content: '',
          imageUrl: '',
          buttons: []
        };
      } catch (error: any) {
        const errMsg = error.response?.data?.error || error.message || 'Failed to save template.';
        messageAlert.error(errMsg);
      } finally {
        savingTemplate.value = false;
      }
    };

    const handleSend = async () => {
      const text = inputText.value.trim();
      if (!text) return;
      if (loading.value) return;

      inputText.value = '';
      await sendMessage(text);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
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
      contactsFileInput,
      textareaRef,
      actionMenuOptions,
      showTemplateModal,
      savingTemplate,
      refining,
      templateForm,
      templateTypeOptions,
      templateRules,
      handleActionMenuSelect,
      handleContactsFileChange,
      handleTemplateTypeChange,
      addTemplateButton,
      removeTemplateButton,
      handleTemplateRefine,
      handleSaveTemplate,
      handleSend,
      handleKeyDown
    };
  }
});
</script>

<style scoped>
/* Scoped css helper for scrollbar styling */
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
