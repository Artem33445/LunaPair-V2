import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
  onSnapshot
} from "firebase/firestore";
import type {
  AdviceRepository,
  AppProfile,
  CycleEntry,
  CycleRepository,
  DailyLog,
  DailyLogRepository,
  PartnerConnection,
  PartnerConnectionRepository,
  PartnerInvite,
  PersonalAdvicePackage,
  ProfileRepository
} from "../../types";
import { db } from "../../lib/firebase";

function cleanData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export class FirebaseProfileRepository implements ProfileRepository {
  constructor(private uid: string) {}

  private get docRef() {
    return doc(db, "users", this.uid, "data", "profile");
  }

  async get() {
    const snap = await getDoc(this.docRef);
    return snap.exists() ? (snap.data() as AppProfile) : undefined;
  }

  async save(profile: AppProfile) {
    await setDoc(this.docRef, cleanData(profile), { merge: true });
  }

  async clear() {
    await deleteDoc(this.docRef);
  }

  subscribe(callback: (profile: AppProfile | undefined) => void): () => void {
    return onSnapshot(this.docRef, (snap: any) => {
      callback(snap.exists() ? (snap.data() as AppProfile) : undefined);
    }, (error) => {
      console.warn("Profile subscription error:", error);
    });
  }
}

export class FirebaseCycleRepository implements CycleRepository {
  constructor(private uid: string) {}

  private get colRef() {
    return collection(db, "users", this.uid, "cycles");
  }

  async list() {
    const q = query(this.colRef, orderBy("startDate"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as CycleEntry);
  }

  subscribe(callback: (cycles: CycleEntry[]) => void): () => void {
    const q = query(this.colRef, orderBy("startDate"));
    return onSnapshot(q, (snap: any) => {
      callback(snap.docs.map((d: any) => d.data() as CycleEntry));
    }, (error) => {
      console.warn("Cycle subscription error:", error);
    });
  }

  async upsert(cycle: CycleEntry) {
    await setDoc(doc(this.colRef, cycle.id), cleanData(cycle));
  }

  async delete(id: string) {
    await deleteDoc(doc(this.colRef, id));
  }

  async clear() {
    const snap = await getDocs(this.colRef);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async bulkPut(cycles: CycleEntry[]) {
    const batch = writeBatch(db);
    cycles.forEach((cycle) => {
      batch.set(doc(this.colRef, cycle.id), cleanData(cycle));
    });
    await batch.commit();
  }

  async getCurrent() {
    const cycles = await this.list();
    return cycles[cycles.length - 1]; // Because ordered by startDate
  }

  async getCompleted() {
    const cycles = await this.list();
    return cycles.filter((c) => Boolean(c.endDate));
  }

  async getById(id: string) {
    const snap = await getDoc(doc(this.colRef, id));
    return snap.exists() ? (snap.data() as CycleEntry) : undefined;
  }

  async update(cycle: CycleEntry) {
    await setDoc(doc(this.colRef, cycle.id), cleanData(cycle), { merge: true });
    return cycle;
  }
}

export class FirebaseDailyLogRepository implements DailyLogRepository {
  constructor(private uid: string) {}

  private get colRef() {
    return collection(db, "users", this.uid, "dailyLogs");
  }

  async list() {
    const q = query(this.colRef, orderBy("date"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as DailyLog);
  }

  subscribe(callback: (logs: DailyLog[]) => void): () => void {
    const q = query(this.colRef, orderBy("date"));
    return onSnapshot(q, (snap: any) => {
      callback(snap.docs.map((d: any) => d.data() as DailyLog));
    }, (error) => {
      console.warn("DailyLog subscription error:", error);
    });
  }

  async getByDate(date: string) {
    const q = query(this.colRef, where("date", "==", date));
    const snap = await getDocs(q);
    if (snap.empty) return undefined;
    return snap.docs[0].data() as DailyLog;
  }

  async getByDateRange(start: string, end: string) {
    const q = query(this.colRef, where("date", ">=", start), where("date", "<=", end), orderBy("date"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as DailyLog);
  }

  async upsert(log: DailyLog) {
    await setDoc(doc(this.colRef, log.id), cleanData(log));
    return log;
  }

  async delete(id: string) {
    await deleteDoc(doc(this.colRef, id));
  }

  async deleteByDate(date: string) {
    const q = query(this.colRef, where("date", "==", date));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async clear() {
    const snap = await getDocs(this.colRef);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  async bulkPut(logs: DailyLog[]) {
    const batch = writeBatch(db);
    logs.forEach((log) => {
      batch.set(doc(this.colRef, log.id), cleanData(log));
    });
    await batch.commit();
  }
}

export class FirebaseAdviceRepository implements AdviceRepository {
  constructor(private uid: string) {}

  private get colRef() {
    return collection(db, "users", this.uid, "advicePackages");
  }

  async getLatest() {
    const q = query(this.colRef, orderBy("generatedAt"));
    const snap = await getDocs(q);
    return snap.docs.at(-1)?.data() as PersonalAdvicePackage | undefined;
  }

  async save(advice: PersonalAdvicePackage) {
    await setDoc(doc(this.colRef, advice.id), cleanData(advice));
  }

  async clear() {
    const snap = await getDocs(this.colRef);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export class FirebasePartnerConnectionRepository implements PartnerConnectionRepository {
  constructor(private uid: string) {}

  private get settingsDoc() {
    return doc(db, "users", this.uid, "data", "settings");
  }

  async getConnection() {
    const snap = await getDoc(this.settingsDoc);
    const data = snap.data();
    return data?.partnerConnection as PartnerConnection | undefined;
  }

  async createInvite() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const invite: PartnerInvite = {
      code,
      createdAt: new Date().toISOString()
    };
    
    // Write invite to invites collection
    await setDoc(doc(db, "invites", code), cleanData({
      ...invite,
      trackerUid: this.uid
    }));
    
    await setDoc(this.settingsDoc, cleanData({ partnerInvite: invite }), { merge: true });
    return invite;
  }

  async connectWithCode(code: string) {
    const timestamp = new Date().toISOString();
    
    // Partner reads the invite
    const inviteDoc = await getDoc(doc(db, "invites", code));
    if (!inviteDoc.exists()) {
      throw new Error("Invalid or expired code");
    }
    
    const inviteData = inviteDoc.data();
    const trackerUid = inviteData.trackerUid;
    
    // Partner updates the invite to let Tracker know they connected
    await setDoc(doc(db, "invites", code), cleanData({ partnerUid: this.uid }), { merge: true });
    
    const connection: PartnerConnection = {
      id: trackerUid,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Save locally for partner
    await setDoc(this.settingsDoc, cleanData({ partnerConnection: connection }), { merge: true });
    return connection;
  }

  async disconnect() {
    const snap = await getDoc(this.settingsDoc);
    const data = snap.data() || {};
    delete data.partnerConnection;
    delete data.partnerInvite;
    
    // In a real app we should also remove partnerUid from tracker's user doc
    // and tracker should remove from partner's settings, but let's just clear local
    await setDoc(this.settingsDoc, cleanData(data));
  }

  async pauseAccess() {
    const conn = await this.getConnection();
    if (conn) {
      conn.status = "paused";
      conn.updatedAt = new Date().toISOString();
      await setDoc(this.settingsDoc, cleanData({ partnerConnection: conn }), { merge: true });
    }
  }

  async resumeAccess() {
    const conn = await this.getConnection();
    if (conn) {
      conn.status = "active";
      conn.updatedAt = new Date().toISOString();
      await setDoc(this.settingsDoc, cleanData({ partnerConnection: conn }), { merge: true });
    }
  }

  async getDemoEnabled() {
    const snap = await getDoc(this.settingsDoc);
    return Boolean(snap.data()?.demoEnabled);
  }

  async setDemoEnabled(enabled: boolean) {
    await setDoc(this.settingsDoc, cleanData({ demoEnabled: enabled }), { merge: true });
  }

  async clear() {
    await deleteDoc(this.settingsDoc);
  }
}
