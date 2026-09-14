<script setup lang="ts">
import { Chart, registerables, type Chart as ChartType, type ChartItem } from 'chart.js'
import {
  useFinanceDashboard,
} from '../composables/useFinanceDashboard'
import FinanceFilterBar from '../components/FinanceFilterBar.vue'
import { formatUsd } from '../utils/finance-query'

Chart.register(...registerables)

useHead({
  title: 'Finance Dashboard',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const { signOut } = useAuth()

const {
  categories,
  loading,
  error,
  accessHint,
  year,
  month,
  dateFrom,
  dateTo,
  selectedCategoryIds,
  paidFilter,
  filterQuery,
  availableYears,
  expenses,
  monthlyTotals,
  categoryTotals,
  categoryMonthMatrix,
  summary,
  clearDateRange,
  toggleCategory,
  clearCategoryFilter,
  isCategorySelected,
  MONTH_LABELS,
} = useFinanceDashboard()

function formatMatrixAmount(amount: number) {
  return amount > 0 ? formatUsd(amount) : ''
}

const monthlyCanvas = ref<HTMLCanvasElement | null>(null)
const categoryCanvas = ref<HTMLCanvasElement | null>(null)
let monthlyChart: ChartType | null = null
let categoryChart: ChartType | null = null

const CATEGORY_COLORS = [
  'rgba(37, 99, 235, 0.85)',
  'rgba(14, 165, 233, 0.85)',
  'rgba(20, 184, 166, 0.85)',
  'rgba(234, 179, 8, 0.85)',
  'rgba(249, 115, 22, 0.85)',
  'rgba(239, 68, 68, 0.85)',
  'rgba(168, 85, 247, 0.85)',
  'rgba(100, 116, 139, 0.85)',
]

function destroyCharts() {
  monthlyChart?.destroy()
  categoryChart?.destroy()
  monthlyChart = null
  categoryChart = null
}

function renderCharts() {
  if (!monthlyCanvas.value || !categoryCanvas.value) return

  const monthlyEl = monthlyCanvas.value as ChartItem
  const categoryEl = categoryCanvas.value as ChartItem

  const usdTick = (value: string | number) =>
    formatUsd(typeof value === 'string' ? Number(value) : value)

  if (!monthlyChart) {
    monthlyChart = new Chart(monthlyEl, {
      type: 'bar',
      data: {
        labels: monthlyTotals.value.labels,
        datasets: [
          {
            label: 'Spend',
            data: [...monthlyTotals.value.data],
            backgroundColor: 'rgba(37, 99, 235, 0.75)',
            borderColor: 'rgba(37, 99, 235, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: usdTick },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => formatUsd(Number(ctx.raw ?? 0)),
            },
          },
        },
      },
    })
  }
  else {
    monthlyChart.data.labels = [...monthlyTotals.value.labels]
    monthlyChart.data.datasets[0].data = [...monthlyTotals.value.data]
    monthlyChart.update()
  }

  const catColors = categoryTotals.value.labels.map(
    (_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  )

  if (!categoryChart) {
    categoryChart = new Chart(categoryEl, {
      type: 'doughnut',
      data: {
        labels: [...categoryTotals.value.labels],
        datasets: [
          {
            label: 'Spend',
            data: [...categoryTotals.value.data],
            backgroundColor: catColors,
            borderWidth: 1,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.label ?? ''
                const value = formatUsd(Number(ctx.raw ?? 0))
                return `${label}: ${value}`
              },
            },
          },
        },
      },
    })
  }
  else {
    categoryChart.data.labels = [...categoryTotals.value.labels]
    categoryChart.data.datasets[0].data = [...categoryTotals.value.data]
    categoryChart.data.datasets[0].backgroundColor = catColors
    categoryChart.update()
  }
}

watch(
  [monthlyTotals, categoryTotals, loading],
  () => {
    if (loading.value) {
      destroyCharts()
      return
    }
    nextTick(() => renderCharts())
  },
  { deep: true },
)

onBeforeUnmount(() => {
  destroyCharts()
})
</script>

<template>
  <div class="page-shell mx-auto max-w-6xl space-y-8 py-10 px-4">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          Finance
        </h1>
        <p class="text-muted-foreground mt-2 max-w-prose">
          Personal spending overview by month and category.
        </p>
      </div>
      <div class="flex items-center gap-4">
        <NuxtLink
          :to="{ path: '/expenses', query: filterQuery }"
          class="text-sm text-primary hover:underline"
        >
          View all expenses →
        </NuxtLink>
        <button
          type="button"
          class="text-sm text-muted-foreground hover:underline"
          @click="signOut"
        >
          Sign out
        </button>
      </div>
    </header>

    <FinanceFilterBar
      v-model:year="year"
      v-model:month="month"
      v-model:date-from="dateFrom"
      v-model:date-to="dateTo"
      v-model:paid-filter="paidFilter"
      id-prefix="dashboard"
      :loading="loading"
      :available-years="availableYears"
      :categories="categories"
      :selected-category-ids="selectedCategoryIds"
      :is-category-selected="isCategorySelected"
      :clear-date-range="clearDateRange"
      :toggle-category="toggleCategory"
      :clear-category-filter="clearCategoryFilter"
    />

    <!-- Loading / error -->
    <div v-if="loading" class="text-muted-foreground text-sm">
      Loading expenses…
    </div>
    <div
      v-else-if="error"
      class="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      {{ error }}
    </div>
    <div
      v-else-if="accessHint"
      class="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
    >
      {{ accessHint }}
    </div>

    <template v-else>
      <!-- Summary -->
      <section class="grid gap-6 grid-cols-3">
        <div>
          <p class="text-sm text-muted-foreground">
            Total spend
          </p>
          <p class="mt-1 text-2xl font-semibold tracking-tight">
            {{ formatUsd(summary.total) }}
          </p>
        </div>
        <div>
          <p class="text-sm text-muted-foreground">
            Expenses
          </p>
          <p class="mt-1 text-2xl font-semibold tracking-tight">
            {{ summary.count }}
          </p>
        </div>
        <div>
          <p class="text-sm text-muted-foreground">
            Average daily
          </p>
          <p class="mt-1 text-2xl font-semibold tracking-tight">
            {{ formatUsd(summary.averageDaily) }}
          </p>
        </div>
      </section>

      <p
        v-if="!expenses.length"
        class="text-sm text-muted-foreground"
      >
        No expenses match the current filters.
      </p>

      <!-- Charts -->
      <section class="grid gap-8 lg:grid-cols-2">
        <div class="space-y-3">
          <h2 class="text-lg font-semibold tracking-tight">
            Spend by month
          </h2>
          <p class="text-sm text-muted-foreground">
            {{ dateFrom || dateTo ? 'Within selected date range' : `Year ${year}` }}
          </p>
          <div class="h-72">
            <canvas ref="monthlyCanvas" />
          </div>
        </div>

        <div class="space-y-3">
          <h2 class="text-lg font-semibold tracking-tight">
            Spend by category
          </h2>
          <p class="text-sm text-muted-foreground">
            {{ dateFrom || dateTo
              ? 'Within selected date range'
              : month === 0
                ? `Year ${year}`
                : `${MONTH_LABELS[month - 1]} ${year}` }}
          </p>
          <div class="h-72">
            <canvas ref="categoryCanvas" />
          </div>
        </div>
      </section>

      <!-- Category × month pivot -->
      <section class="space-y-3">
        <h2 class="text-lg font-semibold tracking-tight">
          Sum of amount by category / month
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ dateFrom || dateTo ? 'Within selected date range' : `Year ${year}` }}
        </p>

        <p
          v-if="!categoryMonthMatrix.rows.length"
          class="text-sm text-muted-foreground"
        >
          No expenses in this period.
        </p>

        <div
          v-else
          class="table-h-scroll rounded-md border border-border"
        >
          <table class="w-full min-w-[960px] text-sm">
            <thead class="border-b border-border bg-muted/40">
              <tr class="text-left">
                <th class="px-4 py-3 font-medium whitespace-nowrap">
                  Category
                </th>
                <th
                  v-for="label in MONTH_LABELS"
                  :key="label"
                  class="px-3 py-3 font-medium text-right whitespace-nowrap"
                >
                  {{ label }}
                </th>
                <th class="px-4 py-3 font-medium text-right whitespace-nowrap">
                  Grand Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in categoryMonthMatrix.rows"
                :key="row.categoryId"
                class="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td class="px-4 py-3 font-medium whitespace-nowrap">
                  {{ row.name }}
                </td>
                <td
                  v-for="(amount, idx) in row.amounts"
                  :key="idx"
                  class="px-3 py-3 text-right tabular-nums whitespace-nowrap"
                >
                  {{ formatMatrixAmount(amount) }}
                </td>
                <td class="px-4 py-3 text-right tabular-nums whitespace-nowrap font-medium">
                  {{ formatMatrixAmount(row.total) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-border bg-muted/40 font-semibold">
                <td class="px-4 py-3 whitespace-nowrap">
                  Grand Total
                </td>
                <td
                  v-for="(total, idx) in categoryMonthMatrix.columnTotals"
                  :key="idx"
                  class="px-3 py-3 text-right tabular-nums whitespace-nowrap"
                >
                  {{ formatMatrixAmount(total) }}
                </td>
                <td class="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                  {{ formatMatrixAmount(categoryMonthMatrix.grandTotal) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
