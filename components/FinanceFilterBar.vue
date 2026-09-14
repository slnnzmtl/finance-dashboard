<script setup lang="ts">
import Input from '@/components/ui/input.vue'
import type { Category, PaidFilter } from '../utils/finance-query'

defineProps<{
  idPrefix: string
  loading: boolean
  availableYears: number[]
  categories: Category[]
  selectedCategoryIds: string[]
  isCategorySelected: (id: string) => boolean
  clearDateRange: () => void
  toggleCategory: (id: string) => void
  clearCategoryFilter: () => void
}>()

const year = defineModel<number>('year', { required: true })
const month = defineModel<number>('month', { required: true })
const dateFrom = defineModel<string>('dateFrom', { required: true })
const dateTo = defineModel<string>('dateTo', { required: true })
const paidFilter = defineModel<PaidFilter>('paidFilter', { required: true })

const monthOptions = [
  { value: 0, label: 'All months' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const paidOptions: { value: PaidFilter, label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
]

const selectClass
  = 'flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
</script>

<template>
  <section class="space-y-4 border-b border-border pb-6">
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium" :for="`${idPrefix}-filter-year`">Year</label>
          <select
            :id="`${idPrefix}-filter-year`"
            v-model.number="year"
            :class="selectClass"
          >
            <option
              v-for="y in availableYears"
              :key="y"
              :value="y"
            >
              {{ y }}
            </option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium" :for="`${idPrefix}-filter-month`">Month</label>
          <select
            :id="`${idPrefix}-filter-month`"
            v-model.number="month"
            :class="selectClass"
            :disabled="!!(dateFrom || dateTo)"
          >
            <option
              v-for="m in monthOptions"
              :key="m.value"
              :value="m.value"
            >
              {{ m.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium" :for="`${idPrefix}-filter-from`">From</label>
          <Input
            :id="`${idPrefix}-filter-from`"
            v-model="dateFrom"
            type="date"
          />
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <label class="text-sm font-medium" :for="`${idPrefix}-filter-to`">To</label>
            <button
              v-if="dateFrom || dateTo"
              type="button"
              class="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              @click="clearDateRange"
            >
              Clear range
            </button>
          </div>
          <Input
            :id="`${idPrefix}-filter-to`"
            v-model="dateTo"
            type="date"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-2 flex-1">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium">Categories</span>
          <button
            v-if="selectedCategoryIds.length"
            type="button"
            class="text-xs text-muted-foreground hover:text-foreground"
            @click="clearCategoryFilter"
          >
            Clear
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            class="rounded-md border px-3 py-1.5 text-sm transition-colors"
            :class="isCategorySelected(cat.id)
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background hover:bg-accent'"
            @click="toggleCategory(cat.id)"
          >
            {{ cat.name }}
          </button>
          <p
            v-if="!categories.length && !loading"
            class="text-sm text-muted-foreground"
          >
            No categories loaded.
          </p>
        </div>
      </div>

      <div class="space-y-2 space-x-2">
        <span class="text-sm font-medium">Status</span>
        <div class="inline-flex rounded-md border border-input overflow-hidden">
          <button
            v-for="opt in paidOptions"
            :key="opt.value"
            type="button"
            class="px-3 py-2 text-sm transition-colors"
            :class="paidFilter === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background hover:bg-accent'"
            @click="paidFilter = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
