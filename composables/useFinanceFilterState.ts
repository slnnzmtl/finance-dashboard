import {
  monthBounds,
  yearBounds,
  type ExpenseSortColumn,
  type PaidFilter,
  type SortDir,
} from '../utils/finance-query'
import {
  financeFilterQueryMatches,
  parseFinanceFilterQuery,
  serializeFinanceFilterQuery,
  type FinanceFilterDefaults,
  type FinanceFilters,
} from '../utils/finance-filter-query'

export interface UseFinanceFilterStateOptions {
  defaults: FinanceFilterDefaults
  /**
   * When true, allow month 0 = all months in the year.
   * When false, clamp month to >= 1.
   */
  allowAllMonths?: boolean
}

/**
 * Owns finance filter refs and bidirectional URL sync.
 * Does not fetch data — page composables watch these refs and load.
 */
export function useFinanceFilterState(options: UseFinanceFilterStateOptions) {
  const { defaults, allowAllMonths = false } = options
  const route = useRoute()
  const router = useRouter()

  const initial = parseFinanceFilterQuery(route.query, defaults)
  if (!allowAllMonths && initial.month < 1) {
    initial.month = defaults.month
  }

  const hadExplicitYearMonth = 'year' in route.query || 'month' in route.query

  const year = ref(initial.year)
  const month = ref(initial.month)
  const dateFrom = ref(initial.dateFrom)
  const dateTo = ref(initial.dateTo)
  const selectedCategoryIds = ref<string[]>([...initial.selectedCategoryIds])
  const paidFilter = ref<PaidFilter>(initial.paidFilter)

  const includePagination = defaults.page != null
  const page = ref(initial.page ?? defaults.page ?? 1)
  const pageSize = ref(initial.pageSize ?? defaults.pageSize ?? 25)

  const includeSort = defaults.sortBy != null
  const sortBy = ref<ExpenseSortColumn>(initial.sortBy ?? defaults.sortBy ?? 'paid_date')
  const sortDir = ref<SortDir>(initial.sortDir ?? defaults.sortDir ?? 'desc')

  const syncingFromRoute = ref(false)
  /** Avoid writing an empty query over the real URL before the router is ready. */
  let allowRouteWrite = false

  function currentFilters(): FinanceFilters {
    const filters: FinanceFilters = {
      year: year.value,
      month: month.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      selectedCategoryIds: selectedCategoryIds.value,
      paidFilter: paidFilter.value,
    }
    if (includePagination) {
      filters.page = page.value
      filters.pageSize = pageSize.value
    }
    if (includeSort) {
      filters.sortBy = sortBy.value
      filters.sortDir = sortDir.value
    }
    return filters
  }

  function applyFilters(filters: FinanceFilters) {
    year.value = filters.year
    month.value = (!allowAllMonths && filters.month < 1)
      ? defaults.month
      : filters.month
    dateFrom.value = filters.dateFrom
    dateTo.value = filters.dateTo
    selectedCategoryIds.value = [...filters.selectedCategoryIds]
    paidFilter.value = filters.paidFilter
    if (includePagination) {
      if (filters.page != null) page.value = filters.page
      if (filters.pageSize != null) pageSize.value = filters.pageSize
    }
    if (includeSort) {
      if (filters.sortBy != null) sortBy.value = filters.sortBy
      if (filters.sortDir != null) sortDir.value = filters.sortDir
    }
  }

  /** Shared filters only — omit pagination and sort for cross-page links. */
  const filterQuery = computed(() =>
    serializeFinanceFilterQuery(
      {
        year: year.value,
        month: month.value,
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
        selectedCategoryIds: selectedCategoryIds.value,
        paidFilter: paidFilter.value,
      },
      {
        year: defaults.year,
        month: defaults.month,
        paidFilter: defaults.paidFilter,
      },
    ),
  )

  function syncQueryToRoute() {
    if (!allowRouteWrite || syncingFromRoute.value) return
    const filters = currentFilters()
    if (financeFilterQueryMatches(filters, defaults, route.query)) return
    router.replace({ query: serializeFinanceFilterQuery(filters, defaults) })
  }

  const effectiveDateWindow = computed(() => {
    if (dateFrom.value || dateTo.value) {
      return {
        from: dateFrom.value || '0001-01-01',
        to: dateTo.value || '9999-12-31',
        isCustomRange: true,
      }
    }
    if (allowAllMonths && month.value === 0) {
      return { ...yearBounds(year.value), isCustomRange: false }
    }
    return { ...monthBounds(year.value, month.value), isCustomRange: false }
  })

  function clearDateRange() {
    dateFrom.value = ''
    dateTo.value = ''
  }

  function isCategorySelected(id: string) {
    return selectedCategoryIds.value.includes(id)
  }

  function toggleCategory(id: string) {
    const idx = selectedCategoryIds.value.indexOf(id)
    if (idx >= 0) {
      selectedCategoryIds.value = selectedCategoryIds.value.filter(c => c !== id)
    }
    else {
      selectedCategoryIds.value = [...selectedCategoryIds.value, id]
    }
  }

  function clearCategoryFilter() {
    selectedCategoryIds.value = []
  }

  const filterWatchSources = [
    year,
    month,
    dateFrom,
    dateTo,
    selectedCategoryIds,
    paidFilter,
    ...(includePagination ? [page, pageSize] : []),
    ...(includeSort ? [sortBy, sortDir] : []),
  ]

  watch(
    filterWatchSources,
    () => {
      syncQueryToRoute()
    },
    { deep: true },
  )

  watch(
    () => route.query,
    (query) => {
      if (financeFilterQueryMatches(currentFilters(), defaults, query)) return
      syncingFromRoute.value = true
      applyFilters(parseFinanceFilterQuery(query, defaults))
      nextTick(() => {
        syncingFromRoute.value = false
      })
    },
  )

  onMounted(() => {
    if (!financeFilterQueryMatches(currentFilters(), defaults, route.query)) {
      syncingFromRoute.value = true
      applyFilters(parseFinanceFilterQuery(route.query, defaults))
      nextTick(() => {
        syncingFromRoute.value = false
        allowRouteWrite = true
      })
    }
    else {
      allowRouteWrite = true
    }
  })

  return {
    defaults,
    year,
    month,
    dateFrom,
    dateTo,
    selectedCategoryIds,
    paidFilter,
    page,
    pageSize,
    sortBy,
    sortDir,
    filterQuery,
    effectiveDateWindow,
    syncingFromRoute,
    hadExplicitYearMonth,
    clearDateRange,
    toggleCategory,
    clearCategoryFilter,
    isCategorySelected,
    syncQueryToRoute,
  }
}
