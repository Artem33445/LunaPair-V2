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
  writeBatch
} from "firebase/firestore";
import type {
  AppProfile,
  CycleEntry,
  CycleRepository,
  DailyLog,
  DailyLogRepository,
  PartnerConnection,
  PartnerConnectionRepository,
  PartnerInvite,
  ProfileRepository
} from "../../types";
import { db } from "../../lib/firebase";

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
    await setDoc(this.docRef, profile, { merge: true });
  }

  async clear() {
    await deleteDoc(this.docRef);
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

  async upsert(cycle: CycleEntry) {
    await setDoc(doc(this.colRef, cycle.id), cycle);
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
      batch.set(doc(this.colRef, cycle.id), cycle);
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
    await setDoc(doc(this.colRef, cycle.id), cycle, { merge: true });
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
    await setDoc(doc(this.colRef, log.id), log);
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
      batch.set(doc(this.colRef, log.id), log);
    });
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
    const invite: PartnerInvite = {
      code: `${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString()
    };
    await setDoc(this.settingsDoc, { partnerInvite: invite }, { merge: true });
    return invite;
  }

  async connectWithCode(code: string) {
    const timestamp = new Date().toISOString();
    const connection: PartnerConnection = {
      id: "partner_connection",
      status: "local-preview",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await setDoc(this.settingsDoc, { partnerConnection: connection }, { merge: true });
    return connection;
  }

  async disconnect() {
    const snap = await getDoc(this.settingsDoc);
    const data = snap.data() || {};
    delete data.partnerConnection;
    delete data.partnerInvite;
    await setDoc(this.settingsDoc, data);
  }

  async pauseAccess() {
    const conn = await this.getConnection();
    if (conn) {
      conn.status = "paused";
      conn.updatedAt = new Date().toISOString();
      await setDoc(this.settingsDoc, { partnerConnection: conn }, { merge: true });
    }
  }

  async resumeAccess() {
    const conn = await this.getConnection();
    if (conn) {
      conn.status = "local-preview";
      conn.updatedAt = new Date().toISOString();
      await setDoc(this.settingsDoc, { partnerConnection: conn }, { merge: true });
    }
  }

  async getDemoEnabled() {
    const snap = await getDoc(this.settingsDoc);
    return Boolean(snap.data()?.demoEnabled);
  }

  async setDemoEnabled(enabled: boolean) {
    await setDoc(this.settingsDoc, { demoEnabled: enabled }, { merge: true });
  }

  async clear() {
    await deleteDoc(this.settingsDoc);
  }
}
