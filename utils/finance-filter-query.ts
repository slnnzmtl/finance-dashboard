import type { LocationQuery, LocationQueryValue } from 'vue-router'
import type { ExpenseSortColumn, PaidFilter, SortDir } from './finance-query'
import { EXPENSE_SORT_COLUMNS } from './finance-query'

export interface FinanceFilters {
  year: number
  month: number
  dateFrom: string
  dateTo: string
  selectedCategoryIds: string[]
  paidFilter: PaidFilter
  page?: number
  pageSize?: number
  sortBy?: ExpenseSortColumn
  sortDir?: SortDir
}

export type FinanceFilterDefaults = Pick<FinanceFilters, 'year' | 'month' | 'paidFilter'> & {
  page?: number
  pageSize?: number
  sortBy?: ExpenseSortColumn
  sortDir?: SortDir
}

const PAID_VALUES = new Set<PaidFilter>(['all', 'paid', 'unpaid'])
const SORT_DIR_VALUES = new Set<SortDir>(['asc', 'desc'])

function firstQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string | null {
  if (value == null) return null
  if (Array.isArray(value)) {
    const first = value.find(v => v != null && v !== '')
    return first ?? null
  }
  return value === '' ? null : value
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (raw == null) return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) return fallback
  return n
}

function parseMonth(raw: string | null, fallback: number): number {
  if (raw == null) return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0 || n > 12) return fallback
  return n
}

function parsePaidFilter(raw: string | null, fallback: PaidFilter): PaidFilter {
  if (raw == null) return fallback
  if (PAID_VALUES.has(raw as PaidFilter)) return raw as PaidFilter
  return fallback
}

function parseSortBy(raw: string | null, fallback: ExpenseSortColumn): ExpenseSortColumn {
  if (raw == null) return fallback
  if (EXPENSE_SORT_COLUMNS.has(raw as ExpenseSortColumn)) return raw as ExpenseSortColumn
  return fallback
}

function parseSortDir(raw: string | null, fallback: SortDir): SortDir {
  if (raw == null) return fallback
  if (SORT_DIR_VALUES.has(raw as SortDir)) return raw as SortDir
  return fallback
}

function parseCategories(query: LocationQuery): string[] {
  const value = query.category
  if (value == null) return []

  const parts: string[] = []
  const push = (s: string) => {
    for (const id of s.split(',')) {
      const trimmed = id.trim()
      if (trimmed && !parts.includes(trimmed)) parts.push(trimmed)
    }
  }

  if (Array.isArray(value)) {
    for (const v of value) {
      if (v != null && v !== '') push(v)
    }
  }
  else if (value !== '') {
    push(value)
  }

  return parts
}

/** Expand query values so `a,b` and `['a','b']` compare equal. */
function normalizeQueryValues(
  value: string | string[] | LocationQueryValue | LocationQueryValue[] | undefined | null,
): string[] {
  if (value == null) return []
  const parts: string[] = []
  const list = Array.isArray(value) ? value : [value]
  for (const item of list) {
    if (item == null || item === '') continue
    for (const id of item.split(',')) {
      const trimmed = id.trim()
      if (trimmed) parts.push(trimmed)
    }
  }
  return parts
}

function queriesEqual(
  a: Record<string, string | string[]>,
  b: LocationQuery,
): boolean {
  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).filter((k) => {
    const v = b[k]
    if (v == null) return false
    if (Array.isArray(v)) return v.some(x => x != null && x !== '')
    return v !== ''
  }).sort()

  if (aKeys.length !== bKeys.length) return false
  if (aKeys.some((k, i) => k !== bKeys[i])) return false

  for (const key of aKeys) {
    const aList = normalizeQueryValues(a[key])
    const bList = normalizeQueryValues(b[key])
    if (aList.length !== bList.length) return false
    if (aList.some((v, i) => v !== bList[i])) return false
  }
  return true
}

export function parseFinanceFilterQuery(
  query: LocationQuery,
  defaults: FinanceFilterDefaults,
): FinanceFilters {
  const filters: FinanceFilters = {
    year: parsePositiveInt(firstQueryValue(query.year), defaults.year),
    month: parseMonth(firstQueryValue(query.month), defaults.month),
    dateFrom: firstQueryValue(query.from) ?? '',
    dateTo: firstQueryValue(query.to) ?? '',
    selectedCategoryIds: parseCategories(query),
    paidFilter: parsePaidFilter(firstQueryValue(query.paid), defaults.paidFilter),
  }

  if (defaults.page != null) {
    filters.page = parsePositiveInt(firstQueryValue(query.page), defaults.page)
  }
  if (defaults.pageSize != null) {
    filters.pageSize = parsePositiveInt(firstQueryValue(query.pageSize), defaults.pageSize)
  }
  if (defaults.sortBy != null) {
    filters.sortBy = parseSortBy(firstQueryValue(query.sort), defaults.sortBy)
    filters.sortDir = parseSortDir(
      firstQueryValue(query.order),
      defaults.sortDir ?? 'desc',
    )
  }

  return filters
}

export function serializeFinanceFilterQuery(
  filters: FinanceFilters,
  defaults: FinanceFilterDefaults,
): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {}

  if (filters.year !== defaults.year) {
    query.year = String(filters.year)
  }
  if (filters.month !== defaults.month) {
    query.month = String(filters.month)
  }
  if (filters.dateFrom) {
    query.from = filters.dateFrom
  }
  if (filters.dateTo) {
    query.to = filters.dateTo
  }
  if (filters.selectedCategoryIds.length > 0) {
    query.category = filters.selectedCategoryIds.join(',')
  }
  if (filters.paidFilter !== defaults.paidFilter) {
    query.paid = filters.paidFilter
  }
  if (
    defaults.page != null
    && filters.page != null
    && filters.page !== defaults.page
  ) {
    query.page = String(filters.page)
  }
  if (
    defaults.pageSize != null
    && filters.pageSize != null
    && filters.pageSize !== defaults.pageSize
  ) {
    query.pageSize = String(filters.pageSize)
  }
  if (
    defaults.sortBy != null
    && filters.sortBy != null
    && filters.sortBy !== defaults.sortBy
  ) {
    query.sort = filters.sortBy
  }
  if (
    defaults.sortBy != null
    && filters.sortDir != null
    && filters.sortDir !== (defaults.sortDir ?? 'desc')
  ) {
    query.order = filters.sortDir
  }

  return query
}

/** True when serialized filters already match the current route query. */
export function financeFilterQueryMatches(
  filters: FinanceFilters,
  defaults: FinanceFilterDefaults,
  routeQuery: LocationQuery,
): boolean {
  return queriesEqual(serializeFinanceFilterQuery(filters, defaults), routeQuery)
}
