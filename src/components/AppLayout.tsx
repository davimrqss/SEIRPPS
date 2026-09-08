import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar fixa no desktop */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      {/* Menu lateral em gaveta no mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
          <AppSidebar mobile />
        </SheetContent>
      </Sheet>

      <main className="relative flex-1 overflow-x-hidden px-4 pb-10 pt-20 md:px-8 md:pt-24">
        <div className="absolute left-3 top-4 z-50 md:hidden">
          <Button
            variant="outline"
            size="icon"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="absolute right-3 top-4 z-50 md:right-6 md:top-6">
          <ThemeToggle />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
