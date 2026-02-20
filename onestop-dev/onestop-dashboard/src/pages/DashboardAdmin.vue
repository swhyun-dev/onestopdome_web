<template>
    <!-- 유저 대시보드 -->
    <section v-if="state.user.role === 'user'" class="space-y-6">
      <!-- KPI 카드 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- 누적 결제 금액 -->
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-[11px] font-semibold text-slate-500 mb-1">내 누적 결제 금액</p>
          <p class="text-2xl font-bold text-slate-900">
            {{ formatCurrency(userDash.totalPaid) }}
          </p>
          <p class="mt-1 text-[11px] text-slate-400">가입 이후 전체 주문 기준</p>
        </div>
  
        <!-- 이번 달 결제 금액 -->
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-[11px] font-semibold text-slate-500 mb-1">이번 달 결제 금액</p>
          <p class="text-2xl font-bold text-slate-900">
            {{ formatCurrency(userDash.monthPaid) }}
          </p>
          <p class="mt-1 text-[11px] text-slate-400">이번 달 주문 {{ userDash.monthOrderCount }}건</p>
        </div>
  
        <!-- 평균 객단가 -->
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-[11px] font-semibold text-slate-500 mb-1">이번 달 평균 객단가</p>
          <p class="text-2xl font-bold text-slate-900">
            {{ formatCurrency(userDash.avgOrderPrice) }}
          </p>
          <p class="mt-1 text-[11px] text-slate-400">이번 달 결제금액 / 주문건수</p>
        </div>
      </div>
  
      <!-- TOP10 / 오늘 주문 -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- 내가 가장 많이 구매한 상품 TOP10 -->
        <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <header class="flex items-center justify-between mb-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-800">내가 가장 많이 구매한 상품 TOP10</h2>
              <p class="text-[11px] text-slate-400 mt-0.5">구매 수량 기준</p>
            </div>
          </header>
  
          <div class="border border-slate-100 rounded-xl overflow-hidden">
            <table class="w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500">순위</th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500">상품명</th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">
                    구매수량
                  </th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">
                    구매금액
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white">
                <tr v-if="!userDash.topProducts.length">
                  <td colspan="4" class="py-6 text-center text-slate-400 text-xs">
                    아직 구매 내역이 없습니다.
                  </td>
                </tr>
                <tr
                  v-for="(item, idx) in userDash.topProducts"
                  :key="idx"
                  class="border-t border-slate-100 text-xs"
                >
                  <td class="py-2 px-2 text-slate-400 text-center">
                    {{ idx + 1 }}
                  </td>
                  <td class="py-2 px-2">
                    <div class="truncate max-w-[180px]" :title="item.goods_name">
                      {{ item.goods_name }}
                    </div>
                    <div class="text-[11px] text-slate-400">코드 {{ item.goods_code }}</div>
                  </td>
                  <td class="py-2 px-2 text-right">
                    {{ item.total_qty }}
                  </td>
                  <td class="py-2 px-2 text-right">
                    {{ formatCurrency(item.total_price) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
  
        <!-- 오늘 주문 내역 -->
        <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <header class="flex items-center justify-between mb-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-800">오늘 주문 내역</h2>
              <p class="text-[11px] text-slate-400 mt-0.5">
                오늘 주문 {{ userDash.todayOrders.length }}건
              </p>
            </div>
          </header>
  
          <div class="border border-slate-100 rounded-xl overflow-hidden">
            <table class="w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500">주문번호</th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500">대표 상품</th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">수량</th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">
                    결제금액
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white">
                <tr v-if="!userDash.todayOrders.length">
                  <td colspan="4" class="py-6 text-center text-slate-400 text-xs">
                    오늘 주문이 없습니다.
                  </td>
                </tr>
                <tr
                  v-for="(order, idx) in userDash.todayOrders"
                  :key="idx"
                  class="border-t border-slate-100 text-xs"
                >
                  <td class="py-2 px-2 text-[11px] text-slate-500">
                    {{ order.order_seq }}
                  </td>
                  <td class="py-2 px-2">
                    <div class="truncate max-w-[180px]" :title="order.main_goods_name">
                      {{ order.main_goods_name }}
                    </div>
                    <div class="text-[11px] text-slate-400">
                      {{ order.order_status }}
                    </div>
                  </td>
                  <td class="py-2 px-2 text-right">
                    {{ order.total_qty }}
                  </td>
                  <td class="py-2 px-2 text-right">
                    {{ formatCurrency(order.settle_price) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  
    <!-- 관리자 대시보드 -->
    <section v-else class="space-y-6">
      <div v-if="state.isLoggedIn && state.user.role === 'admin'" class="flex items-center gap-2">
        <!-- 공급사 선택 -->
        <div class="flex items-center gap-2">
          <select
            v-model="adminFilter.providerSeq"
            class="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white w-48"
          >
            <option value="">전체(모든 공급사)</option>
            <option
              v-for="p in providersState.list"
              :key="p.provider_seq"
              :value="String(p.provider_seq)"
            >
              {{ p.provider_name }}
            </option>
          </select>
          <!-- (선택) 공급사 검색: 필요없으면 삭제해도 됨 -->
          <input
            v-model="providersState.keyword"
            placeholder="공급사 검색"
            class="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white w-32"
            @keydown.enter.prevent="loadProviders"
          />
          <button
            class="border border-slate-300 bg-white rounded-lg px-2 py-1 text-xs hover:bg-slate-50"
            @click="loadProviders"
          >
            검색
          </button>
        </div>
        <input
          v-model="adminFilter.goodsSeq"
          type="number"
          placeholder="상품ID(goodsSeq)"
          class="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white w-40"
        />
        <select
          v-model="adminRange.preset"
          class="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
          @change="applyAdminPreset"
        >
          <option value="7">최근 7일</option>
          <option value="30">최근 30일</option>
          <option value="90">최근 90일</option>
          <option value="custom">직접 선택</option>
        </select>
        <input
          v-model="adminRange.startDate"
          type="date"
          class="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
          :disabled="adminRange.preset !== 'custom'"
        />
        <span class="text-xs text-slate-400">~</span>
        <input
          v-model="adminRange.endDate"
          type="date"
          class="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
          :disabled="adminRange.preset !== 'custom'"
        />
        <button
          class="bg-slate-900 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-slate-800"
          @click="reloadAdminWithRange"
        >
          조회
        </button>
        <button
          class="border border-slate-300 bg-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
          @click="resetAdminFilters"
        >
          필터 초기화
        </button>
      </div>
      <!-- KPI 카드 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- 오늘 전체 매출 -->
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-[11px] font-semibold text-slate-500 mb-1">오늘 전체 매출</p>
          <p class="text-2xl font-bold text-slate-900">
            {{ formatCurrency(adminDash.todaySales) }}
          </p>
          <p class="mt-1 text-[11px] text-slate-400">주문 {{ adminDash.todayOrderCount }}건</p>
        </div>
  
        <!-- 어제 대비 매출 -->
        <div
          class="rounded-2xl border bg-white p-4 shadow-sm"
          :class="
            adminDash.diffRate >= 0
              ? 'border-emerald-200 bg-emerald-50/60'
              : 'border-rose-200 bg-rose-50/60'
          "
        >
          <p class="text-[11px] font-semibold text-slate-500 mb-1">어제 대비 매출</p>
          <p
            class="text-2xl font-bold"
            :class="adminDash.diffRate >= 0 ? 'text-emerald-700' : 'text-rose-700'"
          >
            <span v-if="adminDash.diffRate > 0">▲</span>
            <span v-else-if="adminDash.diffRate < 0">▼</span>
            {{ Math.abs(adminDash.diffRate).toFixed(1) }}%
          </p>
          <p class="mt-1 text-[11px] text-slate-500">
            {{ formatCurrency(adminDash.diffAmount, true) }}
          </p>
        </div>
  
        <!-- 7일 매출 -->
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-[11px] font-semibold text-slate-500 mb-1">매출 합계</p>
          <p class="text-2xl font-bold text-slate-900">
            {{ formatCurrency(adminDash.last7DaysSales) }}
          </p>
          <p class="mt-1 text-[11px] text-slate-400">
            일 평균
            {{ formatCurrency(adminDash.last7DaysSales / (adminDash.dailyRows.length || 1) || 0) }}
          </p>
        </div>
  
        <!-- 재고 부족 -->
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-[11px] font-semibold text-slate-500 mb-1">재고 부족 상품</p>
          <p class="text-2xl font-bold text-rose-600">{{ adminDash.lowStock.length }} 개</p>
          <p class="mt-1 text-[11px] text-slate-400">안전재고 기준 이하</p>
        </div>
      </div>
      <div v-if="adminAlerts.length" class="space-y-2">
        <div
          v-for="(a, idx) in adminAlerts"
          :key="idx"
          class="rounded-xl border px-3 py-2 text-xs flex items-start gap-2"
          :class="
            a.type === 'down'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : a.type === 'up'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
          "
        >
          <div class="font-semibold shrink-0">{{ a.title }}</div>
          <div class="text-[11px] opacity-90">{{ a.desc }}</div>
        </div>
      </div>
      <!-- TOP10 / 재고 부족 리스트 -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- 판매 TOP10 -->
        <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <header class="flex items-center justify-between mb-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-800">가장 많이 판매된 상품 TOP10</h2>
              <p class="text-[11px] text-slate-400 mt-0.5">구매 수량 기준</p>
            </div>
          </header>
  
          <div class="border border-slate-100 rounded-xl overflow-hidden">
            <table class="w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500">순위</th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500">상품명</th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">
                    판매수량
                  </th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">
                    매출액
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white">
                <tr v-if="!adminDash.topProducts.length">
                  <td colspan="4" class="py-6 text-center text-slate-400 text-xs">
                    판매 데이터가 없습니다.
                  </td>
                </tr>
                <tr
                  v-for="(item, idx) in adminDash.topProducts"
                  :key="idx"
                  class="border-t border-slate-100 text-xs"
                >
                  <td class="py-2 px-2 text-slate-400 text-center">
                    {{ idx + 1 }}
                  </td>
                  <td class="py-2 px-2">
                    <div class="truncate max-w-[180px]" :title="item.goods_name">
                      {{ item.goods_name }}
                    </div>
                    <div class="text-[11px] text-slate-400">
                      공급사: {{ item.provider_name || '-' }}
                    </div>
                  </td>
                  <td class="py-2 px-2 text-right">
                    {{ item.total_qty }}
                  </td>
                  <td class="py-2 px-2 text-right">
                    {{ formatCurrency(item.total_price) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
  
        <!-- 재고 부족 리스트 -->
        <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <header class="flex items-center justify-between mb-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-800">재고 부족 상품 리스트</h2>
              <p class="text-[11px] text-slate-400 mt-0.5">총 {{ adminDash.lowStock.length }}개</p>
            </div>
          </header>
  
          <div class="border border-slate-100 rounded-xl overflow-hidden">
            <table class="w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500">상품명</th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">가용</th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">안전</th>
                  <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">
                    필요수량
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white">
                <tr v-if="!adminDash.lowStock.length">
                  <td colspan="4" class="py-6 text-center text-slate-400 text-xs">
                    재고 부족 상품이 없습니다.
                  </td>
                </tr>
                <tr
                  v-for="(row, idx) in adminDash.lowStock"
                  :key="idx"
                  class="border-t border-slate-100 text-xs"
                >
                  <td class="py-2 px-2">
                    <div class="truncate max-w-[200px]" :title="row.goods_name">
                      {{ row.goods_name }}
                    </div>
                    <div class="text-[11px] text-slate-400">코드 {{ row.goods_code }}</div>
                  </td>
                  <td class="py-2 px-2 text-right">
                    {{ row.available_stock }}
                  </td>
                  <td class="py-2 px-2 text-right">
                    {{ row.safe_stock }}
                  </td>
                  <td class="py-2 px-2 text-right font-semibold text-rose-600">
                    {{ row.required_qty }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <header class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-sm font-semibold text-slate-800">공급사별 비교</h2>
            <p class="text-[11px] text-slate-400 mt-0.5">
              선택 기간 기준 / 상위 {{ adminDash.providerCompare.length }}개(매출 순)
            </p>
          </div>
          <div class="text-[11px] text-slate-500" v-if="adminDash.providerCompareLoading">
            불러오는 중…
          </div>
        </header>
  
        <div class="border border-slate-100 rounded-xl overflow-hidden">
          <table class="w-full text-left text-xs text-slate-700">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="py-2 px-2 text-[11px] font-semibold text-slate-500">공급사</th>
                <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">매출</th>
                <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">주문수</th>
                <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">객단가</th>
                <th class="py-2 px-2 text-[11px] font-semibold text-slate-500 text-right">비중</th>
              </tr>
            </thead>
            <tbody class="bg-white">
              <tr v-if="!adminDash.providerCompare.length">
                <td colspan="5" class="py-6 text-center text-slate-400 text-xs">
                  데이터가 없습니다.
                </td>
              </tr>
              <tr
                v-for="(r, i) in adminDash.providerCompare"
                :key="r.provider_seq"
                class="border-t border-slate-100"
              >
                <td class="py-2 px-2">
                  <div class="font-semibold truncate max-w-[220px]">{{ r.provider_name }}</div>
                  <div class="text-[11px] text-slate-400">ID {{ r.provider_seq }}</div>
                </td>
                <td class="py-2 px-2 text-right">{{ formatCurrency(r.sumSales) }}</td>
                <td class="py-2 px-2 text-right">
                  {{ toNumber(r.sumOrders).toLocaleString('ko-KR') }}
                </td>
                <td class="py-2 px-2 text-right">{{ formatCurrency(r.aov) }}</td>
                <td class="py-2 px-2 text-right">{{ r.share.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
  
      <!-- 차트 자리 (나중에 Chart.js 등으로 추가) -->
      <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <header class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-sm font-semibold text-slate-800">매출 추이</h2>
            <p class="text-[11px] text-slate-400 mt-0.5">
              기간 설정에 따라 일별/월별 모두 변경됩니다.
            </p>
            <p class="text-[11px] text-slate-500 mt-1">
              기간: <b class="text-slate-800">{{ adminRange.startDate }}</b>
              ~
              <b class="text-slate-800">{{ adminRange.endDate }}</b>
            </p>
          </div>
  
          <!-- ✅ 탭 버튼 -->
          <div class="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              class="px-3 py-1.5 text-xs rounded-md"
              :class="
                adminChartTab.value === 'daily'
                  ? 'bg-white shadow text-slate-900 font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              "
              @click="adminChartTab.value = 'daily'"
            >
              일별
            </button>
            <button
              class="px-3 py-1.5 text-xs rounded-md"
              :class="
                adminChartTab.value === 'month'
                  ? 'bg-white shadow text-slate-900 font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              "
              @click="adminChartTab.value = 'month'"
            >
              월별
            </button>
          </div>
        </header>
  
        <!-- ✅ 요약 배지 -->
        <div class="mt-3 flex flex-wrap gap-2 text-[11px]">
          <template v-if="adminChartTab.value === 'daily'">
            <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              합계: <b class="text-slate-900">{{ formatCurrency(adminDailySummary.sum) }}</b>
            </span>
            <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              평균(일): <b class="text-slate-900">{{ formatCurrency(adminDailySummary.avg) }}</b>
            </span>
            <span
              v-if="adminDailySummary.max"
              class="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
            >
              최고: <b>{{ String(adminDailySummary.max.date).slice(5) }}</b> ({{
                formatCurrency(adminDailySummary.max.sales_amount)
              }})
            </span>
            <span
              v-if="adminDailySummary.min"
              class="px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100"
            >
              최저: <b>{{ String(adminDailySummary.min.date).slice(5) }}</b> ({{
                formatCurrency(adminDailySummary.min.sales_amount)
              }})
            </span>
          </template>
  
          <template v-else>
            <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              합계: <b class="text-slate-900">{{ formatCurrency(adminMonthSummary.sum) }}</b>
            </span>
            <span class="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              평균(월): <b class="text-slate-900">{{ formatCurrency(adminMonthSummary.avg) }}</b>
            </span>
            <span
              v-if="adminMonthSummary.max"
              class="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
            >
              최고: <b>{{ String(adminMonthSummary.max.date).slice(0, 7) }}</b> ({{
                formatCurrency(adminMonthSummary.max.sales_amount)
              }})
            </span>
            <span
              v-if="adminMonthSummary.min"
              class="px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100"
            >
              최저: <b>{{ String(adminMonthSummary.min.date).slice(0, 7) }}</b> ({{
                formatCurrency(adminMonthSummary.min.sales_amount)
              }})
            </span>
          </template>
        </div>
  
        <!-- ✅ 디버그 라벨(원하면 나중에 제거) -->
        <p class="text-[11px] text-slate-400 mt-0.5">
          dailyRows: {{ adminDash.dailyRows?.length || 0 }} / monthRows:
          {{ adminDash.monthRows?.length || 0 }}
        </p>
  
        <!-- ✅ 일별 차트 -->
        <div v-if="adminChartTab.value === 'daily'">
          <div v-if="adminDash.dailyRows?.length" class="h-56">
            <apexchart
              type="line"
              height="224"
              :options="adminSalesChartOptions"
              :series="adminSalesChartSeries"
            />
          </div>
          <div v-else class="h-56 flex items-center justify-center text-xs text-slate-400">
            {{
              adminDash.dailyRows?.length
                ? '해당 기간 매출이 0입니다.'
                : '일별 차트 데이터가 없습니다.'
            }}
          </div>
        </div>
  
        <!-- ✅ 월별 차트 -->
        <div v-else>
          <div v-if="adminDash.monthRows?.length" class="h-56">
            <apexchart
              type="line"
              height="224"
              :options="adminMonthChartOptions"
              :series="adminMonthChartSeries"
            />
          </div>
          <div v-else class="h-56 flex items-center justify-center text-xs text-slate-400">
            {{
              adminDash.monthRows?.length
                ? '해당 기간 매출이 0입니다.'
                : '월별 차트 데이터가 없습니다.'
            }}
          </div>
        </div>
      </section>
    </section>
  </template>
  
  <script setup>
  import { computed, reactive } from 'vue'
  import { onMounted } from 'vue'
  
  import {
    fetchUserSalesDaily,
    fetchUserTopProducts,
    fetchUserTodayOrders,
    fetchAdminSalesDaily,
    fetchAdminTopProducts,
    fetchLowStock,
    fetchAdminSalesMonth,
    fetchProviders,
    fetchAdminSalesDailyByProvider,
  } from '../api/dashboard'
  
  /** ---------- 공통 상태 ---------- */
  
  const adminRange = reactive({
    preset: '30', // '7' | '30' | '90' | 'custom'
    startDate: '', // YYYY-MM-DD
    endDate: '', // YYYY-MM-DD
  })
  
  const adminFilter = reactive({
    providerSeq: '', // string(선택값)
    goodsSeq: '', // string(선택값)
    goodsKeyword: '', // 상품 검색 키워드(선택)
  })
  
  const providersState = reactive({
    list: [],
    loading: false,
    keyword: '',
  })

  onMounted(async () => {
    // 관리자면 기간 세팅 + 공급사 + 대시보드 로딩
    if (state.user.role === 'admin') {
        applyAdminPreset()       // preset=30 기준 start/end 세팅
        await loadProviders()
        await loadDashboard()
        await loadProviderCompare()
    } else {
        await loadDashboard()
    }
    })
  const loadProviders = async () => {
    providersState.loading = true
    try {
      const res = await fetchProviders(
        providersState.keyword ? { keyword: providersState.keyword } : undefined
      )
      // 백엔드 응답은 배열 그 자체: [{provider_seq, provider_name}]
      providersState.list = Array.isArray(res?.data) ? res.data : []
    } catch (e) {
      console.warn('공급사 목록 로딩 실패:', e)
      providersState.list = []
    } finally {
      providersState.loading = false
    }
  }
  
  const applyAdminPreset = () => {
    if (adminRange.preset === 'custom') return
    const days = Number(adminRange.preset)
    if (!Number.isFinite(days) || days <= 0) return
    setRangeLastNDays(days)
  }
  
  const reloadAdminWithRange = async () => {
    // custom일 때도 start/end가 비어있으면 자동으로 30일로 세팅
    if (!adminRange.startDate || !adminRange.endDate) {
      setRangeLastNDays(30)
    }
    await loadDashboard()
    if (state.user.role === 'admin') await loadProviderCompare()
  }
  
  const resetAdminFilters = async () => {
    adminFilter.providerSeq = ''
    adminFilter.goodsSeq = ''
    adminFilter.goodsKeyword = ''
    await reloadAdminWithRange()
  }
  
  const loginForm = reactive({
    id: '',
    password: '',
    role: 'user',
  })
  
  const adminDailyAllZero = computed(() => {
    const rows = Array.isArray(adminDash.dailyRows) ? adminDash.dailyRows : []
    if (!rows.length) return false
    return rows.every((r) => toNumber(r.sales_amount || 0) === 0)
  })
  
  const adminMonthAllZero = computed(() => {
    const rows = Array.isArray(adminDash.monthRows) ? adminDash.monthRows : []
    if (!rows.length) return false
    return rows.every((r) => toNumber(r.sales_amount || 0) === 0)
  })
  
  /** ---------- 유저 대시보드 상태 ---------- */
  const userDash = reactive({
    totalPaid: 0,
    monthPaid: 0,
    monthOrderCount: 0,
    avgOrderPrice: 0,
    topProducts: [],
    todayOrders: [],
  })
  
  /** ---------- 관리자 대시보드 상태 ---------- */
  const adminDash = reactive({
    todaySales: 0,
    todayOrderCount: 0,
    diffAmount: 0,
    diffRate: 0,
    last7DaysSales: 0,
    topProducts: [],
    lowStock: [],
    dailyRows: [], // ✅ 추가: 차트용 일별 매출 rows
    monthRows: [], // ✅ 추가: 월별 차트용
    providerCompare: [], // 공급사 비교 결과
    providerCompareLoading: false,
  })
  
  // ✅ 차트 탭 상태: 'daily' | 'month'
  const adminChartTab = reactive({ value: 'daily' })
  
  /** ---------- 응답 → items 배열 추출 ---------- */
  const extractItems = (res) => {
    if (!res) return []
    const data = res.data ?? res
    return data.items ?? data.data ?? data
  }
  
  const extractArray = (res) => {
    const d = res?.data ?? res
    if (Array.isArray(d)) return d
    if (Array.isArray(d?.items)) return d.items
    if (Array.isArray(d?.data)) return d.data
    return []
  }
  
  /** ---------- 유저 대시보드 로딩 ---------- */
  const loadUserDashboard = async () => {
    // 각 API별로 개별 호출 + 방어
    let salesDaily = []
    let topProducts = []
    let todayOrders = []
  
    try {
      const res = await fetchUserSalesDaily()
      salesDaily = extractItems(res)
    } catch (e) {
      console.warn('유저 salesDaily 호출 실패:', e)
    }
  
    try {
      const res = await fetchUserTopProducts()
      topProducts = extractItems(res)
    } catch (e) {
      console.warn('유저 topProducts 호출 실패(아직 API 없을 수도 있음):', e)
    }
  
    try {
      const res = await fetchUserTodayOrders()
      todayOrders = extractItems(res)
    } catch (e) {
      console.warn('유저 todayOrders 호출 실패(아직 API 없을 수도 있음):', e)
    }
  
    const allSales = normalizeDailySalesRows(salesDaily)
    const totalPaid = allSales.reduce(
      (sum, r) => sum + Number(r.sales_amount || r.total_amount || 0),
      0
    )
  
    const now = new Date()
    const ym = now.toISOString().slice(0, 7)
    const monthRows = allSales.filter((r) => String(r.date || '').startsWith(ym))
    const monthPaid = monthRows.reduce(
      (sum, r) => sum + Number(r.sales_amount || r.total_amount || 0),
      0
    )
    const monthOrderCount = monthRows.reduce(
      (sum, r) => sum + Number(r.order_count || r.order_cnt || 0),
      0
    )
    const avgOrderPrice = monthOrderCount > 0 ? monthPaid / monthOrderCount : 0
  
    userDash.totalPaid = totalPaid
    userDash.monthPaid = monthPaid
    userDash.monthOrderCount = monthOrderCount
    userDash.avgOrderPrice = avgOrderPrice
    userDash.topProducts = Array.isArray(topProducts) ? topProducts : []
    userDash.todayOrders = Array.isArray(todayOrders) ? todayOrders : []
  }
  
  /** ---------- 관리자 대시보드 로딩 ---------- */
  const loadAdminDashboard = async () => {
    const queryCommon = {
      startDate: adminRange.startDate,
      endDate: adminRange.endDate,
      providerSeq: adminFilter.providerSeq || undefined, // ✅ 전체면 아예 미전달
      goodsSeq: adminFilter.goodsSeq || undefined,
    }
  
    let salesDaily = []
    let salesMonth = []
    let topProducts = []
    let lowStock = []
  
    // 1) 일별 매출
    try {
      console.log('[ADMIN RANGE] start/end =', adminRange.startDate, adminRange.endDate)
      const res = await fetchAdminSalesDaily(queryCommon)
      salesDaily = extractItems(res)
  
      console.log('[DAILY] raw res =', res)
  
      salesDaily = extractItems(res)
  
      console.log(
        '[DAILY] extracted isArray=',
        Array.isArray(salesDaily),
        'len=',
        Array.isArray(salesDaily) ? salesDaily.length : 'n/a'
      )
      console.log('[DAILY] extracted sample=', Array.isArray(salesDaily) ? salesDaily[0] : salesDaily)
    } catch (e) {
      console.warn('관리자 salesDaily 호출 실패:', e)
    }
  
    try {
      const mRes = await fetchAdminSalesMonth(queryCommon)
      const rawMonth = extractItems(mRes)
      adminDash.monthRows = normalizeMonthSalesRows(rawMonth)
      console.log('[MONTH] normalized sample=', adminDash.monthRows?.[0])
    } catch (e) {
      console.warn('관리자 salesMonth 호출 실패:', e)
    }
  
    // 2) 판매 TOP10 (이제 실제 API 존재!)
    try {
      const res = await fetchAdminTopProducts({
        startDate: adminRange.startDate,
        endDate: adminRange.endDate,
        providerSeq: adminFilter.providerSeq || undefined,
        limit: 10,
      })
      topProducts = extractItems(res)
    } catch (e) {
      console.warn('관리자 topProducts 호출 실패:', e)
    }
  
    // 3) 재고 부족 리스트
    try {
      const res = await fetchLowStock({
        providerSeq: queryCommon.providerSeq,
        goodsSeq: queryCommon.goodsSeq,
      })
      lowStock = extractItems(res)
    } catch (e) {
      console.warn('관리자 lowStock 호출 실패:', e)
    }
  
    const rows = normalizeDailySalesRows(salesDaily)
  
    // 데이터 범위 구하기
    const datesSorted = rows
      .map((r) => r.date)
      .filter(Boolean)
      .sort()
    const dataMin = datesSorted[0]
    const dataMax = datesSorted[datesSorted.length - 1]
  
    console.log('[RANGE] data min~max=', dataMin, '~', dataMax)
  
    // ✅ preset(7/30/90)인데 데이터 범위 밖이면, 자동으로 데이터 기준으로 range를 재설정
    if (adminRange.preset !== 'custom' && dataMax) {
      const start = adminRange.startDate
      const end = adminRange.endDate
  
      const outOfRange = !start || !end || end < dataMin || start > dataMax
      if (outOfRange) {
        const days = Number(adminRange.preset)
        if (Number.isFinite(days) && days > 0) {
          setRangeLastNDays(days, dataMax) // baseYmd = dataMax
        }
      }
    }
  
    // 기간 필터
    const start = adminRange.startDate
    const end = adminRange.endDate
    const filteredRows =
      start && end ? rows.filter((r) => r.date >= start && r.date <= end) : rows.slice(-30)
  
    adminDash.dailyRows = filteredRows
  
    // const rowsMonth = normalizeMonthSalesRows(salesMonth)
    // adminDash.monthRows = rowsMonth
  
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  
    const todayRow = rows.find((r) => String(r.date) === today) || {
      sales_amount: 0,
      order_count: 0,
    }
    const yRow = rows.find((r) => String(r.date) === yesterday) || { sales_amount: 0 }
  
    const todaySales = Number(todayRow.sales_amount || todayRow.total_amount || 0)
    const todayOrderCount = Number(todayRow.order_count || todayRow.order_cnt || 0)
    const yesterdaySales = Number(yRow.sales_amount || yRow.total_amount || 0)
  
    const diffAmount = todaySales - yesterdaySales
    let diffRate = 0
    if (yesterdaySales > 0) diffRate = (diffAmount / yesterdaySales) * 100
    else if (todaySales > 0) diffRate = 100
  
    // ✅ [변경] 최근 7일 → 기간 합계(설정한 기간에 맞춤)
    const last7DaysSales = filteredRows.reduce((sum, r) => sum + toNumber(r.sales_amount), 0)
  
    adminDash.todaySales = todaySales
    adminDash.todayOrderCount = todayOrderCount
    adminDash.diffAmount = diffAmount
    adminDash.diffRate = diffRate
    adminDash.last7DaysSales = last7DaysSales
  
    // ✅ 여기서 필드 매핑
    adminDash.topProducts = (Array.isArray(topProducts) ? topProducts : []).map((r) => ({
      ...r,
      provider_name: r.goods_provider_name ?? r.provider_name ?? '',
      total_qty: r.total_ea ?? r.total_qty ?? 0,
      total_price: r.gross_sales ?? r.total_price ?? 0,
    }))
    console.log('[TOP10 sample]', adminDash.topProducts?.[0])
    adminDash.lowStock = Array.isArray(lowStock) ? lowStock : []
  }
  
  /** ---------- 공통: 대시보드 로딩 ---------- */
  const loadDashboard = async () => {
    state.loading = true
    state.error = null
    try {
      if (state.user.role === 'user') {
        await loadUserDashboard()
      } else {
        await loadAdminDashboard()
      }
    } catch (e) {
      console.error(e)
      state.error = e.message || '대시보드 데이터를 불러오지 못했습니다.'
    } finally {
      state.loading = false
    }
  }
  
  /** ---------- 데모 로그인 / 로그아웃 ---------- */
  const demoLogin = async () => {
    state.user.id = loginForm.id
    state.user.name = loginForm.id + ' 님'
    state.user.role = loginForm.role
    state.isLoggedIn = true
  
    if (state.user.role === 'admin') {
      applyAdminPreset() // 기본 preset=30 → start/end 세팅
      await loadProviders()
    }
  
    await loadDashboard()
  }
  
  /** ---------- 유틸 ---------- */
  const formatCurrency = (val, allowSign = false) => {
    const n = Number(val || 0)
    const abs = Math.abs(n).toLocaleString('ko-KR')
    if (!allowSign) return abs + '원'
    const sign = n > 0 ? '+' : n < 0 ? '-' : ''
    return (sign ? sign + ' ' : '') + abs + '원'
  }
  
  const toYmdKST = (v) => {
    if (v == null) return ''
    const d = new Date(String(v))
    if (isNaN(d.getTime())) return ''
    // KST(+9) 보정
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
    return kst.toISOString().slice(0, 10)
  }
  
  const normalizeDailySalesRows = (rows) => {
    if (!Array.isArray(rows)) return []
  
    return rows
      .map((r) => ({
        // ✅ 백엔드 스키마에 맞춤
        date: toYmdKST(r.sale_date), // "2024-12-31T..." → "2025-01-01" 형태로 변환됨(UTC 주의, 아래 설명)
        sales_amount: toNumber(r.gross_sales || 0), // 문자열 → 숫자
        order_count: toNumber(r.order_count || 0),
        total_ea: toNumber(r.total_ea || 0),
        gross_profit: Number(r.gross_profit || 0),
        gross_margin_rate: Number(r.gross_margin_rate || 0),
        cost_of_goods: Number(r.cost_of_goods || 0),
      }))
      .filter((r) => r.date) // date가 있는 것만
  }
  
  const normalizeMonthSalesRows = (rows) => {
    if (!Array.isArray(rows)) return []
  
    return (
      rows
        .map((r) => {
          // ✅ 백엔드: sale_month = 'YYYY-MM-01'
          const raw = r.sale_month ?? r.month ?? r.date ?? ''
          const month = String(raw).slice(0, 7) // 'YYYY-MM'
  
          return {
            month,
            sales_amount: toNumber(r.gross_sales ?? r.sales_amount ?? 0),
            order_count: toNumber(r.order_count ?? 0),
            total_ea: toNumber(r.total_ea ?? 0),
            gross_profit: toNumber(r.gross_profit ?? 0),
            gross_margin_rate: toNumber(r.gross_margin_rate ?? 0),
          }
        })
        // ✅ 이 필터가 핵심: 기존 필터가 sale_month('YYYY-MM-01')를 그대로 검사하거나
        //    month가 빈값이 되어 전부 탈락했을 확률이 큼
        .filter((r) => /^\d{4}-\d{2}$/.test(r.month))
    )
  }
  
  const adminDailySummary = computed(() => {
    const rows = Array.isArray(adminDash.dailyRows) ? adminDash.dailyRows : []
    if (!rows.length) {
      return { sum: 0, avg: 0, max: null, min: null }
    }
    const sum = rows.reduce((s, r) => s + toNumber(r.sales_amount || 0), 0)
    const avg = sum / rows.length
  
    let max = rows[0]
    let min = rows[0]
    for (const r of rows) {
      if (toNumber(r.sales_amount || 0) > toNumber(max.sales_amount || 0)) max = r
      if (toNumber(r.sales_amount || 0) < toNumber(min.sales_amount || 0)) min = r
    }
  
    return { sum, avg, max, min }
  })
  
  const adminMonthSummary = computed(() => {
    const rows = Array.isArray(adminDash.monthRows) ? adminDash.monthRows : []
  
    if (!rows.length) {
      return {
        sum: 0,
        avg: 0,
        max: { date: '', sales_amount: 0 },
        min: { date: '', sales_amount: 0 },
      }
    }
  
    const sum = rows.reduce((s, r) => s + toNumber(r.sales_amount || 0), 0)
    const avg = sum / rows.length
  
    let max = rows[0]
    let min = rows[0]
  
    for (const r of rows) {
      if (toNumber(r.sales_amount) > toNumber(max.sales_amount)) max = r
      if (toNumber(r.sales_amount) < toNumber(min.sales_amount)) min = r
    }
  
    return {
      sum,
      avg,
      // 🔥 핵심: month → date 로 매핑
      max: {
        ...max,
        date: max.month,
      },
      min: {
        ...min,
        date: min.month,
      },
    }
  })
  
  const adminAlerts = computed(() => {
    const rows = Array.isArray(adminDash.dailyRows) ? adminDash.dailyRows : []
    if (rows.length < 2) return []
  
    const last = rows[rows.length - 1]
    const prev = rows[rows.length - 2]
  
    const lastSales = toNumber(last.sales_amount)
    const prevSales = toNumber(prev.sales_amount)
  
    const alerts = []
  
    // 1) 전일 대비 급락/급등 (기본 30% 기준)
    if (prevSales > 0) {
      const rate = ((lastSales - prevSales) / prevSales) * 100
      if (rate <= -30)
        alerts.push({
          type: 'down',
          title: '전일 대비 매출 급락',
          desc: `${prev.date} → ${last.date} / ${rate.toFixed(1)}%`,
        })
      if (rate >= 30)
        alerts.push({
          type: 'up',
          title: '전일 대비 매출 급등',
          desc: `${prev.date} → ${last.date} / +${rate.toFixed(1)}%`,
        })
    }
  
    // 2) 최근 7일 평균 대비 (기본 40% 기준)
    const last7 = rows.slice(-7)
    const avg7 = last7.reduce((s, r) => s + toNumber(r.sales_amount), 0) / (last7.length || 1)
    if (avg7 > 0) {
      const rate2 = ((lastSales - avg7) / avg7) * 100
      if (rate2 <= -40)
        alerts.push({
          type: 'down',
          title: '최근 7일 평균 대비 급락',
          desc: `${last.date} / ${rate2.toFixed(1)}%`,
        })
      if (rate2 >= 40)
        alerts.push({
          type: 'up',
          title: '최근 7일 평균 대비 급등',
          desc: `${last.date} / +${rate2.toFixed(1)}%`,
        })
    }
  
    // 3) 재고 부족 + 판매 상위 교차 (상품코드 기준)
    const low = Array.isArray(adminDash.lowStock) ? adminDash.lowStock : []
    const top = Array.isArray(adminDash.topProducts) ? adminDash.topProducts : []
    const lowSet = new Set(low.map((x) => String(x.goods_code ?? x.goods_seq ?? '')))
    const hotLow = top.filter((t) => lowSet.has(String(t.goods_code ?? t.goods_seq ?? '')))
  
    if (hotLow.length) {
      alerts.push({
        type: 'warn',
        title: '재고 부족 + 판매 상위 상품',
        desc: `${hotLow.length}개 / TOP10 중 재고 부족 포함`,
      })
    }
  
    return alerts
  })
  
  const adminSalesChartSeries = computed(() => {
    const rows = Array.isArray(adminDash.dailyRows) ? adminDash.dailyRows : []
    const data = rows.map((r) => toNumber(r.sales_amount || 0))
    const avg = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0
  
    return [
      { name: '매출', data },
      { name: '평균', data: data.map(() => avg) }, // ✅ 평균선
    ]
  })
  const adminSalesChartOptions = computed(() => {
    const rows = Array.isArray(adminDash.dailyRows) ? adminDash.dailyRows : []
  
    return {
      chart: {
        type: 'line',
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: {
        curve: 'smooth',
        width: [3, 2],
        dashArray: [0, 6], // ✅ 평균선 점선
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: rows.map((r) => String(r.date || '').slice(5)), // MM-DD만 표시
        labels: { rotate: -45 },
      },
      yaxis: {
        labels: {
          formatter: (val) => `${Math.round(val).toLocaleString('ko-KR')}`,
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val) => `${Math.round(val).toLocaleString('ko-KR')}원`,
        },
        custom: ({ dataPointIndex, w }) => {
          const rows = Array.isArray(adminDash.dailyRows) ? adminDash.dailyRows : []
          const r = rows[dataPointIndex]
          if (!r) return ''
          const date = r.date
          const sales = toNumber(r.sales_amount || 0)
          const orders = toNumber(r.order_count || 0)
          const ea = toNumber(r.total_ea || 0)
  
          return `
              <div style="padding:10px 12px;font-size:12px;">
                <div style="font-weight:700;margin-bottom:6px;">${date}</div>
                <div>매출: <b>${sales.toLocaleString('ko-KR')}원</b></div>
                <div>주문수: <b>${orders.toLocaleString('ko-KR')}</b></div>
                <div>수량(EA): <b>${ea.toLocaleString('ko-KR')}</b></div>
              </div>
            `
        },
      },
      grid: { strokeDashArray: 4 },
      annotations: (() => {
        const rows = Array.isArray(adminDash.dailyRows) ? adminDash.dailyRows : []
        if (!rows.length) return {}
  
        // 최고/최저 찾기
        let max = rows[0],
          min = rows[0]
        for (const r of rows) {
          if (toNumber(r.sales_amount) > toNumber(max.sales_amount)) max = r
          if (toNumber(r.sales_amount) < toNumber(min.sales_amount)) min = r
        }
  
        // x축 라벨은 categories(MM-DD)라서 동일 포맷으로 맞춰줌
        const maxX = String(max.date || '').slice(5)
        const minX = String(min.date || '').slice(5)
  
        return {
          points: [
            {
              x: maxX,
              y: toNumber(max.sales_amount),
              marker: { size: 6 },
              label: {
                borderColor: '#10b981',
                style: { fontSize: '11px' },
                text: `최고 ${toNumber(max.sales_amount).toLocaleString('ko-KR')}원`,
              },
            },
            {
              x: minX,
              y: toNumber(min.sales_amount),
              marker: { size: 6 },
              label: {
                borderColor: '#f43f5e',
                style: { fontSize: '11px' },
                text: `최저 ${toNumber(min.sales_amount).toLocaleString('ko-KR')}원`,
              },
            },
          ],
        }
      })(),
    }
  })
  
  const adminMonthChartSeries = computed(() => {
    const rows = Array.isArray(adminDash.monthRows) ? adminDash.monthRows : []
    const data = rows.map((r) => toNumber(r.sales_amount || 0))
    const avg = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0
  
    return [
      { name: '월 매출', data },
      { name: '평균', data: data.map(() => avg) }, // ✅ 평균선
    ]
  })
  
  const adminMonthChartOptions = computed(() => {
    const rows = Array.isArray(adminDash.monthRows) ? adminDash.monthRows : []
    return {
      chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
      stroke: {
        curve: 'smooth',
        width: [3, 2],
        dashArray: [0, 6],
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: rows.map((r) => r.month), // YYYY-MM
        labels: { rotate: -45 },
      },
      yaxis: {
        labels: { formatter: (val) => `${Math.round(val).toLocaleString('ko-KR')}` },
      },
      tooltip: {
        shared: true,
        intersect: false,
        custom: ({ dataPointIndex }) => {
          const rows = Array.isArray(adminDash.monthRows) ? adminDash.monthRows : []
          const r = rows[dataPointIndex]
          if (!r) return ''
          const ym = String(r.date || '').slice(0, 7)
          const sales = toNumber(r.sales_amount || 0)
          const orders = toNumber(r.order_count || 0)
          const ea = toNumber(r.total_ea || 0)
  
          return `
              <div style="padding:10px 12px;font-size:12px;">
                <div style="font-weight:700;margin-bottom:6px;">${ym}</div>
                <div>매출: <b>${sales.toLocaleString('ko-KR')}원</b></div>
                <div>주문수: <b>${orders.toLocaleString('ko-KR')}</b></div>
                <div>수량(EA): <b>${ea.toLocaleString('ko-KR')}</b></div>
              </div>
            `
        },
      },
      grid: { strokeDashArray: 4 },
      annotations: (() => {
        const rows = Array.isArray(adminDash.monthRows) ? adminDash.monthRows : []
        if (!rows.length) return {}
  
        let max = rows[0],
          min = rows[0]
        for (const r of rows) {
          if (toNumber(r.sales_amount) > toNumber(max.sales_amount)) max = r
          if (toNumber(r.sales_amount) < toNumber(min.sales_amount)) min = r
        }
  
        // 월은 categories가 YYYY-MM 형태라고 가정
        const maxX = String(max.date || '').slice(0, 7)
        const minX = String(min.date || '').slice(0, 7)
  
        return {
          points: [
            {
              x: maxX,
              y: toNumber(max.sales_amount),
              marker: { size: 6 },
              label: {
                borderColor: '#10b981',
                style: { fontSize: '11px' },
                text: `최고 ${toNumber(max.sales_amount).toLocaleString('ko-KR')}원`,
              },
            },
            {
              x: minX,
              y: toNumber(min.sales_amount),
              marker: { size: 6 },
              label: {
                borderColor: '#f43f5e',
                style: { fontSize: '11px' },
                text: `최저 ${toNumber(min.sales_amount).toLocaleString('ko-KR')}원`,
              },
            },
          ],
        }
      })(),
    }
  })
  
  const fmtYMD = (d) => d.toISOString().slice(0, 10)
  
  const parseYmdToDate = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  
  const setRangeLastNDays = (days, baseYmd) => {
    const base = baseYmd ? parseYmdToDate(baseYmd) : new Date()
    const end = new Date(base)
    const start = new Date(base)
    start.setDate(end.getDate() - (days - 1))
  
    adminRange.startDate = fmtYMD(start)
    adminRange.endDate = fmtYMD(end)
  }
  
  const state = reactive({
    isLoggedIn: true, // 라우터 가드/로그인 페이지로 나중에 처리
    user: { id: '', name: '관리자', role: 'admin' },
    loading: false,
    error: null,
  })
  
  const toNumber = (v) => {
    if (v == null) return 0
    if (typeof v === 'number') return v
    const s = String(v).replace(/[^\d.-]/g, '') // 콤마/원/공백 제거
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : 0
  }
  
  const calcCompareFromDailyRows = (rows) => {
    const list = Array.isArray(rows) ? rows : []
    const sumSales = list.reduce((s, r) => s + toNumber(r.gross_sales ?? r.sales_amount ?? 0), 0)
    const sumOrders = list.reduce((s, r) => s + toNumber(r.order_count ?? 0), 0)
    const aov = sumOrders > 0 ? sumSales / sumOrders : 0
    return { sumSales, sumOrders, aov }
  }
  
  const loadProviderCompare = async () => {
    adminDash.providerCompareLoading = true
    adminDash.providerCompare = []
  
    try {
      console.log('[COMPARE] range=', adminRange.startDate, adminRange.endDate)
  
      // 1) 공급사 목록
      const pres = await fetchProviders('')
      const providerList = extractArray(pres)
  
      console.log('[COMPARE] providers len=', providerList.length, providerList[0])
  
      if (!providerList.length) {
        console.warn('[COMPARE] providers empty - /api/providers 응답 확인 필요')
        return
      }
  
      // 2) 과부하 방지: 상위 N개만
      const MAX = 20
      const targetProviders = providerList.slice(0, MAX)
  
      // 3) 공급사별 daily 호출 (한 개 실패해도 전체는 살림)
      const jobs = targetProviders.map(async (p) => {
        try {
          const res = await fetchAdminSalesDailyByProvider({
            startDate: adminRange.startDate,
            endDate: adminRange.endDate,
            providerSeq: p.provider_seq,
          })
          const items = extractArray(res)
          const { sumSales, sumOrders, aov } = calcCompareFromDailyRows(items)
  
          return {
            provider_seq: p.provider_seq,
            provider_name: p.provider_name,
            sumSales,
            sumOrders,
            aov,
          }
        } catch (e) {
          console.warn('[COMPARE] provider failed:', p?.provider_seq, p?.provider_name, e)
          return null
        }
      })
  
      const rowsRaw = await Promise.all(jobs)
      const rows = rowsRaw.filter(Boolean)
  
      console.log('[COMPARE] rows len=', rows.length, rows[0])
  
      if (!rows.length) {
        console.warn('[COMPARE] all providers failed or returned empty daily rows')
        return
      }
  
      // 4) 비중/정렬
      const totalSalesAll = rows.reduce((s, r) => s + toNumber(r.sumSales), 0)
  
      adminDash.providerCompare = rows
        .map((r) => ({
          ...r,
          share: totalSalesAll > 0 ? (toNumber(r.sumSales) / totalSalesAll) * 100 : 0,
        }))
        .sort((a, b) => toNumber(b.sumSales) - toNumber(a.sumSales))
    } finally {
      adminDash.providerCompareLoading = false
    }
  }
  </script>
  