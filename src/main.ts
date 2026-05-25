import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import naive from 'naive-ui';
import './style.css';

// Load Inter font for Naive UI
import 'vfonts/Inter.css';

const app = createApp(App);
app.use(router);
app.use(naive);
app.mount('#app');

