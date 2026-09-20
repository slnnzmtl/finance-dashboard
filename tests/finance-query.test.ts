import { describe, it, expect } from 'vitest'
import {
  buildCategoryMonthMatrix,
  categoryNameMap,
  normalizeCategories,
  normalizeExpenses,
  parseExpenseCreateInput,
  resolveCategoryName,
  sortCategoriesByUsage,
  todayIsoDate,
  type Category,
  type Expense,
} from '~/utils/finance-query'

function expense(partial: Partial<Expense> & Pick<Expense, 'id' | 'category' | 'amount' | 'paid_date'>): Expense {
  return {
    created_at: '',
    name: partial.name ?? 'Item',
    paid: true,
    note: null,
    ...partial,
  }
}

describe('normalizeCategories', () => {
  it('coerces numeric ids to strings', () => {
    const rows = [
      { id: 1 as unknown as string, created_at: '', name: 'Food', note: null },
    ] as Category[]
    expect(normalizeCategories(rows)[0]!.id).toBe('1')
  })
})

describe('normalizeExpenses', () => {
  it('coerces numeric category FKs to strings so Map lookups match categories', () => {
    const rows = [
      {
        id: 10 as unknown as string,
        created_at: '',
        category: 1 as unknown as string,
        amount: 91,
        name: 'Coffee',
        paid_date: '2026-08-01',
        paid: true,
        note: null,
      },
    ] as Expense[]

    const expenses = normalizeExpenses(rows)
    const nameById = categoryNameMap([
      { id: 1 as unknown as string, created_at: '', name: 'Food', note: null },
    ] as Category[])

    expect(nameById.get(expenses[0]!.category)).toBe('Food')
  })
})

describe('sortCategoriesByUsage', () => {
  const categories: Category[] = [
    { id: '1', created_at: '', name: 'Zebra', note: null },
    { id: '2', created_at: '', name: 'Apple', note: null },
    { id: '3', created_at: '', name: 'Banana', note: null },
    { id: '4', created_at: '', name: 'Unused', note: null },
  ]

  it('orders by usage count descending', () => {
    const expenses = [
      expense({ id: 'a', category: '1', amount: 1, paid_date: '2026-01-01' }),
      expense({ id: 'b', category: '3', amount: 1, paid_date: '2026-01-01' }),
      expense({ id: 'c', category: '3', amount: 1, paid_date: '2026-01-01' }),
      expense({ id: 'd', category: '3', amount: 1, paid_date: '2026-01-01' }),
      expense({ id: 'e', category: '2', amount: 1, paid_date: '2026-01-01' }),
      expense({ id: 'f', category: '2', amount: 1, paid_date: '2026-01-01' }),
    ]
    expect(sortCategoriesByUsage(categories, expenses).map(c => c.name)).toEqual([
      'Banana',
      'Apple',
      'Zebra',
      'Unused',
    ])
  })

  it('keeps unused categories last, sorted by name', () => {
    const cats: Category[] = [
      { id: '1', created_at: '', name: 'Used', note: null },
      { id: '2', created_at: '', name: 'Zebra', note: null },
      { id: '3', created_at: '', name: 'Apple', note: null },
    ]
    const expenses = [
      expense({ id: 'a', category: '1', amount: 1, paid_date: '2026-01-01' }),
    ]
    expect(sortCategoriesByUsage(cats, expenses).map(c => c.name)).toEqual([
      'Used',
      'Apple',
      'Zebra',
    ])
  })

  it('breaks ties by name', () => {
    const cats: Category[] = [
      { id: '1', created_at: '', name: 'Zebra', note: null },
      { id: '2', created_at: '', name: 'Apple', note: null },
    ]
    const expenses = [
      expense({ id: 'a', category: '1', amount: 1, paid_date: '2026-01-01' }),
      expense({ id: 'b', category: '2', amount: 1, paid_date: '2026-01-01' }),
    ]
    expect(sortCategoriesByUsage(cats, expenses).map(c => c.name)).toEqual([
      'Apple',
      'Zebra',
    ])
  })

  it('matches numeric category FKs without pre-normalization', () => {
    const cats = [
      { id: 1 as unknown as string, created_at: '', name: 'Food', note: null },
      { id: 2 as unknown as string, created_at: '', name: 'Fuel', note: null },
    ] as Category[]
    const expenses = [
      { category: 1 as unknown as string },
      { category: 1 as unknown as string },
    ]

    expect(sortCategoriesByUsage(cats, expenses).map(c => c.name)).toEqual([
      'Food',
      'Fuel',
    ])
  })
})

describe('resolveCategoryName', () => {
  const nameById = categoryNameMap([
    { id: '4', created_at: '', name: 'Food', note: null },
  ])

  it('prefers join name when present', () => {
    expect(resolveCategoryName('4', nameById, 'Food')).toBe('Food')
  })

  it('falls back to map lookup', () => {
    expect(resolveCategoryName('4', nameById)).toBe('Food')
  })

  it('returns Uncategorized for unknown or empty ids', () => {
    expect(resolveCategoryName('99', nameById)).toBe('Uncategorized')
    expect(resolveCategoryName('', nameById)).toBe('Uncategorized')
  })
})

describe('buildCategoryMonthMatrix', () => {
  const categories: Category[] = [
    { id: '1', created_at: '', name: 'Bar / Drinks', note: null },
    { id: '2', created_at: '', name: 'Clothes', note: null },
  ]

  it('sums amounts by category and month with row/column/grand totals', () => {
    const matrix = buildCategoryMonthMatrix(
      [
        expense({ id: 'a', category: '1', amount: 46, paid_date: '2026-01-10' }),
        expense({ id: 'b', category: '1', amount: 76, paid_date: '2026-02-05' }),
        expense({ id: 'c', category: '1', amount: 27, paid_date: '2026-06-01' }),
        expense({ id: 'd', category: '2', amount: 14, paid_date: '2026-01-15' }),
        expense({ id: 'e', category: '2', amount: 209, paid_date: '2026-05-20' }),
        expense({ id: 'f', category: '2', amount: 6, paid_date: '2026-06-30' }),
      ],
      categories,
    )

    expect(matrix.rows).toHaveLength(2)
    expect(matrix.rows[0]!.name).toBe('Clothes')
    expect(matrix.rows[0]!.total).toBe(229)
    expect(matrix.rows[0]!.amounts[0]).toBe(14)
    expect(matrix.rows[0]!.amounts[4]).toBe(209)
    expect(matrix.rows[0]!.amounts[5]).toBe(6)

    expect(matrix.rows[1]!.name).toBe('Bar / Drinks')
    expect(matrix.rows[1]!.total).toBe(149)
    expect(matrix.rows[1]!.amounts[0]).toBe(46)
    expect(matrix.rows[1]!.amounts[1]).toBe(76)
    expect(matrix.rows[1]!.amounts[5]).toBe(27)

    expect(matrix.columnTotals[0]).toBe(60)
    expect(matrix.columnTotals[1]).toBe(76)
    expect(matrix.columnTotals[4]).toBe(209)
    expect(matrix.columnTotals[5]).toBe(33)
    expect(matrix.grandTotal).toBe(378)
  })

  it('skips expenses without paid_date and out-of-range months', () => {
    const matrix = buildCategoryMonthMatrix(
      [
        expense({ id: 'a', category: '1', amount: 10, paid_date: '2026-03-01' }),
        expense({ id: 'b', category: '1', amount: 99, paid_date: '' }),
        expense({ id: 'c', category: '1', amount: 50, paid_date: '2026-13-01' }),
      ],
      categories,
    )

    expect(matrix.rows).toHaveLength(1)
    expect(matrix.rows[0]!.amounts[2]).toBe(10)
    expect(matrix.rows[0]!.total).toBe(10)
    expect(matrix.grandTotal).toBe(10)
  })

  it('labels unknown categories as Uncategorized', () => {
    const matrix = buildCategoryMonthMatrix(
      [expense({ id: 'a', category: '', amount: 5, paid_date: '2026-04-01' })],
      categories,
    )

    expect(matrix.rows).toHaveLength(1)
    expect(matrix.rows[0]!.name).toBe('Uncategorized')
    expect(matrix.rows[0]!.amounts[3]).toBe(5)
    expect(matrix.grandTotal).toBe(5)
  })

  it('returns empty matrix when there are no expenses', () => {
    const matrix = buildCategoryMonthMatrix([], categories)
    expect(matrix.rows).toEqual([])
    expect(matrix.columnTotals).toEqual(Array.from({ length: 12 }, () => 0))
    expect(matrix.grandTotal).toBe(0)
  })
})

describe('todayIsoDate', () => {
  it('formats the local calendar date as YYYY-MM-DD', () => {
    expect(todayIsoDate(new Date(2026, 8, 9))).toBe('2026-09-09')
  })
})

describe('parseExpenseCreateInput', () => {
  const valid = {
    paid_date: '2026-09-09',
    name: 'Coffee',
    category: '4',
    amount: 5,
    paid: true,
    note: '  latte  ',
  }

  it('accepts a valid payload and trims note to null when empty', () => {
    const result = parseExpenseCreateInput(valid)
    expect(result).toEqual({
      ok: true,
      value: {
        paid_date: '2026-09-09',
        name: 'Coffee',
        category: '4',
        amount: 5,
        paid: true,
        note: 'latte',
      },
    })

    const emptyNote = parseExpenseCreateInput({ ...valid, note: '   ' })
    expect(emptyNote.ok && emptyNote.value.note).toBe(null)
  })

  it('parses amount from a numeric string', () => {
    const result = parseExpenseCreateInput({ ...valid, amount: '12' })
    expect(result.ok && result.value.amount).toBe(12)
  })

  it('rejects missing or invalid date', () => {
    expect(parseExpenseCreateInput({ ...valid, paid_date: '' }).ok).toBe(false)
    expect(parseExpenseCreateInput({ ...valid, paid_date: '09-09-2026' }).ok).toBe(false)
  })

  it('rejects empty name or category', () => {
    expect(parseExpenseCreateInput({ ...valid, name: '  ' }).ok).toBe(false)
    expect(parseExpenseCreateInput({ ...valid, category: '' }).ok).toBe(false)
  })

  it('rejects invalid amounts', () => {
    expect(parseExpenseCreateInput({ ...valid, amount: -1 }).ok).toBe(false)
    expect(parseExpenseCreateInput({ ...valid, amount: 'abc' }).ok).toBe(false)
    expect(parseExpenseCreateInput({ ...valid, amount: Number.NaN }).ok).toBe(false)
  })
})
