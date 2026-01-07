import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, LogOut, User, Home } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLocation, Link } from "wouter";
import type { User as AuthUser } from "@shared/models/auth";
import type { UserRole } from "@shared/schema";

export function getRoleHomePath(role?: UserRole | null): string {
  return "/";
}

interface AppHeaderProps {
  user: AuthUser;
  roleLabel?: string;
  userRole?: UserRole | null;
}

export function AppHeader({ user, roleLabel, userRole }: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const homePath = getRoleHomePath(userRole);
  
  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n?.[0])
    .join("")
    .toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link 
          href={homePath} 
          className="flex items-center gap-3 hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2"
          data-testid="link-home"
        >
          <Package className="h-7 w-7 text-primary" />
          <div>
            <span className="text-lg font-medium">SurplusFlow</span>
            {roleLabel && (
              <span className="ml-2 text-sm text-muted-foreground">/ {roleLabel}</span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                className="gap-2" 
                onClick={() => setLocation(homePath)}
                data-testid="link-dashboard"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-2" 
                onClick={() => setLocation("/profile")}
                data-testid="link-profile"
              >
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive"
                data-testid="button-logout"
                onClick={() => window.location.href = "/api/logout"}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
