/**
 * Supabase Admin клиент
 * Используется только на сервере для операций, требующих повышенных прав
 * ⚠️ НИКОГДА не экспортируйте этот клиент на клиентскую сторону!
 * 
 * Примечание: Service Role Key опционален для базовой авторизации.
 * Он нужен только для админских операций (создание пользователей, обход RLS и т.д.)
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'This key is optional for basic authentication but required for admin operations. ' +
      'See docs/implementation/SUPABASE_SERVICE_ROLE_KEY.md for details.'
    )
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

