# FeedWatcher

A powerful Chrome extension that monitors Facebook profiles and groups, automatically scans for new posts, and backs them up to GitHub repositories in MDX format.

![FeedWatcher Logo](./assets/icon.png)

## 🚀 Features

### Core Functionality
- **Facebook Integration**: Monitor Facebook profiles and groups with automatic authentication
- **GitHub Backup**: Seamlessly backup posts to GitHub repositories in MDX format
- **Automated Scanning**: Worker service with configurable intervals for continuous monitoring
- **Post Management**: View, search, and manage collected posts with detailed analytics
- **Calendar View**: Browse posts by date with an intuitive calendar interface

### Technical Highlights
- **Modern Tech Stack**: Built with WXT framework, React 19, Redux Toolkit, and TypeScript
- **Chrome Storage**: Persistent data storage using Chrome's storage API
- **Real-time Updates**: Live status updates and progress tracking
- **Responsive UI**: Beautiful interface built with shadcn/ui components and Tailwind CSS
- **Error Handling**: Comprehensive error handling and recovery mechanisms

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Development](#development)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## 🛠 Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- Chrome browser (or Chromium-based browser)
- Facebook account for monitoring feeds
- GitHub account for backup functionality

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/monokaijs/feed-watcher.git
   cd feed-watcher
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Load extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `.output/chrome-mv3` directory

### Production Build

```bash
# Build for Chrome
npm run build

# Build for Firefox
npm run build:firefox

# Create distribution zip
npm run zip
```

## 🚀 Quick Start

### 1. Initial Setup
1. Install and load the extension in Chrome
2. Click the FeedWatcher icon in your browser toolbar
3. The extension will open in a new tab

### 2. Facebook Authentication
- The extension automatically authenticates with Facebook using your browser cookies
- Make sure you're logged into Facebook in the same browser

### 3. GitHub Integration
1. Navigate to the Settings page
2. Enter your GitHub Personal Access Token
3. The token needs `repo` permissions for backup functionality

### 4. Add Your First Feed
1. Go to the "Feed Watcher" tab
2. Click "Add New Feed"
3. Enter the Facebook profile/group numeric ID
4. Configure backup settings and intervals
5. Enable the feed to start monitoring

## 📖 Usage Guide

### Dashboard
The main dashboard provides an overview of:
- Worker status and active feeds
- Recent posts and activity
- GitHub backup status
- Quick action buttons

### Feed Management
- **Add Feeds**: Monitor Facebook profiles or groups by numeric ID
- **Configure Intervals**: Set custom scanning intervals (minimum 1 minute)
- **Backup Settings**: Choose GitHub repositories for each feed
- **Toggle Status**: Enable/disable feeds and backup functionality

### Post Viewing
- **Posts List**: Browse all collected posts with filtering options
- **Calendar View**: Navigate posts by date
- **Post Details**: View full post content, reactions, and MDX preview
- **GitHub Links**: Direct links to backed-up posts in repositories

### Settings
- **GitHub Integration**: Manage GitHub tokens and repository access
- **Worker Configuration**: Control scanning intervals and behavior
- **Data Management**: Export/import settings and clear data

## ⚙️ Configuration

### GitHub Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Copy the token and paste it in FeedWatcher settings

### Facebook Feed IDs
- **Profile ID**: The numeric ID of a Facebook profile
- **Group ID**: The numeric ID of a Facebook group
- You can find these IDs in the URL or using Facebook's Graph API

### Scanning Intervals
- Minimum interval: 1 minute
- Recommended: 5-15 minutes for active feeds
- Higher intervals reduce API usage but may miss posts

### Backup Configuration
- Each feed can backup to a different GitHub repository
- Posts are saved in MDX format with metadata
- Backup is triggered automatically when new posts are found

## 🏗 Architecture

### Technology Stack
- **Framework**: [WXT](https://wxt.dev/) - Modern web extension framework
- **Frontend**: React 19 with TypeScript
- **State Management**: Redux Toolkit with redux-persist
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom animations
- **Date Handling**: dayjs for date manipulation
- **Markdown**: react-markdown with remark-gfm for rendering

### Project Structure
```
feed-watcher/
├── entrypoints/           # Extension entry points
│   ├── background.ts      # Background service worker
│   ├── content.ts         # Content script
│   └── options/           # Options page (main UI)
├── lib/
│   ├── components/        # React components
│   │   ├── pages/         # Main page components
│   │   └── ui/            # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── router/            # React Router configuration
│   ├── services/          # Business logic services
│   │   ├── fb.service.ts  # Facebook API integration
│   │   ├── github.service.ts # GitHub API integration
│   │   └── worker.service.ts # Background worker
│   ├── store/             # Redux store and slices
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── assets/                # Static assets
└── public/                # Public files
```

### Key Services

#### Facebook Service (`fb.service.ts`)
- Handles Facebook authentication using browser cookies
- Fetches posts from profiles and groups using Graph API
- Manages access tokens and DTSG tokens
- Implements incremental scanning with since/until parameters

#### GitHub Service (`github.service.ts`)
- Manages GitHub API authentication
- Creates and updates repository files
- Handles MDX file generation and upload
- Repository search and validation

#### Worker Service (`worker.service.ts`)
- Background scanning with configurable intervals
- Sequential feed processing to avoid rate limits
- Post storage and deduplication
- Automatic backup triggering
- Status tracking and reporting

### Data Flow
1. **Authentication**: Extension authenticates with Facebook and GitHub
2. **Feed Configuration**: User adds feeds with backup settings
3. **Background Scanning**: Worker service scans feeds at intervals
4. **Post Processing**: New posts are stored locally and backed up to GitHub
5. **UI Updates**: Real-time status updates in the dashboard

## 🔧 Development

### Prerequisites
- Node.js 18+
- Chrome browser for testing
- Facebook and GitHub accounts for integration testing

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run compile

# Build for Firefox
npm run dev:firefox
npm run build:firefox
```

### Development Workflow
1. Make changes to the code
2. The extension auto-reloads in development mode
3. Test functionality in the browser
4. Check console for errors and logs
5. Use Chrome DevTools for debugging

### Testing
- Test Facebook authentication with different account states
- Verify GitHub integration with various repository configurations
- Test worker service with different scanning intervals
- Validate UI responsiveness across different screen sizes

### Debugging
- Background script logs: Chrome DevTools → Extensions → Service Worker
- Options page logs: Standard Chrome DevTools
- Storage inspection: Chrome DevTools → Application → Storage

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages: `git commit -m 'Add amazing feature'`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style
- Use TypeScript for all new code
- Follow existing code formatting (Prettier configuration)
- Add JSDoc comments for complex functions
- Use meaningful variable and function names
- Keep components small and focused

### Pull Request Process
1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all existing tests pass
4. Update the README if you change functionality
5. Request review from maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WXT Framework](https://wxt.dev/) for the excellent extension development experience
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
- [Redux Toolkit](https://redux-toolkit.js.org/) for state management
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/monokaijs/feed-watcher/issues) page
2. Create a new issue with detailed information
3. Include browser version, extension version, and steps to reproduce

---

**Made with ❤️ by [monokaijs](https://github.com/monokaijs)**
