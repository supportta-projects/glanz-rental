"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useCreateCustomer } from "@/lib/queries/customers";
import type { Customer } from "@/lib/types";

interface SimpleCustomerFormProps {
  onSuccess: (customer: Customer) => void;
  onCancel: () => void;
}

/**
 * Simplified customer form - Only name and phone for quick customer creation
 * Easy to use, fast workflow
 */
export function SimpleCustomerForm({ onSuccess, onCancel }: SimpleCustomerFormProps) {
  const { showToast } = useToast();
  const createCustomerMutation = useCreateCustomer();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

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

    try {
      const customer = await createCustomerMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        address: null,
        id_proof_type: null,
        id_proof_number: null,
        id_proof_front_url: null,
        id_proof_back_url: null,
      });

      showToast("Customer added successfully", "success");
      onSuccess(customer);
      
      // Reset form
      setName("");
      setPhone("");
    } catch (error: any) {
      console.error("Error creating customer:", error);
      showToast(
        error.message?.includes("unique") 
          ? "Phone number already exists" 
          : "Failed to create customer",
        "error"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-gray-700">
          Customer Name <span className="text-red-500">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter customer name"
          className="h-14 text-base rounded-xl border-2 focus:border-[#273492]"
          required
          autoFocus
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-gray-700">
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
          className="h-14 text-base rounded-xl border-2 focus:border-[#273492]"
          inputMode="numeric"
          maxLength={10}
          required
        />
        {phone && !validatePhone(phone) && (
          <p className="text-xs text-red-500">
            Phone number must be exactly 10 digits
          </p>
        )}
      </div>

      {/* Note */}
      <p className="text-xs text-gray-500">
        You can add address and ID proof later from customer details page.
      </p>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-14 text-base rounded-xl"
          disabled={createCustomerMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createCustomerMutation.isPending || !name.trim() || !validatePhone(phone)}
          className="flex-1 h-14 bg-[#273492] hover:bg-[#1f2a7a] text-white text-base font-semibold rounded-xl"
        >
          {createCustomerMutation.isPending ? "Adding..." : "Add Customer"}
        </Button>
      </div>
    </form>
  );
}

