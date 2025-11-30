"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search, X, Filter, Plus, Clock, Building2, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface OrdersHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewOrder: () => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
}

export function OrdersHeader({
  searchQuery,
  onSearchChange,
  onNewOrder,
  dateRange,
  onDateRangeChange,
}: OrdersHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useUserStore();
  const supabase = createClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUser();
    router.push("/login");
  };

  // Get breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Dashboard", href: "/dashboard" }];
    
    if (parts[0] === "orders") {
      breadcrumbs.push({ label: "Orders", href: "/orders" });
      if (parts[1]) {
        breadcrumbs.push({ label: parts[1].charAt(0).toUpperCase() + parts[1].slice(1), href: pathname });
      } else {
        breadcrumbs.push({ label: "All", href: "/orders" });
      }
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-2.5">
        {/* Top Row: Breadcrumbs + Branch/Role/Clock/Avatar - Hide on Mobile */}
        <div className="hidden md:flex items-center justify-between mb-3">
          {/* Breadcrumbs */}
          <Breadcrumb items={breadcrumbs} />

          {/* Right: Branch + Role + Clock + Avatar */}
          <div className="flex items-center gap-3">
            {user?.branch && (
              <Badge variant="outline" className="flex items-center gap-1.5 px-2.5 py-1 border-gray-200 bg-white h-7">
                <Building2 className="h-3.5 w-3.5 text-gray-600" />
                <span className="text-xs text-gray-700">{user.branch.name}</span>
              </Badge>
            )}
            {user?.role && (
              <Badge variant="outline" className="px-2.5 py-1 border-gray-200 bg-white h-7">
                <span className="text-xs text-gray-700 capitalize">{user.role.replace("_", " ")}</span>
              </Badge>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Clock className="h-3.5 w-3.5" />
              <span className="tabular-nums">{format(currentTime, "HH:mm:ss")}</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                className="w-7 h-7 rounded-full bg-[#0b63ff] text-white flex items-center justify-center text-xs font-medium hover:bg-[#0a5ce6] transition-colors"
              >
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
              </button>
              {showAvatarMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAvatarMenu(false)}
                  />
                  <div className="absolute right-0 top-9 z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <button
                      onClick={() => {
                        router.push("/profile");
                        setShowAvatarMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <UserCircle className="h-4 w-4" />
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search + Filters + New Order - Stack on Mobile */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 md:gap-3">
          {/* Search - Full Width on Mobile */}
          <div className="relative flex-1 w-full md:max-w-2xl">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search order, customer, phone"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-9 h-8 rounded-lg border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:border-[#0b63ff] focus:ring-1 focus:ring-[#0b63ff] transition-all w-full"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Buttons - Right Corner, Wrap on Mobile */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Filters Dropdown - Shows Selected Filter with Clear Option */}
            {dateRange && onDateRangeChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="h-7 px-2 gap-1.5 border-[#0b63ff] text-[#0b63ff] hover:bg-[#0b63ff] hover:text-white text-xs font-medium transition-colors relative flex-shrink-0"
                  >
                    <Filter className="h-3 w-3" />
                    <span className="hidden sm:flex items-center gap-1">
                      {dateRange.option === "clear" || !dateRange.option
                        ? "Filters" 
                        : dateRange.option === "custom"
                        ? `${format(dateRange.start, "dd MMM")} - ${format(dateRange.end, "dd MMM")}`
                        : dateRange.option === "today"
                        ? "Today"
                        : dateRange.option === "yesterday"
                        ? "Yesterday"
                        : dateRange.option === "thisweek"
                        ? "This Week"
                        : dateRange.option === "thismonth"
                        ? "This Month"
                        : dateRange.option === "last7days"
                        ? "Last 7 Days"
                        : "Filters"}
                    </span>
                    {dateRange.option && dateRange.option !== "clear" && (
                      <X 
                        className="h-3 w-3 ml-0.5 hover:text-red-600 transition-colors" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const today = new Date();
                          const oneYearAgo = new Date();
                          oneYearAgo.setFullYear(today.getFullYear() - 1);
                          onDateRangeChange({
                            start: oneYearAgo,
                            end: today,
                            option: "clear",
                          });
                        }}
                      />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="right" className="w-80 p-0">
                  <div className="p-3">
                    <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* New Order Button - Reduced Height */}
            <Button
              onClick={onNewOrder}
              className="h-7 px-2 bg-[#0b63ff] hover:bg-[#0a5ce6] text-white gap-1.5 text-xs font-medium flex-shrink-0"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">New Order</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

