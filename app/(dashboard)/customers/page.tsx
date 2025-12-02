"use client";

// Static for customers (as per requirements - no realtime needed)
export const dynamic = 'force-static';

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, MapPin, User } from "lucide-react";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils/date";
import { useCustomers, type CustomerWithDues } from "@/lib/queries/customers";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
  PageHeader,
  SearchInput,
  LoadingState,
  EmptyState,
  ErrorState,
  Pagination,
  ActionButton,
} from "@/components/shared";

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  // Ultra-fast debounce - reduced to 30ms for instant search feel
  const debouncedSearch = useDebounce(searchQuery, 30);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25; // 25 items per page

  // Use server-side pagination and search
  // When there's a search query, use server-side filtering
  // When there's no search query, use server-side pagination to access all customers
  const { data: customersData, isLoading, error } = useCustomers(
    debouncedSearch.trim() || undefined, // Pass search query for server-side filtering
    currentPage,
    pageSize
  );

  // Get customers and total from the server response
  const filteredCustomers = customersData?.data || [];
  const totalFiltered = customersData?.total || 0;

  // Use totalPages from server response, or calculate if not available
  const totalPages = customersData?.totalPages || Math.ceil(totalFiltered / pageSize);

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
    <div className="min-h-screen bg-[#f7f9fb] pb-24">
      {/* Header Section */}
      <PageHeader
        title="Customers"
        description={
          customersData
            ? debouncedSearch.trim()
              ? `${totalFiltered} customer${totalFiltered !== 1 ? "s" : ""} found`
              : `${customersData.total} customer${customersData.total !== 1 ? "s" : ""} total`
            : undefined
        }
        actions={
          <Link href="/customers/new" className="hidden md:flex">
            <ActionButton label="Add Customer" onClick={() => {}} />
          </Link>
        }
      >
        <div className="flex flex-col md:flex-row gap-3 items-center mt-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, phone, or customer ID"
            maxWidth="2xl"
          />
        </div>
      </PageHeader>

      <div className="px-4 md:px-6 py-4 space-y-4">
        {isLoading ? (
          <LoadingState variant="skeleton" count={5} />
        ) : error ? (
          <ErrorState
            title="Error loading customers"
            message="Please try refreshing the page"
            onRetry={() => window.location.reload()}
          />
        ) : filteredCustomers && filteredCustomers.length > 0 ? (
          <>
            {/* Mobile: Card View */}
            <div className="md:hidden space-y-2">
              {filteredCustomers.map((customer) => {
                // Pre-compute values once per customer for performance
                const hasDues = customer.due_amount > 0;
                const phoneNumber = customer.phone.replace(/\D/g, "");
                const whatsappUrl = `https://wa.me/${phoneNumber}`;
                const callUrl = `tel:${customer.phone}`;
                const proofLabel = customer.id_proof_type ? getProofTypeLabel(customer.id_proof_type) : null;

                return (
                  <Card
                    key={customer.id}
                    className="p-4 rounded-lg hover:shadow-md transition-all border border-gray-200 bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Customer Info */}
                      <Link href={`/customers/${customer.id}`} className="flex-1 min-w-0">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 text-base truncate">
                              {customer.name}
                            </h3>
                            {customer.customer_number && (
                              <span className="text-xs text-[#6b7280] font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                {customer.customer_number}
                              </span>
                            )}
                          </div>
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
                            <span className={`text-xs font-medium ${hasDues ? "text-red-600" : "text-green-600"}`}>
                              {hasDues ? formatCurrency(customer.due_amount) : "No dues"}
                            </span>
                            {proofLabel && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                {proofLabel}
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
              <Card className="overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#f1f5f9] border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Address
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Due Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          ID Proof
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Added
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => {
                        // Pre-compute values once per customer for performance
                        const hasDues = customer.due_amount > 0;
                        const phoneNumber = customer.phone.replace(/\D/g, "");
                        const whatsappUrl = `https://wa.me/${phoneNumber}`;
                        const callUrl = `tel:${customer.phone}`;
                        const proofLabel = customer.id_proof_type ? getProofTypeLabel(customer.id_proof_type) : null;
                        const formattedDate = customer.created_at ? formatDate(customer.created_at, "dd MMM yyyy") : "-";
                        const dueAmountText = hasDues ? formatCurrency(customer.due_amount) : "No dues";
                        const dueAmountClass = hasDues ? "text-red-600" : "text-green-600";

                        return (
                          <tr
                            key={customer.id}
                            className="border-t border-gray-200 hover:bg-zinc-50 transition-colors bg-white"
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-0.5">
                                <Link
                                  href={`/customers/${customer.id}`}
                                  className="font-semibold text-sm text-[#0f1724] hover:text-[#273492] transition-colors"
                                >
                                  {customer.name}
                                </Link>
                                {customer.customer_number && (
                                  <span className="text-xs text-[#6b7280] font-mono">
                                    {customer.customer_number}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                <PhoneCall className="h-4 w-4 text-gray-400" />
                                {customer.phone}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                              {customer.address ? (
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{customer.address}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-semibold ${dueAmountClass}`}>
                                {dueAmountText}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {proofLabel ? (
                                <Badge variant="outline" className="text-xs border-gray-200">
                                  {proofLabel}
                                </Badge>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <a
                                  href={callUrl}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.location.href = callUrl;
                                  }}
                                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center h-8 w-8"
                                  title="Call"
                                >
                                  <PhoneCall className="h-4 w-4" />
                                </a>
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-lg transition-colors flex items-center justify-center h-8 w-8"
                                  title="WhatsApp"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                  </svg>
                                </a>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formattedDate}
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
          <EmptyState
            icon={<User className="h-16 w-16" />}
            title={searchQuery ? "No customers found" : "No customers yet"}
            description={
              searchQuery
                ? "Try a different search term"
                : "Add your first customer to get started"
            }
            action={
              !searchQuery
                ? {
                    label: "Add Customer",
                    onClick: () => (window.location.href = "/customers/new"),
                  }
                : undefined
            }
          />
        )}
      </div>

      {/* Pagination */}
      {customersData && totalPages > 1 && (
        <div className="pt-6 border-t border-gray-200 px-4 md:px-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalFiltered}
            pageSize={pageSize}
            onPageChange={(page) => {
              setCurrentPage(page);
              scrollToTop();
            }}
          />
        </div>
      )}

      <FloatingActionButton href="/customers/new" label="Add Customer" />
    </div>
  );
}

