import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Load Inter font for Naive UI
import 'vfonts/Inter.css';

const app = createApp(App);
app.use(router);
app.mount('#app');
