<template>
    <div class="p-4">
      <!-- Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div>
          <h2 class="text-xl font-bold text-slate-900">상품관리</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            원스톱도매 등록 여부/옵션/가격을 한 화면에서 관리합니다.
          </p>
        </div>
  
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <div class="relative">
            <input
              v-model="keyword"
              class="border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm w-full sm:w-80 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="상품명/상품코드/옵션코드/품목명 검색"
              @keyup.enter="applySearch"
            />
            <svg
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1016.65 16.65z"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
  
          <select
            v-model.number="pageSize"
            class="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
            @change="changePageSize"
          >
            <option :value="100">100개</option>
            <option :value="200">200개</option>
            <option :value="500">500개</option>
            <option :value="1000">1000개</option>
          </select>
  
          <button
            class="rounded-xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.99] transition"
            @click="applySearch"
          >
            검색
          </button>
        </div>
      </div>
  
      <!-- Table -->
      <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div class="overflow-auto">
          <table class="w-full text-sm min-w-[980px]">
            <thead class="bg-slate-50 sticky top-0 z-10">
              <tr class="text-slate-700">
                <th class="p-3 text-left w-[72px]">#</th>
                <th class="p-3 text-left w-[90px]">이미지</th>
                <th class="p-3 text-left min-w-[260px]">상품/공급사</th>
                <th class="p-3 text-left min-w-[260px]">대표옵션</th>
                <th class="p-3 text-right w-[140px]">원가</th>
                <th class="p-3 text-right w-[140px]">판매가</th>
                <th class="p-3 text-center w-[140px]">옵션</th>
              </tr>
            </thead>
  
            <tbody>
              <template v-for="(g, idx) in list" :key="g.goods_seq">
                <!-- Main row -->
                <tr
                  class="border-t border-slate-100 hover:bg-slate-50 transition"
                  :class="{ 'bg-red-50/50 hover:bg-red-50': g.is_matched === 0 }"
                >
                  <td class="p-3 text-slate-600 tabular-nums">
                    {{ rowNo(idx) }}
                  </td>
  
                  <!-- Image (hover preview) -->
                  <td class="p-3">
                    <div class="relative group">
                      <img
                        v-if="g.image"
                        :src="g.image"
                        class="w-12 h-12 object-cover rounded-xl border border-slate-200 cursor-zoom-in bg-white"
                        loading="lazy"
                        @error="onImgError($event)"
                      />
  
                      <div
                        v-if="g.image"
                        class="absolute z-50 hidden group-hover:block left-14 top-0"
                      >
                        <div class="bg-white border border-slate-200 rounded-2xl shadow-xl p-2">
                          <img
                            :src="g.image"
                            class="w-60 h-60 object-contain rounded-xl bg-white"
                            @error="onImgError($event)"
                          />
                          <div class="text-[11px] text-slate-500 mt-2 px-1">
                            hover preview
                          </div>
                        </div>
                      </div>
  
                      <div
                        v-else
                        class="w-12 h-12 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400"
                      >
                        No Image
                      </div>
                    </div>
                  </td>
  
                  <!-- Product -->
                  <td class="p-3">
                    <div class="flex items-center gap-2">
                      <div class="font-semibold text-slate-900">
                        {{ g.goods_name }}
                      </div>
  
                      <span
                        v-if="g.is_matched === 0"
                        class="px-2 py-0.5 text-[11px] rounded-lg bg-red-100 text-red-600 font-semibold"
                      >
                        미등록
                      </span>
                      <span
                        v-else
                        class="px-2 py-0.5 text-[11px] rounded-lg bg-emerald-100 text-emerald-700 font-semibold"
                      >
                        등록됨
                      </span>
                    </div>
  
                    <div class="text-xs text-slate-500 mt-1">
                      <span class="font-medium">{{ g.goods_code }}</span>
                      <span class="mx-1 text-slate-300">/</span>
                      <span>{{ g.provider_name || '공급사 미지정' }}</span>
                    </div>
                  </td>
  
                  <!-- Rep option -->
                  <td class="p-3">
                    <div v-if="g.rep_option?.optioncode1">
                      <div class="font-medium text-slate-900">
                        {{ g.rep_option.option_title || '-' }}
                      </div>
                      <div class="text-xs text-slate-500 mt-1">
                        {{ g.rep_option.optioncode1 }}
                      </div>
                    </div>
  
                    <div v-else class="text-xs text-red-600 font-semibold">
                      대표옵션 없음
                    </div>
                  </td>
  
                  <!-- Prices -->
                  <td class="p-3 text-right tabular-nums">
                    <span v-if="g.rep_option?.cost_krw != null">
                      {{ money(g.rep_option?.cost_krw) }}
                    </span>
                    <span v-else class="text-slate-400">-</span>
                  </td>
  
                  <td class="p-3 text-right tabular-nums">
                    <span v-if="g.rep_option?.sale_price != null">
                      {{ money(g.rep_option?.sale_price) }}
                    </span>
                    <span v-else class="text-slate-400">-</span>
                  </td>
  
                  <!-- Options -->
                  <td class="p-3 text-center">
                    <button
                      v-if="(g.options?.length || 0) > 1"
                      class="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 transition"
                      @click="toggle(g.goods_seq)"
                    >
                      {{ opened[g.goods_seq] ? '옵션 닫기' : `옵션 ${g.options.length}개` }}
                    </button>
                    <span v-else class="text-xs text-slate-400">1개</span>
                  </td>
                </tr>
  
                <!-- Expanded options row -->
                <tr v-if="opened[g.goods_seq]" class="bg-slate-50 border-t border-slate-100">
                  <td colspan="7" class="p-3">
                    <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                      <div class="px-3 py-2 bg-slate-50 flex items-center justify-between">
                        <div class="text-xs text-slate-600">
                          옵션 상세 (총 <span class="font-semibold">{{ g.options.length }}</span>개)
                        </div>
                        <div v-if="g.is_matched === 0" class="text-xs text-red-600 font-semibold">
                          일부/전체 옵션이 원스톱도매 미등록일 수 있습니다.
                        </div>
                      </div>
  
                      <div class="overflow-auto">
                        <table class="w-full text-xs min-w-[760px]">
                          <thead>
                            <tr class="text-slate-600 bg-white">
                              <th class="p-2 text-left w-[80px]">옵션SEQ</th>
                              <th class="p-2 text-left w-[160px]">옵션코드</th>
                              <th class="p-2 text-left">품목명</th>
                              <th class="p-2 text-right w-[120px]">원가</th>
                              <th class="p-2 text-right w-[120px]">판매가</th>
                              <th class="p-2 text-center w-[120px]">상태</th>
                            </tr>
                          </thead>
  
                          <tbody>
                            <tr
                              v-for="o in g.options"
                              :key="o.option_seq"
                              class="border-t border-slate-100 hover:bg-slate-50 transition"
                            >
                              <td class="p-2 tabular-nums text-slate-700">
                                {{ o.option_seq }}
                              </td>
                              <td class="p-2 font-semibold text-slate-900">
                                {{ o.optioncode1 }}
                              </td>
                              <td class="p-2 text-slate-700">
                                {{ o.item_name || o.option_title || '-' }}
                              </td>
  
                              <td class="p-2 text-right tabular-nums">
                                <span v-if="o.cost_krw != null">{{ money(o.cost_krw) }}</span>
                                <span v-else class="text-slate-400">-</span>
                              </td>
                              <td class="p-2 text-right tabular-nums">
                                <span v-if="o.sale_price != null">{{ money(o.sale_price) }}</span>
                                <span v-else class="text-slate-400">-</span>
                              </td>
  
                              <td class="p-2 text-center">
                                <span
                                  v-if="o.cost_krw == null || o.sale_price == null"
                                  class="px-2 py-0.5 text-[11px] rounded-lg bg-amber-100 text-amber-700 font-semibold"
                                >
                                  매칭 필요
                                </span>
                                <span
                                  v-else
                                  class="px-2 py-0.5 text-[11px] rounded-lg bg-emerald-100 text-emerald-700 font-semibold"
                                >
                                  매칭됨
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
  
              <tr v-if="loading">
                <td colspan="7" class="p-8 text-center text-slate-500">
                  불러오는 중...
                </td>
              </tr>
  
              <tr v-if="!loading && list.length === 0">
                <td colspan="7" class="p-8 text-center text-slate-500">
                  데이터가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
  
      <!-- Pagination -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4">
        <div class="text-sm text-slate-600">
          총 {{ (pagination.totalCount || 0).toLocaleString() }}개 / {{ pagination.totalPages }}페이지
        </div>
  
        <div class="flex items-center gap-2">
          <button
            class="border border-slate-200 rounded-xl px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition"
            :disabled="page <= 1 || loading"
            @click="go(page - 1)"
          >
            이전
          </button>
  
          <div class="text-sm text-slate-700 tabular-nums">
            Page <span class="font-semibold">{{ page }}</span> / {{ pagination.totalPages }}
          </div>
  
          <button
            class="border border-slate-200 rounded-xl px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition"
            :disabled="page >= pagination.totalPages || loading"
            @click="go(page + 1)"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted } from 'vue'
  import { fetchAdminProducts } from '@/api/adminProducts'
  
  const keyword = ref('')
  const page = ref(1)
  const pageSize = ref(100)
  const loading = ref(false)
  
  const list = ref([])
  const pagination = reactive({ totalCount: 0, totalPages: 1 })
  
  // 옵션 펼침 상태
  const opened = reactive({})
  
  const toggle = (goodsSeq) => {
    opened[goodsSeq] = !opened[goodsSeq]
  }
  
  const money = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '-'
    return n.toLocaleString()
  }
  
  const rowNo = (idx) => (page.value - 1) * pageSize.value + (idx + 1)
  
  const load = async () => {
    loading.value = true
    try {
      const res = await fetchAdminProducts({
        keyword: keyword.value,
        page: page.value,
        pageSize: pageSize.value,
      })
  
      list.value = res.data?.data ?? []
      const pg = res.data?.pagination ?? {}
      pagination.totalCount = pg.totalCount ?? 0
      pagination.totalPages = pg.totalPages ?? 1
  
      // 페이지 바뀔 때 열린 옵션 초기화
      for (const k of Object.keys(opened)) delete opened[k]
    } finally {
      loading.value = false
    }
  }
  
  const applySearch = () => {
    page.value = 1
    load()
  }
  
  const changePageSize = () => {
    page.value = 1
    load()
  }
  
  const go = (p) => {
    page.value = p
    load()
  }
  
  // 이미지 에러 시 깨진 아이콘 방지
  const onImgError = (e) => {
    const el = e?.target
    if (el && el.tagName === 'IMG') {
      el.style.display = 'none'
    }
  }
  
  onMounted(load)
  </script>
  