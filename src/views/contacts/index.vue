<template>
  <div class="contacts-container">
    <n-card title="Contacts Upload" class="glass-card">
      <template #header-extra>
        <n-tag type="info" size="medium">Phase 1</n-tag>
      </template>
      <div class="card-content">
        <p class="description">
          Paste any raw, messy text block containing phone numbers (e.g. chat transcripts, csv exports, or unstructured text lists).
          Our system will extract, normalize to country prefix, and deduplicate them.
        </p>
        <n-input
          v-model:value="rawText"
          type="textarea"
          placeholder="Paste raw text here... (e.g., 'Contact John at 98765-43210 or call +91 99999 88888')"
          :rows="10"
          class="input-textarea"
          clearable
        />
        <div class="action-bar">
          <n-button
            type="primary"
            :loading="loading"
            @click="handleUpload"
            class="action-button"
            :disabled="!rawText.trim()"
          >
            Process & Save Contacts
          </n-button>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useMessage } from 'naive-ui';
import axios from 'axios';

export default defineComponent({
  name: 'ContactsUpload',
  setup() {
    const rawText = ref('');
    const loading = ref(false);
    const message = useMessage();

    const handleUpload = async () => {
      if (!rawText.value.trim()) return;
      loading.value = true;
      try {
        const response = await axios.post('http://localhost:3000/api/contacts/upload', {
          rawText: rawText.value
        });
        
        if (response.data.success) {
          message.success(
            `Successfully processed! Added ${response.data.added} new contacts. Total contacts: ${response.data.total}.`
          );
          rawText.value = '';
        } else {
          message.error(response.data.error || 'Failed to process contacts.');
        }
      } catch (error: any) {
        const errMsg = error.response?.data?.error || error.message || 'An error occurred while uploading.';
        message.error(errMsg);
      } finally {
        loading.value = false;
      }
    };

    return {
      rawText,
      loading,
      handleUpload
    };
  }
});
</script>

<style scoped>
.contacts-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 0 24px;
}

.glass-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.08);
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.12);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.description {
  color: #475569;
  font-size: 15px;
  line-height: 1.6;
  margin: 0 0 8px 0;
}

.input-textarea {
  font-family: inherit;
  border-radius: 8px;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
}

.action-button {
  padding: 0 24px;
  font-weight: 500;
  border-radius: 8px;
}
</style>
