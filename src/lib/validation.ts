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
  collectionDefinitionSchema,
  collectionEventSchema,
  collectionEventAssignmentSchema,
  expenseCategorySchema,
  staffSchema,
  masjidSchema,
  allocationSchema,
  loginSchema,
  changePasswordSchema,

  // Types
  type MemberInput,
  type PlanInput,
  type PaymentInput,
  type ExpenseInput,
  type SettingsInput,
  type CollectionDefinitionInput,
  type CollectionEventInput,
  type CollectionEventAssignmentInput,
  type ExpenseCategoryInput,
  type StaffInput,
  type MasjidInput,
  type AllocationInput,

  // Form helpers
  getFormFields,
  getZodSchema,
  validateForm,
  type FormFieldMeta,
} from "./validation-registry";
