"use client";

// Static for customers (as per requirements - no realtime needed)
export const dynamic = 'force-static';

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneCall, MapPin, User, Sparkles, Users, TrendingUp, Search, Plus, AlertCircle, IndianRupee } from "lucide-react";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils/date";
import { useCustomers, type CustomerWithDues } from "@/lib/queries/customers";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
  LoadingState,
  EmptyState,
  ErrorState,
  Pagination,
} from "@/components/shared";

// Memoized Customer Card Component for Performance (Mobile)
const CustomerCard = memo(({ customer, index, getProofTypeLabel }: { 
  customer: CustomerWithDues; 
  index: number;
  getProofTypeLabel: (type?: string) => string | null;
}) => {
  const router = useRouter();
  const hasDues = customer.due_amount > 0;
  const phoneNumber = customer.phone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${phoneNumber}`;
  const callUrl = `tel:${customer.phone}`;
  const proofLabel = customer.id_proof_type ? getProofTypeLabel(customer.id_proof_type) : null;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }
    router.push(`/customers/${customer.id}`);
  };

  return (
    <Card
      onClick={handleCardClick}
      className={`p-5 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm hover:border-[#273492]/40 hover:shadow-xl transition-all duration-300 premium-hover fadeInUp cursor-pointer`}
      style={{ 
        animationDelay: `${index * 0.03}s`,
        willChange: "transform",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Customer Info */}
        <div className="flex-1 min-w-0">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#273492] to-[#1f2a7a] flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white font-bold text-sm">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base truncate">
                  {customer.name}
                </h3>
                {customer.customer_number && (
                  <span className="text-xs text-[#6b7280] font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {customer.customer_number}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <PhoneCall className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{customer.phone}</span>
            </div>
            {customer.address && (
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{customer.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className={`text-sm font-bold flex items-center gap-1.5 ${hasDues ? "text-red-600" : "text-green-600"}`}>
                {hasDues ? (
                  <>
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{formatCurrency(customer.due_amount)}</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <span>No dues</span>
                  </>
                )}
              </span>
              {proofLabel && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-gray-300">
                  {proofLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-col gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <a
            href={callUrl}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = callUrl;
            }}
            className="p-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center"
            title="Call"
          >
            <PhoneCall className="h-5 w-5" />
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2.5 bg-gradient-to-r from-[#25D366] to-[#20BA5A] hover:from-[#20BA5A] hover:to-[#1DA851] text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center"
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
});

CustomerCard.displayName = "CustomerCard";

export default function CustomersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  // Ultra-fast debounce - reduced to 30ms for instant search feel
  const debouncedSearch = useDebounce(searchQuery, 30);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25; // 25 items per page

  // Use server-side pagination and search
  // Disable realtime subscriptions for static page (as per dynamic = 'force-static')
  const { data: customersData, isLoading, error } = useCustomers(
    debouncedSearch.trim() || undefined,
    currentPage,
    pageSize,
    false // enableRealtime = false for static page
  );

  // Get customers and total from the server response
  const filteredCustomers = customersData?.data || [];
  const totalFiltered = customersData?.total || 0;
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

  // Calculate quick stats
  const quickStats = useMemo(() => {
    if (!customersData || isLoading) return null;
    
    const totalCustomers = customersData.total || 0;
    // Calculate dues stats from current page (for performance)
    // Note: These stats are based on the current page view
    const customersWithDues = filteredCustomers.filter(c => c.due_amount > 0).length;
    const totalDues = filteredCustomers.reduce((sum, c) => sum + (c.due_amount || 0), 0);
    
    return {
      totalCustomers,
      customersWithDues,
      totalDues,
    };
  }, [customersData, filteredCustomers, isLoading]);

  // Helper function to scroll to top smoothly
  const scrollToTop = useCallback(() => {
    const scrollContainer = document.querySelector('main[data-scroll-container="true"]') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#f7f9fb] pb-24">
      {/* Premium Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(39,52,146,0.05),transparent_50%)]" />
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto relative">
        {/* Premium Modern Header - Shopify/Flipkart Style */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-200/60">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-[#273492] to-gray-900 bg-clip-text text-transparent">
                Customers
              </h1>
              <Sparkles className="h-6 w-6 text-[#273492] animate-pulse" />
            </div>
            <p className="text-sm md:text-base text-gray-500 font-medium">
              {customersData
                ? debouncedSearch.trim()
                  ? `${totalFiltered} customer${totalFiltered !== 1 ? "s" : ""} found`
                  : `Manage and track all your customers`
                : "Manage and track all your customers"}
            </p>
          </div>
          <Link href="/customers/new" className="hidden md:flex">
            <Button className="bg-[#273492] hover:bg-[#1f2a7a] text-white h-11 px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Customer
            </Button>
          </Link>
        </div>

        {/* Premium Search Bar */}
        <div className="relative">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or customer ID..."
              className="h-14 pl-12 pr-4 text-base rounded-xl border-2 focus:border-[#273492] focus:ring-2 focus:ring-[#273492]/20 transition-all duration-200 bg-white/80 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Quick Stats Bar */}
        {!isLoading && quickStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <Card className="p-5 bg-gradient-to-br from-[#273492]/5 to-[#273492]/10 border-[#273492]/20 premium-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Total Customers</p>
                  <p className="text-3xl font-bold text-[#273492]">{quickStats.totalCustomers}</p>
                </div>
                <div className="p-3 bg-[#273492]/10 rounded-xl">
                  <Users className="h-6 w-6 text-[#273492]" />
                </div>
              </div>
            </Card>
            
            <Card className="p-5 bg-gradient-to-br from-red-50 to-red-100/50 border-red-200/50 premium-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">With Dues</p>
                  <p className="text-3xl font-bold text-red-700">{quickStats.customersWithDues}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertCircle className="h-6 w-6 text-red-700" />
                </div>
              </div>
            </Card>
            
            <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50 premium-hover">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Total Dues</p>
                  <p className="text-3xl font-bold text-orange-700">{formatCurrency(quickStats.totalDues)}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <IndianRupee className="h-6 w-6 text-orange-700" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Loading State for Stats */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl shimmer-premium" />
            ))}
          </div>
        )}

        <div className="space-y-4">
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
              <div className="md:hidden space-y-3">
                {filteredCustomers.map((customer, index) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    index={index}
                    getProofTypeLabel={getProofTypeLabel}
                  />
                ))}
              </div>

              {/* Desktop: Enhanced Table View */}
              <div className="hidden md:block">
                <Card className="overflow-hidden border border-gray-200/60 bg-white/80 backdrop-blur-sm shadow-lg">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Phone
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Address
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Due Amount
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            ID Proof
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Added
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/60">
                        {filteredCustomers.map((customer, index) => {
                          const hasDues = customer.due_amount > 0;
                          const phoneNumber = customer.phone.replace(/\D/g, "");
                          const whatsappUrl = `https://wa.me/${phoneNumber}`;
                          const callUrl = `tel:${customer.phone}`;
                          const proofLabel = customer.id_proof_type ? getProofTypeLabel(customer.id_proof_type) : null;
                          const formattedDate = customer.created_at ? formatDate(customer.created_at, "dd MMM yyyy") : "-";
                          const dueAmountText = hasDues ? formatCurrency(customer.due_amount) : "No dues";
                          const dueAmountClass = hasDues ? "text-red-600" : "text-green-600";

                          const handleRowClick = (e: React.MouseEvent) => {
                            // Don't navigate if clicking on action buttons or links
                            const target = e.target as HTMLElement;
                            if (target.closest('a') || target.closest('button')) {
                              return;
                            }
                            router.push(`/customers/${customer.id}`);
                          };

                          return (
                            <tr
                              key={customer.id}
                              onClick={handleRowClick}
                              className={`border-t border-gray-200/60 hover:bg-gradient-to-r hover:from-[#273492]/5 hover:to-transparent transition-all duration-200 bg-white fadeInUp cursor-pointer`}
                              style={{ 
                                animationDelay: `${index * 0.03}s`,
                                willChange: "background-color",
                              }}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3 group">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#273492] to-[#1f2a7a] flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <span className="text-white font-bold text-sm">
                                      {customer.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-sm text-gray-900 group-hover:text-[#273492] transition-colors">
                                      {customer.name}
                                    </span>
                                    {customer.customer_number && (
                                      <span className="text-xs text-gray-500 font-mono">
                                        {customer.customer_number}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                  <PhoneCall className="h-4 w-4 text-gray-400" />
                                  {customer.phone}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
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
                                <span className={`text-sm font-bold flex items-center gap-1.5 ${dueAmountClass}`}>
                                  {hasDues && <AlertCircle className="h-4 w-4" />}
                                  {dueAmountText}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {proofLabel ? (
                                  <Badge variant="outline" className="text-xs border-gray-300 bg-white">
                                    {proofLabel}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <a
                                    href={callUrl}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      window.location.href = callUrl;
                                    }}
                                    className="p-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center h-9 w-9"
                                    title="Call"
                                  >
                                    <PhoneCall className="h-4 w-4" />
                                  </a>
                                  <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-2 bg-gradient-to-r from-[#25D366] to-[#20BA5A] hover:from-[#20BA5A] hover:to-[#1DA851] text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center h-9 w-9"
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
                              <td className="px-6 py-4 text-sm text-gray-900">
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
              icon={<User className="h-16 w-16 text-gray-400" />}
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
      </div>

      {/* Pagination */}
      {customersData && totalPages > 1 && (
        <div className="pt-6 border-t border-gray-200/60 px-4 md:px-6">
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
