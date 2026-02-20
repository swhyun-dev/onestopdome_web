<template>
    <div class="p-4">
      <!-- Header -->
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900">주문하기</h2>
          <p class="text-xs text-slate-500 mt-1">
            공급사/상품을 선택하고 옵션별 수량을 입력하여 주문서를 제출합니다.
          </p>
        </div>
  
        <div class="flex flex-wrap items-center gap-2">
          <!-- Provider filter -->
          <select
            v-model="providerSeq"
            class="border rounded-lg px-3 py-2 text-sm bg-white"
            @change="apply"
          >
            <option value="0">전체 공급사</option>
            <option value="null">공급사 미지정</option>
            <option v-for="p in providers" :key="p.provider_seq" :value="String(p.provider_seq)">
              {{ p.provider_name }}
            </option>
          </select>
  
          <!-- Search -->
          <input
            v-model="keyword"
            class="border rounded-lg px-3 py-2 text-sm w-[320px]"
            placeholder="상품코드/상품명/품목명/match_code 검색"
            @keyup.enter="apply"
          />
  
          <!-- Page size -->
          <select
            v-model.number="pageSize"
            class="border rounded-lg px-3 py-2 text-sm bg-white"
            @change="apply"
          >
            <option :value="100">100개</option>
            <option :value="200">200개</option>
            <option :value="500">500개</option>
            <option :value="1000">1000개</option>
          </select>
  
          <button
            class="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            @click="apply"
          >
            검색
          </button>
        </div>
      </div>
    <!-- Sticky Price Guide (Header 아래 / Main layout 위) -->
<div class="sticky top-0 z-40 -mx-4 px-4 pt-3 pb-3 bg-white/90 backdrop-blur border-b mb-4">
  <div class="max-w-[1400px] mx-auto">
    <div class="rounded-2xl border bg-gradient-to-r from-slate-50 to-white shadow-sm overflow-hidden">
      <div class="p-4 md:p-5">
        <!-- top row -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="shrink-0 w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-black">
              ₩
            </div>

            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-extrabold text-slate-900">가격 기준 안내</span>
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border">
                  매달 환율계수 업데이트
                </span>
              </div>

              <div class="text-xs text-slate-600 mt-1">
                <span class="font-semibold text-slate-900">공급가(원화)</span>는
                <span class="font-semibold text-slate-900">원가(위안화)</span>에
                물류/마진/환율계수를 반영한 값입니다.
              </div>
            </div>
          </div>

          <!-- FX chip -->
          <div class="flex items-center gap-2">
            <div class="rounded-xl border bg-white px-3 py-2">
              <div class="text-[11px] text-slate-500">금일 환율</div>
              <div class="text-sm font-extrabold tabular-nums text-slate-900">
                {{ fxText }}
              </div>
              <div v-if="fxSourceNote" class="text-[10px] text-slate-500 mt-0.5">
                {{ fxSourceNote }}
              </div>
            </div>
          </div>
        </div>

        <!-- formula row -->
        <div class="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-stretch">
          <div class="rounded-2xl border bg-white p-4">
            <div class="text-[11px] text-slate-500 mb-2">한눈에 보는 계산 방식</div>

            <div class="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
              <span class="px-2 py-1 rounded-lg bg-slate-50 border">원가(위안화)</span>
              <span class="text-slate-400">×</span>
              <span class="px-2 py-1 rounded-lg bg-slate-50 border">물류 330원</span>
              <span class="text-slate-400">×</span>
              <span class="px-2 py-1 rounded-lg bg-slate-50 border">마진 35%</span>
              <span class="text-slate-400">×</span>
              <span class="px-2 py-1 rounded-lg bg-slate-50 border">
                환율계수 <span class="font-extrabold text-slate-900">(1.095)</span>
                </span>
            </div>

            <div class="mt-2 text-xs text-slate-600">
              ※ 실제 계산은 시스템에서 처리되며, 화면에서는 <span class="font-semibold text-slate-900">표시 기준</span>만 안내합니다.
            </div>
          </div>

          <div class="rounded-2xl border bg-amber-50 p-4 flex flex-col justify-between">
            <div>
              <div class="text-[11px] text-amber-800 font-semibold">표기 단위</div>
              <div class="mt-2 text-sm text-amber-900 font-bold">
                원가(위안화): <span class="tabular-nums">¥</span> 표기<br />
                공급가(원화): <span class="tabular-nums">₩</span> 표기
              </div>
            </div>
            <div class="mt-3 text-[11px] text-amber-800">
              원가/공급가 기준은 옵션별로 다를 수 있어요.
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</div>

      <!-- Main layout: Grid + Sticky Summary -->
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">
        <!-- LEFT: Product grid -->
        <div class="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 border-b flex items-center justify-between">
            <div class="text-sm font-semibold text-slate-900">상품 리스트</div>
            <div class="text-xs text-slate-500">
              총 {{ pagination.totalCount.toLocaleString() }}개 / {{ pagination.totalPages }}페이지
              <span v-if="loading" class="ml-2">불러오는 중...</span>
            </div>
          </div>
  
          <div class="p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
              <div
                v-for="row in grouped"
                :key="row.key"
                class="group border rounded-2xl bg-white hover:shadow-md transition overflow-hidden"
              >
                <!-- image -->
                <div class="relative">
                    <div class="aspect-[4/3] bg-slate-50">
                        <img
                        v-if="row.image"
                        :src="row.image"
                        class="w-full h-full object-cover"
                        loading="lazy"
                        />
                        <div
                        v-else
                        class="w-full h-full flex items-center justify-center text-slate-400 text-sm"
                        >
                        No Image
                        </div>
                    </div>

                    <!-- badges -->
                    <div class="absolute left-3 top-3 flex gap-2">
                        <span
                        v-if="row.is_registered === 0"
                        class="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100"
                        >
                        미등록
                        </span>
                    </div>
                    </div>

  
                <!-- content -->
                <div class="p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="font-bold text-slate-900 truncate">
                        {{ row.product_name }}
                      </div>
                      <div class="text-xs text-slate-500 mt-1">
                        <span class="font-mono">{{ row.product_code }}</span>
                        <span class="mx-2">/</span>
                        <span class="font-semibold">{{ row.provider_name || '공급사 미지정' }}</span>
                      </div>
                      <div class="text-[11px] text-slate-500 mt-1 truncate">
                        대표옵션: {{ row.first_item_name || '-' }}
                      </div>
                    </div>
  
                    <div class="text-right text-[11px] text-slate-500 whitespace-nowrap">
                      <div v-if="row.goods_seq">goods_seq {{ row.goods_seq }}</div>
                      <div v-else>fm_goods 매칭 없음</div>
                    </div>
                  </div>
  
                  <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div class="rounded-xl bg-slate-50 border px-3 py-2">
                        <div class="text-[11px] text-slate-500">원가(위안화)</div>
                        <div class="font-bold tabular-nums text-slate-900">
                        ¥ {{ num(row.cost_cny) }}
                    </div>
                   </div>

                    <div class="rounded-xl bg-slate-50 border px-3 py-2">
                        <div class="text-[11px] text-slate-500">공급가(원화)</div>
                        <div class="font-bold tabular-nums text-slate-900">
                        ₩ {{ money(row.sale_price) }}
                        </div>
                    </div>
                    </div>
  
                  <div class="mt-3 flex items-center justify-between">
                    <div class="text-xs text-slate-500">
                      선택수량 <span class="font-bold tabular-nums text-slate-900">{{ rowSelectedQty(row) }}</span>
                    </div>
  
                    <button
                      class="px-3 py-2 text-xs font-semibold rounded-lg border bg-white hover:bg-slate-50"
                      @click="openOptions(row)"
                    >
                      옵션 {{ row.items.length }}개 보기
                    </button>
                  </div>
                </div>
              </div>
            </div>
  
            <div v-if="!loading && grouped.length === 0" class="py-12 text-center text-slate-500">
              데이터가 없습니다.
            </div>
          </div>
  
          <!-- pagination -->
          <div class="px-4 py-3 border-t flex items-center justify-between">
            <div class="text-xs text-slate-500">
              Page {{ page }} / {{ pagination.totalPages }}
            </div>
  
            <div class="flex items-center gap-2">
              <button
                class="border rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
                :disabled="page <= 1"
                @click="go(page - 1)"
              >
                이전
              </button>
              <button
                class="border rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
                :disabled="page >= pagination.totalPages"
                @click="go(page + 1)"
              >
                다음
              </button>
            </div>
          </div>
        </div>
  
        <!-- RIGHT: Sticky summary -->
        <div class="sticky top-4">
            <div class="bg-white border rounded-2xl shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b">
                <div class="text-sm font-bold text-slate-900">주문 합계</div>
                <div class="text-xs text-slate-500 mt-1">
                    원가(위안화)/공급가(원화) 기준으로 합계를 표시합니다.
                </div>
                </div>

                <div class="p-4 space-y-3">
                <!-- counts -->
                <div class="rounded-2xl border bg-slate-50 p-3">
                    <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-600">선택 옵션(라인)</span>
                    <span class="font-bold tabular-nums text-slate-900">
                        {{ totals.totalLines.toLocaleString() }}
                    </span>
                    </div>
                    <div class="flex items-center justify-between text-sm mt-1">
                    <span class="text-slate-600">총 수량</span>
                    <span class="font-bold tabular-nums text-slate-900">
                        {{ totals.totalQty.toLocaleString() }}
                    </span>
                    </div>
                </div>

                <!-- totals -->
                <div class="rounded-2xl border bg-white p-3">
                    <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-600">원가 합계(위안)</span>
                    <span class="font-bold tabular-nums text-slate-900">
                        ¥ {{ num(totals.totalCostCny) }}
                    </span>
                    </div>

                    <div class="flex items-center justify-between text-sm mt-1">
                    <span class="text-slate-600">공급가 합계(원화)</span>
                    <span class="font-bold tabular-nums text-slate-900">
                        {{ money(totals.totalSale) }}
                    </span>
                    </div>

                    <div class="mt-2 text-[11px] text-slate-500 leading-relaxed">
                    * 공급가는 원가(위안)와 물류비/마진/환율계수 기준으로 산정됩니다.
                    </div>
                </div>

                <!-- memo -->
                <div>
                    <label class="text-xs font-semibold text-slate-600">메모 (선택)</label>
                    <textarea
                    v-model="memo"
                    class="mt-1 w-full border rounded-xl p-3 text-sm min-h-[90px] resize-none"
                    placeholder="예) 다음주 월요일 출고 부탁 / 급건 등"
                    />
                </div>

                <!-- actions -->
                <div class="flex gap-2">
                    <button
                    class="flex-1 px-4 py-2 text-sm font-semibold rounded-xl border hover:bg-slate-50 disabled:opacity-40"
                    @click="clearCart"
                    :disabled="totals.totalQty === 0"
                    >
                    비우기
                    </button>

                    <button
                    class="flex-1 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
                    @click="submit"
                    :disabled="submitting || totals.totalQty === 0"
                    >
                    {{ submitting ? '제출 중...' : '주문서 제출' }}
                    </button>
                </div>

                <!-- mini cart preview -->
                <div class="pt-2">
                    <div class="text-xs font-semibold text-slate-600 mb-2">선택 항목 미리보기</div>

                    <div v-if="cartPreview.length === 0" class="text-xs text-slate-500">
                    아직 선택된 옵션이 없습니다.
                    </div>

                    <div v-else class="space-y-2 max-h-[260px] overflow-auto pr-1">
                    <div
                        v-for="c in cartPreview"
                        :key="c.match_code"
                        class="border rounded-2xl p-3 bg-white"
                    >
                        <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <div class="text-xs font-mono text-slate-600 truncate">{{ c.match_code }}</div>
                            <div class="text-sm font-semibold text-slate-900 truncate">
                            {{ c.item_name || c.product_name }}
                            </div>

                            <div class="text-xs text-slate-500 mt-1">
                            원가(¥) {{ num(c.cost_cny) }} / 공급가(₩) {{ money(c.sale_price) }}
                            </div>
                        </div>

                        <div class="text-right">
                            <div class="text-sm font-bold tabular-nums">{{ c.qty }}</div>
                            <button
                            class="text-[11px] text-slate-500 hover:text-slate-900 mt-1"
                            @click="removeFromCart(c.match_code)"
                            >
                            삭제
                            </button>
                        </div>
                        </div>
                    </div>
                    </div>
                </div>

                </div>
            </div>
            </div>
      </div>
  
      <!-- Options Modal -->
        <div v-if="modal.open" class="fixed inset-0 z-50">
        <!-- backdrop -->
        <div class="absolute inset-0 bg-black/40" @click="closeModal"></div>

        <!-- modal -->
        <div class="absolute inset-0 flex items-center justify-center p-4">
            <div
            class="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border overflow-hidden
                    max-h-[85vh] flex flex-col"
            @click.stop
            >
            <!-- header (sticky) -->
            <div class="sticky top-0 z-10 bg-white px-5 py-4 border-b flex items-start justify-between gap-3">
                <div class="min-w-0">
                <div class="text-xs text-slate-500">옵션 선택</div>
                <div class="text-lg font-bold truncate text-slate-900">
                    {{ modal.product?.product_name }}
                </div>
                <div class="text-xs text-slate-500 mt-1">
                    {{ modal.product?.product_code }} / {{ modal.product?.provider_name || '공급사 미지정' }}
                    <span v-if="modal.product?.is_registered === 0" class="ml-2 text-amber-700">
                    (미등록: fm_goods 매칭 없음)
                    </span>
                </div>
                </div>

                <button class="text-sm text-slate-500 hover:text-slate-900" @click="closeModal">
                닫기
                </button>
            </div>

            <!-- body (scroll only here) -->
            <div class="p-5 overflow-y-auto flex-1">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div class="flex items-center gap-3">
                    <div class="relative">
                    <img
                        v-if="modal.product?.image"
                        :src="modal.product.image"
                        class="w-16 h-16 rounded-xl border object-cover"
                    />
                    <div v-else class="w-16 h-16 rounded-xl border bg-slate-100" />
                    </div>

                    <div class="text-xs text-slate-600">
                    <div>
                        기준 원가(위안):
                        <span class="font-semibold tabular-nums">¥ {{ num(modal.product?.cost_cny) }}</span>
                    </div>
                    <div>
                        기준 공급가(원화):
                        <span class="font-semibold tabular-nums">{{ money(modal.product?.sale_price) }}</span>
                    </div>
                    </div>
                </div>

                <input
                    v-model="modal.search"
                    class="border rounded-lg px-3 py-2 text-sm w-full md:w-[360px]"
                    placeholder="옵션/품목명/옵션코드 검색"
                />
                </div>

                <div class="border rounded-xl overflow-hidden">
                <table class="w-full text-sm">
                    <thead class="bg-slate-50 text-slate-700">
                    <tr>
                        <th class="p-3 text-left w-[180px]">옵션코드(match_code)</th>
                        <th class="p-3 text-left">품목명</th>
                        <th class="p-3 text-right w-[120px]">원가(¥)</th>
                        <th class="p-3 text-right w-[130px]">공급가(₩)</th>
                        <th class="p-3 text-center w-[160px]">수량</th>
                    </tr>
                    </thead>

                    <tbody>
                    <tr
                        v-for="it in modalFiltered"
                        :key="it.match_code"
                        class="border-t hover:bg-slate-50"
                    >
                        <td class="p-3 font-mono text-xs">{{ it.match_code }}</td>
                        <td class="p-3">
                        <div class="font-semibold text-slate-900">{{ it.item_name }}</div>
                        <div class="text-[11px] text-slate-500">{{ it.product_name }}</div>
                        </td>

                        <td class="p-3 text-right tabular-nums">¥ {{ num(it.cost_cny) }}</td>
                        <td class="p-3 text-right tabular-nums">{{ money(it.sale_price) }}</td>

                        <td class="p-3">
                        <div class="flex items-center justify-center gap-2">
                            <button class="w-8 h-8 rounded-lg border hover:bg-white" @click="stepQty(it.match_code, -1)">-</button>
                            <input
                            class="w-16 text-center border rounded-lg py-2 tabular-nums"
                            type="number"
                            min="0"
                            v-model.number="modal.qtyDraft[it.match_code]"
                            />
                            <button class="w-8 h-8 rounded-lg border hover:bg-white" @click="stepQty(it.match_code, +1)">+</button>
                        </div>
                        </td>
                    </tr>

                    <tr v-if="modalFiltered.length === 0">
                        <td colspan="5" class="p-10 text-center text-slate-500">옵션이 없습니다.</td>
                    </tr>
                    </tbody>
                </table>
                </div>
            </div>

            <!-- footer (sticky) -->
            <div class="sticky bottom-0 z-10 bg-white px-5 py-4 border-t">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div class="text-xs text-slate-600">
                    이 상품 선택 수량:
                    <span class="font-bold tabular-nums">{{ modalSelectedTotal }}</span>
                    / 라인원가(¥):
                    <span class="font-bold tabular-nums">¥ {{ num(modalSelectedCostCny) }}</span>
                    / 라인공급가(₩):
                    <span class="font-bold tabular-nums">{{ money(modalSelectedSale) }}</span>
                </div>

                <div class="flex items-center justify-end gap-2">
                    <button
                    class="px-4 py-2 text-sm font-semibold rounded-lg border hover:bg-slate-50"
                    @click="closeModal"
                    >
                    취소
                    </button>

                    <button
                    class="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                    @click="confirmModal"
                    >
                    확인(반영)
                    </button>
                </div>
                </div>
            </div>

            </div>
        </div>
        </div>

  
      <!-- bottom spacer -->
      <div class="h-6"></div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed, onMounted } from 'vue'
  import { fetchProviders } from '@/api/dashboard'
  import { fetchOrderProducts, submitOrder } from '@/api/order'

  const num = (v) => Number(v || 0).toLocaleString()
  const keyword = ref('')
  const providerSeq = ref('0')
  
  const page = ref(1)
  const pageSize = ref(200)
  const loading = ref(false)
  
  const raw = ref([]) // option-level rows
  const pagination = reactive({ totalCount: 0, totalPages: 1 })
  
  const providers = ref([])
  
  const memo = ref('')
  const submitting = ref(false)
  
  // cart: match_code -> qty
  const cart = reactive({})
  
  // modal state
  const modal = reactive({
    open: false,
    product: null, // product group
    items: [],
    search: '',
    qtyDraft: {},
  })
  
  const money = (v) => Number(v || 0).toLocaleString()
  
  const loadProviders = async () => {
    const res = await fetchProviders()
    providers.value = res.data ?? []
  }
  
  const load = async () => {
    loading.value = true
    try {
      const res = await fetchOrderProducts({
        keyword: keyword.value,
        providerSeq: providerSeq.value,
        page: page.value,
        pageSize: pageSize.value,
      })
      raw.value = res.data?.data ?? []
      const pg = res.data?.pagination ?? {}
      pagination.totalCount = pg.totalCount ?? 0
      pagination.totalPages = pg.totalPages ?? 1
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
  
  /**
   * Group options to product-level cards:
   * - goods_seq 있으면 goods_seq로 묶고
   * - 없으면 product_code로 묶음
   */
  const grouped = computed(() => {
    const rows = raw.value || []
    const m = new Map()
  
    for (const r of rows) {
      const goodsSeq = r.goods_seq ?? null
      const key = goodsSeq ? `G:${goodsSeq}` : `P:${r.product_code}`
  
      if (!m.has(key)) {
        m.set(key, {
          key,
          goods_seq: goodsSeq,
          product_code: r.product_code,
          product_name: r.goods_name || r.product_name,
          provider_name: r.provider_name || '공급사 미지정',
          image: r.image || '',
          is_registered: Number(r.is_registered ?? (goodsSeq ? 1 : 0)),
          cost_krw: r.cost_krw,
          cost_cny: r.cost_cny,
          sale_price: r.sale_price,
          first_item_name: r.item_name,
          items: [],
        })
      }
  
      const g = m.get(key)
      g.items.push({
        product_code: r.product_code,
        product_name: r.product_name,
        item_name: r.item_name,
        match_code: r.match_code,
        cost_cny: r.cost_cny,
        cost_krw: r.cost_krw,
        sale_price: r.sale_price,
      })
    }
  
    const arr = Array.from(m.values())
    // 정렬: 공급사 -> product_code
    arr.sort((a, b) => {
      const ap = String(a.provider_name || '')
      const bp = String(b.provider_name || '')
      if (ap !== bp) return ap.localeCompare(bp, 'ko')
      return String(a.product_code || '').localeCompare(String(b.product_code || ''))
    })
    return arr
  })
  
  const rowSelectedQty = (row) => {
    let s = 0
    for (const it of row.items) s += Number(cart[it.match_code] || 0)
    return s
  }
  
  const totals = computed(() => {
  let totalLines = 0
  let totalQty = 0
  let totalCostCny = 0
  let totalSale = 0

  const priceMap = new Map()
  for (const r of raw.value || []) {
    priceMap.set(String(r.match_code), {
      cost_cny: Number(r.cost_cny || 0),
      sale: Number(r.sale_price || 0),
    })
  }

  for (const [code, qty] of Object.entries(cart)) {
    const q = Number(qty || 0)
    if (q <= 0) continue

    totalLines += 1
    totalQty += q

    const p = priceMap.get(code) || { cost_cny: 0, sale: 0 }
    totalCostCny += p.cost_cny * q
    totalSale += p.sale * q
  }

  return { totalLines, totalQty, totalCostCny, totalSale }
})
  
const cartPreview = computed(() => {
  const map = new Map()
  for (const r of raw.value || []) {
    map.set(String(r.match_code), r)
  }

  const arr = []
  for (const [match_code, qty] of Object.entries(cart)) {
    const q = Number(qty || 0)
    if (q <= 0) continue
    const r = map.get(match_code) || {}
    arr.push({
      match_code,
      qty: q,
      item_name: r.item_name || '',
      product_name: r.product_name || '',
      cost_cny: r.cost_cny || 0,
      sale_price: r.sale_price || 0,
    })
  }

  arr.sort((a, b) => String(a.match_code).localeCompare(String(b.match_code)))
  return arr
})

  
  const clearCart = () => {
    for (const k of Object.keys(cart)) delete cart[k]
  }
  
  const removeFromCart = (matchCode) => {
    delete cart[matchCode]
  }
  
  const openOptions = (row) => {
    modal.open = true
    modal.product = row
    modal.items = row.items || []
    modal.search = ''
  
    modal.qtyDraft = {}
    for (const it of modal.items) {
      modal.qtyDraft[it.match_code] = Number(cart[it.match_code] || 0)
    }
  }
  
  const closeModal = () => {
    modal.open = false
    modal.product = null
    modal.items = []
    modal.search = ''
    modal.qtyDraft = {}
  }
  
  const modalFiltered = computed(() => {
    const q = String(modal.search || '').trim().toLowerCase()
    if (!q) return modal.items || []
    return (modal.items || []).filter((it) => {
      return (
        String(it.match_code || '').toLowerCase().includes(q) ||
        String(it.item_name || '').toLowerCase().includes(q) ||
        String(it.product_name || '').toLowerCase().includes(q)
      )
    })
  })
  
  const stepQty = (matchCode, delta) => {
    const now = Number(modal.qtyDraft[matchCode] || 0)
    modal.qtyDraft[matchCode] = Math.max(0, now + delta)
  }
  
  const modalSelectedTotal = computed(() => {
    let s = 0
    for (const it of modal.items || []) s += Number(modal.qtyDraft[it.match_code] || 0)
    return s
  })
  
  const modalSelectedCost = computed(() => {
    let s = 0
    for (const it of modal.items || []) {
      const q = Number(modal.qtyDraft[it.match_code] || 0)
      s += Number(it.cost_krw || 0) * q
    }
    return s
  })

  const modalSelectedCostCny = computed(() => {
  let sum = 0
  for (const it of modal.items || []) {
    const q = Number(modal.qtyDraft[it.match_code] || 0)
    sum += Number(it.cost_cny || 0) * q
  }
  return sum
})

  const modalSelectedSale = computed(() => {
    let s = 0
    for (const it of modal.items || []) {
      const q = Number(modal.qtyDraft[it.match_code] || 0)
      s += Number(it.sale_price || 0) * q
    }
    return s
  })
  
  const confirmModal = () => {
    for (const it of modal.items || []) {
      const code = it.match_code
      const q = Math.max(0, Number(modal.qtyDraft[code] || 0))
      if (q > 0) cart[code] = q
      else delete cart[code]
    }
    closeModal()
  }
  
  const submit = async () => {
    if (totals.value.totalQty <= 0) return
    submitting.value = true
    try {
      const items = Object.entries(cart)
        .map(([match_code, qty]) => ({ match_code, qty: Number(qty || 0) }))
        .filter((x) => x.qty > 0)
  
      const res = await submitOrder({ memo: memo.value, items })
      alert(`주문이 제출되었습니다.\n주문번호: ${res.data?.orderNo || '-'}`)
  
      memo.value = ''
      clearCart()
    } catch (e) {
      console.error(e)
      alert('주문 제출 실패: 콘솔을 확인해주세요.')
    } finally {
      submitting.value = false
    }
  }
  
  onMounted(async () => {
    await loadProviders()
    await load()
  })
  </script>
  
  <style scoped>
  .tabular-nums { font-variant-numeric: tabular-nums; }
  </style>
  