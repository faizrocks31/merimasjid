// Re-export everything from the central validation registry
// This maintains backward compatibility while using the single source of truth

export {
  // Schemas
  memberSchema,
  planSchema,
  paymentSchema,
  expenseSchema,
  reversalSchema,
  settingsSchema,
  categorySchema,
  expenseCategorySchema,
  staffSchema,
  masjidSchema,
  allocationSchema,
  collectionEventSchema,
  collectionEventAssignmentSchema,
  loginSchema,
  changePasswordSchema,

  // Types
  type MemberInput,
  type PlanInput,
  type PaymentInput,
  type ExpenseInput,
  type SettingsInput,
  type CategoryInput,
  type ExpenseCategoryInput,
  type StaffInput,
  type MasjidInput,
  type AllocationInput,
  type CollectionEventInput,
  type CollectionEventAssignmentInput,

  // Form helpers
  getFormFields,
  getZodSchema,
  validateForm,
  type FormFieldMeta,
} from "./validation-registry";