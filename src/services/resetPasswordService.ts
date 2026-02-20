// Reset Password data service — validation and API calls
// Following Rule #7: Avoid calling APIs in createEffect, use data service pattern

import { apiPost } from '../utils/api'
import { validatePassword } from '../utils/validation'
import { resetPasswordStore, resetPasswordStoreActions } from '../stores/resetPasswordStore'
import { t } from '../stores/languageStore'

// ======================
// URL param sync
// ======================

export const syncParamsFromUrl = (
  token: string | undefined,
  email: string | undefined,
) => {
  if (token && email) {
    resetPasswordStoreActions.setToken(token)
    resetPasswordStoreActions.setEmail(decodeURIComponent(email))
    resetPasswordStoreActions.setView('form')
  } else {
    resetPasswordStoreActions.setView('invalidLink')
  }
}

// ======================
// Form validation
// ======================

const validateResetForm = (): Record<string, string> => {
  const errors: Record<string, string> = {}

  validateNewPassword(errors)
  validateConfirmPassword(errors)

  return errors
}

const validateNewPassword = (errors: Record<string, string>) => {
  if (!resetPasswordStore.newPassword) {
    errors.newPassword = t().resetPassword.newPasswordRequired
    return
  }

  const result = validatePassword(resetPasswordStore.newPassword)
  if (!result.valid) {
    errors.newPassword =
      result.error || t().resetPassword.newPasswordRequired
  }
}

const validateConfirmPassword = (errors: Record<string, string>) => {
  if (!resetPasswordStore.confirmPassword) {
    errors.confirmPassword = t().resetPassword.confirmPasswordRequired
    return
  }

  if (resetPasswordStore.newPassword !== resetPasswordStore.confirmPassword) {
    errors.confirmPassword = t().resetPassword.passwordsDoNotMatch
  }
}

// ======================
// Form submission
// ======================

export const handleSubmit = async (e: Event) => {
  e.preventDefault()
  resetPasswordStoreActions.setApiError('')

  const errors = validateResetForm()
  if (Object.keys(errors).length > 0) {
    resetPasswordStoreActions.setErrors(errors)
    return
  }

  resetPasswordStoreActions.setErrors({})
  await submitResetPassword()
}

const submitResetPassword = async () => {
  resetPasswordStoreActions.setIsLoading(true)

  try {
    const response = await apiPost('confirmResetPassword', {
      email: resetPasswordStore.email,
      token: resetPasswordStore.token,
      newPassword: resetPasswordStore.newPassword,
    })

    if (response.success) {
      resetPasswordStoreActions.setView('success')
    } else {
      resetPasswordStoreActions.setApiError(
        response.error || t().resetPassword.failed,
      )
    }
  } catch {
    resetPasswordStoreActions.setApiError(t().resetPassword.failed)
  } finally {
    resetPasswordStoreActions.setIsLoading(false)
  }
}
