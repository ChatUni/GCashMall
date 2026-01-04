// Account service - business logic extracted from Account page
// Following Rule #7: React components should be pure - separate business logic from components

import { apiGet, apiPost, apiPostWithAuth, checkEmail, emailRegister, saveAuthData, clearAuthData, isLoggedIn, getStoredUser } from '../utils/api'
import { accountStoreActions, type ProfileFormState, type PasswordFormState } from '../stores/accountStore'
import { validateEmail, validatePhone, validateBirthday, validatePassword, validateConfirmPassword } from '../utils/validation'
import type { User, WatchHistoryItem, FavoriteItem, OAuthType, ResetPasswordResponse } from '../types'

// Initialize account data
export const initializeAccountData = async (searchParams: URLSearchParams, setSearchParams: (params: Record<string, string>) => void) => {
  const code = searchParams.get('code')
  
  if (code) {
    await handleGoogleCallback(code, setSearchParams)
    return
  }
  
  await checkLoginStatus()
}

// Handle OAuth callback (Google, Facebook, Twitter, LinkedIn)
const handleOAuthCallback = async (
  code: string,
  oauthType: OAuthType,
  setSearchParams: (params: Record<string, string>) => void
) => {
  accountStoreActions.setLoading(true)
  clearAuthData()
  accountStoreActions.setUser(null)
  
  try {
    const response = await apiPost<{ id: string; name: string; email: string; picture: string }>(
      `${oauthType}Auth`,
      { code, redirectUri: `${window.location.origin}/account` }
    )

    if (response.success && response.data) {
      const { id: oauthId, name, email, picture } = response.data
      const checkResponse = await checkEmail(email)
      
      if (checkResponse.success && checkResponse.data?.exists) {
        // User exists - login with OAuth info
        const loginResponse = await apiPost<{ user: User; token: string }>('googleLogin', {
          email,
          oauthId,
          oauthType,
        })
        if (loginResponse.success && loginResponse.data) {
          saveAuthData(loginResponse.data.token, loginResponse.data.user)
          accountStoreActions.initializeUserData(loginResponse.data.user)
        } else {
          accountStoreActions.setShowLoginModal(true)
        }
      } else {
        // New user - register with OAuth info (no password required)
        const registerResponse = await emailRegister({
          email,
          nickname: name,
          photoUrl: picture,
          oauthId,
          oauthType,
        })
        
        if (registerResponse.success && registerResponse.data) {
          saveAuthData(registerResponse.data.token, registerResponse.data.user)
          accountStoreActions.initializeUserData(registerResponse.data.user)
        } else {
          accountStoreActions.setShowLoginModal(true)
        }
      }
    } else {
      accountStoreActions.setShowLoginModal(true)
    }
  } catch {
    accountStoreActions.setShowLoginModal(true)
  } finally {
    setSearchParams({})
    accountStoreActions.setLoading(false)
  }
}

// Handle Google OAuth callback (legacy - wraps handleOAuthCallback)
const handleGoogleCallback = async (code: string, setSearchParams: (params: Record<string, string>) => void) => {
  return handleOAuthCallback(code, 'google', setSearchParams)
}

// Check login status
export const checkLoginStatus = async (): Promise<boolean> => {
  if (isLoggedIn()) {
    const storedUser = getStoredUser()
    if (storedUser) {
      accountStoreActions.initializeUserData(storedUser)
      accountStoreActions.setLoading(false)
      return true
    }
  }

  try {
    const response = await apiGet<User>('user')
    if (response.success && response.data) {
      accountStoreActions.initializeUserData(response.data)
      accountStoreActions.setLoading(false)
      return true
    }
  } catch {
    // User not logged in
  }

  accountStoreActions.setShowLoginModal(true)
  accountStoreActions.setLoading(false)
  return false
}

// Fetch user data (watch history, favorites)
export const fetchAccountUserData = async () => {
  const [historyResponse, favoritesResponse] = await Promise.all([
    apiGet<WatchHistoryItem[]>('watchHistory'),
    apiGet<FavoriteItem[]>('favorites'),
  ])

  if (historyResponse.success && historyResponse.data) {
    accountStoreActions.setWatchHistory(historyResponse.data)
  }
  if (favoritesResponse.success && favoritesResponse.data) {
    accountStoreActions.setFavorites(favoritesResponse.data)
  }
}

// Logout
export const handleLogout = () => {
  clearAuthData()
  accountStoreActions.reset()
}

// Validate profile form
export const validateProfileForm = (form: ProfileFormState, t: Record<string, string>): boolean => {
  let isValid = true
  
  const emailValidation = validateEmail(form.email)
  if (!emailValidation.valid) {
    accountStoreActions.updateProfileError('emailError', t.invalidEmail || emailValidation.error || '')
    isValid = false
  } else {
    accountStoreActions.updateProfileError('emailError', '')
  }
  
  const phoneValidation = validatePhone(form.phoneNumber)
  if (!phoneValidation.valid) {
    accountStoreActions.updateProfileError('phoneError', t.invalidPhone || phoneValidation.error || '')
    isValid = false
  } else {
    accountStoreActions.updateProfileError('phoneError', '')
  }
  
  const birthdayValidation = validateBirthday(form.birthday)
  if (!birthdayValidation.valid) {
    accountStoreActions.updateProfileError('birthdayError', t.invalidBirthday || birthdayValidation.error || '')
    isValid = false
  } else {
    accountStoreActions.updateProfileError('birthdayError', '')
  }
  
  return isValid
}

// Save profile
export const saveProfile = async (form: ProfileFormState, t: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
  if (!validateProfileForm(form, t)) {
    return { success: false }
  }

  accountStoreActions.setProfileSaving(true)

  try {
    const response = await apiPostWithAuth<User>('updateProfile', {
      nickname: form.nickname,
      email: form.email,
      phone: form.phoneNumber,
      sex: form.gender === 'not_specified' ? null : form.gender,
      dob: form.birthday || null,
    })

    if (response.success && response.data) {
      const token = localStorage.getItem('gcashmall_token')
      if (token) {
        saveAuthData(token, response.data)
      }
      accountStoreActions.setUser(response.data)
      accountStoreActions.setOriginalProfile(form)
      return { success: true }
    }
    
    return { success: false, error: response.error || 'Failed to update profile' }
  } catch (error) {
    console.error('Error saving profile:', error)
    return { success: false, error: 'Failed to update profile' }
  } finally {
    accountStoreActions.setProfileSaving(false)
  }
}

// Validate password form (for users with existing password)
export const validatePasswordForm = (form: PasswordFormState, t: Record<string, string>, hasExistingPassword: boolean = true): boolean => {
  let isValid = true

  accountStoreActions.setPasswordErrors({
    currentPasswordError: '',
    newPasswordError: '',
    confirmPasswordError: '',
  })

  // Only validate current password if user has an existing password
  if (hasExistingPassword && !form.currentPassword) {
    accountStoreActions.updatePasswordError('currentPasswordError', t.currentPasswordRequired || 'Current password is required')
    isValid = false
  }

  const passwordValidation = validatePassword(form.newPassword)
  if (!passwordValidation.valid) {
    accountStoreActions.updatePasswordError('newPasswordError', t.newPasswordInvalid || passwordValidation.error || '')
    isValid = false
  }

  const confirmValidation = validateConfirmPassword(form.newPassword, form.confirmPassword)
  if (!confirmValidation.valid) {
    accountStoreActions.updatePasswordError('confirmPasswordError', t.passwordMismatch || confirmValidation.error || '')
    isValid = false
  }

  return isValid
}

// Change password (for users with existing password)
export const changePassword = async (form: PasswordFormState, t: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
  if (!validatePasswordForm(form, t, true)) {
    return { success: false }
  }

  accountStoreActions.setPasswordChanging(true)

  try {
    const response = await apiPostWithAuth<User>('updatePassword', {
      oldPassword: form.currentPassword,
      newPassword: form.newPassword,
    })

    if (response.success) {
      accountStoreActions.clearPasswordForm()
      // Update user's hasPassword status
      const state = accountStoreActions.getState()
      if (state.user) {
        accountStoreActions.setUser({ ...state.user, hasPassword: true })
      }
      return { success: true }
    }

    if (response.error?.includes('incorrect')) {
      accountStoreActions.updatePasswordError('currentPasswordError', t.currentPasswordIncorrect || 'Current password is incorrect')
    }
    
    return { success: false, error: response.error || 'Failed to change password' }
  } catch (error) {
    console.error('Error changing password:', error)
    return { success: false, error: 'Failed to change password' }
  } finally {
    accountStoreActions.setPasswordChanging(false)
  }
}

// Set password (for OAuth users without password)
export const setPassword = async (form: PasswordFormState, t: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
  if (!validatePasswordForm(form, t, false)) {
    return { success: false }
  }

  accountStoreActions.setPasswordChanging(true)

  try {
    const response = await apiPostWithAuth<User>('setPassword', {
      newPassword: form.newPassword,
    })

    if (response.success) {
      accountStoreActions.clearPasswordForm()
      // Update user's hasPassword status
      const state = accountStoreActions.getState()
      if (state.user) {
        accountStoreActions.setUser({ ...state.user, hasPassword: true })
      }
      return { success: true }
    }

    return { success: false, error: response.error || 'Failed to set password' }
  } catch (error) {
    console.error('Error setting password:', error)
    return { success: false, error: 'Failed to set password' }
  } finally {
    accountStoreActions.setPasswordChanging(false)
  }
}

// Reset password (send reset email)
export const resetPassword = async (email: string, t: Record<string, string>): Promise<{ success: boolean; message?: string; error?: string }> => {
  const emailValidation = validateEmail(email)
  if (!emailValidation.valid) {
    return { success: false, error: t.invalidEmail || emailValidation.error || '' }
  }

  try {
    const response = await apiPost<ResetPasswordResponse>('resetPassword', { email })

    if (response.success && response.data) {
      return { success: true, message: response.data.message }
    }

    return { success: false, error: response.error || 'Failed to send reset email' }
  } catch (error) {
    console.error('Error resetting password:', error)
    return { success: false, error: 'Failed to send reset email' }
  }
}

// Upload avatar
export const uploadAvatar = async (file: File, t: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
  accountStoreActions.setAvatarError('')

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    accountStoreActions.setAvatarError(t.avatarSizeError || 'File size must be less than 5MB')
    return { success: false }
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    accountStoreActions.setAvatarError(t.avatarTypeError || 'Only image files are allowed')
    return { success: false }
  }

  accountStoreActions.setAvatarUploading(true)

  try {
    const state = accountStoreActions.getState()
    const userId = state.user?._id

    if (!userId) {
      return { success: false, error: 'User not logged in' }
    }

    // Delete current image on the cloud (if any)
    if (state.user?.avatar) {
      await deleteCloudImage(state.user.avatar)
    }

    // Convert file to base64
    const base64Image = await fileToDataUrl(file)

    // Upload to cloud (under /GCash/users/{_id} folder)
    const uploadResponse = await apiPost<{ url: string; public_id: string }>(
      'uploadImage',
      { image: base64Image, folder: `GCash/users/${userId}` }
    )

    if (!uploadResponse.success || !uploadResponse.data) {
      return { success: false, error: uploadResponse.error || 'Failed to upload image' }
    }

    // Update profile picture
    const updateResponse = await apiPostWithAuth<User>('updateProfilePicture', {
      photoUrl: uploadResponse.data.url,
    })

    if (updateResponse.success && updateResponse.data) {
      const token = localStorage.getItem('gcashmall_token')
      if (token) {
        saveAuthData(token, updateResponse.data)
      }
      accountStoreActions.setUser(updateResponse.data)
      return { success: true }
    }

    return { success: false, error: updateResponse.error || 'Failed to update avatar' }
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return { success: false, error: 'Failed to upload avatar' }
  } finally {
    accountStoreActions.setAvatarUploading(false)
  }
}

// Delete cloud image by URL
const deleteCloudImage = async (imageUrl: string): Promise<void> => {
  try {
    await apiPost('deleteImage', { imageUrl })
  } catch (error) {
    console.error('Error deleting cloud image:', error)
    // Continue even if delete fails - we still want to upload the new image
  }
}

// Remove avatar
export const removeAvatar = async () => {
  try {
    await apiPost('removeAvatar', {})
    const state = accountStoreActions.getState()
    if (state.user) {
      accountStoreActions.setUser({ ...state.user, avatar: null })
    }
  } catch (error) {
    console.error('Error removing avatar:', error)
  }
}

// Clear watch history
export const clearWatchHistory = async () => {
  try {
    await apiPost('clearWatchHistory', {})
    accountStoreActions.clearWatchHistory()
  } catch (error) {
    console.error('Error clearing history:', error)
  }
}

// Remove watch history item
export const removeWatchHistoryItem = async (itemId: string) => {
  try {
    await apiPost('removeWatchHistoryItem', { itemId })
    accountStoreActions.removeWatchHistoryItem(itemId)
  } catch (error) {
    console.error('Error removing history item:', error)
  }
}

// Remove favorite
export const removeFavorite = async (itemId: string) => {
  try {
    await apiPost('removeFavorite', { itemId })
    accountStoreActions.removeFavoriteItem(itemId)
  } catch (error) {
    console.error('Error removing favorite:', error)
  }
}

// Top up
export const topUp = async (amount: number) => {
  try {
    await apiPost('topUp', { amount })
    accountStoreActions.addBalance(amount)
    accountStoreActions.setShowTopUpPopup(false)
    accountStoreActions.setSelectedTopUpAmount(null)
  } catch (error) {
    console.error('Error topping up:', error)
  }
}

// Check if profile has changes
export const hasProfileChanges = (current: ProfileFormState, original: ProfileFormState): boolean => {
  return (
    current.nickname !== original.nickname ||
    current.email !== original.email ||
    current.phoneNumber !== original.phoneNumber ||
    current.gender !== original.gender ||
    current.birthday !== original.birthday
  )
}

// Helper: file to data URL
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}
