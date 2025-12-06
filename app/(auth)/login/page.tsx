"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/lib/stores/useUserStore";
import { useToast } from "@/components/ui/toast";
import { getMainBranch, getMainBranchId } from "@/lib/utils/branches";
import type { Branch } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useUserStore();
  const { showToast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign in with username and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username, // Supabase uses email field, but we'll use username
        password,
      });

      if (error) throw error;

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*, branch:branches(*)")
        .eq("id", data.user.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData) {
        throw new Error("Profile not found");
      }

      // Type assertion for profile data
      const profile = profileData as any;

      // Check if staff is disabled - block login
      if (profile.is_active === false) {
        // Sign out the user immediately
        await supabase.auth.signOut();
        throw new Error("Your account has been disabled. Please contact your administrator.");
      }

      // Set user in store
      // ✅ FIX: For shop admins (branch_admin, staff), automatically assign main branch
      // For super_admin, keep branch_id as null (can switch branches)
      let branchId: string | null;
      let branch: Branch | null = null;

      if (profile.role === "super_admin") {
        branchId = null; // Super admin can switch branches
      } else {
        // For shop admins (branch_admin, staff), automatically assign main branch
        const mainBranchId = await getMainBranchId();
        branchId = mainBranchId || profile.branch_id; // Use main branch or fallback to profile branch_id
        
        // Fetch branch details if we have a branch_id
        if (branchId) {
          // If we got main branch ID, fetch its details
          if (mainBranchId) {
            const mainBranch = await getMainBranch();
            branch = mainBranch || null;
          } else {
            // Use the branch from profile if main branch not found
            branch = profile.branch || null;
          }
        }
      }
      
      setUser({
        id: profile.id,
        username: profile.username,
        role: profile.role,
        branch_id: branchId,
        full_name: profile.full_name,
        phone: profile.phone,
        gst_number: profile.gst_number,
        gst_enabled: profile.gst_enabled ?? false,
        gst_rate: profile.gst_rate ? parseFloat(String(profile.gst_rate)) : undefined,
        gst_included: profile.gst_included ?? false,
        upi_id: profile.upi_id,
        company_name: profile.company_name,
        company_logo_url: profile.company_logo_url,
        branch: branch || undefined,
      });

      // ✅ FIX: Invalidate all queries after setting branch_id so they refetch with new branch
      if (branchId) {
        // Use setTimeout to ensure state is updated first
        setTimeout(() => {
          queryClient.invalidateQueries();
        }, 100);
      }

      showToast("Login successful!", "success");
      
      // Redirect based on role: staff goes to orders, others to dashboard
      if (profile.role === "staff") {
        router.push("/orders");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      showToast(error.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 md:p-8 shadow-lg rounded-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="/glanz_logo.png" 
              alt="Glanz Logo" 
              className="w-12 h-12 object-contain"
            />
            <h1 className="text-3xl font-bold text-[#273492]">Glanz Costumes</h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-base font-semibold">
              Email
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter email address"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-14 text-base rounded-xl border-2 focus:border-[#273492]"
              autoFocus
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base font-semibold">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 text-base rounded-xl border-2 focus:border-sky-500 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2"
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-[#273492] hover:bg-[#1f2a7a] text-white text-base font-semibold rounded-xl"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

