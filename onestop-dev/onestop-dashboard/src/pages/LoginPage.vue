<template>
  <div class="m-auto w-full max-w-md px-4 py-10">
    <div class="bg-white rounded-2xl shadow-md border border-slate-100 p-7">
      <h1 class="text-2xl font-bold text-slate-900 text-center mb-2">원스톱 도매 대시보드</h1>
      <p class="text-xs text-slate-500 text-center mb-6">
        추후 fm_member 연동 예정 / 현재는 데모 로그인입니다.
      </p>

      <form @submit.prevent="demoLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1"> 아이디 </label>
          <input
            v-model="loginForm.id"
            type="text"
            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1"> 비밀번호 </label>
          <input
            v-model="loginForm.password"
            type="password"
            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1"> 역할 (데모용) </label>
          <select
            v-model="loginForm.role"
            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="user">일반 사용자(구매자)</option>
            <option value="admin">관리자</option>
          </select>
        </div>

        <button
          type="submit"
          class="w-full mt-3 bg-slate-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800 active:scale-[0.99] transition"
        >
          로그인
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const loginForm = reactive({
  id: '',
  password: '',
  role: 'user',
})

// ✅ 데모 로그인: role에 따라 라우팅만 해줌
const demoLogin = async () => {
  // TODO: 나중에 fm_member 연동 시 여기서 API 호출 후 토큰/세션 처리

  if (loginForm.role === 'admin') {
    router.push('/app/admin')
  } else {
    router.push('/app/user') // 유저 페이지 라우트가 있으면
  }
}
</script>
