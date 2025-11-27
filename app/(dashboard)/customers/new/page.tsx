"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { IdProofUpload } from "@/components/customers/id-proof-upload";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function NewCustomerPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [idProofType, setIdProofType] = useState<"aadhar" | "passport" | "voter" | "others" | "">("");
  const [idProofNumber, setIdProofNumber] = useState("");
  const [idProofFrontUrl, setIdProofFrontUrl] = useState("");
  const [idProofBackUrl, setIdProofBackUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Phone number validation: exactly 10 digits
  const validatePhone = (phone: string): boolean => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length === 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      showToast("Name and phone number are required", "error");
      return;
    }

    if (!validatePhone(phone)) {
      showToast("Phone number must be exactly 10 digits", "error");
      return;
    }

    setSaving(true);
    showToast("Creating customer...", "info");

    try {
      // Optimized single insert with all fields
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          id_proof_type: idProofType || null,
          id_proof_number: idProofNumber.trim() || null,
          id_proof_front_url: idProofFrontUrl || null,
          id_proof_back_url: idProofBackUrl || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidate queries in background (non-blocking)
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      showToast("Customer added successfully", "success");
      
      // Navigate immediately for faster perceived performance
      router.push("/customers");
    } catch (error: any) {
      console.error("Error creating customer:", error);
      showToast(
        error.message?.includes("unique") 
          ? "Phone number already exists" 
          : "Failed to create customer",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/customers">
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Customer</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Basic Information */}
        <Card className="p-4 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

          {/* Name */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer name"
              className="h-14 text-base rounded-xl"
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => {
                // Only allow digits and limit to 10
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(value);
              }}
              placeholder="Enter 10-digit phone number"
              className="h-14 text-base rounded-xl"
              inputMode="numeric"
              maxLength={10}
              required
            />
            {phone && !validatePhone(phone) && (
              <p className="text-xs text-red-500 mt-1">
                Phone number must be exactly 10 digits
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">Address (Optional)</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address"
              className="h-14 text-base rounded-xl"
            />
          </div>
        </Card>

        {/* ID Proof Information */}
        <Card className="p-4 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">ID Proof (Optional)</h2>

          {/* ID Proof Type */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">ID Proof Type</Label>
            <Select
              value={idProofType}
              onChange={(e) =>
                setIdProofType(e.target.value as "aadhar" | "passport" | "voter" | "others" | "")
              }
            >
              <SelectItem value="">Select ID proof type</SelectItem>
              <SelectItem value="aadhar">Aadhar</SelectItem>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="voter">Voter ID</SelectItem>
              <SelectItem value="others">Others</SelectItem>
            </Select>
          </div>

          {/* ID Proof Number */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-600">ID Proof Number</Label>
            <Input
              value={idProofNumber}
              onChange={(e) => setIdProofNumber(e.target.value)}
              placeholder="Enter ID proof number"
              className="h-14 text-base rounded-xl"
            />
          </div>

          {/* ID Proof Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IdProofUpload
              label="Front Side"
              currentUrl={idProofFrontUrl}
              onUploadComplete={setIdProofFrontUrl}
              onRemove={() => setIdProofFrontUrl("")}
            />
            <IdProofUpload
              label="Back Side"
              currentUrl={idProofBackUrl}
              onUploadComplete={setIdProofBackUrl}
              onRemove={() => setIdProofBackUrl("")}
            />
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1 h-14 text-base rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="flex-1 h-14 bg-sky-500 hover:bg-sky-600 text-white text-base font-semibold rounded-xl"
          >
            {saving ? "Saving..." : "Save Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}

