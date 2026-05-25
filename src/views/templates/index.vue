<template>
  <div class="templates-container">
    <!-- Part 1: Template Builder Form -->
    <n-card title="Create Message Template" class="glass-card">
      <template #header-extra>
        <n-tag type="success" size="medium">Phase 2</n-tag>
      </template>
      <n-form ref="formRef" :model="formValue" :rules="rules" label-placement="left" label-width="120px">
        <n-form-item label="Template Name" path="name">
          <n-input v-model:value="formValue.name" placeholder="Welcome Promo" />
        </n-form-item>

        <n-form-item label="Template Type" path="type">
          <n-select
            v-model:value="formValue.type"
            :options="typeOptions"
            placeholder="Select a template type"
            @update:value="handleTypeChange"
          />
        </n-form-item>

        <!-- Dynamic Image URL field -->
        <n-form-item
          v-if="formValue.type === 'image_text_button'"
          label="Image URL"
          path="imageUrl"
        >
          <n-input
            v-model:value="formValue.imageUrl"
            placeholder="https://images.unsplash.com/photo-1542751371-adc38448a05e"
          />
        </n-form-item>

        <n-form-item label="Message Content" path="content">
          <div class="message-content-wrapper">
            <n-input
              v-model:value="formValue.content"
              type="textarea"
              placeholder="Type your message content here..."
              :rows="4"
              class="content-input"
            />
            <div class="refine-container">
              <n-button 
                size="small" 
                type="primary" 
                ghost
                :loading="refining"
                :disabled="!formValue.content.trim()"
                @click="handleRefine"
              >
                ✨ Sparkle / Refine with AI
              </n-button>
            </div>
          </div>
        </n-form-item>

        <!-- Dynamic Button Labels fields (visible for text_button and image_text_button) -->
        <div v-if="formValue.type !== 'text'" class="buttons-section">
          <div class="section-title">
            <span>Buttons (Max 3)</span>
            <n-button size="small" type="dashed" @click="addButton" :disabled="formValue.buttons.length >= 3">
              Add Button
            </n-button>
          </div>
          
          <div v-for="(_, index) in formValue.buttons" :key="index" class="button-row">
            <n-form-item :label="'Button ' + (index + 1)" class="button-item">
              <n-input v-model:value="formValue.buttons[index]" placeholder="Learn More" />
            </n-form-item>
            <n-button type="error" size="small" @click="removeButton(index)" circle>
              -
            </n-button>
          </div>
        </div>

        <div class="form-actions">
          <n-button
            type="primary"
            :loading="saving"
            @click="handleSave"
            class="submit-btn"
          >
            Save Template
          </n-button>
        </div>
      </n-form>
    </n-card>

    <!-- Part 2: Saved Templates Section -->
    <div class="saved-templates-section">
      <h2 class="section-heading">Saved Templates</h2>
      <div v-if="loadingTemplates" class="loading-container">
        <n-spin size="large" />
      </div>
      
      <n-empty v-else-if="templates.length === 0" description="No templates saved yet." />
      
      <n-grid v-else :cols="1" :x-gap="16" :y-gap="16" cols-s="1" cols-m="2" cols-l="3" responsive="screen">
        <n-grid-item v-for="tmpl in templates" :key="tmpl.id">
          <n-card :title="tmpl.name" class="template-card" size="small">
            <template #header-extra>
              <n-tag :type="getTypeTagType(tmpl.type)" size="small">
                {{ getTypeLabel(tmpl.type) }}
              </n-tag>
            </template>
            
            <div class="template-body">
              <!-- Render Image if available -->
              <div v-if="tmpl.type === 'image_text_button' && tmpl.imageUrl" class="image-preview">
                <img :src="tmpl.imageUrl" alt="Template Image" />
              </div>
              
              <div class="content-preview">
                {{ tmpl.content }}
              </div>
              
              <!-- Render Buttons if available -->
              <div v-if="tmpl.type !== 'text' && tmpl.buttons && tmpl.buttons.length > 0" class="button-preview-list">
                <div v-for="(btnLabel, idx) in tmpl.buttons" :key="idx" class="mock-button">
                  {{ btnLabel }}
                </div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
      </n-grid>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import axios from 'axios';

interface Template {
  id: string;
  name: string;
  type: 'text' | 'text_button' | 'image_text_button';
  content: string;
  buttons?: string[];
  imageUrl?: string;
}

export default defineComponent({
  name: 'TemplateBuilder',
  setup() {
    const message = useMessage();
    const saving = ref(false);
    const loadingTemplates = ref(false);
    const templates = ref<Template[]>([]);

    const formValue = ref({
      name: '',
      type: 'text' as 'text' | 'text_button' | 'image_text_button',
      content: '',
      imageUrl: '',
      buttons: [] as string[]
    });

    const typeOptions = [
      { label: 'Text Only', value: 'text' },
      { label: 'Text + Buttons', value: 'text_button' },
      { label: 'Image + Text + Buttons', value: 'image_text_button' }
    ];

    const rules = {
      name: { required: true, message: 'Please input template name', trigger: 'blur' },
      type: { required: true, message: 'Please select type', trigger: 'change' },
      content: { required: true, message: 'Please input message content', trigger: 'blur' }
    };

    const fetchTemplates = async () => {
      loadingTemplates.value = true;
      try {
        const response = await axios.get('http://localhost:3000/api/templates');
        templates.value = response.data;
      } catch (error: any) {
        message.error('Failed to load saved templates.');
      } finally {
        loadingTemplates.value = false;
      }
    };

    const handleTypeChange = (value: 'text' | 'text_button' | 'image_text_button') => {
      if (value === 'text') {
        formValue.value.buttons = [];
        formValue.value.imageUrl = '';
      } else if (value === 'text_button') {
        formValue.value.imageUrl = '';
        if (formValue.value.buttons.length === 0) {
          formValue.value.buttons = ['Click Here'];
        }
      } else if (value === 'image_text_button') {
        if (formValue.value.buttons.length === 0) {
          formValue.value.buttons = ['Click Here'];
        }
      }
    };

    const addButton = () => {
      if (formValue.value.buttons.length < 3) {
        formValue.value.buttons.push('');
      }
    };

    const removeButton = (index: number) => {
      formValue.value.buttons.splice(index, 1);
    };

    const handleSave = async () => {
      if (!formValue.value.name.trim() || !formValue.value.content.trim()) {
        message.error('Please fill out all required fields.');
        return;
      }

      saving.value = true;
      try {
        const payload: any = {
          name: formValue.value.name,
          type: formValue.value.type,
          content: formValue.value.content
        };

        if (formValue.value.type !== 'text') {
          // Filter out empty buttons
          const validButtons = formValue.value.buttons.filter(b => b.trim() !== '');
          if (validButtons.length === 0) {
            message.error('Please specify at least one button label.');
            saving.value = false;
            return;
          }
          payload.buttons = validButtons;
        }

        if (formValue.value.type === 'image_text_button') {
          if (!formValue.value.imageUrl.trim()) {
            message.error('Please provide an Image URL.');
            saving.value = false;
            return;
          }
          payload.imageUrl = formValue.value.imageUrl;
        }

        await axios.post('http://localhost:3000/api/templates', payload);
        message.success('Template saved successfully!');
        
        // Reset form
        formValue.value = {
          name: '',
          type: 'text',
          content: '',
          imageUrl: '',
          buttons: []
        };

        // Reload templates list
        await fetchTemplates();
      } catch (error: any) {
        const errMsg = error.response?.data?.error || error.message || 'Failed to save template.';
        message.error(errMsg);
      } finally {
        saving.value = false;
      }
    };

    const refining = ref(false);

    const handleRefine = async () => {
      if (!formValue.value.content.trim()) return;
      refining.value = true;
      try {
        const response = await axios.post('http://localhost:3000/api/ai/refine', {
          content: formValue.value.content
        });
        if (response.data.success && response.data.refined) {
          formValue.value.content = response.data.refined;
          message.success('Message refined successfully with Gemini!');
        } else {
          message.error(response.data.error || 'Failed to refine message.');
        }
      } catch (error: any) {
        const errMsg = error.response?.data?.error || error.message || 'An error occurred during refinement.';
        message.error(errMsg);
      } finally {
        refining.value = false;
      }
    };

    const getTypeLabel = (type: string) => {
      if (type === 'text') return 'Text Only';
      if (type === 'text_button') return 'Text + Buttons';
      return 'Image + Text + Buttons';
    };

    const getTypeTagType = (type: string) => {
      if (type === 'text') return 'info';
      if (type === 'text_button') return 'warning';
      return 'success';
    };

    onMounted(() => {
      fetchTemplates();
    });

    return {
      formValue,
      typeOptions,
      rules,
      saving,
      loadingTemplates,
      templates,
      addButton,
      removeButton,
      handleTypeChange,
      handleSave,
      getTypeLabel,
      getTypeTagType,
      refining,
      handleRefine
    };
  }
});
</script>

<style scoped>
.templates-container {
  max-width: 1000px;
  margin: 40px auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.glass-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.08);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.refine-container {
  display: flex;
  justify-content: flex-end;
}

.buttons-section {
  border-top: 1px dashed #e2e8f0;
  padding-top: 16px;
  margin-top: 16px;
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
}

.button-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.button-item {
  flex: 1;
  margin-bottom: 0 !important;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
  margin-top: 16px;
}

.submit-btn {
  border-radius: 8px;
  font-weight: 500;
  padding: 0 24px;
}

.saved-templates-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-heading {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.template-card {
  border-radius: 12px;
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
  height: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.08);
}

.template-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-preview {
  width: 100%;
  max-height: 150px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #f1f5f9;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.content-preview {
  font-size: 14px;
  color: #475569;
  line-height: 1.5;
  white-space: pre-wrap;
}

.button-preview-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.mock-button {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 6px;
  text-align: center;
  font-size: 13px;
  color: #2563eb;
  font-weight: 600;
  cursor: default;
}
</style>
