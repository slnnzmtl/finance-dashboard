import {
  ACCESS_HINT,
  buildCategoryMonthMatrix,
  buildExpenseQuery,
  categoryNameMap,
  formatUsd,
  normalizeCategories,
  normalizeExpenses,
  resolveCategoryName,
  yearBounds,
  type Category,
  type Expense,
} from '../utils/finance-query'
import { useFinanceFilterState } from './useFinanceFilterState'

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

export function useFinanceDashboard() {
  const now = new Date()

  const {
    year,
    month,
    dateFrom,
    dateTo,
    selectedCategoryIds,
    paidFilter,
    filterQuery,
    effectiveDateWindow,
    hadExplicitYearMonth,
    clearDateRange,
    toggleCategory,
    clearCategoryFilter,
    isCategorySelected,
  } = useFinanceFilterState({
    defaults: {
      year: now.getFullYear(),
      /** Current calendar month; 0 = all months when selected in the filter. */
      month: now.getMonth() + 1,
      paidFilter: 'all',
    },
    allowAllMonths: true,
  })

  /** Category / summary window expenses (already filtered server-side). */
  const expenses = ref<Expense[]>([])
  /** Year (or custom range) expenses for the monthly bar chart. */
  const yearExpenses = ref<Expense[]>([])
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const accessHint = ref<string | null>(null)
  const hasLoadedOnce = ref(false)

  let didSnapDefault = hadExplicitYearMonth
  let fetchGeneration = 0

  const availableYears = computed(() => {
    const years = new Set<number>()
    years.add(now.getFullYear())
    years.add(year.value)
    for (const e of yearExpenses.value) {
      if (e.paid_date) years.add(Number(e.paid_date.slice(0, 4)))
    }
    for (const e of expenses.value) {
      if (e.paid_date) years.add(Number(e.paid_date.slice(0, 4)))
    }
    return [...years].sort((a, b) => b - a)
  })

  const yearDateWindow = computed(() => {
    if (dateFrom.value || dateTo.value) {
      return {
        from: dateFrom.value || '0001-01-01',
        to: dateTo.value || '9999-12-31',
      }
    }
    return yearBounds(year.value)
  })

  const monthlyTotals = computed(() => {
    const totals = Array.from({ length: 12 }, () => 0)
    for (const e of yearExpenses.value) {
      if (!e.paid_date) continue
      const m = Number(e.paid_date.slice(5, 7)) - 1
      if (m >= 0 && m < 12) totals[m] += e.amount
    }
    return {
      labels: [...MONTH_LABELS],
      data: totals,
    }
  })

  const categoryTotals = computed(() => {
    const nameById = categoryNameMap(categories.value)
    const map = new Map<string, { name: string, total: number }>()
    for (const e of expenses.value) {
      const id = e.category
      const name = resolveCategoryName(id, nameById)
      const existing = map.get(id)
      if (existing) {
        existing.total += e.amount
      }
      else {
        map.set(id, { name, total: e.amount })
      }
    }
    const entries = [...map.values()].sort((a, b) => b.total - a.total)
    return {
      labels: entries.map(e => e.name),
      data: entries.map(e => e.total),
    }
  })

  const categoryMonthMatrix = computed(() =>
    buildCategoryMonthMatrix(yearExpenses.value, categories.value),
  )

  const summary = computed(() => {
    const list = expenses.value
    const total = list.reduce((sum, e) => sum + e.amount, 0)
    const count = list.length

    const today = new Date()
    let daysPassed = 0

    if (dateFrom.value || dateTo.value) {
      const window = effectiveDateWindow.value
      const start = new Date(`${window.from}T00:00:00`)
      let end = new Date(`${window.to}T00:00:00`)
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      if (window.to > todayStr) end = new Date(`${todayStr}T00:00:00`)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
        daysPassed = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
      }
    }
    else if (month.value === 0) {
      const isCurrentYear = year.value === today.getFullYear()
      const start = new Date(year.value, 0, 1)
      const end = isCurrentYear ? today : new Date(year.value, 11, 31)
      daysPassed = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
    }
    else {
      const daysInMonth = new Date(year.value, month.value, 0).getDate()
      const isCurrentMonth
        = year.value === today.getFullYear()
          && month.value === today.getMonth() + 1
      daysPassed = isCurrentMonth ? today.getDate() : daysInMonth
    }

    const averageDaily = daysPassed > 0 ? Math.round(total / daysPassed) : 0

    return { total, count, averageDaily }
  })

  function expenseQuery(from: string, to: string) {
    return buildExpenseQuery(useSupabase(), {
      from,
      to,
      paidFilter: paidFilter.value,
      selectedCategoryIds: selectedCategoryIds.value,
    })
  }

  /** Snap empty default year to latest year with data; keep all-months when month is 0. */
  function snapToLatestPeriod(rows: Expense[]) {
    const withDate = rows.filter(e => e.paid_date)
    if (!withDate.length) return false

    const latest = withDate.reduce((a, b) => (a.paid_date >= b.paid_date ? a : b))
    const nextYear = Number(latest.paid_date.slice(0, 4))
    const nextMonth = Number(latest.paid_date.slice(5, 7))

    if (month.value === 0) {
      if (nextYear !== year.value) {
        year.value = nextYear
        return true
      }
      return false
    }

    const changed = nextYear !== year.value || nextMonth !== month.value
    if (changed) {
      year.value = nextYear
      month.value = nextMonth
    }
    return changed
  }

  async function fetchData() {
    const generation = ++fetchGeneration
    const showFullLoading = !hasLoadedOnce.value
    if (showFullLoading) loading.value = true
    error.value = null
    accessHint.value = null

    try {
      const categoryWindow = effectiveDateWindow.value
      const yearWindow = yearDateWindow.value
      const supabase = useSupabase()

      const categoryQuery = expenseQuery(categoryWindow.from, categoryWindow.to)
      const yearQuery = expenseQuery(yearWindow.from, yearWindow.to)
      const categoriesQuery = supabase
        .from('category')
        .select('id, created_at, name, note')
        .order('name', { ascending: true })

      const [categoryRes, yearRes, categoryListRes] = await Promise.all([
        categoryQuery,
        yearQuery,
        categoriesQuery,
      ])

      if (generation !== fetchGeneration) return

      if (categoryRes.error) throw categoryRes.error
      if (yearRes.error) throw yearRes.error
      if (categoryListRes.error) throw categoryListRes.error

      const categoryRows = normalizeExpenses((categoryRes.data ?? []) as Expense[])
      const yearRows = normalizeExpenses((yearRes.data ?? []) as Expense[])

      expenses.value = categoryRows
      yearExpenses.value = yearRows
      categories.value = normalizeCategories((categoryListRes.data ?? []) as Category[])

      if (
        categories.value.length === 0
        && categoryRows.length === 0
        && yearRows.length === 0
      ) {
        accessHint.value = ACCESS_HINT
      }

      if (!didSnapDefault && !dateFrom.value && !dateTo.value) {
        if (categoryRows.length === 0 && yearRows.length > 0) {
          didSnapDefault = true
          const changed = snapToLatestPeriod(yearRows)
          if (changed) return
        }
        else if (categoryRows.length === 0 && yearRows.length === 0) {
          const probe = buildExpenseQuery(supabase, {
            from: '0001-01-01',
            to: '9999-12-31',
            paidFilter: paidFilter.value,
            selectedCategoryIds: selectedCategoryIds.value,
          }).limit(1)

          const probeRes = await probe
          if (generation !== fetchGeneration) return
          if (probeRes.error) throw probeRes.error

          const probeRows = (probeRes.data ?? []) as Expense[]
          didSnapDefault = true
          if (probeRows.length > 0) {
            const changed = snapToLatestPeriod(probeRows)
            if (changed) return
          }
        }
        else {
          didSnapDefault = true
        }
      }
      else {
        didSnapDefault = true
      }

      hasLoadedOnce.value = true
    }
    catch (err) {
      if (generation !== fetchGeneration) return
      error.value = err instanceof Error ? err.message : 'Failed to load finance data'
      expenses.value = []
      yearExpenses.value = []
      categories.value = []
      hasLoadedOnce.value = true
    }
    finally {
      if (generation === fetchGeneration) {
        loading.value = false
      }
    }
  }

  watch(
    [year, month, dateFrom, dateTo, selectedCategoryIds, paidFilter],
    () => {
      fetchData()
    },
    { deep: true, immediate: true },
  )

  return {
    expenses,
    yearExpenses,
    categories,
    loading,
    error,
    accessHint,
    hasLoadedOnce,
    year,
    month,
    dateFrom,
    dateTo,
    selectedCategoryIds,
    paidFilter,
    filterQuery,
    availableYears,
    effectiveDateWindow,
    monthlyTotals,
    categoryTotals,
    categoryMonthMatrix,
    summary,
    fetchData,
    clearDateRange,
    toggleCategory,
    clearCategoryFilter,
    isCategorySelected,
    formatUsd,
    MONTH_LABELS,
  }
}
