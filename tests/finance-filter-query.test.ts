import { describe, it, expect } from 'vitest'
import {
  parseFinanceFilterQuery,
  serializeFinanceFilterQuery,
  financeFilterQueryMatches,
  type FinanceFilterDefaults,
  type FinanceFilters,
} from '~/utils/finance-filter-query'

const defaults: FinanceFilterDefaults = {
  year: 2026,
  month: 8,
  paidFilter: 'all',
  page: 1,
  pageSize: 25,
}

const baseFilters: FinanceFilters = {
  year: 2026,
  month: 8,
  dateFrom: '',
  dateTo: '',
  selectedCategoryIds: [],
  paidFilter: 'all',
  page: 1,
  pageSize: 25,
}

describe('parseFinanceFilterQuery', () => {
  it('returns defaults for empty query', () => {
    expect(parseFinanceFilterQuery({}, defaults)).toEqual(baseFilters)
  })

  it('parses valid year, month, paid, dates, and pagination', () => {
    expect(parseFinanceFilterQuery({
      year: '2024',
      month: '3',
      paid: 'unpaid',
      from: '2024-01-01',
      to: '2024-03-31',
      page: '2',
      pageSize: '50',
    }, defaults)).toEqual({
      year: 2024,
      month: 3,
      dateFrom: '2024-01-01',
      dateTo: '2024-03-31',
      selectedCategoryIds: [],
      paidFilter: 'unpaid',
      page: 2,
      pageSize: 50,
    })
  })

  it('parses repeatable and comma-separated category ids', () => {
    expect(parseFinanceFilterQuery({
      category: ['abc', 'def'],
    }, defaults).selectedCategoryIds).toEqual(['abc', 'def'])

    expect(parseFinanceFilterQuery({
      category: 'abc,def',
    }, defaults).selectedCategoryIds).toEqual(['abc', 'def'])
  })

  it('allows month 0 for all-months', () => {
    expect(parseFinanceFilterQuery({ month: '0' }, {
      ...defaults,
      month: 0,
    }).month).toBe(0)
  })

  it('falls back to defaults for invalid values', () => {
    expect(parseFinanceFilterQuery({
      year: 'nope',
      month: '13',
      paid: 'maybe',
      page: '0',
      pageSize: '-1',
    }, defaults)).toEqual(baseFilters)
  })

  it('omits page fields when defaults omit them', () => {
    const result = parseFinanceFilterQuery({ page: '2' }, {
      year: 2026,
      month: 8,
      paidFilter: 'all',
    })
    expect(result.page).toBeUndefined()
    expect(result.pageSize).toBeUndefined()
  })

  it('parses sort and order when defaults include sort', () => {
    const withSort = {
      ...defaults,
      sortBy: 'paid_date' as const,
      sortDir: 'desc' as const,
    }
    expect(parseFinanceFilterQuery({
      sort: 'amount',
      order: 'asc',
    }, withSort)).toEqual({
      ...baseFilters,
      sortBy: 'amount',
      sortDir: 'asc',
    })
  })

  it('falls back to sort defaults for invalid values', () => {
    const withSort = {
      ...defaults,
      sortBy: 'paid_date' as const,
      sortDir: 'desc' as const,
    }
    expect(parseFinanceFilterQuery({
      sort: 'category',
      order: 'sideways',
    }, withSort)).toEqual({
      ...baseFilters,
      sortBy: 'paid_date',
      sortDir: 'desc',
    })
  })

  it('omits sort fields when defaults omit them', () => {
    const result = parseFinanceFilterQuery({
      sort: 'amount',
      order: 'asc',
    }, {
      year: 2026,
      month: 8,
      paidFilter: 'all',
    })
    expect(result.sortBy).toBeUndefined()
    expect(result.sortDir).toBeUndefined()
  })
})

describe('serializeFinanceFilterQuery', () => {
  it('omits values that match defaults', () => {
    expect(serializeFinanceFilterQuery(baseFilters, defaults)).toEqual({})
  })

  it('includes only non-default and set filters', () => {
    expect(serializeFinanceFilterQuery({
      ...baseFilters,
      year: 2024,
      month: 3,
      dateFrom: '2024-01-01',
      dateTo: '2024-03-31',
      selectedCategoryIds: ['abc', 'def'],
      paidFilter: 'paid',
      page: 2,
      pageSize: 50,
    }, defaults)).toEqual({
      year: '2024',
      month: '3',
      from: '2024-01-01',
      to: '2024-03-31',
      category: 'abc,def',
      paid: 'paid',
      page: '2',
      pageSize: '50',
    })
  })

  it('serializes categories as a single comma-separated string', () => {
    expect(serializeFinanceFilterQuery({
      ...baseFilters,
      selectedCategoryIds: ['abc', 'def', 'ghi'],
    }, defaults)).toEqual({
      category: 'abc,def,ghi',
    })
  })

  it('does not serialize page when defaults omit pagination', () => {
    expect(serializeFinanceFilterQuery({
      ...baseFilters,
      page: 2,
      pageSize: 50,
    }, {
      year: 2026,
      month: 8,
      paidFilter: 'all',
    })).toEqual({})
  })

  it('omits default sort from the query', () => {
    const withSort = {
      ...defaults,
      sortBy: 'paid_date' as const,
      sortDir: 'desc' as const,
    }
    expect(serializeFinanceFilterQuery({
      ...baseFilters,
      sortBy: 'paid_date',
      sortDir: 'desc',
    }, withSort)).toEqual({})
  })

  it('serializes non-default sort and order', () => {
    const withSort = {
      ...defaults,
      sortBy: 'paid_date' as const,
      sortDir: 'desc' as const,
    }
    expect(serializeFinanceFilterQuery({
      ...baseFilters,
      sortBy: 'name',
      sortDir: 'asc',
    }, withSort)).toEqual({
      sort: 'name',
      order: 'asc',
    })
  })

  it('does not serialize sort when defaults omit sort', () => {
    expect(serializeFinanceFilterQuery({
      ...baseFilters,
      sortBy: 'amount',
      sortDir: 'asc',
    }, {
      year: 2026,
      month: 8,
      paidFilter: 'all',
    })).toEqual({})
  })
})

describe('round-trip', () => {
  it('preserves non-default values', () => {
    const filters: FinanceFilters = {
      year: 2024,
      month: 11,
      dateFrom: '2024-01-01',
      dateTo: '',
      selectedCategoryIds: ['cat-1'],
      paidFilter: 'unpaid',
      page: 3,
      pageSize: 100,
    }
    const query = serializeFinanceFilterQuery(filters, defaults)
    expect(parseFinanceFilterQuery(query, defaults)).toEqual(filters)
  })

  it('preserves multiple category ids', () => {
    const filters: FinanceFilters = {
      ...baseFilters,
      selectedCategoryIds: ['abc', 'def', 'ghi'],
    }
    const query = serializeFinanceFilterQuery(filters, defaults)
    expect(query.category).toBe('abc,def,ghi')
    expect(parseFinanceFilterQuery(query, defaults)).toEqual(filters)
  })

  it('preserves non-default sort', () => {
    const withSort = {
      ...defaults,
      sortBy: 'paid_date' as const,
      sortDir: 'desc' as const,
    }
    const filters: FinanceFilters = {
      ...baseFilters,
      sortBy: 'amount',
      sortDir: 'asc',
    }
    const query = serializeFinanceFilterQuery(filters, withSort)
    expect(parseFinanceFilterQuery(query, withSort)).toEqual(filters)
  })
})

describe('financeFilterQueryMatches', () => {
  it('matches empty route when filters are defaults', () => {
    expect(financeFilterQueryMatches(baseFilters, defaults, {})).toBe(true)
  })

  it('does not match when route has an extra default param', () => {
    expect(financeFilterQueryMatches(baseFilters, defaults, { paid: 'all' })).toBe(false)
  })

  it('matches comma-separated category against the same ids', () => {
    const filters: FinanceFilters = {
      ...baseFilters,
      selectedCategoryIds: ['abc', 'def'],
    }
    expect(financeFilterQueryMatches(filters, defaults, { category: 'abc,def' })).toBe(true)
    expect(financeFilterQueryMatches(filters, defaults, { category: ['abc', 'def'] })).toBe(true)
  })

  it('matches route sort params against filters', () => {
    const withSort = {
      ...defaults,
      sortBy: 'paid_date' as const,
      sortDir: 'desc' as const,
    }
    const filters: FinanceFilters = {
      ...baseFilters,
      sortBy: 'name',
      sortDir: 'asc',
    }
    expect(financeFilterQueryMatches(filters, withSort, {
      sort: 'name',
      order: 'asc',
    })).toBe(true)
    expect(financeFilterQueryMatches(filters, withSort, {
      sort: 'amount',
      order: 'asc',
    })).toBe(false)
  })
})
