export type UserRole = "tracker" | "partner";
export type ThemePreference = "light" | "dark" | "system";
export type CyclePhase = "menstrual" | "follicular" | "fertile" | "ovulation" | "luteal";
export type DataConfidence = "low" | "medium" | "high";
export type PartnerAccessLevel = "basic" | "wellbeing" | "detailed" | "full" | "custom";
export type PartnerConnectionStatus = "local-preview" | "paused" | "disconnected";
export type Mood =
  | "good"
  | "calm"
  | "energetic"
  | "sensitive"
  | "changeable"
  | "irritated"
  | "anxious"
  | "sad"
  | "happy"
  | "tired"
  | "tense";
export type FlowLevel = "none" | "spotting" | "light" | "medium" | "heavy";
export type WellbeingLevel = "very-bad" | "bad" | "normal" | "good" | "excellent";
export type EnergyLevel = "very-low" | "low" | "normal" | "high" | "very-high";
export type SleepQuality = "bad" | "normal" | "good";
export type IntimacyType = "penetrative" | "non-penetrative" | "prefer-not-to-say";
export type ProtectionStatus = "used" | "not-used" | "prefer-not-to-say";
export type IntimacyAfterFeeling = "fine" | "discomfort" | "pain" | "note-only";

export interface IntimacyLog {
  occurred: boolean | null;
  type?: IntimacyType;
  protection?: ProtectionStatus;
  afterFeeling?: IntimacyAfterFeeling;
  note?: string;
}

export interface AppProfile {
  id: string;
  role: UserRole;
  name: string;
  averageCycleLength: number;
  averagePeriodLength: number;
  theme: ThemePreference;
  onboardingCompleted: boolean;
  partnerSharing: PartnerSharingPreferences;
  supportPreferences?: PartnerSupportPreferences;
  partnerInviteCode?: string;
  partnerInviteConfirmed?: boolean;
  partnerInviteConfirmedAt?: string;
  hidePrivateMarkers?: boolean;
  disableAnimatedBackground?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerSharingPreferences {
  shareCurrentCycleDay: boolean;
  shareCurrentPhase: boolean;
  sharePredictedPeriod: boolean;
  sharePredictionRange: boolean;
  shareCalendar: boolean;
  shareConfirmedPeriodDays: boolean;
  sharePredictedPeriodDays: boolean;
  shareFertileWindow: boolean;
  shareOvulationPrediction: boolean;
  shareDailyWellbeing: boolean;
  shareMood: boolean;
  shareEnergy: boolean;
  shareSleep: boolean;
  sharePainLevel: boolean;
  shareSymptoms: boolean;
  shareDischarge: boolean;
  shareDayNotes: boolean;
  sharePrivateMarkers: boolean;
  shareIntimacy: boolean;
  shareCycleHistory: boolean;
  shareStatistics: boolean;
  shareReports: boolean;
  shareSupportPreferences: boolean;
  accessLevel: PartnerAccessLevel;
  accessPaused: boolean;
  partnerDisconnected: boolean;
  updatedAt: string;
}

export interface PartnerSupportPreferences {
  preferredSupport: string[];
  avoidWhenPossible: string;
  reassuranceText: string;
  updatedAt: string;
}

export interface CycleEntry {
  id: string;
  startDate: string;
  endDate?: string;
  periodLength?: number;
  cycleLength?: number;
  source: "user" | "demo";
  createdAt: string;
  updatedAt: string;
}

export interface DailyLog {
  id: string;
  date: string;
  hiddenFromPartner?: boolean;
  noteVisibleToPartner?: boolean;
  mood?: Mood;
  moodChangedDuringDay?: boolean;
  wellbeing?: WellbeingLevel;
  energy?: number;
  energyLevel?: EnergyLevel;
  pain?: number;
  painLevel?: number;
  flow?: FlowLevel;
  symptoms: string[];
  customSymptom?: string;
  sleepQuality?: SleepQuality;
  sleepHours?: number;
  temperature?: number;
  intimacy?: IntimacyLog;
  note?: string;
  source: "user" | "demo";
  createdAt: string;
  updatedAt: string;
}

export interface PartnerVisibleDay {
  date: string;
  cycleDay?: number;
  phase?: CyclePhase;
  isConfirmedPeriodDay?: boolean;
  isPredictedPeriodDay?: boolean;
  isFertileWindow?: boolean;
  isPredictedOvulation?: boolean;
  wellbeing?: WellbeingLevel;
  mood?: Mood;
  energy?: EnergyLevel;
  sleepQuality?: SleepQuality;
  sleepHours?: number;
  painLevel?: number;
  symptoms?: string[];
  discharge?: FlowLevel;
  notePreview?: string;
  hasPrivateMarker?: boolean;
  intimacy?: IntimacyLog;
  visibility: {
    cycle: boolean;
    wellbeing: boolean;
    mood: boolean;
    energy: boolean;
    sleep: boolean;
    pain: boolean;
    symptoms: boolean;
    discharge: boolean;
    note: boolean;
    privateMarker: boolean;
    intimacy: boolean;
  };
}

export interface PartnerSupportCard {
  title: string;
  body: string;
  actions: string[];
  source: "preferences" | "today-log" | "pattern" | "phase" | "general";
}

export interface PartnerPermissionsSummary {
  accessLevel: PartnerAccessLevel;
  accessPaused: boolean;
  partnerDisconnected: boolean;
  enabledCount: number;
  sensitiveEnabledCount: number;
  hiddenByDefault: string[];
}

export interface PartnerCycleSummary {
  startDate: string;
  endDate?: string;
  cycleLength?: number;
  periodLength?: number;
}

export interface PartnerStatisticsSummary {
  averagePain?: number;
  frequentMood?: Mood;
  frequentSymptoms: string[];
  logCount: number;
}

export interface PartnerDashboardData {
  connectionStatus: PartnerConnectionStatus;
  partnerDisplayName?: string;
  currentCycleDay?: number;
  currentPhase?: CyclePhase;
  daysUntilPredictedPeriod?: number;
  predictedPeriodStart?: string;
  predictedRange?: {
    start: string;
    end: string;
  };
  confidence?: DataConfidence;
  today?: PartnerVisibleDay;
  calendarDays: PartnerVisibleDay[];
  cycleHistory?: PartnerCycleSummary[];
  statistics?: PartnerStatisticsSummary;
  supportCard?: PartnerSupportCard;
  permissionsSummary: PartnerPermissionsSummary;
}

export interface PredictionResult {
  cycleDay: number;
  currentPhase: CyclePhase;
  predictedNextPeriodStart: string;
  predictedPeriodEnd: string;
  uncertaintyStart: string;
  uncertaintyEnd: string;
  predictedOvulationDate: string;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  averageCycleLength: number;
  averagePeriodLength: number;
  irregularityDetected: boolean;
  dataConfidence: DataConfidence;
  pendingExpectation?: PendingPeriodExpectation;
  futureProjections: FutureCycleProjection[];
}

export interface PendingPeriodExpectation {
  originalPredictedStart: string;
  currentShiftedStart: string;
  daysDelayed: number;
  active: boolean;
}

export interface FutureCycleProjection {
  index: number;
  predictedStartDate: string;
  predictedEndDate: string;
  fertileWindowStart?: string;
  fertileWindowEnd?: string;
  ovulationDate?: string;
  basedOnCycleLength: number;
  confidence: DataConfidence;
}

export type CyclePredictionConfidence = DataConfidence;

export interface SyncStatus {
  mode: "local";
  available: false;
  message: string;
}

export interface AuthService {
  getCurrentMode(): "local";
}

export interface CycleRepository {
  list(): Promise<CycleEntry[]>;
  upsert(cycle: CycleEntry): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  bulkPut(cycles: CycleEntry[]): Promise<void>;
  getCurrent(): Promise<CycleEntry | undefined>;
  getCompleted(): Promise<CycleEntry[]>;
  getById(id: string): Promise<CycleEntry | undefined>;
  update(cycle: CycleEntry): Promise<CycleEntry>;
}

export interface DailyLogRepository {
  list(): Promise<DailyLog[]>;
  getByDate(date: string): Promise<DailyLog | undefined>;
  getByDateRange(start: string, end: string): Promise<DailyLog[]>;
  upsert(log: DailyLog): Promise<DailyLog>;
  delete(id: string): Promise<void>;
  deleteByDate(date: string): Promise<void>;
  clear(): Promise<void>;
  bulkPut(logs: DailyLog[]): Promise<void>;
}

export interface ProfileRepository {
  get(): Promise<AppProfile | undefined>;
  save(profile: AppProfile): Promise<void>;
  clear(): Promise<void>;
}

export interface PartnerConnection {
  id: string;
  status: PartnerConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerInvite {
  code: string;
  createdAt: string;
  expiresAt?: string;
}

export interface PartnerConnectionRepository {
  getConnection(): Promise<PartnerConnection | undefined>;
  createInvite(): Promise<PartnerInvite>;
  connectWithCode(code: string): Promise<PartnerConnection>;
  disconnect(): Promise<void>;
  pauseAccess(): Promise<void>;
  resumeAccess(): Promise<void>;
  getDemoEnabled(): Promise<boolean>;
  setDemoEnabled(enabled: boolean): Promise<void>;
  clear(): Promise<void>;
}

export interface PartnerDataService {
  getPartnerDashboard(): Promise<PartnerDashboardData>;
  getPartnerCalendar(startDate: string, endDate: string): Promise<PartnerVisibleDay[]>;
  getPartnerDay(date: string): Promise<PartnerVisibleDay | undefined>;
}

export interface PartnerPermissionsService {
  getPermissions(): Promise<PartnerSharingPreferences>;
  updatePermissions(permissions: PartnerSharingPreferences): Promise<void>;
}

export interface SyncService {
  getStatus(): SyncStatus;
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  profile: AppProfile;
  cycles: CycleEntry[];
  dailyLogs: DailyLog[];
}

export interface CycleReport {
  cycleId: string;
  startDate: string;
  endDate?: string;
  cycleLength?: number;
  periodLength?: number;
  logCount: number;
  completionRate: number;
  averagePain: number | null;
  frequentMood?: Mood;
  frequentSymptoms: string[];
  predictedDeviationDays?: number;
  insufficientData: boolean;
}

export interface CycleReportService {
  buildReport(cycle: CycleEntry, logs: DailyLog[], nextCycle?: CycleEntry): CycleReport;
}
