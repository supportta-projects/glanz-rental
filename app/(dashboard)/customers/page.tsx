"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, PhoneCall, MapPin, User, CreditCard, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils/date";
import { useCustomers, type CustomerWithDues } from "@/lib/queries/customers";
import { useDebounce } from "@/lib/hooks/use-debounce";

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { data: customersData, isLoading, error } = useCustomers(
    debouncedSearch.trim() || undefined,
    currentPage,
    pageSize
  );

  const filteredCustomers = customersData?.data || [];

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const getProofTypeLabel = useCallback((type?: string) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      aadhar: "Aadhar",
      passport: "Passport",
      voter: "Voter ID",
      others: "Others",
    };
    return labels[type] || type;
  }, []);

  // Helper function to scroll to top smoothly
  const scrollToTop = useCallback(() => {
    const scrollContainer = document.querySelector('main[data-scroll-container="true"]') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Customers</h1>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by name or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-10 rounded-xl w-full"
            />
          </div>
          {/* Desktop Add Customer Button */}
          <Link href="/customers/new" className="hidden md:flex">
            <Button className="h-14 px-6 bg-sky-500 hover:bg-sky-600 text-white text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-95">
              <Plus className="h-5 w-5 mr-2" />
              Add Customer
            </Button>
          </Link>
        </div>
        {customersData && customersData.total > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            {customersData.total} customer{customersData.total !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-red-500">Error loading customers</p>
            <p className="text-sm text-gray-400 mt-2">
              Please try refreshing the page
            </p>
          </Card>
        ) : filteredCustomers && filteredCustomers.length > 0 ? (
          <>
            {/* Mobile: Card View */}
            <div className="md:hidden space-y-2">
              {filteredCustomers.map((customer) => {
                const hasDues = customer.due_amount > 0;
                const phoneNumber = customer.phone.replace(/\D/g, "");
                const whatsappUrl = `https://wa.me/${phoneNumber}`;
                const callUrl = `tel:${customer.phone}`;

                return (
                  <Card
                    key={customer.id}
                    className="p-3 rounded-lg hover:shadow-sm transition-shadow border border-gray-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Customer Info */}
                      <Link href={`/customers/${customer.id}`} className="flex-1 min-w-0">
                        <div className="space-y-1.5">
                          <h3 className="font-semibold text-gray-900 text-base truncate">
                            {customer.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <PhoneCall className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{customer.phone}</span>
                          </div>
                          {customer.address && (
                            <div className="flex items-start gap-1.5 text-xs text-gray-500">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{customer.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <span
                              className={`text-xs font-medium ${
                                hasDues ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {hasDues ? formatCurrency(customer.due_amount) : "No dues"}
                            </span>
                            {customer.id_proof_type && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                {getProofTypeLabel(customer.id_proof_type)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Right: Action Buttons */}
                      <div className="flex flex-col gap-2.5 flex-shrink-0">
                        <a
                          href={callUrl}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = callUrl;
                          }}
                          className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors active:scale-95 flex items-center justify-center"
                          title="Call"
                        >
                          <PhoneCall className="h-5 w-5" />
                        </a>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2.5 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-lg transition-colors active:scale-95 flex items-center justify-center"
                          title="WhatsApp"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden md:block">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Phone
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Address
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Due Amount
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          ID Proof
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Actions
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Added
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer, index) => {
                        const hasDues = customer.due_amount > 0;
                        const phoneNumber = customer.phone.replace(/\D/g, "");
                        const whatsappUrl = `https://wa.me/${phoneNumber}`;
                        const callUrl = `tel:${customer.phone}`;

                        return (
                          <tr
                            key={customer.id}
                            className={`border-t hover:bg-gray-50 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                            }`}
                          >
                            <td className="px-6 py-4">
                              <Link
                                href={`/customers/${customer.id}`}
                                className="font-semibold text-gray-900 hover:text-sky-600 transition-colors"
                              >
                                {customer.name}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <PhoneCall className="h-4 w-4 text-gray-400" />
                                {customer.phone}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                              {customer.address ? (
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{customer.address}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-sm font-semibold ${
                                  hasDues ? "text-red-600" : "text-green-600"
                                }`}
                              >
                                {hasDues ? formatCurrency(customer.due_amount) : "No dues"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {customer.id_proof_type ? (
                                <Badge variant="outline" className="text-xs">
                                  {getProofTypeLabel(customer.id_proof_type)}
                                </Badge>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <a
                                  href={callUrl}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.location.href = callUrl;
                                  }}
                                  className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center"
                                  title="Call"
                                >
                                  <PhoneCall className="h-5 w-5" />
                                </a>
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2.5 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-lg transition-colors flex items-center justify-center"
                                  title="WhatsApp"
                                >
                                  <svg
                                    className="h-5 w-5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                  </svg>
                                </a>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {customer.created_at
                                ? formatDate(customer.created_at, "dd MMM yyyy")
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <Card className="p-12 text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-lg">
              {searchQuery ? "No customers found" : "No customers yet"}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {searchQuery
                ? "Try a different search term"
                : "Add your first customer to get started"}
            </p>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {customersData && customersData.totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t px-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, customersData.total)} of {customersData.total} customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                scrollToTop();
              }}
              disabled={currentPage === 1 || isLoading}
              className="h-10 px-4"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm text-gray-600 px-3">
              Page {currentPage} of {customersData.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage((p) => Math.min(customersData.totalPages, p + 1));
                scrollToTop();
              }}
              disabled={currentPage >= customersData.totalPages || isLoading}
              className="h-10 px-4"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <FloatingActionButton href="/customers/new" label="Add Customer" />
    </div>
  );
}

