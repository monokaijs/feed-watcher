import {configureDNR} from "@/lib/utils/dnr.ts";
import {fbService} from "@/lib/services/fb.service.ts";
import {workerService} from "@/lib/services/worker.service.ts";

export default defineBackground(() => {
  chrome.action.onClicked.addListener(() => {
    return chrome.runtime.openOptionsPage();
  });

  const initializeServices = async () => {
    try {
      await configureDNR();
      await fbService.authenticate();
      await workerService.initialize();
    } catch (error) {
    }
  };

  initializeServices();

  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local' && changes.watcher_feeds) {
      try {
        const newFeeds = JSON.parse(changes.watcher_feeds.newValue || '[]');
        await workerService.updateFeedConfiguration(newFeeds);
      } catch (error) {
      }
    }
  });


  chrome.runtime.onSuspend.addListener(async () => {
    try {
      await workerService.shutdown();
    } catch (error) {
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    switch (message.type) {
      case 'GET_WORKER_STATUS':
        sendResponse(workerService.getStatus());
        break;

      case 'TRIGGER_FEED_SCAN':
        workerService.triggerFeedScan(message.feedId)
          .then(result => sendResponse({success: true, result}))
          .catch(error => sendResponse({success: false, error: error.message}));
        return true;

      case 'GET_POSTS':
        workerService.getPostsForDashboard(message.feedId, message.limit)
          .then(posts => sendResponse({success: true, posts}))
          .catch(error => sendResponse({success: false, error: error.message}));
        return true;

      case 'LOAD_POSTS_FOR_DATE':
        workerService.loadPostsForDate(message.feedId, message.date)
          .then(posts => sendResponse({success: true, posts}))
          .catch(error => sendResponse({success: false, error: error.message}));
        return true;

      case 'UPDATE_POSTS_COUNTS':
        workerService.updateAllFeedsPostsCounts()
          .then(() => sendResponse({success: true}))
          .catch(error => sendResponse({success: false, error: error.message}));
        return true;

      case 'WORKER_STATUS_UPDATE':
        break;


      default:
        console.log('Unknown message type:', message.type);
        sendResponse({success: false, error: 'Unknown message type'});
    }
  });
});
