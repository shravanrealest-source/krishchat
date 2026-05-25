<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div class="app-layout">
          <!-- Glassmorphism Header / Navigation Bar -->
          <header class="app-header">
            <div class="logo">
              <span class="logo-icon">💬</span>
              <span class="logo-text">WhatsApp Promo Tool</span>
            </div>
            <nav class="nav-links">
              <router-link to="/contacts" class="nav-item" active-class="active">
                Upload Contacts
              </router-link>
              <router-link to="/templates" class="nav-item" active-class="active">
                Template Builder
              </router-link>
              <router-link to="/chat" class="nav-item" active-class="active">
                AI Chat Agent
              </router-link>
            </nav>
          </header>
          
          <!-- Main Content Area -->
          <main class="app-content">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </main>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { GlobalThemeOverrides } from 'naive-ui';

export default defineComponent({
  name: 'App',
  setup() {
    // Custom premium color overrides for Naive UI
    const themeOverrides: GlobalThemeOverrides = {
      common: {
        primaryColor: '#2563eb', // Premium Royal Blue
        primaryColorHover: '#3b82f6',
        primaryColorPressed: '#1d4ed8',
        successColor: '#10b981', // Emerald Green
        successColorHover: '#34d399',
        warningColor: '#f59e0b', // Amber Warning
        errorColor: '#ef4444' // Rose Red
      },
      Card: {
        borderRadius: '16px'
      }
    };

    return {
      themeOverrides
    };
  }
});
</script>

<style>
/* Global Styling */
body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f8fafc;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
}

.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 40px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-weight: 700;
  font-size: 18px;
  background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 16px;
}

.nav-item {
  text-decoration: none;
  color: #64748b;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(37, 99, 235, 0.05);
  color: #2563eb;
}

.nav-item.active {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

.app-content {
  flex: 1;
  background: radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.02) 0%, transparent 40%),
              radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.02) 0%, transparent 40%);
  padding-bottom: 40px;
}

/* Page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
