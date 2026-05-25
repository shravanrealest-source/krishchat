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

        <!-- Statistics Summary Display -->
        <div v-if="summary" class="summary-area">
          <n-alert title="Upload Summary" type="success" closable @close="clearSummary">
            <div class="summary-details">
              <div class="summary-metric">
                <span class="metric-value text-blue-600 font-bold">{{ summary.addedCount }}</span>
                <span class="metric-label">New Stored</span>
              </div>
              <div class="summary-metric">
                <span class="metric-value text-amber-500 font-bold">{{ summary.duplicateCount }}</span>
                <span class="metric-label">Duplicates</span>
              </div>
              <div class="summary-metric">
                <span class="metric-value text-rose-500 font-bold">{{ summary.invalidCount }}</span>
                <span class="metric-label">Invalids</span>
              </div>
            </div>
            
            <!-- Detailed Lists -->
            <div class="summary-lists">
              <div v-if="summary.added.length > 0" class="list-section">
                <div class="list-title">Added Numbers ({{ summary.added.length }}):</div>
                <div class="list-box">{{ summary.added.join(', ') }}</div>
              </div>
              <div v-if="summary.duplicates.length > 0" class="list-section">
                <div class="list-title">Duplicate Numbers ({{ summary.duplicates.length }}):</div>
                <div class="list-box">{{ summary.duplicates.join(', ') }}</div>
              </div>
              <div v-if="summary.invalids.length > 0" class="list-section">
                <div class="list-title">Invalid Numbers/Sequences ({{ summary.invalids.length }}):</div>
                <div class="list-box">{{ summary.invalids.join(', ') }}</div>
              </div>
            </div>
          </n-alert>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useMessage } from 'naive-ui';
import axios from 'axios';

interface SummaryData {
  added: string[];
  duplicates: string[];
  invalids: string[];
  addedCount: number;
  duplicateCount: number;
  invalidCount: number;
  total: number;
}

export default defineComponent({
  name: 'ContactsUpload',
  setup() {
    const rawText = ref('');
    const loading = ref(false);
    const message = useMessage();
    const summary = ref<SummaryData | null>(null);

    const clearSummary = () => {
      summary.value = null;
    };

    const handleUpload = async () => {
      if (!rawText.value.trim()) return;
      loading.value = true;
      summary.value = null;
      try {
        const response = await axios.post('http://localhost:3000/api/contacts/upload', {
          rawText: rawText.value
        });
        
        if (response.data.success) {
          const { added, duplicates, invalids, total } = response.data;
          
          summary.value = {
            added,
            duplicates,
            invalids,
            addedCount: added.length,
            duplicateCount: duplicates.length,
            invalidCount: invalids.length,
            total
          };
          
          message.success(
            `Successfully processed! Stored ${added.length} new contacts.`
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
      summary,
      handleUpload,
      clearSummary
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

.summary-area {
  margin-top: 8px;
}

.summary-details {
  display: flex;
  justify-content: space-around;
  gap: 16px;
  margin-top: 12px;
  margin-bottom: 16px;
  text-align: center;
}

.summary-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  background: rgba(255, 255, 255, 0.5);
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.5);
}

.metric-value {
  font-size: 20px;
}

.metric-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
  font-weight: 500;
}

.summary-lists {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.list-title {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.list-box {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(226, 232, 240, 0.7);
  padding: 8px 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 11px;
  color: #475569;
  max-height: 80px;
  overflow-y: auto;
  word-break: break-all;
}
</style>
