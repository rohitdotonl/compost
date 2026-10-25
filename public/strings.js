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

  // Phase 4: reader
  readerBack: 'Rack',
  readerBackLabel: 'Back to your rack',
  readerOriginal: 'Open original',
  readerSettings: 'Aa',
  readerSettingsLabel: 'Reading settings',
  readerSize: 'Size',
  readerSmaller: 'A−',
  readerSmallerLabel: 'Smaller text',
  readerLarger: 'A+',
  readerLargerLabel: 'Larger text',
  readerWidth: 'Width',
  readerNarrower: 'Narrower',
  readerWider: 'Wider',
  readerFont: 'Type',
  readerFonts: { serif: 'Serif', sans: 'Sans' },
  readerTheme: 'Page',
  readerThemes: { light: 'Light', sepia: 'Sepia', dark: 'Dark' },
  readerLoading: 'Getting the text…',
  readerFailed: 'Couldn’t extract this one. Opened the original.',
  readerFailedBlocked: 'Couldn’t extract this one.',
  readerOffline: 'This one isn’t saved for offline reading yet.',
  readerGone: 'That article isn’t in your rack or vault.',
};
