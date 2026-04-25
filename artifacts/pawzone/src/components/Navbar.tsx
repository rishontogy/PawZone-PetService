import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShoppingCart, User, LogOut, LayoutDashboard, PawPrint } from "lucide-react";
import { useGetCart } from "@workspace/api-client-react";

export function Navbar() {
  const { user, token, logout } = useAuth();
  const [location] = useLocation();

  const { data: cart } = useGetCart({
    query: {
      enabled: !!token && user?.role === "buyer",
    },
  });

  const cartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const dashPath = user?.role === "admin" ? "/admin" :
    user?.role === "seller" ? "/seller" :
    user?.role === "transporter" ? "/transporter" : "/buyer";

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <PawPrint className="w-7 h-7 text-primary" />
            <span className="text-xl font-bold text-primary">PawZone</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/listings" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Browse Pets
            </Link>
            {!user && (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-3">
              {user.role === "buyer" && (
                <Link href="/buyer/cart">
                  <Button variant="ghost" size="sm" className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="hidden md:inline text-sm">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground capitalize">
                    {user.role} Account
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={dashPath} className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {!user && (
            <div className="md:hidden flex gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
