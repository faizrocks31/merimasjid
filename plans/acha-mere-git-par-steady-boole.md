# Plan: Fix Expense Form Reset and Approval/Rejection Actions

## Context
We are working on the Expenses page of the Masjid Collection SaaS. Two specific issues need fixing:

1. **Expense Form Does Not Reset After Submission**: After creating an expense, the form retains previously entered values instead of clearing to a ready state.

2. **Approve/Reject Buttons Not Working**: Pending expense approval/rejection actions fail to execute properly.

## Root Cause Analysis

### Issue 1: Form Not Resetting
- **Location**: `src/app/(dashboard)/expenses/expense-form.tsx` lines 75-78
- **Problem**: `useEffect` only resets `idempotencyKey` when `state?.ok` is true, but doesn't reset form field values
- **Mechanism**: Form uses `useActionState` with `createExpenseAction` server action, but lacks explicit field reset logic after successful submission
- **Key Insight**: The form is uncontrolled (using FormData), but we need to trigger a field reset after successful submission

### Issue 2: Approval/Rejection Buttons Not Working
- **Location**: `src/app/(dashboard)/expenses/page.tsx` lines 106-117
- **Problem**: Two separate forms for same expense may cause conflicts or submission failures
- **Potential Issues**:
  - JavaScript errors preventing form submission
  - Race conditions in approval status update
  - UI not re-rendering properly after action completion
  - Backend validation failing silently

## Implementation Plan

### Fix 1: Expense Form Reset
1. **Add form reset logic** after successful submission in `ExpenseForm` component
2. **Reset all form fields** to their initial/default values when `state?.ok` is true
3. **Preserve existing validation and submission behavior**

### Fix 2: Approval/Rejection Actions
1. **Investigate submission flow** by checking browser console for errors
2. **Simplify form structure** - ensure each form has unique action context
3. **Add error handling** in client-side to catch submission failures
4. **Verify approval status update** in backend with better error messages

## Files to Modify
1. `src/app/(dashboard)/expenses/expense-form.tsx` - Add form reset logic
2. `src/app/(dashboard)/expenses/page.tsx` - Review and potentially simplify form structure

## Verification Steps
1. Test expense creation → form should reset completely
2. Test pending expense approval → status should change to "APPROVED"
3. Test pending expense rejection → status should change to "REJECTED"
4. Verify existing functionality remains intact
5. Confirm no regression in other expense operations

## Constraints
- Work ONLY on Expenses page and required code
- Do not modify database schema or unrelated modules
- Maintain masjid tenant isolation
- Preserve existing approval workflow and business rules
- Minimal, focused changes only