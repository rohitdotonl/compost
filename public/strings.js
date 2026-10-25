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
  expiresToday: { morning: 'expires this morning', afternoon: 'expires this afternoon', evening: 'expires tonight' },
  dayParts: { morning: 'morning', afternoon: 'afternoon', evening: 'evening' },
  untilTomorrow: (part) => `until tomorrow${part ? ` ${part}` : ''}`,
  untilDay: (day, part) => `until ${day}${part ? ` ${part}` : ''}`,
  untilNext: (day) => `until next ${day}`,
  intents: { tonight: 'Tonight', commute: 'Commute', weekend: 'Weekend' },
  intentLabel: 'When?',
  intentNone: 'Any time',
  refreshDetails: 'Refresh details',
  refreshNothing: 'Couldn’t find more about that page.',

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
  slotReceipt: (used, limit, until) => `Slot ${used} of ${limit} · ${until}`,
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
};
