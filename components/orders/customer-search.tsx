"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, CheckCircle2, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCustomers, type CustomerWithDues } from "@/lib/queries/customers";
import type { Customer } from "@/lib/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CustomerForm } from "@/components/customers/customer-form";

interface CustomerSearchProps {
  onSelectCustomer: (customer: Customer) => void;
  selectedCustomer: Customer | null;
}

/**
 * Check if customer has KYC verification
 * Customer is verified if they have ID proof number OR ID proof images
 */
function isCustomerVerified(customer: CustomerWithDues | Customer): boolean {
  return !!(
    customer.id_proof_number ||
    customer.id_proof_front_url ||
    customer.id_proof_back_url
  );
}

export function CustomerSearch({ onSelectCustomer, selectedCustomer }: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch customers with search query (for search dropdown, we want all results, not paginated)
  // Use pageSize of 100 to get more results for search
  const { data: customersData, isLoading } = useCustomers(
    searchQuery.trim() || undefined,
    1, // page 1
    100 // large page size for search results
  );
  
  // Extract customers array from paginated response
  const customers = customersData?.data || [];

  // Show dropdown when typing
  useEffect(() => {
    if (searchQuery.trim() && customers.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [searchQuery, customers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: CustomerWithDues) => {
    onSelectCustomer(customer);
    setSearchQuery(customer.name);
    setShowDropdown(false);
  };

  const handleCustomerCreated = (customer: Customer) => {
    onSelectCustomer(customer);
    setShowAddModal(false);
    setSearchQuery(customer.name);
  };

  // Filter customers based on search (client-side for better UX)
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.includes(query)
    );
  });

  return (
    <div className="space-y-2 relative">
      <Label className="text-lg font-bold">Customer *</Label>
      
      {/* Search Input with Add Button */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="Search customer by name or phone"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            onFocus={() => {
              if (searchQuery.trim() && filteredCustomers.length > 0) {
                setShowDropdown(true);
              }
            }}
            className="h-14 text-base rounded-xl pl-10 pr-4"
          />
        </div>
        <Button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="h-14 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl flex-shrink-0"
          aria-label="Add new customer"
        >
          <Plus className="h-5 w-5 md:mr-2" />
          <span className="hidden md:inline">Add</span>
        </Button>
      </div>

      {/* Selected Customer Display */}
      {selectedCustomer && !showDropdown && (
        <Card className="p-3 bg-sky-50 rounded-xl border-sky-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isCustomerVerified(selectedCustomer) && (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">
                  {selectedCustomer.name}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {selectedCustomer.phone}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onSelectCustomer(null as any);
                setSearchQuery("");
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              Change
            </Button>
          </div>
        </Card>
      )}

      {/* Dropdown with Customer List */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-80 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredCustomers.length > 0 ? (
            <div className="p-2">
              {filteredCustomers.map((customer) => {
                const isVerified = isCustomerVerified(customer);
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full p-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {/* Verification Tick */}
                      {isVerified ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 flex-shrink-0" />
                      )}
                      
                      {/* Customer Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">
                            {customer.name}
                          </p>
                          {isVerified && (
                            <span className="text-xs text-green-600 font-medium">
                              ✓ KYC
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <p className="text-sm text-gray-600 truncate">
                            {customer.phone}
                          </p>
                        </div>
                        {customer.address && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {customer.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No customers found</p>
              <p className="text-xs text-gray-400 mt-1">
                Click "Add" to create a new customer
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Customer Modal */}
      <Sheet open={showAddModal} onOpenChange={setShowAddModal}>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] overflow-y-auto rounded-t-2xl"
          onClose={() => setShowAddModal(false)}
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-xl">Add New Customer</SheetTitle>
          </SheetHeader>
          <CustomerForm
            onSuccess={handleCustomerCreated}
            onCancel={() => setShowAddModal(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

