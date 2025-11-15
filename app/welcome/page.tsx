"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
            Welcome!
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Hello, {user?.email || "User"}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            You have successfully logged in. However, your account does not have
            administrator privileges.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            If you believe you should have access to the dashboard, please
            contact your administrator.
          </p>
        </div>

        <div>
          <Button onClick={handleLogout} variant="outline" className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
