"use client";

import { Card } from "@/components/ui/card";
import { StandardButton } from "@/components/shared/standard-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Sparkles, User, Key, Receipt, QrCode, LogOut, Building2, MapPin, Upload, X, Camera } from "lucide-react";
import { compressImage, createPreviewUrl, revokePreviewUrl } from "@/lib/utils/image-compression";

/**
 * Premium Modern Profile Page
 * 
 * Features:
 * - Editable user details (name, phone)
 * - Company details section (name, address, logo) - super_admin
 * - Branch details section (name, address, logo) - branch_admin
 * - Separate UPI and GST sections
 * - Premium animations and design with project theme colors
 * - Performance optimized
 * - Modern UI inspired by Shopify/Flipkart
 */
export default function ProfilePage() {
  const { user, clearUser, setUser } = useUserStore();
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();
  
  // User details state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  
  // Company details state (for super_admin)
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  
  // Branch details state (for branch_admin)
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchLogoUrl, setBranchLogoUrl] = useState("");
  const [branchLogoPreview, setBranchLogoPreview] = useState<string | null>(null);
  const [uploadingBranchLogo, setUploadingBranchLogo] = useState(false);
  const branchLogoInputRef = useRef<HTMLInputElement>(null);
  const [savingBranch, setSavingBranch] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // GST state
  const [gstNumber, setGstNumber] = useState("");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState("5.00");
  const [gstIncluded, setGstIncluded] = useState(false);
  const [savingGst, setSavingGst] = useState(false);
  
  // UPI state
  const [upiId, setUpiId] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);

  // Initialize fields from user - only run when user.id changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setGstNumber(user.gst_number || "");
      setGstEnabled(user.gst_enabled ?? false);
      setGstRate(user.gst_rate?.toString() || "5.00");
      setGstIncluded(user.gst_included ?? false);
      setUpiId(user.upi_id || "");
      
      // Company details (from profiles table - super_admin only)
      const companyNameValue = (user as any).company_name || "";
      const companyAddressValue = (user as any).company_address || "";
      const companyLogoValue = (user as any).company_logo_url || "";
      setCompanyName(companyNameValue);
      setCompanyAddress(companyAddressValue);
      setCompanyLogoUrl(companyLogoValue);
      if (companyLogoValue) {
        setCompanyLogoPreview(companyLogoValue);
      }
      
      // Branch details (from branch - branch_admin)
      if (user.branch) {
        setBranchName(user.branch.name || "");
        setBranchAddress(user.branch.address || "");
        setBranchPhone(user.branch.phone || "");
        const branchLogoValue = (user.branch as any).logo_url || "";
        setBranchLogoUrl(branchLogoValue);
        if (branchLogoValue) {
          setBranchLogoPreview(branchLogoValue);
        }
      }
    }
  }, [user?.id]); // Only depend on user.id to prevent unnecessary re-runs

  // Handle logo upload (company)
  const handleCompanyLogoUpload = useCallback(async (file: File) => {
    if (!user) return;

    setUploadingLogo(true);
    try {
      // Create instant preview
      const preview = createPreviewUrl(file);
      setCompanyLogoPreview(preview);

      // Compress image
      let compressedFile: File;
      try {
        compressedFile = await compressImage(file);
      } catch {
        compressedFile = file;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `company-logo-${timestamp}-${random}.jpg`;
      const filePath = fileName; // Upload to root of bucket, not in subfolder

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, compressedFile, {
          cacheControl: "31536000",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        // Check if it's a bucket not found error
        if (uploadError.message?.toLowerCase().includes("bucket") || uploadError.message?.toLowerCase().includes("not found")) {
          throw new Error("Storage bucket not found. Please run the 'supabase-storage-buckets-migration.sql' script in Supabase SQL Editor to create the required storage buckets.");
        }
        throw new Error(uploadError.message || "Upload failed");
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await (supabase
        .from("profiles") as any)
        .update({ company_logo_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setCompanyLogoUrl(publicUrl);
      revokePreviewUrl(preview);
      setCompanyLogoPreview(publicUrl);
      
      // Update user store
      setUser({
        ...user,
        company_logo_url: publicUrl,
      } as any);

      showToast("Company logo uploaded successfully", "success");
    } catch (error: any) {
      console.error("Logo upload error:", error);
      const errorMessage = error.message || "Failed to upload logo";
      
      // Show more helpful error message for bucket errors
      if (errorMessage.includes("bucket") || errorMessage.includes("not found")) {
        showToast(
          "Storage bucket not found. Please run 'supabase-storage-buckets-migration.sql' in Supabase SQL Editor.",
          "error"
        );
      } else {
        showToast(errorMessage, "error");
      }
      
      setCompanyLogoPreview(companyLogoUrl || null);
    } finally {
      setUploadingLogo(false);
    }
  }, [user, companyLogoUrl, showToast, supabase, setUser]);

  // Handle logo upload (branch)
  const handleBranchLogoUpload = useCallback(async (file: File) => {
    if (!user?.branch_id) return;

    setUploadingBranchLogo(true);
    try {
      // Create instant preview
      const preview = createPreviewUrl(file);
      setBranchLogoPreview(preview);

      // Compress image
      let compressedFile: File;
      try {
        compressedFile = await compressImage(file);
      } catch {
        compressedFile = file;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `branch-logo-${timestamp}-${random}.jpg`;
      const filePath = fileName; // Upload to root of bucket, not in subfolder

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("branch-logos")
        .upload(filePath, compressedFile, {
          cacheControl: "31536000",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        // Check if it's a bucket not found error
        if (uploadError.message?.toLowerCase().includes("bucket") || uploadError.message?.toLowerCase().includes("not found")) {
          throw new Error("Storage bucket not found. Please run the 'supabase-storage-buckets-migration.sql' script in Supabase SQL Editor to create the required storage buckets.");
        }
        throw new Error(uploadError.message || "Upload failed");
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("branch-logos")
        .getPublicUrl(filePath);

      // Update branch
      const { error: updateError } = await (supabase
        .from("branches") as any)
        .update({ logo_url: publicUrl })
        .eq("id", user.branch_id);

      if (updateError) throw updateError;

      setBranchLogoUrl(publicUrl);
      revokePreviewUrl(preview);
      setBranchLogoPreview(publicUrl);
      
      // Update user store
      if (user.branch) {
        setUser({
          ...user,
          branch: {
            ...user.branch,
            logo_url: publicUrl,
          },
        });
      }

      showToast("Branch logo uploaded successfully", "success");
    } catch (error: any) {
      console.error("Branch logo upload error:", error);
      const errorMessage = error.message || "Failed to upload logo";
      
      // Show more helpful error message for bucket errors
      if (errorMessage.includes("bucket") || errorMessage.includes("not found")) {
        showToast(
          "Storage bucket not found. Please run 'supabase-storage-buckets-migration.sql' in Supabase SQL Editor.",
          "error"
        );
      } else {
        showToast(errorMessage, "error");
      }
      
      setBranchLogoPreview(branchLogoUrl || null);
    } finally {
      setUploadingBranchLogo(false);
    }
  }, [user, branchLogoUrl, showToast, supabase, setUser]);

  // Save user details
  const handleSaveUserDetails = useCallback(async () => {
    if (!user) return;

    if (!fullName.trim()) {
      showToast("Full name is required", "error");
      return;
    }

    if (!phone.trim()) {
      showToast("Phone number is required", "error");
      return;
    }

    setSavingUser(true);
    try {
      const { error } = await (supabase
        .from("profiles") as any)
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Update user store
      setUser({
        ...user,
        full_name: fullName.trim(),
        phone: phone.trim(),
      });

      showToast("User details saved successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to save user details", "error");
    } finally {
      setSavingUser(false);
    }
  }, [user, fullName, phone, showToast, supabase, setUser]);

  // Save company details (super_admin only)
  const handleSaveCompanyDetails = useCallback(async () => {
    if (!user || user.role !== "super_admin") return;

    setSavingUser(true);
    try {
      const { error } = await (supabase
        .from("profiles") as any)
        .update({
          company_name: companyName.trim() || null,
          company_address: companyAddress.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Update user store
      setUser({
        ...user,
        company_name: companyName.trim() || undefined,
        company_address: companyAddress.trim() || undefined,
      } as any);

      showToast("Company details saved successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to save company details", "error");
    } finally {
      setSavingUser(false);
    }
  }, [user, companyName, companyAddress, showToast, supabase, setUser]);

  // Save branch details (branch_admin only)
  const handleSaveBranchDetails = useCallback(async () => {
    if (!user?.branch_id) return;

    if (!branchName.trim()) {
      showToast("Branch name is required", "error");
      return;
    }

    if (!branchAddress.trim()) {
      showToast("Branch address is required", "error");
      return;
    }

    setSavingBranch(true);
    try {
      const { error } = await (supabase
        .from("branches") as any)
        .update({
          name: branchName.trim(),
          address: branchAddress.trim(),
          phone: branchPhone.trim() || null,
        })
        .eq("id", user.branch_id);

      if (error) throw error;

      // Update user store
      if (user.branch) {
        setUser({
          ...user,
          branch: {
            ...user.branch,
            name: branchName.trim(),
            address: branchAddress.trim(),
            phone: branchPhone.trim() || undefined,
          },
        });
      }

      showToast("Branch details saved successfully", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to save branch details", "error");
    } finally {
      setSavingBranch(false);
    }
  }, [user, branchName, branchAddress, branchPhone, showToast, supabase, setUser]);

  // Memoized handlers for performance
  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
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
  }, [newPassword, confirmPassword, showToast, supabase]);

  const handleSaveGst = useCallback(async () => {
    if (!user) return;

    // Validate GST rate
    const gstRateNum = parseFloat(gstRate);
    if (gstEnabled && (isNaN(gstRateNum) || gstRateNum < 0 || gstRateNum > 100)) {
      showToast("GST rate must be a number between 0 and 100", "error");
      return;
    }

    setSavingGst(true);
    try {
      const { error } = await (supabase
        .from("profiles") as any)
        .update({
          gst_number: gstNumber.trim() || null,
          gst_enabled: gstEnabled,
          gst_rate: gstEnabled ? gstRateNum : null,
          gst_included: gstIncluded,
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
      });

      showToast("GST settings saved successfully", "success");
    } catch (error: any) {
      console.error("Error saving GST settings:", error);
      const errorMessage = error.message || "Failed to save GST settings";
      
      if (errorMessage.includes("column") || errorMessage.includes("does not exist")) {
        showToast("Database migration not run. Please run supabase-profile-company-migration.sql in Supabase SQL editor", "error");
      } else {
        showToast(errorMessage, "error");
      }
    } finally {
      setSavingGst(false);
    }
  }, [user, gstNumber, gstEnabled, gstRate, gstIncluded, showToast, supabase, setUser]);

  const handleSaveUpi = useCallback(async () => {
    if (!user) return;

    setSavingUpi(true);
    try {
      const { error } = await (supabase
        .from("profiles") as any)
        .update({
          upi_id: upiId.trim() || null,
        })
        .eq("id", user.id);

      if (error) {
        console.error("UPI save error:", error);
        throw error;
      }

      // Update user store
      setUser({
        ...user,
        upi_id: upiId.trim() || undefined,
      });

      showToast("UPI ID saved successfully", "success");
    } catch (error: any) {
      console.error("Error saving UPI ID:", error);
      showToast(error.message || "Failed to save UPI ID", "error");
    } finally {
      setSavingUpi(false);
    }
  }, [user, upiId, showToast, supabase, setUser]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    clearUser();
    router.push("/login");
  }, [supabase, clearUser, router]);

  // Memoized role display
  const roleDisplay = useMemo(() => {
    if (!user?.role) return "N/A";
    return user.role.replace("_", " ").split(" ").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  }, [user?.role]);

  const isSuperAdmin = user?.role === "super_admin";
  const isBranchAdmin = user?.role === "branch_admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb] pb-24">
      {/* Premium Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(39,52,146,0.05),transparent_50%)]" />
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto relative">
        {/* Premium Modern Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200/60 animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-[#273492] to-gray-900 bg-clip-text text-transparent">
                Profile Settings
              </h1>
              <Sparkles className="h-6 w-6 text-[#273492] animate-pulse" />
            </div>
            <p className="text-sm md:text-base text-gray-500 font-medium">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* User Information Card - Editable */}
          <Card 
            className="p-6 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp"
            style={{ animationDelay: "0.1s", willChange: "transform" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#273492] to-[#1f2a7a] flex items-center justify-center shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">User Information</h2>
                <p className="text-sm text-gray-500">Your account details</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-[#6b7280] font-medium">Full Name *</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-[#6b7280] font-medium">Phone *</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#6b7280] font-medium">Role</Label>
                <div className="h-12 bg-gradient-to-r from-[#273492]/10 to-[#1f2a7a]/10 rounded-xl px-4 flex items-center text-[#273492] text-sm font-bold border border-[#273492]/20">
                  {roleDisplay}
                </div>
              </div>
              <StandardButton
                onClick={handleSaveUserDetails}
                variant="default"
                disabled={savingUser}
                loading={savingUser}
                className="w-full h-12 bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl premium-hover"
              >
                {savingUser ? "Saving..." : "Save User Details"}
              </StandardButton>
            </div>
          </Card>

          {/* Company Details Card - Super Admin Only */}
          {isSuperAdmin && (
            <Card 
              className="p-6 rounded-xl border-2 border-[#273492]/20 bg-gradient-to-br from-[#273492]/5 to-[#273492]/10 shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp"
              style={{ animationDelay: "0.15s", willChange: "transform" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#273492] to-[#1f2a7a] flex items-center justify-center shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
                  <p className="text-sm text-gray-500">Configure company information for invoices</p>
                </div>
              </div>
              <div className="space-y-4">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label className="text-sm text-[#6b7280] font-medium">Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {companyLogoPreview ? (
                      <div className="relative">
                        <img
                          src={companyLogoPreview}
                          alt="Company logo"
                          className="w-24 h-24 object-contain rounded-xl border-2 border-[#273492]/20 bg-white p-2"
                        />
                        <button
                          onClick={() => {
                            setCompanyLogoPreview(null);
                            setCompanyLogoUrl("");
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={companyLogoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCompanyLogoUpload(file);
                        }}
                        className="hidden"
                      />
                      <StandardButton
                        onClick={() => companyLogoInputRef.current?.click()}
                        variant="outline"
                        disabled={uploadingLogo}
                        className="h-12 border-[#273492]/30 hover:border-[#273492] hover:bg-[#273492]/5"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingLogo ? "Uploading..." : companyLogoPreview ? "Change Logo" : "Upload Logo"}
                      </StandardButton>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-[#6b7280] font-medium">Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-[#6b7280] font-medium">Company Address / Location</Label>
                  <textarea
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Enter company address"
                    rows={3}
                    className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20 resize-none"
                  />
                </div>
                <StandardButton
                  onClick={handleSaveCompanyDetails}
                  variant="default"
                  disabled={savingUser}
                  loading={savingUser}
                  className="w-full h-12 bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl premium-hover"
                >
                  {savingUser ? "Saving..." : "Save Company Details"}
                </StandardButton>
              </div>
            </Card>
          )}

          {/* Branch Details Card - Branch Admin Only */}
          {isBranchAdmin && user?.branch && (
            <Card 
              className="p-6 rounded-xl border-2 border-[#273492]/20 bg-gradient-to-br from-[#273492]/5 to-[#273492]/10 shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp"
              style={{ animationDelay: "0.15s", willChange: "transform" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#273492] to-[#1f2a7a] flex items-center justify-center shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Branch Details</h2>
                  <p className="text-sm text-gray-500">Configure branch information for invoices</p>
                </div>
              </div>
              <div className="space-y-4">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label className="text-sm text-[#6b7280] font-medium">Branch Logo</Label>
                  <div className="flex items-center gap-4">
                    {branchLogoPreview ? (
                      <div className="relative">
                        <img
                          src={branchLogoPreview}
                          alt="Branch logo"
                          className="w-24 h-24 object-contain rounded-xl border-2 border-[#273492]/20 bg-white p-2"
                        />
                        <button
                          onClick={() => {
                            setBranchLogoPreview(null);
                            setBranchLogoUrl("");
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={branchLogoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBranchLogoUpload(file);
                        }}
                        className="hidden"
                      />
                      <StandardButton
                        onClick={() => branchLogoInputRef.current?.click()}
                        variant="outline"
                        disabled={uploadingBranchLogo}
                        className="h-12 border-[#273492]/30 hover:border-[#273492] hover:bg-[#273492]/5"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingBranchLogo ? "Uploading..." : branchLogoPreview ? "Change Logo" : "Upload Logo"}
                      </StandardButton>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-[#6b7280] font-medium">Branch Name *</Label>
                  <Input
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Enter branch name"
                    className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-[#6b7280] font-medium">Branch Address / Location *</Label>
                  <textarea
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    placeholder="Enter branch address"
                    rows={3}
                    className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-[#6b7280] font-medium">Branch Phone</Label>
                  <Input
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    placeholder="Enter branch phone number"
                    className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                  />
                </div>
                <StandardButton
                  onClick={handleSaveBranchDetails}
                  variant="default"
                  disabled={savingBranch}
                  loading={savingBranch}
                  className="w-full h-12 bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl premium-hover"
                >
                  {savingBranch ? "Saving..." : "Save Branch Details"}
                </StandardButton>
              </div>
            </Card>
          )}

          {/* UPI Settings Card - Separate Section */}
          <Card 
            className="p-6 rounded-xl border-2 border-[#273492]/20 bg-gradient-to-br from-[#273492]/5 to-[#273492]/10 shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp"
            style={{ animationDelay: "0.2s", willChange: "transform" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#273492] to-[#1f2a7a] flex items-center justify-center shadow-lg">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">UPI Payment Settings</h2>
                <p className="text-sm text-gray-500">Configure UPI ID for payment QR codes</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-[#6b7280] font-medium">UPI ID</Label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@paytm or yourname@upi"
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                />
                <p className="text-xs text-[#6b7280]">
                  Enter your UPI ID for payment QR codes in invoices (e.g., business@paytm, business@upi)
                </p>
              </div>
              <StandardButton
                onClick={handleSaveUpi}
                variant="default"
                disabled={savingUpi}
                loading={savingUpi}
                className="w-full h-12 bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl premium-hover"
              >
                {savingUpi ? "Saving..." : "Save UPI Settings"}
              </StandardButton>
            </div>
          </Card>

          {/* GST Settings Card - Separate Section */}
          <Card 
            className="p-6 rounded-xl border-2 border-[#273492]/20 bg-gradient-to-br from-[#273492]/5 to-[#273492]/10 shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp"
            style={{ animationDelay: "0.3s", willChange: "transform" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#273492] to-[#1f2a7a] flex items-center justify-center shadow-lg">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">GST Settings</h2>
                <p className="text-sm text-gray-500">Configure tax settings for invoices</p>
              </div>
            </div>
            <div className="space-y-4">
              {/* GST Number */}
              <div className="space-y-2">
                <Label className="text-sm text-[#6b7280] font-medium">GST Number (Optional)</Label>
                <Input
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="Enter GST number (e.g., 27AAAAA0000A1Z5)"
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                  maxLength={15}
                />
              </div>

              {/* GST Enabled Toggle */}
              <div className="space-y-3 p-4 rounded-xl bg-white/60 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-gray-900">Enable GST</Label>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      {gstEnabled ? "GST will be applied to all orders" : "GST will not be applied to orders"}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gstEnabled}
                      onChange={(e) => setGstEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#273492]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#273492]"></div>
                  </label>
                </div>
              </div>

              {/* GST Rate (only shown when GST is enabled) */}
              {gstEnabled && (
                <div className="space-y-4 p-4 rounded-xl bg-white/60 border border-gray-200 animate-fade-in">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">
                      GST Rate (%)
                    </Label>
                    <Input
                      type="number"
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value)}
                      placeholder="5.00"
                      className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                    <p className="text-xs text-[#6b7280]">
                      Enter the GST percentage rate (e.g., 5.00 for 5%, 18.00 for 18%)
                    </p>
                  </div>

                  {/* GST Calculation Method */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-900">GST Calculation Method</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:bg-gray-50 hover:border-[#273492]/30 transition-all duration-200 premium-hover">
                        <input
                          type="radio"
                          name="gstMethod"
                          checked={!gstIncluded}
                          onChange={() => setGstIncluded(false)}
                          className="w-4 h-4 text-[#273492] focus:ring-[#273492]"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">GST Excluded</div>
                          <div className="text-xs text-[#6b7280] mt-0.5">
                            GST ({gstRate}%) will be added on top of the order total
                          </div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:bg-gray-50 hover:border-[#273492]/30 transition-all duration-200 premium-hover">
                        <input
                          type="radio"
                          name="gstMethod"
                          checked={gstIncluded}
                          onChange={() => setGstIncluded(true)}
                          className="w-4 h-4 text-[#273492] focus:ring-[#273492]"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">GST Included</div>
                          <div className="text-xs text-[#6b7280] mt-0.5">
                            GST ({gstRate}%) is already included in the item prices
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <StandardButton
                onClick={handleSaveGst}
                variant="default"
                disabled={savingGst}
                loading={savingGst}
                className="w-full h-12 bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl premium-hover"
              >
                {savingGst ? "Saving..." : "Save GST Settings"}
              </StandardButton>
            </div>
          </Card>

          {/* Change Password Card - Premium */}
          <Card 
            className="p-6 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 premium-hover fadeInUp"
            style={{ animationDelay: "0.4s", willChange: "transform" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#273492] to-[#1f2a7a] flex items-center justify-center shadow-lg">
                <Key className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-[#6b7280] font-medium">Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#6b7280] font-medium">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#6b7280] font-medium">Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 text-base rounded-xl border-gray-200 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20"
                />
              </div>
              <StandardButton
                type="submit"
                variant="default"
                disabled={loading}
                loading={loading}
                className="w-full h-12 bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl premium-hover"
              >
                {loading ? "Updating..." : "Update Password"}
              </StandardButton>
            </form>
          </Card>

          {/* Logout Button - Premium */}
          <div className="fadeInUp" style={{ animationDelay: "0.5s" }}>
            <StandardButton
              onClick={handleLogout}
              variant="destructive"
              className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl premium-hover"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </StandardButton>
          </div>
        </div>
      </div>
    </div>
  );
}



