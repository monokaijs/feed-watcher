import {useAppDispatch, useAppSelector} from '@/lib/store';
import {setTheme} from '@/lib/store/slices/appSlice';
import GitHubIntegration from '@/lib/components/GitHubIntegration';
import {Button} from '@/lib/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/lib/components/ui/card';
import {Label} from '@/lib/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/lib/components/ui/select';
import {Database, Palette} from 'lucide-react';

export default function Settings() {
  const dispatch = useAppDispatch();
  const {
    theme,
    feedWatcherEnabled,
  } = useAppSelector((state) => state.app);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your application preferences and integrations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5"/>
            General Settings
          </CardTitle>
          <CardDescription>
            Basic application preferences and appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'system') => dispatch(setTheme(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select theme"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <GitHubIntegration/>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5"/>
            Data Management
          </CardTitle>
          <CardDescription>
            Manage your stored data and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline">
              Export Data
            </Button>
            <Button variant="outline">
              Import Data
            </Button>
            <Button variant="destructive">
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
