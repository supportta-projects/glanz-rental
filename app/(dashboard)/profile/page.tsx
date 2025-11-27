"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useState, useEffect } from "react";

export default function ProfilePage() {
  const { user, clearUser, setUser } = useUserStore();
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState("5.00");
  const [gstIncluded, setGstIncluded] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [savingGst, setSavingGst] = useState(false);

  // Initialize GST fields from user
  useEffect(() => {
    if (user) {
      setGstNumber(user.gst_number || "");
      setGstEnabled(user.gst_enabled ?? false);
      setGstRate(user.gst_rate?.toString() || "5.00");
      setGstIncluded(user.gst_included ?? false);
      setUpiId(user.upi_id || "");
    }
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      showToast("Password updated successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showToast(error.message || "Failed to update password", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGst = async () => {
    if (!user) return;

    // Validate GST rate
    const gstRateNum = parseFloat(gstRate);
    if (gstEnabled && (isNaN(gstRateNum) || gstRateNum < 0 || gstRateNum > 100)) {
      showToast("GST rate must be a number between 0 and 100", "error");
      return;
    }

    setSavingGst(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          gst_number: gstNumber.trim() || null,
          gst_enabled: gstEnabled,
          gst_rate: gstEnabled ? gstRateNum : null,
          gst_included: gstIncluded,
          upi_id: upiId.trim() || null,
        })
        .eq("id", user.id);

      if (error) {
        console.error("GST save error:", error);
        throw error;
      }

      // Update user store
      setUser({
        ...user,
        gst_number: gstNumber.trim() || undefined,
        gst_enabled: gstEnabled,
        gst_rate: gstEnabled ? gstRateNum : undefined,
        gst_included: gstIncluded,
        upi_id: upiId.trim() || undefined,
      });

      showToast("GST settings saved successfully", "success");
    } catch (error: any) {
      console.error("Error saving GST settings:", error);
      const errorMessage = error.message || "Failed to save GST settings";
      
      // Check if it's a database column error
      if (errorMessage.includes("column") || errorMessage.includes("does not exist")) {
        showToast("Database migration not run. Please run supabase-gst-migration.sql in Supabase SQL editor", "error");
      } else {
        showToast(errorMessage, "error");
      }
    } finally {
      setSavingGst(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUser();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* User Info */}
        <Card className="p-5 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            User Information
          </h2>
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-gray-600">Full Name</Label>
              <div className="h-14 bg-gray-50 rounded-xl px-4 flex items-center text-gray-700 mt-1">
                {user?.full_name || "N/A"}
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Username</Label>
              <div className="h-14 bg-gray-50 rounded-xl px-4 flex items-center text-gray-700 mt-1">
                {user?.username || "N/A"}
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Phone</Label>
              <div className="h-14 bg-gray-50 rounded-xl px-4 flex items-center text-gray-700 mt-1">
                {user?.phone || "N/A"}
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Role</Label>
              <div className="h-14 bg-gray-50 rounded-xl px-4 flex items-center text-gray-700 mt-1">
                {user?.role?.replace("_", " ").toUpperCase() || "N/A"}
              </div>
            </div>
          </div>
        </Card>

        {/* GST Settings */}
        <Card className="p-5 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            GST Settings
          </h2>
          <div className="space-y-4">
            {/* GST Number */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">GST Number (Optional)</Label>
              <Input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="Enter GST number (e.g., 27AAAAA0000A1Z5)"
                className="h-14 text-base rounded-xl"
                maxLength={15}
              />
            </div>

            {/* UPI ID */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">UPI ID (Optional)</Label>
              <Input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@paytm or yourname@upi"
                className="h-14 text-base rounded-xl"
              />
              <p className="text-xs text-gray-500">
                Enter your UPI ID for payment QR codes (e.g., business@paytm, business@upi)
              </p>
            </div>

            {/* GST Enabled Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-600">Enable GST</Label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gstEnabled}
                    onChange={(e) => setGstEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500">
                {gstEnabled ? "GST will be applied to all orders" : "GST will not be applied to orders"}
              </p>
            </div>

            {/* GST Rate (only shown when GST is enabled) */}
            {gstEnabled && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">
                  GST Rate (%)
                </Label>
                <Input
                  type="number"
                  value={gstRate}
                  onChange={(e) => setGstRate(e.target.value)}
                  placeholder="5.00"
                  className="h-14 text-base rounded-xl"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.01"
                />
                <p className="text-xs text-gray-500">
                  Enter the GST percentage rate (e.g., 5.00 for 5%, 18.00 for 18%)
                </p>
              </div>
            )}

            {/* GST Include/Exclude Toggle (only shown when GST is enabled) */}
            {gstEnabled && (
              <div className="space-y-3">
                <Label className="text-sm text-gray-600">GST Calculation Method</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="gstMethod"
                      checked={!gstIncluded}
                      onChange={() => setGstIncluded(false)}
                      className="w-5 h-5 text-sky-500 focus:ring-sky-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">GST Excluded</div>
                      <div className="text-xs text-gray-500">
                        GST ({gstRate}%) will be added on top of the order total
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="gstMethod"
                      checked={gstIncluded}
                      onChange={() => setGstIncluded(true)}
                      className="w-5 h-5 text-sky-500 focus:ring-sky-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">GST Included</div>
                      <div className="text-xs text-gray-500">
                        GST ({gstRate}%) is already included in the item prices
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <Button
              onClick={handleSaveGst}
              disabled={savingGst}
              className="w-full h-14 bg-sky-500 hover:bg-sky-600 text-white text-base font-semibold rounded-xl"
            >
              {savingGst ? "Saving..." : "Save GST Settings"}
            </Button>
          </div>
        </Card>

        {/* Change Password */}
        <Card className="p-5 rounded-xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Change Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-14"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-14"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-14"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-sky-500 hover:bg-sky-600"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full h-14"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}

