export type Lang = 'he' | 'en';

const he = {
  // Navigation
  home: 'בית',
  advanced: 'מתקדם',

  // Greeting
  goodMorning: 'בוקר טוב',
  goodAfternoon: 'אחר הצהריים',
  goodEvening: 'ערב טוב',
  goodNight: 'לילה טוב',

  // Home
  ourPortfolio: 'שווי התיק שלנו',
  sincePurchase: 'שינוי מאז קניה',
  sincePurchaseHint: 'ממוצע משוקלל של כל הרכישות',
  dailyChangeLabel: 'שינוי יומי',
  pricesStaleNote: 'חלק מהמחירים לא התעדכנו כרגע — מוצג הערך האחרון הידוע.',
  nextDeposit: 'הפקדה הבאה',
  ourInvestments: 'ההשקעות שלנו',
  noRecurring: 'אין הפקדות קבועות',
  nextDepositLabel: 'הבאה:',
  recurringActiveCount: (n: number) => `${n} הפקדות קבועות פעילות`,
  sincePurchaseCaption: 'שינוי ביחס למחיר הקנייה',
  recurringBreakdownTitle: 'הפקדות קבועות',
  recurringTotal: 'סה״כ',
  nextExecution: 'ביצוע הבא',
  unrealizedGain: 'רווח לא ממומש',
  unrealizedLoss: 'הפסד לא ממומש',
  positions: (n: number) => `${n} השקעות`,

  // Market status
  marketsActive: 'השווקים פעילים',
  marketsClosed: 'השווקים סגורים',
  marketNamedOpen: (exchange: string) => `${exchange} פתוח`,
  marketNamedClosed: (exchange: string) => `${exchange} סגור`,
  marketOpen: 'השוק פתוח',
  marketClosed: 'השוק סגור',
  marketExchangesTitle: 'השווקים שלך',
  marketClosesIn: (duration: string) => `נסגר בעוד ${duration}`,
  marketOpensIn: (duration: string) => `נפתח בעוד ${duration}`,
  marketOpensTomorrow: 'נפתח מחר',
  marketOpensOnDay: (day: string) => `נפתח ביום ${day}`,

  // CTA
  addInvestment: 'הוסף השקעה',
  addFirst: 'הוסף השקעה ראשונה',
  loadDemo: 'טען תיק דמו',

  // Empty state
  welcomeTitle: 'ברוכים הבאים ל-TIKI',
  welcomeSubtitle: 'כאן תוכלו לצפות בהשקעות שלכם צומחות.',
  welcomeBody: 'כל תיק גדול מתחיל בהשקעה אחת.',
  letsBegin: 'בואו נתחיל',

  // Overview Cards
  totalInvested: 'סה״כ הושקע',
  currentValue: 'שווי נוכחי',
  profitLoss: 'רווח / הפסד',
  roi: 'תשואה כוללת',
  monthlyContrib: 'הפקדה חודשית',

  // Advanced / Asset list
  myInvestments: 'ההשקעות שלי',
  assetHeader: 'נכס',
  ownerHeader: 'בעלים',
  qtyHeader: 'כמות',
  avgBuyHeader: 'מחיר קנייה',
  currentHeader: 'מחיר נוכחי',
  valueHeader: 'שווי',
  pnlHeader: 'ר/ה',
  monthlyHeader: 'הפקדה',
  portfolioTotal: 'סה״כ תיק',
  noInvestments: 'אין השקעות',
  perMonth: '/חודש',

  // Owners
  me: 'אני',
  partner: 'בן/בת זוג',
  shared: 'משותף',

  // Modal
  addNewInvestment: 'הוספת השקעה חדשה',
  editInvestment: (ticker: string) => `עריכת ${ticker}`,
  findAsset: 'מציאת נכס',
  purchaseDetails: 'פרטי הרכישה',
  investmentSetup: 'הגדרת ההשקעה',
  tickerSymbol: 'סמל מסחר',
  purchaseDate: 'תאריך רכישה',
  howDidYouInvest: 'כיצד השקעת?',
  amountMethod: 'השקעתי סכום',
  unitsMethod: 'קניתי יחידות',
  investedAmount: 'סכום השקעה',
  unitsPurchased: 'מספר יחידות',
  historyPrice: 'מחיר ביום הרכישה',
  calculatedQty: 'כמות',
  calculatedAvgBuy: 'מחיר קנייה ממוצע',
  calculatedInvestedAmount: 'סכום השקעה מחושב',
  priceDiagnostics: 'אבחון מחיר (השוואה ל-BLINK)',
  resolvedSymbol: 'סימול Yahoo',
  exchangeLabel: 'בורסה',
  matchedTradingDate: 'יום מסחר שנמצא',
  rawClose: 'מחיר סגירה גולמי',
  adjustedClose: 'מחיר סגירה מותאם',
  blinkPriceLabel: 'מחיר לפי BLINK (ידני)',
  diffVsClose: 'הפרש מול סגירה גולמית',
  diffVsAdjClose: 'הפרש מול סגירה מותאמת',
  fetchingPrice: 'שולף מחיר...',
  priceReceived: 'מחיר עדכני התקבל',
  couldNotConnect: 'לא ניתן להתחבר לשוק. בדקו את הרשת.',
  couldNotFetchHistory: 'לא הצלחנו לקבל מחיר היסטורי לתאריך זה.',
  enterManually: 'לא מוצאים? הזינו פרטים ידנית',
  manualEntry: 'הזנה ידנית',
  manualEntryReady: 'פרטים ידניים מוכנים',
  assetNamePlaceholder: 'שם הנכס',
  currencyLabel: 'מטבע',
  whoIsOwner: 'בעלים',
  frequencyLabel: 'תדירות הפקדה',
  contributionAmount: 'סכום הפקדה',
  colorAccent: 'צבע',
  cancel: 'ביטול',
  saveChanges: 'שמור שינויים',
  continueBtn: 'המשך',
  backBtn: 'חזרה',
  addToInvestments: 'הוסף להשקעות',
  name: 'שם',
  avgBuy: 'מחיר קנייה',
  qty: 'כמות',
  currentPrice: 'מחיר נוכחי',
  confirm: 'אישור',

  // Ticker details modal
  liveMarketPrice: 'מחיר שוק חי',
  range1W: 'שבוע',
  range1M: 'חודש',
  range3M: '3 חודשים',
  range1Y: 'שנה',
  yourHolding: 'ההחזקה שלך',
  todayChange: 'שינוי היום',

  // Frequency options
  freqOneTime: 'חד פעמי',
  freqDaily: 'יומי',
  freqWeekly: 'שבועי',
  freqMonthly: 'חודשי',
  freqQuarterly: 'רבעוני',
  freqSemiAnnually: 'חצי שנתי',
  freqYearly: 'שנתי',
  freqEveryX: 'כל X חודשים',
  dayOfMonth: 'יום בחודש',
  numMonths: 'מספר חודשים',

  // Projection chart
  portfolioProjection: 'תחזית תיק',
  estimatedWith: 'שווי עתידי משוער עם',
  today: 'היום',
  withContributions: 'עם הפקדות',
  growthOnly: 'צמיחה בלבד',
  year: 'שנה',
  inYears: (n: number) => `בעוד ${n} שנה`,
  totalGain: 'רווח כולל',
  multiplier: 'מכפיל',

  // Projection simulator
  simulator: 'סימולטור',
  annualReturn: 'תשואה שנתית',
  timeHorizon: 'אופק השקעה',
  valueInYears: (n: number) => `שווי בעוד ${n} שנה`,
  xTimesYourMoney: (x: number) => `${x.toFixed(1)}× הכסף שלכם`,

  // Allocation
  allocationTitle: 'חלוקת השקעות',
  byCurrentValue: 'לפי שווי נוכחי',
  total: 'סה״כ',

  // Contribution split
  monthlySplit: 'פיצול הפקדות חודשיות',
  totalPerMonth: 'סה״כ לחודש',

  // Upcoming deposits
  upcomingDeposits: 'הפקדות קרובות',
  totalDeposit: 'סה״כ הפקדה',
  noUpcoming: 'אין הפקדות קבועות',

  // Privacy
  dataPrivacy: 'כל הנתונים נשמרים מקומית על המכשיר שלכם בלבד',

  // Feature descriptions (empty state)
  livePrices: 'מחירים חיים',
  livepricesSub: 'מהשוק בזמן אמת',
  futureProjection: 'תחזית חכמה',
  futureProjectionSub: 'סימולציות עתידיות',
  ownerTracking: 'שניכם יחד',
  ownerTrackingSub: 'מעקב לפי בעלים',

  // Auth / Login
  loginSubtitle: 'לוח הבקרה של ההשקעות שלנו',
  continueWithGoogle: 'המשך עם Google',
  orText: 'או',
  continueWithoutAccount: 'המשך ללא חשבון (מצב דמו)',
  signOut: 'התנתקות',

  // Migration prompt
  migrationTitle: 'מצאנו נתוני TIKI מקומיים',
  migrationBody: (n: number) => `נמצאו ${n} השקעות שמורות במכשיר זה. האם לשמור אותן לחשבון שלכם?`,
  saveToAccount: 'שמור בחשבון',
  keepLocal: 'שמור מקומי בלבד',
  clearLocalData: 'מחק נתונים מקומיים',
  saving: 'שומר...',

  // Cloud sync
  cloudUnavailable: 'הסנכרון עם הענן אינו זמין כרגע. הנתונים המקומיים שלכם בטוחים.',

  // Mamish
  mamishActivated: '✨ מאמיש מוד',
  mamishDeactivated: 'חזרה למצב רגיל',

  // Personality sentences (one per portfolio state)
  personalityGain: '📈 חודש מצוין.',
  personalityGrowing: '💰 התיק שלכם ממשיך לצמוח.',
  personalityBuilding: '🌱 אתם בונים משהו לעתיד.',
  personalityDown: '📉 השוק ירד היום — אבל אתם עדיין בדרך הנכונה.',
  personalityStart: '✨ כל השקעה מגדילה אתכם.',
};

type T = typeof he;

const en: T = {
  home: 'Home',
  advanced: 'Advanced',

  goodMorning: 'Good morning',
  goodAfternoon: 'Good afternoon',
  goodEvening: 'Good evening',
  goodNight: 'Good night',

  ourPortfolio: 'Our Portfolio Value',
  sincePurchase: 'Change since purchase',
  sincePurchaseHint: 'Weighted average across all purchases',
  dailyChangeLabel: 'Daily change',
  pricesStaleNote: "Some prices couldn't refresh right now — showing the last known value.",
  nextDeposit: 'Next Deposit',
  ourInvestments: 'Our Investments',
  noRecurring: 'No recurring deposits',
  nextDepositLabel: 'Next:',
  recurringActiveCount: (n: number) => `${n} active recurring investment${n !== 1 ? 's' : ''}`,
  sincePurchaseCaption: 'Change vs. purchase price',
  recurringBreakdownTitle: 'Recurring Investments',
  recurringTotal: 'Total',
  nextExecution: 'Next execution',
  unrealizedGain: 'Unrealized gain',
  unrealizedLoss: 'Unrealized loss',
  positions: (n: number) => `${n} position${n !== 1 ? 's' : ''}`,

  // Market status
  marketsActive: 'Markets Active',
  marketsClosed: 'Markets Closed',
  marketNamedOpen: (exchange: string) => `${exchange} Open`,
  marketNamedClosed: (exchange: string) => `${exchange} Closed`,
  marketOpen: 'Market Open',
  marketClosed: 'Market Closed',
  marketExchangesTitle: 'Your Markets',
  marketClosesIn: (duration: string) => `Closes in ${duration}`,
  marketOpensIn: (duration: string) => `Opens in ${duration}`,
  marketOpensTomorrow: 'Opens tomorrow',
  marketOpensOnDay: (day: string) => `Opens ${day}`,

  addInvestment: 'Add Investment',
  addFirst: 'Add First Investment',
  loadDemo: 'Load Demo Portfolio',

  welcomeTitle: 'Welcome to TIKI',
  welcomeSubtitle: 'This is where you\'ll watch your investments grow.',
  welcomeBody: 'Every great portfolio starts with a single investment.',
  letsBegin: 'Let\'s Begin',

  totalInvested: 'Total Invested',
  currentValue: 'Current Value',
  profitLoss: 'Profit / Loss',
  roi: 'Overall Return',
  monthlyContrib: 'Monthly Contribution',

  myInvestments: 'My Investments',
  assetHeader: 'Asset',
  ownerHeader: 'Owner',
  qtyHeader: 'Qty',
  avgBuyHeader: 'Avg Buy',
  currentHeader: 'Current',
  valueHeader: 'Value',
  pnlHeader: 'P&L',
  monthlyHeader: 'Monthly',
  portfolioTotal: 'Portfolio Total',
  noInvestments: 'No investments yet',
  perMonth: '/month',

  me: 'Me',
  partner: 'Partner',
  shared: 'Shared',

  addNewInvestment: 'Add New Investment',
  editInvestment: (ticker: string) => `Edit ${ticker}`,
  findAsset: 'Find Asset',
  purchaseDetails: 'Purchase Details',
  investmentSetup: 'Investment Setup',
  tickerSymbol: 'Ticker Symbol',
  purchaseDate: 'Purchase Date',
  howDidYouInvest: 'How did you invest?',
  amountMethod: 'I invested an amount',
  unitsMethod: 'I bought units',
  investedAmount: 'Amount invested',
  unitsPurchased: 'Units purchased',
  historyPrice: 'Price on purchase date',
  calculatedQty: 'Quantity',
  calculatedAvgBuy: 'Average buy price',
  calculatedInvestedAmount: 'Calculated invested amount',
  priceDiagnostics: 'Price diagnostics (compare vs. BLINK)',
  resolvedSymbol: 'Resolved Yahoo symbol',
  exchangeLabel: 'Exchange',
  matchedTradingDate: 'Matched trading date',
  rawClose: 'Raw close',
  adjustedClose: 'Adjusted close',
  blinkPriceLabel: 'BLINK price (manual)',
  diffVsClose: 'Diff vs. raw close',
  diffVsAdjClose: 'Diff vs. adjusted close',
  fetchingPrice: 'Fetching price...',
  priceReceived: 'Live price received',
  couldNotConnect: 'Could not connect to market. Check your network.',
  couldNotFetchHistory: 'Could not fetch historical price for that date.',
  enterManually: "Can't find it? Enter details manually",
  manualEntry: 'Manual entry',
  manualEntryReady: 'Manual details ready',
  assetNamePlaceholder: 'Asset name',
  currencyLabel: 'Currency',
  whoIsOwner: 'Owner',
  frequencyLabel: 'Investment frequency',
  contributionAmount: 'Contribution amount',
  colorAccent: 'Color',
  cancel: 'Cancel',
  saveChanges: 'Save Changes',
  continueBtn: 'Continue',
  backBtn: 'Back',
  addToInvestments: 'Add Investment',
  name: 'Name',
  avgBuy: 'Avg Buy Price',
  qty: 'Quantity',
  currentPrice: 'Current Price',
  confirm: 'Confirm',

  // Ticker details modal
  liveMarketPrice: 'Live market price',
  range1W: '1W',
  range1M: '1M',
  range3M: '3M',
  range1Y: '1Y',
  yourHolding: 'Your holding',
  todayChange: "Today's change",

  freqOneTime: 'One-time',
  freqDaily: 'Daily',
  freqWeekly: 'Weekly',
  freqMonthly: 'Monthly',
  freqQuarterly: 'Quarterly',
  freqSemiAnnually: 'Semi-annually',
  freqYearly: 'Yearly',
  freqEveryX: 'Every X months',
  dayOfMonth: 'Day of month',
  numMonths: 'Number of months',

  portfolioProjection: 'Portfolio Projection',
  estimatedWith: 'Estimated future value with',
  today: 'Today',
  withContributions: 'With contributions',
  growthOnly: 'Growth only',
  year: 'year',
  inYears: (n: number) => `In ${n} year${n !== 1 ? 's' : ''}`,
  totalGain: 'Total gain',
  multiplier: 'Multiplier',

  simulator: 'Simulator',
  annualReturn: 'Annual Return',
  timeHorizon: 'Time Horizon',
  valueInYears: (n: number) => `Value in ${n} year${n !== 1 ? 's' : ''}`,
  xTimesYourMoney: (x: number) => `${x.toFixed(1)}× your money`,

  allocationTitle: 'Investment Allocation',
  byCurrentValue: 'By current portfolio value',
  total: 'Total',

  monthlySplit: 'Monthly Contribution Split',
  totalPerMonth: 'Total / month',

  upcomingDeposits: 'Upcoming Deposits',
  totalDeposit: 'Total deposit',
  noUpcoming: 'No recurring contributions',

  dataPrivacy: 'All data is stored locally on your device only',

  livePrices: 'Live Prices',
  livepricesSub: 'Real-time market data',
  futureProjection: 'Smart Projection',
  futureProjectionSub: 'Future simulations',
  ownerTracking: 'Together',
  ownerTrackingSub: 'Tracked by owner',

  // Auth / Login
  loginSubtitle: 'Your personal investment dashboard',
  continueWithGoogle: 'Continue with Google',
  orText: 'or',
  continueWithoutAccount: 'Continue without account (demo mode)',
  signOut: 'Sign out',

  // Migration prompt
  migrationTitle: 'We found local TIKI data',
  migrationBody: (n: number) => `Found ${n} investment${n !== 1 ? 's' : ''} saved on this device. Save them to your account?`,
  saveToAccount: 'Save to account',
  keepLocal: 'Keep local only',
  clearLocalData: 'Clear local data',
  saving: 'Saving...',

  // Cloud sync
  cloudUnavailable: 'Cloud sync is unavailable right now. Your local data is still safe.',

  mamishActivated: '✨ Mamish Mode',
  mamishDeactivated: 'Back to normal',

  personalityGain: '📈 Great month.',
  personalityGrowing: '💰 Your portfolio keeps growing.',
  personalityBuilding: '🌱 You\'re building something for the future.',
  personalityDown: '📉 The market is down today, but you\'re still on the right path.',
  personalityStart: '✨ Every investment counts.',
};

export const translations: Record<Lang, T> = { he, en };
export type Translations = T;
