const AUTO_SAVE_ALARM = "mafiauniverse-auto-save";
const AUTO_SAVE_INTERVAL_MINUTES = 5;
const GAME_EDIT_URL = "https://mafiauniverse.org/Games/Edit";
const GAME_EDIT_URL_PATTERN = `${GAME_EDIT_URL}*`;

// Prevent simultaneous lifecycle events from creating the alarm twice.
let ensureAlarmPromise;
const reloadingGameTabIds = new Set();

function ensureAutoSaveAlarm() {
  const isEnsuringAlarm = ensureAlarmPromise !== undefined;

  if (isEnsuringAlarm) {
    return ensureAlarmPromise;
  }

  ensureAlarmPromise = chrome.alarms
    .get(AUTO_SAVE_ALARM)
    .then(async (alarm) => {
      const alarmAlreadyExists = alarm !== undefined;

      if (alarmAlreadyExists) {
        return;
      }

      await chrome.alarms.create(AUTO_SAVE_ALARM, {
        delayInMinutes: AUTO_SAVE_INTERVAL_MINUTES,
        periodInMinutes: AUTO_SAVE_INTERVAL_MINUTES,
      });
    })
    .catch((error) => {
      console.error("[mafiauniverse-helper] Auto-save failed", error);
    })
    .finally(() => {
      ensureAlarmPromise = undefined;
    });

  return ensureAlarmPromise;
}

async function autoSaveTab(tab) {
  const canAutoSave = tab.id !== undefined && !tab.discarded;

  if (!canAutoSave) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const button = document.getElementById("SaveGameButton");
        const saveButtonIsMissing = button === null;

        if (saveButtonIsMissing) {
          console.warn("[mafiauniverse-helper] SaveGameButton not found");
          return;
        }

        console.log(
          "[mafiauniverse-helper] Auto-save requested",
          new Date().toISOString(),
        );
        button.click();
      },
    });
  } catch (error) {
    console.error("[mafiauniverse-helper] Auto-save failed", error);
  }
}

async function handleAutoSave() {
  try {
    const tabs = await chrome.tabs.query({ url: GAME_EDIT_URL_PATTERN });
    await Promise.all(tabs.map(autoSaveTab));
  } catch (error) {
    console.error("[mafiauniverse-helper] Auto-save failed", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureAutoSaveAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureAutoSaveAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_SAVE_ALARM) {
    void handleAutoSave();
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  const isMainFrame = details.frameId === 0;
  const isPageReloaded = details.transitionType === "reload";
  const isGameEditPage = details.url.startsWith(GAME_EDIT_URL);
  const shouldAutoSaveAfterReload =
    isMainFrame && isPageReloaded && isGameEditPage;

  if (shouldAutoSaveAfterReload) {
    reloadingGameTabIds.add(details.tabId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const isGameEditPageFullyLoaded =
    changeInfo.status === "complete" &&
    tab.url?.startsWith(GAME_EDIT_URL);
  const pageWasReloaded =
    isGameEditPageFullyLoaded && reloadingGameTabIds.delete(tabId);
  const shouldAutoSaveAfterReload =
    pageWasReloaded && isGameEditPageFullyLoaded;

  if (shouldAutoSaveAfterReload) {
    void autoSaveTab(tab);
  }
});

void ensureAutoSaveAlarm();
