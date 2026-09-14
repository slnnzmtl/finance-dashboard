<script setup lang="ts">
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'
import type {
  ExpenseRow,
  ExpenseUpdate,
} from '../composables/useFinanceExpenses'
import {
  formatUsd,
  type Category,
  type Expense,
  type ExpenseSortColumn,
  type SortDir,
} from '../utils/finance-query'

const props = defineProps<{
  rows: ExpenseRow[]
  categories: Category[]
  totalAmount: number
  sortBy: ExpenseSortColumn
  sortDir: SortDir
  page: number
  totalPages: number
  pageRangeLabel: string
  updateExpense: (id: string, patch: ExpenseUpdate) => Promise<boolean>
  deleteExpense: (id: string) => Promise<boolean>
  toggleSort: (column: ExpenseSortColumn) => void
  goToPrevPage: () => void
  goToNextPage: () => void
}>()

const pageSize = defineModel<number>('pageSize', { required: true })

type EditField = keyof Pick<Expense, 'paid_date' | 'name' | 'category' | 'amount' | 'paid' | 'note'>

const editing = ref<{ id: string, field: EditField } | null>(null)
const draft = ref('')
const saving = ref(false)
const deletingId = ref<string | null>(null)

const pageSizeOptions = [25, 50, 100]

/** Match display-row size. `size="1"` + min-w-0 stops native inputs from widening the column. */
const cellControlClass
  = 'box-border !h-7 !min-h-0 !w-full min-w-0 max-w-full rounded-md border border-input bg-background !px-1.5 !py-0 text-sm leading-tight shadow-none outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'

function formatPaidDate(value: string) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function ariaSortFor(column: ExpenseSortColumn): 'ascending' | 'descending' | 'none' {
  if (props.sortBy !== column) return 'none'
  return props.sortDir === 'asc' ? 'ascending' : 'descending'
}

function sortIndicator(column: ExpenseSortColumn): string {
  if (props.sortBy !== column) return ''
  return props.sortDir === 'asc' ? ' ↑' : ' ↓'
}

function isEditing(rowId: string, field: EditField) {
  return editing.value?.id === rowId && editing.value?.field === field
}

function seedDraft(row: ExpenseRow, field: EditField): string {
  if (field === 'amount') return String(row.amount)
  if (field === 'paid') return row.paid ? 'true' : 'false'
  if (field === 'note') return row.note ?? ''
  return String(row[field] ?? '')
}

function startEdit(row: ExpenseRow, field: EditField) {
  if (saving.value || deletingId.value) return
  if (isEditing(row.id, field)) return
  editing.value = { id: row.id, field }
  draft.value = seedDraft(row, field)
}

function cancelEdit() {
  editing.value = null
}

function parseDraft(field: EditField, value: string): Expense[EditField] | undefined {
  if (field === 'amount') {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return undefined
    return n
  }
  if (field === 'paid') return value === 'true'
  if (field === 'note') return value.trim() || null
  if (field === 'paid_date') return value || undefined
  if (field === 'name') return value.trim()
  return value
}

function isUnchanged(row: ExpenseRow, field: EditField, parsed: Expense[EditField]) {
  if (field === 'note') return (row.note ?? null) === parsed
  return row[field] === parsed
}

async function commitEdit() {
  const current = editing.value
  if (!current || saving.value || deletingId.value) return

  const row = props.rows.find(r => r.id === current.id)
  if (!row) {
    editing.value = null
    return
  }

  const parsed = parseDraft(current.field, draft.value)
  if (parsed === undefined) return

  if (isUnchanged(row, current.field, parsed)) {
    if (isEditing(current.id, current.field)) editing.value = null
    return
  }

  saving.value = true
  try {
    const ok = await props.updateExpense(current.id, { [current.field]: parsed })
    if (ok && isEditing(current.id, current.field)) editing.value = null
  }
  finally {
    saving.value = false
  }
}

async function onDelete(row: ExpenseRow) {
  if (saving.value || deletingId.value) return

  const label = row.name?.trim() || 'this expense'
  const confirmed = window.confirm(`Delete “${label}”? This cannot be undone.`)
  if (!confirmed) return

  if (editing.value?.id === row.id) editing.value = null
  deletingId.value = row.id
  try {
    await props.deleteExpense(row.id)
  }
  finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="table-h-scroll rounded-md border border-border">
      <table class="w-max text-sm">
        <thead class="border-b border-border bg-muted/40">
          <tr class="text-left">
            <th
              class="whitespace-nowrap px-4 py-3 font-medium"
              :aria-sort="ariaSortFor('paid_date')"
            >
              <button
                type="button"
                class="inline-flex items-center gap-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                @click="toggleSort('paid_date')"
              >
                Date{{ sortIndicator('paid_date') }}
              </button>
            </th>
            <th
              class="whitespace-nowrap px-4 py-3 font-medium"
              :aria-sort="ariaSortFor('name')"
            >
              <button
                type="button"
                class="inline-flex items-center gap-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                @click="toggleSort('name')"
              >
                Name{{ sortIndicator('name') }}
              </button>
            </th>
            <th class="whitespace-nowrap px-4 py-3 font-medium">
              Category
            </th>
            <th
              class="whitespace-nowrap px-4 py-3 font-medium text-right"
              :aria-sort="ariaSortFor('amount')"
            >
              <button
                type="button"
                class="inline-flex items-center gap-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                @click="toggleSort('amount')"
              >
                Amount{{ sortIndicator('amount') }}
              </button>
            </th>
            <th
              class="whitespace-nowrap px-4 py-3 font-medium"
              :aria-sort="ariaSortFor('paid')"
            >
              <button
                type="button"
                class="inline-flex items-center gap-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                @click="toggleSort('paid')"
              >
                Paid{{ sortIndicator('paid') }}
              </button>
            </th>
            <th class="whitespace-nowrap px-4 py-3 font-medium">
              Note
            </th>
            <th class="w-24 whitespace-nowrap px-4 py-3 font-medium text-right">
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="group border-b border-border last:border-0 transition-colors duration-200 ease-out hover:bg-muted/30"
          >
            <td
              class="px-4 py-3 whitespace-nowrap"
              :class="!isEditing(row.id, 'paid_date') && 'cursor-pointer text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted/50'"
              @click="startEdit(row, 'paid_date')"
            >
              <Input
                v-if="isEditing(row.id, 'paid_date')"
                v-model="draft"
                type="date"
                size="1"
                autofocus
                :disabled="saving || Boolean(deletingId)"
                :class="cellControlClass"
                @click.stop
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape.prevent="cancelEdit"
              />
              <template v-else>
                {{ formatPaidDate(row.paid_date) }}
              </template>
            </td>
            <td
              class="px-4 py-3 whitespace-nowrap"
              :class="!isEditing(row.id, 'name') && 'cursor-pointer font-medium transition-colors duration-150 ease-out hover:bg-muted/50'"
              @click="startEdit(row, 'name')"
            >
              <Input
                v-if="isEditing(row.id, 'name')"
                v-model="draft"
                size="1"
                autofocus
                :disabled="saving || Boolean(deletingId)"
                :class="cellControlClass"
                @click.stop
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape.prevent="cancelEdit"
              />
              <template v-else>
                {{ row.name }}
              </template>
            </td>
            <td
              class="px-4 py-3 whitespace-nowrap"
              :class="!isEditing(row.id, 'category') && 'cursor-pointer transition-colors duration-150 ease-out hover:bg-muted/50'"
              @click="startEdit(row, 'category')"
            >
              <select
                v-if="isEditing(row.id, 'category')"
                v-model="draft"
                :class="cellControlClass"
                :disabled="saving || Boolean(deletingId)"
                autofocus
                @click.stop
                @change="commitEdit"
                @blur="commitEdit"
                @keydown.escape.prevent="cancelEdit"
              >
                <option
                  v-for="cat in categories"
                  :key="cat.id"
                  :value="cat.id"
                >
                  {{ cat.name }}
                </option>
              </select>
              <template v-else>
                {{ row.categoryName }}
              </template>
            </td>
            <td
              class="px-4 py-3 text-right tabular-nums whitespace-nowrap"
              :class="!isEditing(row.id, 'amount') && 'cursor-pointer transition-colors duration-150 ease-out hover:bg-muted/50'"
              @click="startEdit(row, 'amount')"
            >
              <Input
                v-if="isEditing(row.id, 'amount')"
                v-model="draft"
                type="number"
                min="0"
                step="1"
                size="1"
                autofocus
                :disabled="saving || Boolean(deletingId)"
                :class="[cellControlClass, 'text-right']"
                @click.stop
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape.prevent="cancelEdit"
              />
              <template v-else>
                {{ formatUsd(row.amount) }}
              </template>
            </td>
            <td
              class="px-4 py-3 whitespace-nowrap"
              :class="!isEditing(row.id, 'paid') && 'cursor-pointer transition-colors duration-150 ease-out hover:bg-muted/50'"
              @click="startEdit(row, 'paid')"
            >
              <select
                v-if="isEditing(row.id, 'paid')"
                v-model="draft"
                :class="cellControlClass"
                :disabled="saving || Boolean(deletingId)"
                autofocus
                @click.stop
                @change="commitEdit"
                @blur="commitEdit"
                @keydown.escape.prevent="cancelEdit"
              >
                <option value="true">
                  Paid
                </option>
                <option value="false">
                  Unpaid
                </option>
              </select>
              <span
                v-else
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                :class="row.paid
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground'"
              >
                {{ row.paid ? 'Paid' : 'Unpaid' }}
              </span>
            </td>
            <td
              class="max-w-[12rem] px-4 py-3 whitespace-nowrap"
              :class="!isEditing(row.id, 'note') && 'cursor-pointer truncate text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted/50'"
              :title="row.note || undefined"
              @click="startEdit(row, 'note')"
            >
              <Input
                v-if="isEditing(row.id, 'note')"
                v-model="draft"
                size="1"
                autofocus
                :disabled="saving || Boolean(deletingId)"
                :class="cellControlClass"
                @click.stop
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape.prevent="cancelEdit"
              />
              <template v-else>
                {{ row.note || '—' }}
              </template>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive opacity-0 pointer-events-none transition-[opacity,transform] duration-200 ease-out translate-x-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:translate-x-0"
                :class="deletingId === row.id && 'opacity-100 pointer-events-auto translate-x-0'"
                :disabled="saving || Boolean(deletingId)"
                @click.stop="onDelete(row)"
              >
                {{ deletingId === row.id ? 'Deleting…' : 'Delete' }}
              </Button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-border bg-muted/40 font-semibold">
            <td colspan="3" class="px-4 py-3">
              Total
            </td>
            <td class="px-4 py-3 text-right tabular-nums whitespace-nowrap">
              {{ formatUsd(totalAmount) }}
            </td>
            <td colspan="3" class="px-4 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-muted-foreground">
        {{ pageRangeLabel }}
      </p>

      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <label class="text-sm text-muted-foreground" for="expenses-page-size">
            Per page
          </label>
          <select
            id="expenses-page-size"
            v-model.number="pageSize"
            class="flex h-10 w-16 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option
              v-for="size in pageSizeOptions"
              :key="size"
              :value="size"
            >
              {{ size }}
            </option>
          </select>
        </div>

        <span class="text-sm text-muted-foreground">
          Page {{ page }} of {{ totalPages }}
        </span>

        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="page <= 1"
            @click="goToPrevPage"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="page >= totalPages"
            @click="goToNextPage"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
