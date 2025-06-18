import * as React from "react"
import {Activity, Eye, LayoutDashboard, Settings,} from "lucide-react"
import {NavMain} from "@/lib/components/nav-main"
import {NavUser} from "@/lib/components/nav-user"
import {Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail,} from "@/lib/components/ui/sidebar"
import AppLogo from '@/assets/icon.png';

const data = {
  user: {
    name: "FeedWatcher User",
    email: "user@feedwatcher.com",
    avatar: "/avatars/user.jpg",
  },
  teams: [
    {
      name: "FeedWatcher",
      logo: Activity,
      plan: "Personal",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: '/',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Watcher",
      url: '/watcher',
      icon: Eye,
    },
    {
      title: "Settings",
      url: '/settings',
      icon: Settings,
    },
  ],
}

export function AppSidebar({...props}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className={'flex flex-row gap-3 justify-center items-center'}>
          <img src={AppLogo} className={'w-8 h-8'}/>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">FeedWatcher</span>
            <span className="truncate text-xs">v1.0.0</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain}/>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user}/>
      </SidebarFooter>
      <SidebarRail/>
    </Sidebar>
  )
}
