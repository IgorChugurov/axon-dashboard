/**
 * Скрипт для создания суперадмина
 * Запуск: pnpm create-super-admin
 *
 * Требует:
 * - SUPABASE_SERVICE_ROLE_KEY в .env.local
 * - NEXT_PUBLIC_SUPABASE_URL в .env.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Загружаем переменные окружения из .env.local
function loadEnv() {
  try {
    const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
    const envVars: Record<string, string> = {};

    envFile.split("\n").forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        envVars[key] = value;
      }
    });

    Object.assign(process.env, envVars);
  } catch (error) {
    console.warn("⚠️  Could not load .env.local, using process.env");
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error(
    "❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
  );
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSuperAdmin() {
  const email = "igorchugurov@gmail.com";
  const password = "1234567!Igor";

  console.log("🚀 Creating super admin...");
  console.log(`📧 Email: ${email}`);

  try {
    // 1. Проверяем, существует ли пользователь
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      console.log("✅ User already exists, using existing user");
      userId = existingUser.id;
    } else {
      // 2. Создаем пользователя
      console.log("📝 Creating new user...");
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Автоматически подтверждаем email
          user_metadata: {
            first_name: "Igor",
            last_name: "Chugurov",
          },
        });

      if (createError) {
        throw createError;
      }

      if (!newUser.user) {
        throw new Error("Failed to create user");
      }

      userId = newUser.user.id;
      console.log("✅ User created successfully");
    }

    // 3. Создаем профиль (если не существует)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 = not found, это нормально
      throw profileError;
    }

    if (!profile) {
      console.log("📝 Creating profile...");
      const { error: insertProfileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          email,
          first_name: "Igor",
          last_name: "Chugurov",
        });

      if (insertProfileError) {
        throw insertProfileError;
      }
      console.log("✅ Profile created successfully");
    } else {
      console.log("✅ Profile already exists");
    }

    // 4. Получаем ID роли superAdmin
    const { data: role, error: roleError } = await supabaseAdmin
      .from("admin_roles")
      .select("id")
      .eq("name", "superAdmin")
      .single();

    if (roleError) {
      throw roleError;
    }

    if (!role) {
      throw new Error(
        "Super admin role not found. Please run migration 20250130000000_create_unified_admins_structure.sql first."
      );
    }

    // 5. Добавляем в таблицу project_admins (superAdmin с project_id = NULL)
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("project_admins")
      .select("id")
      .eq("user_id", userId)
      .is("project_id", null)
      .single();

    if (adminError && adminError.code !== "PGRST116") {
      throw adminError;
    }

    if (!admin) {
      console.log("📝 Adding to project_admins table as superAdmin...");
      const { error: insertAdminError } = await supabaseAdmin
        .from("project_admins")
        .insert({
          user_id: userId,
          role_id: role.id,
          project_id: null, // superAdmin имеет project_id = NULL
        });

      if (insertAdminError) {
        throw insertAdminError;
      }
      console.log("✅ Added to project_admins table successfully");
    } else {
      // Обновляем роль на superAdmin (если изменилась)
      const { error: updateError } = await supabaseAdmin
        .from("project_admins")
        .update({ role_id: role.id })
        .eq("user_id", userId)
        .is("project_id", null);

      if (updateError) {
        throw updateError;
      }
      console.log("✅ Admin role updated to superAdmin");
    }

    console.log("\n🎉 Super admin created successfully!");
    console.log(`👤 User ID: ${userId}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log("\n⚠️  Please change the password after first login!");
  } catch (error) {
    console.error("❌ Error creating super admin:", error);
    process.exit(1);
  }
}

createSuperAdmin();
