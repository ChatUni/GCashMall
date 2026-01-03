// Validation utilities - extracted business logic
// Following Rule #7: React components should be pure - separate business logic from components

// Email validation
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) {
    return { valid: true }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  return { valid: true }
}

// Phone validation
export const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  if (!phone) {
    return { valid: true }
  }
  const phoneRegex = /^[\d\s\-\(\)\+]+$/
  if (phone.length < 10 || !phoneRegex.test(phone)) {
    return { valid: false, error: 'Invalid phone number' }
  }
  return { valid: true }
}

// Birthday validation
export const validateBirthday = (birthday: string): { valid: boolean; error?: string } => {
  if (!birthday) {
    return { valid: true }
  }
  const date = new Date(birthday)
  if (isNaN(date.getTime()) || date >= new Date()) {
    return { valid: false, error: 'Invalid date of birth' }
  }
  return { valid: true }
}

// Password validation according to spec:
// - At least 6 characters
// - At least 1 uppercase letter
// - At least 1 lowercase letter
// - At least 1 number
// - At least 1 special character
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: 'Password is required' }
  }

  const minLength = password.length >= 6
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  if (!minLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return {
      valid: false,
      error: 'Password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
    }
  }

  return { valid: true }
}

// Confirm password validation
export const validateConfirmPassword = (
  password: string,
  confirmPassword: string,
): { valid: boolean; error?: string } => {
  if (!confirmPassword) {
    return { valid: false, error: 'Please confirm your new password' }
  }
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' }
  }
  return { valid: true }
}

// File size validation (in bytes)
export const validateFileSize = (
  file: File,
  maxSizeBytes: number,
): { valid: boolean; error?: string } => {
  if (file.size > maxSizeBytes) {
    const maxSizeMB = maxSizeBytes / (1024 * 1024)
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` }
  }
  return { valid: true }
}

// File type validation
export const validateFileType = (
  file: File,
  allowedTypes: string[],
): { valid: boolean; error?: string } => {
  const isAllowed = allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      const prefix = type.slice(0, -1)
      return file.type.startsWith(prefix)
    }
    return file.type === type
  })

  if (!isAllowed) {
    return { valid: false, error: `File type not allowed. Allowed: ${allowedTypes.join(', ')}` }
  }
  return { valid: true }
}

// Image file validation
export const validateImageFile = (file: File, maxSizeMB: number = 5): { valid: boolean; error?: string } => {
  const sizeValidation = validateFileSize(file, maxSizeMB * 1024 * 1024)
  if (!sizeValidation.valid) {
    return sizeValidation
  }

  const typeValidation = validateFileType(file, ['image/*'])
  if (!typeValidation.valid) {
    return { valid: false, error: 'Only image files are allowed' }
  }

  return { valid: true }
}

// Video file validation
export const validateVideoFile = (file: File, maxSizeMB: number = 500): { valid: boolean; error?: string } => {
  const sizeValidation = validateFileSize(file, maxSizeMB * 1024 * 1024)
  if (!sizeValidation.valid) {
    return sizeValidation
  }

  const typeValidation = validateFileType(file, ['video/*'])
  if (!typeValidation.valid) {
    return { valid: false, error: 'Only video files are allowed' }
  }

  return { valid: true }
}

// Required field validation
export const validateRequired = (value: string, fieldName: string): { valid: boolean; error?: string } => {
  if (!value || !value.trim()) {
    return { valid: false, error: `${fieldName} is required` }
  }
  return { valid: true }
}

// Generate random password that meets validation requirements
export const generateRandomPassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'

  // Ensure at least one of each required character type
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Add more random characters to reach 12 chars
  const allChars = uppercase + lowercase + numbers + special
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}
