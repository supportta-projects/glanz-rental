"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/stores/useUserStore";
import { createClient } from "@/lib/supabase/client";
import { User, LogOut, Key, Building2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function TopHeader() {
  const { user, clearUser } = useUserStore();
  const router = useRouter();
  const supabase = createClient();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUser();
    router.push("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };


  return (
    <>
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-16 shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 h-full max-w-full">
          {/* Left: Branch Name with Icon */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {user?.branch && (
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-5 w-5 text-[#6b7280] flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-[#0f1724] truncate text-sm md:text-base leading-tight">
                    {user.branch.name}
                  </span>
                  <span className="text-xs text-[#6b7280] truncate hidden md:block">
                    {user.full_name || "User"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Avatar */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setShowMenu(true)}
              className={`
                relative flex-shrink-0 w-8 h-8 rounded-full 
                bg-[#0b63ff]
                text-white flex items-center justify-center 
                font-medium text-xs
                hover:bg-[#0a5ce6]
                transition-all duration-200 ease-out
                ${showMenu ? 'ring-2 ring-[#0b63ff] ring-offset-2' : ''}
              `}
              aria-label="User menu"
            >
              <span className="relative z-10">
                {user?.full_name ? getInitials(user.full_name) : "U"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Sheet */}
      <Sheet open={showMenu} onOpenChange={setShowMenu} side="bottom">
        <SheetContent className="h-full max-h-full overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left text-lg">Account Menu</SheetTitle>
          </SheetHeader>
          <div className="mt-2 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start h-14 text-base rounded-xl"
              onClick={() => {
                router.push("/profile");
                setShowMenu(false);
              }}
            >
              <User className="h-5 w-5 mr-3 text-gray-600" />
              My Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start h-14 text-base rounded-xl"
              onClick={() => {
                router.push("/profile");
                setShowMenu(false);
              }}
            >
              <Key className="h-5 w-5 mr-3 text-gray-600" />
              Change Password
            </Button>
            <div className="border-t border-gray-200 my-2" />
            <Button
              variant="ghost"
              className="w-full justify-start h-14 text-base text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="hidden md:block fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="hidden md:block fixed right-6 top-20 z-50 w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {/* User Info Header */}
            <div className="px-4 py-3 bg-[#f1f5f9] border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0 w-9 h-9 rounded-full bg-[#0b63ff] text-white flex items-center justify-center font-medium text-xs">
                  <span>{user?.full_name ? getInitials(user.full_name) : "U"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#0f1724] text-sm truncate">{user?.full_name || "User"}</div>
                  <div className="text-xs text-[#6b7280] mt-0.5 truncate">{user?.branch?.name || ""}</div>
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-start h-9 rounded-lg text-sm"
                onClick={() => {
                  router.push("/profile");
                  setShowMenu(false);
                }}
              >
                <User className="h-4 w-4 mr-3 text-[#6b7280]" />
                My Profile
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-9 rounded-lg text-sm"
                onClick={() => {
                  router.push("/profile");
                  setShowMenu(false);
                }}
              >
                <Key className="h-4 w-4 mr-3 text-[#6b7280]" />
                Change Password
              </Button>
              <div className="border-t border-gray-200 my-1" />
              <Button
                variant="ghost"
                className="w-full justify-start h-9 rounded-lg text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

