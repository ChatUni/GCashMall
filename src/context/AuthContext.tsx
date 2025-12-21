import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface User {
  id: string
  nickname: string
  email: string
  phone: string
  gender: string
  birthday: string
  avatarUrl: string | null
}

interface AuthContextType {
  user: User | null
  isLoggedIn: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, nickname: string) => Promise<boolean>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('gcashtv-user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const isLoggedIn = user !== null

  useEffect(() => {
    if (user) {
      localStorage.setItem('gcashtv-user', JSON.stringify(user))
    } else {
      localStorage.removeItem('gcashtv-user')
    }
  }, [user])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Get registered users from localStorage
    const usersData = localStorage.getItem('gcashtv-registered-users')
    const users: { [email: string]: { password: string; user: User } } = usersData ? JSON.parse(usersData) : {}

    // Check if user exists and password matches
    if (users[email] && users[email].password === password) {
      setUser(users[email].user)
      return true
    }

    return false
  }

  const register = async (email: string, password: string, nickname: string): Promise<boolean> => {
    // Get registered users from localStorage
    const usersData = localStorage.getItem('gcashtv-registered-users')
    const users: { [email: string]: { password: string; user: User } } = usersData ? JSON.parse(usersData) : {}

    // Check if email already exists
    if (users[email]) {
      return false
    }

    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      nickname,
      email,
      phone: '',
      gender: 'Not specified',
      birthday: '',
      avatarUrl: null
    }

    // Save to registered users
    users[email] = { password, user: newUser }
    localStorage.setItem('gcashtv-registered-users', JSON.stringify(users))

    // Log in the new user
    setUser(newUser)
    return true
  }

  const logout = () => {
    setUser(null)
  }

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)

      // Also update in registered users
      const usersData = localStorage.getItem('gcashtv-registered-users')
      if (usersData) {
        const users: { [email: string]: { password: string; user: User } } = JSON.parse(usersData)
        if (users[user.email]) {
          users[user.email].user = updatedUser
          // If email changed, update the key
          if (updates.email && updates.email !== user.email) {
            users[updates.email] = users[user.email]
            delete users[user.email]
          }
          localStorage.setItem('gcashtv-registered-users', JSON.stringify(users))
        }
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
