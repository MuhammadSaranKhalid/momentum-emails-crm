"use client"

import type { AuthProvider } from "@refinedev/core"
import { supabaseBrowserClient } from "@/utils/supabase/client"

export const authProviderClient: AuthProvider = {
  login: async ({ email, password }) => {
    if (email && password) {
      const { error } = await supabaseBrowserClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return {
          success: false,
          error,
        }
      }

      return {
        success: true,
        redirectTo: "/dashboard",
      }
    }

    return {
      success: false,
      error: {
        name: "LoginError",
        message: "Invalid login credentials",
      },
    }
  },
  logout: async () => {
    const { error } = await supabaseBrowserClient.auth.signOut()

    if (error) {
      return {
        success: false,
        error,
      }
    }

    return {
      success: true,
      redirectTo: "/login",
    }
  },
  register: async ({ email, password, firstName, lastName }) => {
    try {
      const { data, error } = await supabaseBrowserClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
          },
        },
      })

      if (error) {
        return {
          success: false,
          error,
        }
      }

      if (data) {
        return {
          success: true,
          redirectTo: "/dashboard",
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      }
    }

    return {
      success: false,
      error: {
        message: "Register failed",
        name: "Invalid email or password",
      },
    }
  },
  check: async () => {
    const { data, error } = await supabaseBrowserClient.auth.getUser()
    const { user } = data

    if (error) {
      return {
        authenticated: false,
        redirectTo: "/login",
        logout: true,
      }
    }

    if (user) {
      return {
        authenticated: true,
      }
    }

    return {
      authenticated: false,
      redirectTo: "/login",
    }
  },
  getPermissions: async () => {
    const user = await supabaseBrowserClient.auth.getUser()

    if (user) {
      return user.data.user?.role
    }

    return null
  },
  getIdentity: async () => {
    const { data } = await supabaseBrowserClient.auth.getUser()

    if (data?.user) {
      const fullName = data.user.user_metadata?.full_name || data.user.email;
      return {
        ...data.user,
        name: fullName,
      }
    }

    return null
  },
  onError: async (error) => {
    if (error?.code === "PGRST301" || error?.code === 401) {
      return {
        logout: true,
      }
    }

    return { error }
  },
}
