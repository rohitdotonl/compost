// All user-facing copy in one place.
export const S = {
  appName: 'Compost',

  // Passcode
  passcodePrompt: 'Enter your passcode to use Compost on this device.',
  passcodeLabel: 'Passcode',
  passcodeSubmit: 'Unlock',
  passcodeWrong: 'That passcode didn’t work.',

  // Tabs
  tabRack: 'Rack',
  tabVault: 'Vault',
  tabHeap: 'Heap',

  // Rack
  addPlaceholder: 'Paste a link',
  addSubmit: 'Add',
  rackEmpty: 'Nothing waiting. Go do something else.',
  open: 'Open',
  done: 'Done',
  toss: 'Toss',
  extend: '+48h',
  minutes: (n) => `${n} min`,
  expiresToday: 'expires today',
  expiresTomorrow: 'expires tomorrow',
  daysLeft: (n) => `${n} days left`,
  intents: { tonight: 'Tonight', commute: 'Commute', weekend: 'Weekend' },

  // Done
  takeawayPrompt: 'What’s the one takeaway worth keeping?',
  keep: 'Keep',
  skip: 'Skip',
  slotFreed: (used, limit) => `Slot freed · ${used} of ${limit} used`,

  // Toss
  tossed: 'Good call. Attention saved.',
  undo: 'Undo',
  restored: 'Back in your rack.',
  undoExpired: 'Too late to undo.',

  // Vault
  vaultSearch: 'Search your vault',
  vaultDownload: 'Download vault',
  vaultEmpty: 'Nothing finished yet.',
  vaultNoMatch: 'Nothing matches.',
  finishedOn: (date) => `Finished ${date}`,
  vaultFileTitle: 'Compost vault',
  vaultFileExported: (date) => `Exported ${date}`,

  // Heap
  heapNote: 'Everything here clears itself after 30 days.',
  heapEmpty: 'The heap is empty.',
  leftOn: (date) => `Left ${date}`,

  // Save page
  saving: 'Saving…',
  savedReceipt: (used, limit, weekday) => `Slot ${used} of ${limit} used. Expires ${weekday}.`,
  intentQuestion: 'When will you read it?',
  close: 'Close',
  alreadyInRack: 'Already in your rack',
  alreadyInVault: 'Already in your vault',
  rackFull: 'Your rack is full. Drop one to make room.',
  dropAndSave: 'Drop and save',
  cancel: 'Cancel',
  noLink: 'No link found to save.',
  invalidLink: 'That doesn’t look like a link.',

  // Bookmarklet page
  bookmarkletLink: 'Save from your browser',
  bookmarkletTitle: 'Save from your browser',
  bookmarkletDrag: 'Drag this button to your bookmarks bar:',
  bookmarkletName: 'Save to Compost',
  bookmarkletUse: 'Click it on any page to save that page. The first time, it asks for your passcode.',
  bookmarkletCopy: 'Can’t drag? Create a bookmark by hand and paste this as its address:',
  back: 'Back to your rack',

  // Errors
  offline: 'Couldn’t reach Compost. Try again.',
  actionFailed: 'Couldn’t reach Compost. Nothing changed.',
  retry: 'Try again',
  somethingWrong: 'Something went wrong.',

  // Phase 2: keyboard
  linkCopied: 'Link copied',
  bookmarkletCopied: 'Bookmarklet copied. Paste it as a bookmark’s address.',
  copyFailed: 'Couldn’t copy.',
  alreadyExtended: 'Already extended once.',
  exportMarkdown: 'Markdown',
  exportJson: 'JSON',
  exportObsidian: 'Obsidian',
  exportLabel: 'Export:',
  exportFolder: 'Compost Vault',
  palettePlaceholder: 'Search or run a command',
  paletteLabel: 'Command palette',
  paletteNothing: 'Nothing matches.',
  sections: { commands: 'Commands', rack: 'Rack', vault: 'Vault', heap: 'Heap' },
  commands: {
    open: 'Open original',
    done: 'Done',
    toss: 'Toss',
    tossOldest: 'Toss oldest',
    extend: 'Extend +48h',
    goRack: 'Go to Rack',
    goVault: 'Go to Vault',
    goHeap: 'Go to Heap',
    exportMarkdown: 'Export vault as Markdown',
    exportJson: 'Export everything as JSON',
    exportObsidian: 'Export vault as Obsidian zip',
    bookmarklet: 'Copy bookmarklet link',
    add: 'Add link',
    shortcuts: 'Keyboard shortcuts',
  },
  shortcutsTitle: 'Keyboard shortcuts',
  shortcuts: [
    ['j / k', 'Next / previous row'],
    ['o / Enter', 'Open'],
    ['d', 'Done, with a takeaway'],
    ['x', 'Toss'],
    ['u', 'Undo a toss'],
    ['e', '+48h'],
    ['c', 'Copy link'],
    ['1 2 3', 'Tonight, commute, weekend'],
    ['a', 'Add link'],
    ['/', 'Search this tab'],
    ['g r / v / h', 'Rack, Vault, Heap'],
    ['⌘K / Ctrl K', 'Command palette'],
    ['Esc', 'Back out'],
    ['?', 'This sheet'],
  ],
};
