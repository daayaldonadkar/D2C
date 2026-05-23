const { clipboard, app } = require('electron');
const fs = require('fs');
const path = require('path');

const MAX_HISTORY = 30;
const POLL_INTERVAL_MS = 400;

let clipboardHistory = [];
let pollTimer = null;
let updateCallback = null;

function getStoragePath() {
  return path.join(app.getPath('userData'), 'clipboard-history.json');
}

function loadHistory() {
  try {
    const data = fs.readFileSync(getStoragePath(), 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      clipboardHistory = parsed.slice(0, MAX_HISTORY);
    }
  } catch {
    // File doesn't exist or is corrupt — start fresh
  }
}

function saveHistory() {
  try {
    fs.writeFileSync(getStoragePath(), JSON.stringify(clipboardHistory, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save clipboard history:', err);
  }
}

function setUpdateCallback(cb) {
  updateCallback = cb;
}

function startListening() {
  loadHistory();

  if (pollTimer) return;

  pollTimer = setInterval(() => {
    const currentText = clipboard.readText().trim();
    if (!currentText) return;

    // Check if the text is already at the top of history
    if (clipboardHistory.length > 0 && clipboardHistory[0].text === currentText) return;

    // Remove existing entry with same text if it exists (for deduplication)
    const existingIndex = clipboardHistory.findIndex(item => item.text === currentText);
    let existingItem = null;
    if (existingIndex !== -1) {
      existingItem = clipboardHistory.splice(existingIndex, 1)[0];
    }

    // Create or update item
    const newItem = {
      text: currentText,
      usageCount: existingItem ? existingItem.usageCount : 0,
      isBookmarked: existingItem ? existingItem.isBookmarked : false,
      createdAt: Date.now()
    };

    // Add to top of history
    clipboardHistory.unshift(newItem);

    if (clipboardHistory.length > MAX_HISTORY) {
      clipboardHistory = clipboardHistory.slice(0, MAX_HISTORY);
    }

    saveHistory();

    if (updateCallback) {
      updateCallback([...clipboardHistory]);
    }
  }, POLL_INTERVAL_MS);
}

function getHistory() {
  return clipboardHistory;
}

module.exports = { startListening, getHistory, setUpdateCallback, saveHistory };
