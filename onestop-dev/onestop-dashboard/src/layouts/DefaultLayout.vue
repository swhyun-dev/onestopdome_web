<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- ✅ Sidebar -->
    <aside class="w-64 shrink-0 border-r border-slate-200 bg-white">
      <div class="px-5 py-4 border-b border-slate-100">
        <div class="text-sm font-extrabold text-slate-900">원스톱 도매</div>
        <div class="text-[11px] text-slate-500">Dashboard</div>
      </div>

      <nav class="p-3 space-y-1">
        <template v-for="m in visibleMenus" :key="m.path">
          <RouterLink
            :to="m.path"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition"
            :class="isActive(m.path)
              ? 'bg-slate-900 text-white'
              : 'text-slate-700 hover:bg-slate-50'"
          >
            <span class="text-[13px] font-semibold">{{ m.label }}</span>
            <span v-if="m.badge" class="ml-auto text-[11px] px-2 py-0.5 rounded-full"
              :class="isActive(m.path) ? 'bg-white/20' : 'bg-slate-100 text-slate-600'">
              {{ m.badge }}
            </span>
          </RouterLink>
        </template>

        <!-- ✅ 로그아웃/기타 -->
        <button
          class="w-full mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
          @click="logout"
        >
          <span class="text-[13px] font-semibold">로그아웃</span>
        </button>
      </nav>
    </aside>

    <!-- 메인 -->
    <div class="flex-1 flex flex-col">
      <header
        class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between"
      >
        <div>
          <p class="text-xs text-slate-400">
            {{ state.user.role === 'admin' ? '관리자 대시보드' : '내 대시보드' }}
          </p>
          <h1 class="text-lg font-semibold text-slate-900">원스톱 도매 대시보드</h1>
        </div>

        <div class="flex items-center gap-3 text-xs">
          <span class="text-slate-500">오늘 날짜: {{ todayText }}</span>
        </div>

        <!-- ⚠️ 여기(필터/조회 UI)는 “페이지로 옮기는 게 정석” -->
        <!-- 일단 유지하려면, 아래 버튼들이 호출하는 함수들이 Layout에 존재해야 함 -->
      </header>

      <main class="flex-1 overflow-y-auto p-6 bg-slate-100 thin-scrollbar">
        <router-view />

        <div
          v-if="state.loading"
          class="fixed bottom-4 right-4 bg-slate-900 text-white text-xs px-3 py-2 rounded-full shadow-lg flex items-center gap-2"
        >
          <span>대시보드 데이터 불러오는 중...</span>
        </div>

        <div
          v-if="state.error"
          class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-full shadow"
        >
          {{ state.error }}
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router'

const route = useRoute()
const router = useRouter()
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') // 보통 '' 또는 '/app'
const p = (path: string) => `${BASE}${path.startsWith('/') ? path : `/${path}`}`

type MenuItem = {
  label: string
  path: string
  roles: Array<'admin' | 'user'>
  badge?: string
}

const MENUS: MenuItem[] = [
  // User
  { label: '내 대시보드', path: p('/app/user'), roles: ['user'] }, // user 라우트 있을 경우

  // Admin (✔ router와 정확히 일치)
  { label: '관리자 대시보드', path: p('/app/admin'), roles: ['admin'] },
  { label: '재고관리', path: p('/app/admin/stock'), roles: ['admin'] },

  { label: '주문하기', path: p('/app/admin/orders/new'), roles: ['admin'] },
  { label: '주문관리', path: p('/app/admin/orders'), roles: ['admin']},
  { label: '상품관리', path: p('/app/admin/products'), roles: ['admin'] },
  { label: '공급사관리', path: p('/app/admin/providers'), roles: ['admin'], badge: '준비중' },
  { label: '리포트/통계', path: p('/app/admin/reports'), roles: ['admin'], badge: '준비중' },
  { label: '설정', path: p('/app/admin/settings'), roles: ['admin'], badge: '준비중' },
]

const visibleMenus = computed(() => {
  const role = state.user.role
  return MENUS.filter(m => m.roles.includes(role))
})

const isActive = (path: string) => {
  // /admin/stock/xxx 같은 확장도 active 처리
  return route.path === path || route.path.startsWith(path + '/')
}

const state = reactive({
  isLoggedIn: true, // 라우터 가드/로그인 페이지로 나중에 처리
  user: { id: '', name: '관리자', role: 'admin' },
  loading: false,
  error: null,
})

const logout = () => {
  state.isLoggedIn = false
  state.user = { id: '', name: '', role: 'user' }
}

const todayText = computed(() => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
})
</script>

<style>
.thin-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.thin-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.7);
  border-radius: 999px;
}
.thin-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
</style>
