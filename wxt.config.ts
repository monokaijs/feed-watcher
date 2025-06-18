import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    sizes: [16, 32, 48, 128]
  },
  webExt: {
    disabled: true,
  },
  manifest: {
    name: "FeedWatcher",
    description: "Watch FB social feed and backup to GitHub",
    action: {
      default_title: "FeedWatcher"
    },
    host_permissions: [
      'https://*.facebook.com/*',
    ],
    permissions: [
      'storage',
      'declarativeNetRequest',
      'cookies',
    ]
  }
});
