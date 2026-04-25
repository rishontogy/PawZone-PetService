import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShoppingCart, User, LogOut, LayoutDashboard, PawPrint, Search, Bell } from "lucide-react";
import { useGetCart } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation as useWouterLocation } from "wouter";

export function Navbar() {
  const { user, token, logout } = useAuth();
  const [location] = useLocation();
  const [, setLocation] = useWouterLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const { data: cart } = useGetCart({
    query: { enabled: !!token && user?.role === "buyer" },
  });

  const cartCount = cart?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) ?? 0;

  const dashPath = user?.role === "admin" ? "/admin" :
    user?.role === "seller" ? "/seller" :
    user?.role === "transporter" ? "/transporter" : "/buyer";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      setLocation(`/listings?search=${encodeURIComponent(searchVal)}`);
      setSearchOpen(false);
      setSearchVal("");
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href={user ? dashPath : "/"} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-900">Paw<span className="text-teal-600">Zone</span></span>
          </Link>

          {/* Center search bar (desktop, not on buyer dashboard since that has its own) */}
          {!user || user.role !== "buyer" ? (
            <div className="hidden md:flex flex-1 max-w-md">
              <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-xl w-full px-3 gap-2">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search pets..."
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="flex-1 bg-transparent py-2 text-sm outline-none text-gray-700"
                />
              </form>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 max-w-md">
              <Link href="/listings" className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition-colors">
                <Search className="w-4 h-4" />
                Browse all pets
              </Link>
            </div>
          )}

          {/* Right side nav */}
          <div className="flex items-center gap-2">
            {!user && (
              <>
                <Link href="/listings">
                  <Button variant="ghost" size="sm" className="hidden md:inline-flex text-gray-600">Browse Pets</Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-gray-600">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl">Sign Up</Button>
                </Link>
              </>
            )}

            {user && (
              <>
                {/* Cart badge (buyers only) */}
                {user.role === "buyer" && (
                  <Link href="/buyer/cart">
                    <button className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                      <ShoppingCart className="w-5 h-5" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold leading-none">
                          {cartCount > 9 ? "9+" : cartCount}
                        </span>
                      )}
                    </button>
                  </Link>
                )}

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                        {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                      </div>
                      <span className="hidden md:inline text-sm font-medium text-gray-700">{user.name?.split(" ")[0]}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border-gray-100">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{user.role} Account</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={dashPath} className="flex items-center gap-2 cursor-pointer rounded-lg">
                        <LayoutDashboard className="w-4 h-4 text-gray-500" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 cursor-pointer rounded-lg">
                        <User className="w-4 h-4 text-gray-500" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer rounded-lg focus:text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
