<!-- src/pages/admin/StockPage.vue -->
<template>
  <div class="p-6 space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-xl font-semibold">재고관리</h1>
        <p class="text-sm text-gray-500">최근 주문량 기준으로 품절/부족 상품을 우선 정렬합니다.</p>
      </div>

      <div class="flex flex-col gap-2">
      <!-- 1) 상단: 핵심 컨트롤 -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Provider Filter -->
          <select
            v-model="providerSeq"
            class="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
            @change="page = 1; reload()"
          >
            <option value="">전체 공급사</option>
            <option v-for="pv in providerOptions" :key="pv.provider_seq" :value="pv.provider_seq">
              {{ pv.provider_name }}
            </option>
          </select>

          <!-- Keyword -->
          <input
            v-model.trim="keyword"
            @keyup.enter="page = 1; reload()"
            placeholder="상품명/코드 검색"
            class="px-3 py-2 text-sm rounded-lg border border-gray-200 w-56"
          />
          <select v-model.number="perPage" class="px-3 py-2 text-sm rounded-lg border bg-white">
            <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }}개씩</option>
          </select>
          <!-- 필터 토글 버튼 -->
          <button
            type="button"
            class="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            @click="showFilters = !showFilters"
          >
            필터 {{ showFilters ? "접기" : "열기" }}
          </button>
        </div>

        <!-- Excel -->
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium border"
          :class="selectedCount > 0 ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'"
          :disabled="selectedCount === 0 || downloading"
          @click="downloadExcel"
        >
          {{ downloading ? "다운로드 중..." : `주문서 엑셀 (${selectedCount})` }}
        </button>
      </div>

      <!-- 2) 하단: 접히는 필터 패널 (기간/상태) -->
      <div v-show="showFilters" class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <!-- Period -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">기간</span>
          <div class="inline-flex rounded-lg border border-gray-200 overflow-hidden bg-white">
            <button
              v-for="p in periodOptions"
              :key="p.value"
              class="px-3 py-2 text-sm"
              :class="period === p.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
              @click="setPeriod(p.value)"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- Status Filter -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-gray-600">상태</span>

          <label
            class="text-sm px-2 py-1 rounded-lg border cursor-pointer select-none"
            :class="statusFilter.has('soldout') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-700'"
          >
            <input class="mr-1" type="checkbox" :checked="statusFilter.has('soldout')" @change="toggleStatus('soldout')" />
            품절
          </label>

          <label
            class="text-sm px-2 py-1 rounded-lg border cursor-pointer select-none"
            :class="statusFilter.has('low') ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-gray-200 text-gray-700'"
          >
            <input class="mr-1" type="checkbox" :checked="statusFilter.has('low')" @change="toggleStatus('low')" />
            부족
          </label>

          <label
            class="text-sm px-2 py-1 rounded-lg border cursor-pointer select-none"
            :class="statusFilter.has('slight') ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-white border-gray-200 text-gray-700'"
          >
            <input class="mr-1" type="checkbox" :checked="statusFilter.has('slight')" @change="toggleStatus('slight')" />
            약간 부족
          </label>

          <label
            class="text-sm px-2 py-1 rounded-lg border cursor-pointer select-none"
            :class="statusFilter.has('ok') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-700'"
          >
            <input class="mr-1" type="checkbox" :checked="statusFilter.has('ok')" @change="toggleStatus('ok')" />
            안정
          </label>

          <button class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50" @click="setAllStatus">
            전체
          </button>
        </div>
      </div>
    </div>

    </div>

    <!-- Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div class="rounded-xl border bg-white p-4">
        <div class="text-sm text-gray-500">상품수</div>
        <div class="text-2xl font-semibold">{{ flatRows.length }}</div>
      </div>
      <div class="rounded-xl border bg-white p-4">
        <div class="text-sm text-gray-500">품절(재고 0)</div>
        <div class="text-2xl font-semibold">{{ countSoldOut }}</div>
      </div>
      <div class="rounded-xl border bg-white p-4">
        <div class="text-sm text-gray-500">부족(주문량 대비)</div>
        <div class="text-2xl font-semibold">{{ countLow }}</div>
      </div>
      <div class="rounded-xl border bg-white p-4">
        <div class="text-sm text-gray-500">최근 {{ period }}일 주문량 합</div>
        <div class="text-2xl font-semibold">{{ sumOrderQty }}</div>
      </div>
    </div>

    <!-- Content -->
    <div class="rounded-xl border bg-white">
      <div class="p-4 border-b flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm text-gray-600">
          정렬: <b>재고 0 우선</b> → 주문량 큰 순 → 재고 적은 순
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- ✅ 기간 (1주/2주/한달) -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">기간</span>
            <div class="inline-flex rounded-lg border border-gray-200 overflow-hidden bg-white">
              <button
                v-for="p in periodOptions"
                :key="p.value"
                class="px-3 py-2 text-sm"
                :class="period === p.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
                @click="setPeriod(p.value)"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <!-- ✅ 상태 필터 -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm text-gray-600">상태</span>

            <label
              class="text-sm px-2 py-1 rounded-lg border cursor-pointer select-none"
              :class="statusFilter.has('soldout') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-700'"
            >
              <input class="mr-1" type="checkbox" :checked="statusFilter.has('soldout')" @change="toggleStatus('soldout')" />
              품절
            </label>

            <label
              class="text-sm px-2 py-1 rounded-lg border cursor-pointer select-none"
              :class="statusFilter.has('low') ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-gray-200 text-gray-700'"
            >
              <input class="mr-1" type="checkbox" :checked="statusFilter.has('low')" @change="toggleStatus('low')" />
              부족
            </label>

            <label
              class="text-sm px-2 py-1 rounded-lg border cursor-pointer select-none"
              :class="statusFilter.has('slight') ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-white border-gray-200 text-gray-700'"
            >
              <input class="mr-1" type="checkbox" :checked="statusFilter.has('slight')" @change="toggleStatus('slight')" />
              약간 부족
            </label>

            <label
              class="text-sm px-2 py-1 rounded-lg border cursor-pointer select-none"
              :class="statusFilter.has('ok') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-700'"
            >
              <input class="mr-1" type="checkbox" :checked="statusFilter.has('ok')" @change="toggleStatus('ok')" />
              안정
            </label>

            <button
              class="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
              @click="setAllStatus"
            >
              전체
            </button>
          </div>

          <!-- 공급사 전체 접기/펼치기 -->
          <button class="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50" @click="toggleAllProviders">
            {{ allProvidersOpened ? "공급사 전체 접기" : "공급사 전체 펼치기" }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="p-8 text-center text-gray-500">불러오는 중...</div>
      <div v-else-if="groupedProviders.length === 0" class="p-8 text-center text-gray-500">데이터가 없습니다.</div>

      <div v-else class="divide-y">
        <div v-for="group in groupedProviders" :key="group.provider_seq">
          <!-- Provider Header -->
          <button
            class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            @click="toggleProvider(group.provider_seq)"
          >
            <div class="flex items-center gap-3">
              <span class="font-semibold">{{ group.provider_name }}</span>
              <span class="text-xs text-gray-500">({{ group.items.length }}개)</span>

              <span v-if="group.badges.soldOut > 0" class="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                품절 {{ group.badges.soldOut }}
              </span>
              <span v-if="group.badges.low > 0" class="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                부족 {{ group.badges.low }}
              </span>
            </div>

            <div class="text-sm text-gray-500">
              {{ openedProviders.has(group.provider_seq) ? "접기" : "펼치기" }}
            </div>
          </button>

          <!-- Provider Table -->
          <div v-show="openedProviders.has(group.provider_seq)" class="px-4 pb-4">
            <div class="overflow-auto border rounded-lg">
              <table class="min-w-[980px] w-full text-sm">
                <thead class="bg-gray-50 text-gray-600">
                  <tr>
                    <th class="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      class="rounded border-gray-300"
                      :checked="allVisibleSelected"
                      :indeterminate.prop="someVisibleSelected && !allVisibleSelected"
                      @change="toggleSelectAllVisible($event.target.checked)"
                    />
                  </th>
                    <th class="p-3 w-16">사진</th>
                    <th class="p-3 text-left">상품</th>
                    <th class="p-3 text-right w-44">권장입고</th>                    
                    <th class="p-3 text-right w-28">현재재고</th>
                    <th class="p-3 text-right w-40">입고수량</th>
                    <th class="p-3 text-right w-36">최근 {{ period }}일 주문량</th>
                    <th class="p-3 text-center w-30">상태</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr
                    v-for="it in rowsWithOptions(group.items)"
                    :key="it.type + '-' + it.row.goods_seq"
                    class="hover:bg-gray-50"
                    :class="it.type === 'goods' ? rowClass(it.row) : ''"
                  >
                    <!-- ===================== -->
                    <!-- 상품 행 -->
                    <!-- ===================== -->
                    <template v-if="it.type === 'goods'">
                      <!-- 체크박스 -->
                      <td class="p-3 text-center w-10">
                        <input
                          type="checkbox"
                          class="rounded border-gray-300"
                          :checked="selectedMap.has(goodsKey(it.row))"
                          @change="onGoodsCheck(it.row, $event.target.checked)"
                        />
                      </td>
                      <!-- 썸네일 -->
                      <td class="p-3 w-16">
                        <div class="w-12 h-12 rounded bg-gray-100 overflow-hidden border border-gray-200">
                          <img
                            v-if="it.row.thumb_url"
                            :src="it.row.thumb_url"
                            class="w-full h-full object-cover"
                            alt=""
                            loading="lazy"
                          />
                        </div>
                      </td>  
                      <!-- 상품 정보 + 옵션 버튼 -->
                      <td class="p-3">
                        <div class="flex items-center gap-2">
                          <div class="min-w-0">
                            <div class="font-medium truncate">{{ it.row.goods_name }}</div>
                            <div class="text-xs text-gray-500">{{ it.row.goods_code }}</div>
                          </div>

                          <button
                            type="button"
                            class="ml-auto text-xs px-2 py-1 rounded border hover:bg-gray-50 shrink-0"
                            @click="toggleOptions(it.row)"
                          >
                            {{ isOpened(it.row.goods_seq) ? "옵션 접기" : "옵션 보기" }}
                          </button>
                        </div>
                      </td>

                      <!-- 권장입고 -->
                      <td class="p-3 text-right">{{ it.row.suggest_qty ?? 0 }}</td>

                      <!-- 재고 -->
                      <td class="p-3 text-right">{{ it.row.stock_qty ?? 0 }}</td>
                       <!-- 입고수량(발주수량) -->
                      <td class="p-3 text-right w-28">
                        <input
                          type="number"
                          min="0"
                          class="w-24 px-2 py-1 text-sm rounded border border-gray-200 text-right"
                          :value="it.row.order_qty_input ?? it.row.suggest_qty ?? 0"
                          @input="onChangeInQty(it.row, $event.target.value)"
                        />
                      </td> 
                      <!-- 최근 주문량 -->
                      <td class="p-3 text-right">{{ it.row.order_qty ?? 0 }}</td>

                      <!-- 상태 -->
                      <td class="p-3 text-center">
                        <span
                          v-if="it.row.status==='soldout'"
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                bg-red-100 text-red-800 border border-red-200"
                        >
                          품절
                        </span>

                        <span
                          v-else-if="it.row.status==='low'"
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                bg-amber-100 text-amber-800 border border-amber-200"
                        >
                          부족
                        </span>

                        <span
                          v-else-if="it.row.status==='slight'"
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                bg-yellow-100 text-yellow-800 border border-yellow-300"
                        >
                          약간 부족
                        </span>

                        <span
                          v-else
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                bg-emerald-100 text-emerald-800 border border-emerald-200"
                        >
                          안정
                        </span>
                      </td>
                    </template>

                    <!-- ===================== -->
                    <!-- 옵션 행 (상품 바로 아래에 붙음) -->
                    <!-- ===================== -->
                    <template v-else>
                      <td :colspan="7" class="p-3 bg-gray-50">
                        <div class="flex items-center justify-between mb-2">
                          <div class="text-sm font-medium text-gray-700">옵션</div>
                          <div v-if="optionLoading.has(Number(it.row.goods_seq))" class="text-xs text-gray-500">로딩중...</div>
                        </div>

                        <!-- ✅ 지금은 백엔드가 option_name/option_key/stock_qty/order_qty만 주므로 최소표시 -->
                        <div class="overflow-x-auto border rounded-lg bg-white">
                          <table class="min-w-full text-sm">
                            <thead class="bg-gray-50 text-gray-600">
                              <tr>
                                <th class="p-2 w-10 text-center"></th>
                                <th class="p-2 text-left">옵션명</th>
                                <th class="p-2 text-left w-28">옵션코드</th>
                                <th class="p-2 text-right w-20">재고</th>
                                <th class="p-2 text-right w-28">최근 30일 주문량</th>
                                <th class="p-2 text-center w-20">상태</th>
                                <!-- 가격/권장입고/입고수량은 백엔드 필드 추가되면 바로 붙일 자리 -->
                              </tr>
                            </thead>
                            <tbody class="divide-y">
                              <tr
                                v-for="op in (optionMap.get(Number(it.row.goods_seq)) || [])"
                                :key="op.option_key"
                                :class="optionStatus(op)==='soldout' ? 'bg-red-50'
                                      : optionStatus(op)==='low' ? 'bg-amber-50'
                                      : optionStatus(op)==='slight' ? 'bg-yellow-50' : ''"
                              >
                                <td class="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    class="rounded border-gray-300"
                                    :checked="selectedMap.has(optionKey(it.row.goods_seq, op.option_key))"
                                    @change="onOptionCheck(it.row, op, $event.target.checked)"
                                  />
                                </td>

                                <td class="p-2">{{ op.option_name }}</td>
                                <td class="p-2 text-gray-500">{{ op.option_key }}</td>
                                <td class="p-2 text-right font-medium">{{ op.stock_qty ?? 0 }}</td>
                                <td class="p-2 text-right">{{ op.order_qty ?? 0 }}</td>
                                <td class="p-2 text-center">
                                  <span v-if="optionStatus(op)==='soldout'" class="badge-soldout">품절</span>
                                  <span v-else-if="optionStatus(op)==='low'" class="badge-low">부족</span>
                                  <span v-else-if="optionStatus(op)==='slight'" class="badge-slight">약간</span>
                                  <span v-else class="badge-ok">안정</span>
                                </td>
                              </tr>

                              <tr v-if="(optionMap.get(Number(it.row.goods_seq)) || []).length === 0 && !optionLoading.has(Number(it.row.goods_seq))">
                                <td colspan="5" class="p-3 text-center text-gray-500">옵션이 없습니다.</td>
                              </tr>

                            </tbody>
                          </table>
                        </div>
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              * 부족 기준(현재): 재고 0=품절 / 주문량&gt;0이고 재고&lt;주문량=부족
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-end gap-2">
      <button class="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
              :disabled="page === 1"
              @click="page = Math.max(1, page - 1)">
        이전
      </button>

      <div class="text-sm text-gray-600">
        {{ page }} / {{ totalPages }}
      </div>

      <button class="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
              :disabled="page >= totalPages"
              @click="page = Math.min(totalPages, page + 1)">
        다음
      </button>
    </div>
  </div>
</template>

<script setup>
//import { ref } from "vue";
import { computed, onMounted, watch, reactive, ref } from "vue";
import { fetchAdminStockList, downloadOrderSheetExcel, fetchStockOptions } from "@/api/adminStock";

// ====== State ======
const loading = ref(false);
const downloading = ref(false);

const periodOptions = [
  { label: "1주", value: 7 },
  { label: "2주", value: 14 },
  { label: "1달", value: 30 },
];

const statusPriority = {
  soldout: 0,
  low: 1,
  slight: 2,
  ok: 3,
};

const period = ref(30);
const providerSeq = ref("");
const keyword = ref("");
const onlyNeedAction = ref(false);
const showFilters = ref(false);
const perPageOptions = [100, 200, 500, 1000];
const perPage = ref(100); // ✅ 디폴트 100
const page = ref(1);      // 기존 page를 이걸로 사용
const statusFilter = ref(new Set(["soldout", "low", "slight", "ok"]));
const SLIGHT_RATIO = 1.2;
const COVER = 1.5;

const openedOptions = ref(new Set())        // goods_seq Set
const optionMap = ref(new Map())            // goods_seq -> options[]
const optionLoading = ref(new Set())        // goods_seq Set (로딩 표시용)


// 원본 rows
const rows = ref([]);

// 공급사 접기/펼치기
const openedProviders = ref(new Set());
const allProvidersOpened = computed(() => openedProviders.value.size === groupedProviders.value.length);

// 체크 선택
const selectedMap = ref(new Map()); // goods_seq -> row

watch([perPage, providerSeq, keyword, statusFilter], () => {
  page.value = 1;
});

function calcSuggestQty(stock_qty, order_qty) {
  const target = Math.ceil(order_qty * COVER);
  return Math.max(target - stock_qty, 0);
}


function getStockStatus(stock_qty, order_qty) {
  if (stock_qty === 0) return "soldout";
  if (order_qty > 0 && stock_qty < order_qty) return "low";
  if (order_qty > 0 && stock_qty < Math.ceil(order_qty * SLIGHT_RATIO)) return "slight";
  return "ok";
}

// ====== Helpers: mapping/normalizing ======
function normalizeItem(it) {
  if (!it) return null;

  const stock_qty = Number(it.current_stock ?? 0);         // ✅ 백엔드 필드
  // ✅ period 지원 전: 임시로 3개월 주문량을 order_qty에 연결
  const order_qty = Number(it.order_qty ?? it.purchase_ea_3mon ?? 0);

  const suggest_qty = calcSuggestQty(stock_qty, order_qty);
  const status = getStockStatus(stock_qty, order_qty);

  return {
    provider_seq: it.provider_seq ?? "",
    provider_name: it.provider_name ?? "",
    goods_seq: it.goods_seq,
    goods_name: it.goods_name ?? "-",
    goods_code: it.goods_code ?? "",
    thumb_url: it.thumb_url ?? "",

    // ✅ 화면/요약에서 사용할 핵심 키 (이 이름으로만 씁니다)
    stock_qty,
    order_qty,
    suggest_qty,
    status,

    // 주문서용 입력값(없으면 권장으로 시작)
    order_qty_input: Number(it.order_qty_input ?? suggest_qty),
    edited: false,
    raw: it,
  };
}

// 정렬: 품절 우선 → 주문량 desc → 재고 asc
function sortKey(a, b) {
  const aSold = a.stock_qty === 0 ? 0 : 1; // 품절이 더 앞(0)
  const bSold = b.stock_qty === 0 ? 0 : 1;
  if (aSold !== bSold) return aSold - bSold;

  if (b.order_qty !== a.order_qty) return b.order_qty - a.order_qty;

  return a.stock_qty - b.stock_qty;
}

// ====== Computed ======

const allFilteredRows = computed(() => {
  const base = rows.value;

  const filtered = base.filter(r => statusFilter.value.has(r.status));
  const filtered2 = filtered.filter(r => (providerSeq.value ? r.provider_seq == providerSeq.value : true));

  const kw = keyword.value?.toLowerCase();
  const filtered3 = kw
    ? filtered2.filter(r =>
        (r.goods_name || "").toLowerCase().includes(kw) ||
        (r.goods_code || "").toLowerCase().includes(kw)
      )
    : filtered2;

  return [...filtered3].sort(sortKey);
});

// ✅ 화면에 보여줄 부분만 slice
const pagedRows = computed(() => {
  const start = (page.value - 1) * perPage.value;
  return allFilteredRows.value.slice(start, start + perPage.value);
});

// 페이지 수
const totalPages = computed(() => Math.max(1, Math.ceil(allFilteredRows.value.length / perPage.value)));


const flatRows = computed(() => {
  const base = rows.value;

  const filtered = base.filter(r => statusFilter.value.has(r.status)); // ✅ 추가
  // 공급사 필터는 API로도 가능하지만, 프론트에서도 2차로 안전하게 걸러둠
  const filtered2 = filtered.filter((r) => (providerSeq.value ? r.provider_seq == providerSeq.value : true));

  // 키워드
  const kw = keyword.value?.toLowerCase();
  const filtered3 = kw
    ? filtered2.filter((r) => (r.goods_name || "").toLowerCase().includes(kw) || (r.goods_code || "").toLowerCase().includes(kw))
    : filtered2;

    return [...filtered3].sort(sortKey);
});

const groupedProviders = computed(() => {
  const map = new Map();
  for (const r of pagedRows.value) {
    if (!map.has(r.provider_seq)) {
      map.set(r.provider_seq, {
        provider_seq: r.provider_seq,
        provider_name: r.provider_name,
        items: [],
        badges: { soldOut: 0, low: 0 },
      });
    }
    const g = map.get(r.provider_seq);
    g.items.push(r);
    if (r.status === "soldout") g.badges.soldOut += 1;
    if (r.status === "low") g.badges.low += 1;
  }
  return Array.from(map.values());
});

const providerOptions = computed(() => {
  // rows 전체에서 공급사 목록 생성
  const map = new Map();
  for (const r of rows.value) {
    if (!map.has(r.provider_seq)) map.set(r.provider_seq, { provider_seq: r.provider_seq, provider_name: r.provider_name });
  }
  return Array.from(map.values());
});

const selectedCount = computed(() => selectedMap.value.size);

const countSoldOut = computed(() => allFilteredRows.value.filter(r => r.status === "soldout").length);
const countLow = computed(() => allFilteredRows.value.filter(r => r.status === "low").length);
// const sumOrderQty = computed(() => allFilteredRows.value.reduce((acc, r) => acc + (Number(r.order_qty) || 0), 0));

const totalProducts = computed(() => rows.value.length);

const lowCount = computed(() =>
  rows.value.filter(r => r.status === "low").length
);

const soldoutCount = computed(() =>
  rows.value.filter(r => r.status === "soldout").length
);

const sumOrderQty = computed(() =>
  rows.value.reduce((acc, r) => acc + (Number(r.order_qty) || 0), 0)
);

// ====== Actions ======
async function reload() {
  loading.value = true;
  try {
    const list = await fetchAllStocks({
      period: period.value,
      keyword: keyword.value,
    });

    rows.value = list.map(normalizeItem).filter(Boolean);

    // ✅ 이제 rows가 "전체"라서 공급사도 전체로 구성됨
    openedProviders.value = new Set(groupedProviders.value.map(g => g.provider_seq));
  } finally {
    loading.value = false;
  }
}

function setPeriod(v) {
  period.value = v;
  page.value = 1;
  reload();
}

function toggleProvider(pseq) {
  const s = new Set(openedProviders.value);
  if (s.has(pseq)) s.delete(pseq);
  else s.add(pseq);
  openedProviders.value = s;
}

function toggleAllProviders() {
  if (allProvidersOpened.value) {
    openedProviders.value = new Set();
  } else {
    openedProviders.value = new Set(groupedProviders.value.map((g) => g.provider_seq));
  }
}


function toggleRow(row, checked) {
  const m = new Map(selectedMap.value);
  if (checked) m.set(row.goods_seq, row);
  else m.delete(row.goods_seq);
  selectedMap.value = m;
}

function isAllChecked(items) {
  if (!items.length) return false;
  return items.every((it) => selectedMap.value.has(it.goods_seq));
}

function toggleGroupCheck(items, checked) {
  const m = new Map(selectedMap.value);
  for (const it of items) {
    if (checked) m.set(it.goods_seq, it);
    else m.delete(it.goods_seq);
  }
  selectedMap.value = m;
}

async function downloadExcel() {
  if (selectedMap.value.size === 0) return;

  downloading.value = true;
  try {
    const items = Array.from(selectedMap.value.values()).map((r) => ({
    provider_seq: r.provider_seq,
    goods_seq: r.goods_seq,
    qty: Number(r.order_qty_input ?? 0), // ✅ 권장/수정된 값 반영
  }));

    const res = await downloadOrderSheetExcel({ items, period: period.value });

    // blob 다운로드 처리
    const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    // filename 파싱(가능하면)
    const cd = res.headers["content-disposition"] || "";
    const match = cd.match(/filename\*=UTF-8''(.+)$|filename="?([^"]+)"?/);
    const filename = decodeURIComponent(match?.[1] || match?.[2] || `ordersheet_${Date.now()}.xlsx`);
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } finally {
    downloading.value = false;
  }
}

onMounted(() => {
  reload();
});

async function fetchAllStocks({ period, keyword = "" }) {
  const all = [];
  let p = 1;
  const size = 300; // 서버/성능에 맞게 200~500 추천

  while (true) {
    const res = await fetchAdminStockList({
      page: p,
      pageSize: size,
      providerSeq: "",      // ✅ 첫화면은 전체
      keyword,
      period,
    });

    const items = res?.data?.items ?? [];
    all.push(...items);

    if (items.length < size) break; // 마지막 페이지
    p += 1;

    // 안전장치(무한루프 방지)
    if (p > 500) break;
  }

  return all;
}

function applySuggestMode(row, mode) {
  console.log("applySuggestMode row:", row);
  if (!row) {
    console.warn("applySuggestMode: row is undefined", mode);
    return;
  }

  row.suggest_mode = mode;

  let next = 0;

  if (mode === "basic") {
    next = calcSuggestQtyBasic(row.stock_qty, row.order_qty);
  } else {
    next = calcSuggestQtyBasic(row.stock_qty, row.order_qty);
  }

  row.suggest_qty = next;
  row.order_qty_input = next;
  row.edited = false;
}


function toggleStatus(k) {
  const s = new Set(statusFilter.value);
  if (s.has(k)) s.delete(k);
  else s.add(k);
  statusFilter.value = s;
}

function setAllStatus() {
  statusFilter.value = new Set(["soldout", "low", "slight", "ok"]);
}

function rowClass(row) {
  if (row.status === "soldout") return "bg-red-50";
  if (row.status === "low") return "bg-amber-50";
  if (row.status === "slight") return "bg-yellow-50";
  return "";
}

const visibleRows = computed(() => {
  // 페이지네이션을 쓰고 있다면
  return pagedRows.value;

  // 만약 페이지네이션이 없으면 아래로
  // return allFilteredRows.value;
});

function rowKey(r) {
  // 옵션 도입 시 `${goods_seq}|${option_key}` 형태로 확장 가능
  return String(r.goods_seq);
}

function onRowCheck(row, checked) {
  const key = rowKey(row);
  if (checked) selectedMap.value.set(key, row);
  else selectedMap.value.delete(key);
}

const allVisibleSelected = computed(() => {
  const list = visibleRows.value;
  if (!list.length) return false;
  return list.every(r => selectedMap.value.has(rowKey(r)));
});

const someVisibleSelected = computed(() => {
  const list = visibleRows.value;
  if (!list.length) return false;
  return list.some(r => selectedMap.value.has(rowKey(r)));
});

function toggleSelectAllVisible(checked) {
  for (const r of visibleRows.value) {
    const key = goodsKey(r)
    if (checked) selectedMap.value.set(key, { type: 'goods', ...r })
    else selectedMap.value.delete(key)
  }
}

async function toggleOptions(row) {
  const gid = Number(row.goods_seq);

  // 1) 토글 (반응성 보장: new Set으로 교체)
  const next = new Set(openedOptions.value);
  if (next.has(gid)) {
    next.delete(gid);
    openedOptions.value = next;
    return;
  }
  next.add(gid);
  openedOptions.value = next;

  // 2) 옵션 캐시 없으면 로드
  if (optionMap.value.has(gid)) return;

  const loading = new Set(optionLoading.value);
  loading.add(gid);
  optionLoading.value = loading;

  try {
    const res = await fetchStockOptions({ goods_seq: gid, period: period.value }); // period는 기존 것 사용
    optionMap.value.set(gid, res?.data?.items ?? []);
  } finally {
    const done = new Set(optionLoading.value);
    done.delete(gid);
    optionLoading.value = done;
  }
}

function goodsKey(row) {
  return `G|${row.goods_seq}`
}
function optionKey(goods_seq, option_key) {
  return `O|${goods_seq}|${option_key}`
}

function onGoodsCheck(row, checked) {
  const key = goodsKey(row);
  if (checked) selectedMap.value.set(key, row);
  else selectedMap.value.delete(key);
}

function onOptionCheck(goodsRow, op, checked) {
  const key = optionKey(goodsRow.goods_seq, op.option_key)
  if (checked) {
    selectedMap.value.set(key, {
      type: 'option',
      goods_seq: goodsRow.goods_seq,
      goods_name: goodsRow.goods_name,
      provider_seq: goodsRow.provider_seq,
      provider_name: goodsRow.provider_name,
      option_key: op.option_key,
      option_name: op.option_name,
      stock_qty: Number(op.stock_qty ?? 0),
      order_qty: Number(op.order_qty ?? 0),
      // 주문서 수량은 옵션 기준으로도 입력 가능하게 하고 싶으면 여기에 qty 필드 추가
      qty: Number(goodsRow.order_qty_input ?? 0),
    })
  } else {
    selectedMap.value.delete(key)
  }
}

const openedOptionRows = computed(() => {
  // group.items 중에서 열린 것만 뽑아서 옵션행을 만들기
  return (group.items || []).filter(r => openedOptions.has(r.goods_seq));
});

function isOpened(goodsSeq) {
  return openedOptions.value.has(Number(goodsSeq));
}

// ✅ 핵심: 상품행 + 옵션행을 “한 배열”로 만들기 (정렬/밀림 해결)
function rowsWithOptions(items = []) {
  const out = [];
  for (const r of items) {
    out.push({ type: "goods", row: r });
    if (isOpened(r.goods_seq)) out.push({ type: "options", row: r });
  }
  return out;
}

function optionStatus(op) {
  const stock = Number(op.stock_qty ?? 0);
  const order = Number(op.order_qty ?? 0);

  if (stock === 0) return "soldout";
  if (order > 0 && stock < order) return "low";
  if (order > 0 && stock < Math.ceil(order * 1.2)) return "slight";
  return "ok";
}

function sortByRule(a, b) {
  // 1) 상태 우선순위
  const pa = statusPriority[a.status] ?? 99;
  const pb = statusPriority[b.status] ?? 99;
  if (pa !== pb) return pa - pb;

  // 2) 주문량 큰 순
  const oa = Number(a.order_qty ?? 0);
  const ob = Number(b.order_qty ?? 0);
  if (ob !== oa) return ob - oa;

  // 3) 재고 적은 순
  const sa = Number(a.stock_qty ?? 0);
  const sb = Number(b.stock_qty ?? 0);
  if (sa !== sb) return sa - sb;

  // 4) 마지막 tie-breaker (상품명)
  return String(a.goods_name ?? "").localeCompare(String(b.goods_name ?? ""), "ko");
}

const sortedRows = computed(() => {
  return [...allFilteredRows.value].sort(sortByRule);
});
</script>
