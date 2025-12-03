"use client";

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { Search, Plus, CheckCircle2, Phone, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCustomers, type CustomerWithDues } from "@/lib/queries/customers";
import type { Customer } from "@/lib/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SimpleCustomerForm } from "./simple-customer-form";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";

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

// Memoized customer item for performance
const CustomerItem = memo(({ 
  customer, 
  onSelect 
}: { 
  customer: CustomerWithDues; 
  onSelect: () => void;
}) => {
  const isVerified = isCustomerVerified(customer);
  
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full p-3 rounded-lg hover:bg-gradient-to-r hover:from-[#273492]/5 hover:to-transparent active:bg-gray-100 transition-all duration-200 text-left premium-hover"
    >
      <div className="flex items-center gap-3">
        {isVerified ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
        ) : (
          <div className="h-5 w-5 flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">
              {customer.name}
            </p>
            {isVerified && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-4 border-green-300 bg-green-50 text-green-700">
                ✓ KYC
              </Badge>
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
});

CustomerItem.displayName = "CustomerItem";

export function CustomerSearch({ onSelectCustomer, selectedCustomer }: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search for performance (30ms for instant feel)
  const debouncedSearch = useDebounce(searchQuery, 30);

  // Fetch customers with debounced search query
  const { data: customersData, isLoading } = useCustomers(
    debouncedSearch.trim() || undefined,
    1,
    100,
    false // Disable realtime for performance
  );
  
  // Extract customers array from paginated response
  const customers = customersData?.data || [];

  // Memoize filtered customers for performance
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(query) ||
      customer.phone.includes(query)
    );
  }, [customers, searchQuery]);

  // Show dropdown when typing
  useEffect(() => {
    if (searchQuery.trim() && filteredCustomers.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [searchQuery, filteredCustomers.length]);

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

  const handleSelectCustomer = useCallback((customer: CustomerWithDues) => {
    onSelectCustomer(customer);
    setSearchQuery(customer.name);
    setShowDropdown(false);
  }, [onSelectCustomer]);

  const handleCustomerCreated = useCallback((customer: Customer) => {
    // Select customer immediately and close modal
    onSelectCustomer(customer);
    setSearchQuery(customer.name);
    setShowAddModal(false);
    setShowDropdown(false);
  }, [onSelectCustomer]);

  return (
    <div className="space-y-3 relative">
      <Label className="text-lg font-bold text-gray-900">Customer *</Label>
      
      {/* Premium Search Input with Add Button */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
          <Input
            ref={searchInputRef}
            placeholder="Search customer by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim() && filteredCustomers.length > 0) {
                setShowDropdown(true);
              }
            }}
            className="h-14 pl-12 pr-4 text-base rounded-xl border-2 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20 transition-all duration-200 bg-white/80 backdrop-blur-sm"
          />
        </div>
        <Button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="h-14 px-6 bg-gradient-to-r from-[#273492] to-[#1f2a7a] hover:from-[#1f2a7a] hover:to-[#273492] text-white rounded-xl flex-shrink-0 shadow-lg hover:shadow-xl transition-all duration-200 premium-hover"
          aria-label="Add new customer"
        >
          <Plus className="h-5 w-5 md:mr-2" />
          <span className="hidden md:inline">Add</span>
        </Button>
      </div>

      {/* Selected Customer Display - Premium Card */}
      {selectedCustomer && !showDropdown && (
        <Card className="p-4 bg-gradient-to-br from-[#273492]/10 to-[#273492]/5 rounded-xl border-[#273492]/20 premium-hover fadeInUp">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#273492] to-[#1f2a7a] flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white font-bold text-sm">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 truncate">
                    {selectedCustomer.name}
                  </p>
                  {isCustomerVerified(selectedCustomer) && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3.5 w-3.5" />
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
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Change
            </Button>
          </div>
        </Card>
      )}

      {/* Premium Dropdown with Customer List */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border-2 border-gray-200/60 max-h-80 overflow-y-auto custom-scrollbar fadeInUp"
        >
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#273492]"></div>
              <p className="text-sm text-gray-500 mt-2">Loading customers...</p>
            </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="p-2">
              {filteredCustomers.map((customer, index) => (
                <CustomerItem
                  key={customer.id}
                  customer={customer}
                  onSelect={() => handleSelectCustomer(customer)}
                />
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="p-6 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">No customers found</p>
              <Button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  setShowAddModal(true);
                }}
                className="mt-3 bg-[#273492] hover:bg-[#1f2a7a] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Customer
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Add Customer Modal - Simple Sheet */}
      <Sheet open={showAddModal} onOpenChange={setShowAddModal} side="bottom">        
        <SheetContent
          className="h-auto max-h-[85vh] overflow-y-auto rounded-t-2xl"
          onClose={() => setShowAddModal(false)}
        >
          <SheetHeader className="mb-5 pb-3 border-b">
            <SheetTitle className="text-left text-xl font-bold text-gray-900">
              Add New Customer
            </SheetTitle>
            <p className="text-sm text-gray-500 mt-1">
              Enter name and phone number to create customer quickly
            </p>
          </SheetHeader>
          <SimpleCustomerForm
            onSuccess={handleCustomerCreated}
            onCancel={() => setShowAddModal(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

