import {Outlet} from 'react-router-dom';
import {SidebarInset, SidebarProvider} from "@/lib/components/ui/sidebar";
import {AppSidebar} from "../app-sidebar";
import {CSSProperties} from "react";
import {SiteHeader} from "../site-header";

export default function DashboardLayout() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset"/>
      <SidebarInset>
        <SiteHeader/>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 p-4 mx-auto w-full xl:max-w-[1600px] md:gap-6 md:py-6">
              <Outlet/>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
