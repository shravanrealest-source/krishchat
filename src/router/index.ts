import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import ContactsView from '../views/contacts/index.vue';
import TemplatesView from '../views/templates/index.vue';
import ChatView from '../views/chat/index.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/contacts'
  },
  {
    path: '/contacts',
    name: 'Contacts',
    component: ContactsView
  },
  {
    path: '/templates',
    name: 'Templates',
    component: TemplatesView
  },
  {
    path: '/chat',
    name: 'Chat',
    component: ChatView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
