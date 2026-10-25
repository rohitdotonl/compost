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
    ['e', '+48h, or edit a Vault takeaway'],
    ['c', 'Copy link'],
    ['1 2 3', 'Tonight, commute, weekend'],
    ['a', 'Add link'],
    ['/', 'Search this tab'],
    ['g r / v / h', 'Rack, Vault, Heap'],
    ['⌘K / Ctrl K', 'Command palette'],
    ['Esc', 'Back out'],
    ['?', 'This sheet'],
  ],

  // Phase 7: shelf
  viewLabel: 'Vault view',
  viewList: 'List',
  viewShelf: 'Shelf',
  shelfLabel: 'Bookshelf, one shelf per month',
  spineLabel: (title, site, date) => `${title} — ${site} — finished ${date}`,
  // Phase 6: daily
  dailyFrom: (title) => `From ${title}`,
  dailyFinished: (date) => `finished ${date}`,
  dailyKeep: 'Still useful',
  dailyLetGo: 'Let it go',
  dailyLabel: 'A line from your Vault',
  takeawayEdit: 'Edit takeaway',
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
  // Phase 8: nudges
  // The notification (built by the Worker for GET /api/digest, and by sw.js).
  digest: (n, when) => {
    const words = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
    const count = words[n - 1] || String(n);
    const day = { today: 'today', tomorrow: 'tomorrow', soon: 'by tomorrow' }[when] || 'tomorrow';
    return n === 1 ? `${count} article leaves your rack ${day}.` : `${count} articles leave your rack ${day}.`;
  },
  digestFallback: 'Something in your rack expires soon.',
  // The footer line (notify.js).
  reminderOff: 'Daily reminder: off',
  reminderTurnOn: 'Turn on',
  reminderAt: (time) => `Daily reminder at ${time}`,
  reminderChange: 'Change',
  reminderTurnOff: 'Turn off',
  reminderPick: 'Remind me at',
  reminderHourLabel: 'Reminder time',
  reminderSave: 'Save',
  reminderCancel: 'Cancel',
  reminderHint: 'Only on days something is about to leave your rack.',
  reminderBlocked: 'Notifications are blocked for this site.',
  reminderFailed: 'Couldn’t turn on the reminder here.',
  reminderLabel: 'Daily reminder',
  hourLabel: (h) => `${h}:00`,
  // The Sunday line at the top of the Rack (daily.js).
  weeklyLine: (time) => `You read for ${time} this week.`,
  weeklyTime: (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  },
};
