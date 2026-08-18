import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="relative flex-1 overflow-auto px-8 pb-10 pt-24">
        <div className="absolute right-6 top-6 z-50">
          <ThemeToggle />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
