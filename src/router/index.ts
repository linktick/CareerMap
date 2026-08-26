import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/wizard',
    name: 'wizard',
    component: () => import('@/views/WizardView.vue'),
    meta: { title: '填写信息' },
  },
  {
    path: '/sandbox',
    name: 'sandbox',
    component: () => import('@/views/SandboxView.vue'),
    meta: { title: '职业沙盘' },
  },
  {
    path: '/demo',
    name: 'demo',
    component: () => import('@/views/DemoView.vue'),
    meta: { title: '示例沙盘' },
  },
  {
    path: '/compare',
    name: 'compare',
    component: () => import('@/views/CompareView.vue'),
    meta: { title: '赛道对比' },
  },
  {
    path: '/growth/:routeId?',
    name: 'growth',
    component: () => import('@/views/GrowthView.vue'),
    meta: { title: '12个月成长方案' },
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/views/HistoryView.vue'),
    meta: { title: '历史记录' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
