<template>
    <div class="p-4">
      <!-- Header -->
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div>
          <h2 class="text-xl font-bold">주문관리</h2>
          <p class="text-xs text-slate-500 mt-1">
            주문 제출 내역(헤더)과 주문 상세(아이템)를 확인합니다.
          </p>
        </div>
  
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="status" class="border rounded-lg px-3 py-2 text-sm bg-white" @change="apply">
            <option value="">전체 상태</option>
            <option value="submitted">submitted</option>
            <option value="confirmed">confirmed</option>
            <option value="canceled">canceled</option>
            <option value="done">done</option>
          </select>
  
          <input v-model="from" type="date" class="border rounded-lg px-3 py-2 text-sm bg-white" @change="apply" />
          <input v-model="to" type="date" class="border rounded-lg px-3 py-2 text-sm bg-white" @change="apply" />
  
          <input
            v-model="keyword"
            class="border rounded-lg px-3 py-2 text-sm w-[280px]"
            placeholder="주문번호/메모 검색"
            @keyup.enter="apply"
          />
  
          <select v-model.number="pageSize" class="border rounded-lg px-3 py-2 text-sm bg-white" @change="apply">
            <option :value="20">20개</option>
            <option :value="50">50개</option>
            <option :value="100">100개</option>
            <option :value="200">200개</option>
          </select>
  
          <button
            class="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            @click="apply"
          >
            검색
          </button>
        </div>
      </div>
  
      <!-- Main -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        <!-- List -->
        <div class="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b flex items-center justify-between">
            <div class="text-sm font-semibold">주문 리스트</div>
            <div class="text-xs text-slate-500">
              총 {{ pagination.totalCount.toLocaleString() }}개 / {{ pagination.totalPages }}페이지
              <span v-if="loading" class="ml-2">불러오는 중...</span>
            </div>
          </div>
  
          <div class="overflow-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-slate-700">
                <tr>
                  <th class="p-3 text-left w-[90px]">ID</th>
                  <th class="p-3 text-left w-[170px]">주문번호</th>
                  <th class="p-3 text-left w-[160px]">주문일시</th>
                  <th class="p-3 text-left w-[120px]">상태</th>
                  <th class="p-3 text-right w-[110px]">수량</th>
                  <th class="p-3 text-right w-[140px]">총 원가</th>
                  <th class="p-3 text-right w-[140px]">총 판매</th>
                  <th class="p-3 text-left">메모</th>
                </tr>
              </thead>
  
              <tbody>
                <tr
                  v-for="o in orders"
                  :key="o.id"
                  class="border-t hover:bg-slate-50 cursor-pointer"
                  :class="selected?.id === o.id ? 'bg-slate-50' : ''"
                  @click="openDetail(o.id)"
                >
                  <td class="p-3 tabular-nums">{{ o.id }}</td>
  
                  <td class="p-3">
                    <div class="font-semibold">{{ o.order_no || '-' }}</div>
                    <button
                      v-if="o.order_no"
                      class="text-[11px] text-slate-500 hover:text-slate-900 underline mt-1"
                      @click.stop="copy(o.order_no)"
                    >
                      주문번호 복사
                    </button>
                  </td>
  
                  <td class="p-3 text-xs text-slate-700">
                    {{ formatDT(o.ordered_at) }}
                  </td>
  
                  <td class="p-3">
                    <span :class="badgeClass(o.status)" class="px-2 py-1 rounded-full text-xs font-semibold">
                      {{ o.status }}
                    </span>
                  </td>
  
                  <td class="p-3 text-right tabular-nums">{{ Number(o.total_qty || 0).toLocaleString() }}</td>
                  <td class="p-3 text-right tabular-nums">{{ money(o.total_cost_krw) }}</td>
                  <td class="p-3 text-right tabular-nums">{{ money(o.total_sale_krw) }}</td>
  
                  <td class="p-3 text-xs text-slate-600">
                    <div class="line-clamp-2">{{ o.memo || '-' }}</div>
                  </td>
                </tr>
  
                <tr v-if="!loading && orders.length === 0">
                  <td colspan="8" class="p-10 text-center text-slate-500">
                    주문 내역이 없습니다.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
  
          <!-- pagination -->
          <div class="px-4 py-3 border-t flex items-center justify-between">
            <div class="text-xs text-slate-500">
                총 {{ pagination.totalCount.toLocaleString() }}개
            </div>
  
            <div class="flex items-center gap-2">
              <button class="border rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
                      :disabled="page<=1" @click="go(page-1)">
                이전
              </button>
              <div class="text-sm tabular-nums">Page {{ page }} / {{ pagination.totalPages }}</div>
              <button class="border rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
                      :disabled="page>=pagination.totalPages" @click="go(page+1)">
                다음
              </button>
            </div>
          </div>
        </div>
  
        <!-- Detail panel -->
        <div class="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b flex items-center justify-between">
            <div class="text-sm font-semibold">주문 상세</div>
            <button v-if="selected" class="text-xs text-slate-500 hover:text-slate-900" @click="selected=null">
              닫기
            </button>
          </div>
  
          <div v-if="!selected" class="p-8 text-center text-slate-500 text-sm">
            왼쪽에서 주문을 클릭하면 상세가 표시됩니다.
          </div>
  
          <div v-else class="p-4 space-y-4">
            <!-- header summary -->
            <div class="border rounded-2xl p-4 bg-slate-50">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-xs text-slate-500">주문번호</div>
                  <div class="text-lg font-bold truncate">{{ selected.order.order_no }}</div>
                  <div class="text-xs text-slate-500 mt-1">
                    주문일시: {{ formatDT(selected.order.ordered_at) }}
                  </div>
                </div>
  
                <div class="text-right">
                  <span :class="badgeClass(selected.order.status)"
                        class="px-2 py-1 rounded-full text-xs font-semibold">
                    {{ selected.order.status }}
                  </span>
                  <div class="mt-2 text-xs text-slate-500">
                    ID: <span class="tabular-nums">{{ selected.order.id }}</span>
                  </div>
                </div>
              </div>
  
              <div class="grid grid-cols-3 gap-3 mt-4">
                <div class="bg-white border rounded-xl p-3">
                  <div class="text-[11px] text-slate-500">총 수량</div>
                  <div class="text-base font-bold tabular-nums">
                    {{ Number(selected.order.total_qty || 0).toLocaleString() }}
                  </div>
                </div>
                <div class="bg-white border rounded-xl p-3">
                  <div class="text-[11px] text-slate-500">총 원가</div>
                  <div class="text-base font-bold tabular-nums">
                    {{ money(selected.order.total_cost_krw) }}
                  </div>
                </div>
                <div class="bg-white border rounded-xl p-3">
                  <div class="text-[11px] text-slate-500">총 판매</div>
                  <div class="text-base font-bold tabular-nums">
                    {{ money(selected.order.total_sale_krw) }}
                  </div>
                </div>
              </div>
  
              <div class="mt-3 text-xs text-slate-600">
                <div class="font-semibold mb-1">메모</div>
                <div class="whitespace-pre-wrap">{{ selected.order.memo || '-' }}</div>
              </div>
            </div>
  
            <!-- grouped items -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="text-sm font-bold">주문 아이템</div>
                <div class="text-xs text-slate-500">
                  {{ selected.items.length }}개 라인
                </div>
              </div>
  
              <div v-for="g in groupedItems" :key="g.key" class="border rounded-2xl overflow-hidden">
                <div class="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
                  <div class="font-semibold">
                    {{ g.provider_name }}
                  </div>
                  <div class="text-xs text-slate-600">
                    소계 수량 {{ g.sub.totalQty.toLocaleString() }} /
                    원가 {{ money(g.sub.totalCost) }} /
                    판매 {{ money(g.sub.totalSale) }}
                  </div>
                </div>
  
                <div class="overflow-auto">
                  <table class="w-full text-xs">
                    <thead class="bg-white text-slate-600">
                      <tr>
                        <th class="p-3 text-left w-[90px]">상품코드</th>
                        <th class="p-3 text-left">품목명</th>
                        <th class="p-3 text-left w-[150px]">match_code</th>
                        <th class="p-3 text-right w-[80px]">수량</th>
                        <th class="p-3 text-right w-[110px]">원가</th>
                        <th class="p-3 text-right w-[110px]">판매</th>
                        <th class="p-3 text-right w-[120px]">라인원가</th>
                        <th class="p-3 text-right w-[120px]">라인판매</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="it in g.items" :key="it.id" class="border-t">
                        <td class="p-3 font-mono">{{ it.product_code }}</td>
                        <td class="p-3">
                          <div class="font-semibold text-sm">{{ it.item_name || it.product_name }}</div>
                          <div class="text-[11px] text-slate-500">{{ it.product_name }}</div>
                        </td>
                        <td class="p-3 font-mono text-[11px]">{{ it.match_code }}</td>
                        <td class="p-3 text-right tabular-nums">{{ Number(it.qty || 0).toLocaleString() }}</td>
                        <td class="p-3 text-right tabular-nums">{{ money(it.cost_krw) }}</td>
                        <td class="p-3 text-right tabular-nums">{{ money(it.sale_price) }}</td>
                        <td class="p-3 text-right tabular-nums">{{ money(it.line_cost_krw) }}</td>
                        <td class="p-3 text-right tabular-nums">{{ money(it.line_sale_krw) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
  
              <div class="text-xs text-slate-500 px-1">
                * 주문 아이템은 제출 시점 스냅샷입니다.
              </div>
            </div>
          </div>
  
          <div v-if="detailLoading" class="px-4 pb-4 text-xs text-slate-500">
            상세 불러오는 중...
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed, onMounted } from 'vue'
  import { fetchOrders, fetchOrderDetail } from '@/api/order'
  
  const keyword = ref('')
  const status = ref('')
  const from = ref('')
  const to = ref('')
  
  const page = ref(1)
  const pageSize = ref(50)
  
  const loading = ref(false)
  const detailLoading = ref(false)
  
  const orders = ref([])
  const pagination = reactive({ totalCount: 0, totalPages: 1 })
  
  // selected detail: { order, items }
  const selected = ref(null)
  
  const money = (v) => Number(v || 0).toLocaleString()
  
  const formatDT = (v) => {
    if (!v) return '-'
    // v가 "YYYY-MM-DD HH:mm:ss" 형태일 가능성이 높음
    return String(v).replace('T', ' ').slice(0, 19)
  }
  
  const badgeClass = (s) => {
    const v = String(s || '')
    if (v === 'submitted') return 'bg-blue-50 text-blue-700 border border-blue-100'
    if (v === 'confirmed') return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
    if (v === 'canceled') return 'bg-rose-50 text-rose-700 border border-rose-100'
    if (v === 'done') return 'bg-slate-200 text-slate-700 border border-slate-300'
    return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
  
  const load = async () => {
    loading.value = true
    try {
      const res = await fetchOrders({
        keyword: keyword.value,
        status: status.value,
        from: from.value,
        to: to.value,
        page: page.value,
        pageSize: pageSize.value,
      })
  
      orders.value = res.data?.data ?? []
      const pg = res.data?.pagination ?? {}
      pagination.totalCount = pg.totalCount ?? 0
      pagination.totalPages = pg.totalPages ?? 1
  
      // 현재 선택된 주문이 페이지 바뀌며 사라질 수 있으니 그대로 유지하되,
      // 원하면 여기서 selected를 null로 초기화할 수 있음.
    } finally {
      loading.value = false
    }
  }
  
  const apply = () => {
    page.value = 1
    load()
  }
  
  const go = (p) => {
    page.value = p
    load()
  }
  
  const openDetail = async (orderId) => {
    if (!orderId) return
    detailLoading.value = true
    try {
      const res = await fetchOrderDetail(orderId)
      selected.value = {
        order: res.data?.order,
        items: res.data?.items ?? [],
      }
    } finally {
      detailLoading.value = false
    }
  }
  
  const groupedItems = computed(() => {
    if (!selected.value) return []
    const items = selected.value.items || []
    const m = new Map()
  
    for (const it of items) {
      const key = String(it.provider_seq ?? 'null')
      if (!m.has(key)) {
        m.set(key, {
          key,
          provider_seq: it.provider_seq ?? null,
          provider_name: it.provider_name || '공급사 미지정',
          items: [],
          sub: { totalQty: 0, totalCost: 0, totalSale: 0 },
        })
      }
      const g = m.get(key)
      g.items.push(it)
  
      const q = Number(it.qty || 0)
      g.sub.totalQty += q
      g.sub.totalCost += Number(it.line_cost_krw || 0)
      g.sub.totalSale += Number(it.line_sale_krw || 0)
    }
  
    // provider_seq null은 뒤로 보내고, 나머지는 숫자 정렬
    const arr = Array.from(m.values())
    arr.sort((a, b) => {
      const an = a.provider_seq === null ? 1e15 : Number(a.provider_seq)
      const bn = b.provider_seq === null ? 1e15 : Number(b.provider_seq)
      return an - bn
    })
    return arr
  })
  
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text))
      alert('복사되었습니다.')
    } catch (e) {
      console.error(e)
      alert('복사 실패: 브라우저 권한을 확인해주세요.')
    }
  }
  
  onMounted(load)
  </script>
  
  <style scoped>
  /* tailwind line-clamp 없을 때 대비 (있으면 무시됨) */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  </style>
  