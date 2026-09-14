<script setup lang="ts">
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'
import Label from '@/components/ui/label.vue'
import {
  todayIsoDate,
  type Category,
  type ExpenseCreateInput,
} from '../utils/finance-query'

const props = defineProps<{
  categories: Category[]
  createExpense: (input: ExpenseCreateInput) => Promise<boolean>
}>()

const open = ref(false)
const saving = ref(false)
const formError = ref<string | null>(null)

const paidDate = ref(todayIsoDate())
const name = ref('')
const category = ref('')
const amount = ref('')
const paid = ref(true)
const note = ref('')

function resetForm() {
  paidDate.value = todayIsoDate()
  name.value = ''
  category.value = props.categories[0]?.id ?? ''
  amount.value = ''
  paid.value = true
  note.value = ''
  formError.value = null
}

function openForm() {
  resetForm()
  open.value = true
}

function cancelForm() {
  if (saving.value) return
  open.value = false
  formError.value = null
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) cancelForm()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') cancelForm()
}

watch(open, (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) {
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
  }
  else {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  }
})

onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

watch(
  () => props.categories,
  (cats) => {
    if (open.value && !category.value && cats[0]) {
      category.value = cats[0].id
    }
  },
  { deep: true },
)

async function onSubmit() {
  if (saving.value) return
  formError.value = null
  saving.value = true
  try {
    const ok = await props.createExpense({
      paid_date: paidDate.value,
      name: name.value,
      category: category.value,
      amount: amount.value,
      paid: paid.value,
      note: note.value,
    })
    if (ok) {
      open.value = false
      resetForm()
    }
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex justify-end">
    <Button
      type="button"
      size="sm"
      @click="openForm"
    >
      Add expense
    </Button>
  </div>

  <Teleport to="body">
    <Transition name="expense-modal">
      <div
        v-if="open"
        class="expense-modal-root fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
        role="presentation"
        @click="onBackdropClick"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-create-title"
          class="expense-modal-panel w-full max-w-lg rounded-lg border border-border bg-background shadow-lg"
          @click.stop
        >
          <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2
                id="expense-create-title"
                class="text-lg font-semibold tracking-tight"
              >
                Add expense
              </h2>
              <p class="mt-1 text-sm text-muted-foreground">
                Create a new expense record.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              :disabled="saving"
              aria-label="Close"
              @click="cancelForm"
            >
              ✕
            </Button>
          </div>

          <form
            class="space-y-4 px-5 py-4"
            @submit.prevent="onSubmit"
          >
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for-id="expense-create-date">
                  Date
                </Label>
                <Input
                  id="expense-create-date"
                  v-model="paidDate"
                  type="date"
                  required
                  :disabled="saving"
                />
              </div>

              <div class="space-y-2">
                <Label for-id="expense-create-amount">
                  Amount
                </Label>
                <Input
                  id="expense-create-amount"
                  v-model="amount"
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="0"
                  :disabled="saving"
                />
              </div>

              <div class="space-y-2 sm:col-span-2">
                <Label for-id="expense-create-name">
                  Name
                </Label>
                <Input
                  id="expense-create-name"
                  v-model="name"
                  type="text"
                  required
                  placeholder="Expense name"
                  :disabled="saving"
                />
              </div>

              <div class="space-y-2">
                <Label for-id="expense-create-category">
                  Category
                </Label>
                <select
                  id="expense-create-category"
                  v-model="category"
                  required
                  :disabled="saving || categories.length === 0"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option
                    v-if="categories.length === 0"
                    value=""
                    disabled
                  >
                    No categories
                  </option>
                  <option
                    v-for="cat in categories"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.name }}
                  </option>
                </select>
              </div>

              <div class="space-y-2">
                <Label for-id="expense-create-paid">
                  Paid
                </Label>
                <select
                  id="expense-create-paid"
                  v-model="paid"
                  :disabled="saving"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option :value="true">
                    Paid
                  </option>
                  <option :value="false">
                    Unpaid
                  </option>
                </select>
              </div>

              <div class="space-y-2 sm:col-span-2">
                <Label for-id="expense-create-note">
                  Note
                </Label>
                <Input
                  id="expense-create-note"
                  v-model="note"
                  type="text"
                  placeholder="Optional"
                  :disabled="saving"
                />
              </div>
            </div>

            <p
              v-if="formError"
              class="text-sm text-destructive"
            >
              {{ formError }}
            </p>

            <div class="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="saving"
                @click="cancelForm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                :disabled="saving || categories.length === 0"
              >
                {{ saving ? 'Saving…' : 'Save expense' }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.expense-modal-enter-active,
.expense-modal-leave-active {
  transition: opacity 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

.expense-modal-enter-active .expense-modal-panel,
.expense-modal-leave-active .expense-modal-panel {
  transition:
    transform 220ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

.expense-modal-enter-from,
.expense-modal-leave-to {
  opacity: 0;
}

.expense-modal-enter-from .expense-modal-panel,
.expense-modal-leave-to .expense-modal-panel {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.98);
}

@media (min-width: 640px) {
  .expense-modal-enter-from .expense-modal-panel,
  .expense-modal-leave-to .expense-modal-panel {
    transform: translateY(0.5rem) scale(0.98);
  }
}
</style>
