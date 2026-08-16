import { repositories as localRepos } from "../db/repositories/localRepositories";
import { getRepositories } from "../db/repositories";

export async function migrateLocalToFirebaseIfNeeded(uid: string) {
  const firebaseRepos = getRepositories(uid);

  // 1. Check if cloud already has a profile
  const cloudProfile = await firebaseRepos.profile.get();
  
  if (cloudProfile) {
    // User already has data in the cloud!
    // The user's preference is to use cloud data and NOT overwrite it with local data.
    // We can clear local data to avoid confusion, or just leave it. Let's clear it.
    await localRepos.profile.clear();
    await localRepos.cycles.clear();
    await localRepos.dailyLogs.clear();
    await localRepos.partnerConnection.clear();
    return;
  }

  // 2. Cloud is empty. Let's migrate local data to cloud.
  const localProfile = await localRepos.profile.get();
  if (!localProfile) {
    // No local data either. Nothing to migrate.
    return;
  }

  // Migrate Profile
  await firebaseRepos.profile.save(localProfile);

  // Migrate Cycles
  const localCycles = await localRepos.cycles.list();
  if (localCycles.length > 0) {
    await firebaseRepos.cycles.bulkPut(localCycles);
  }

  // Migrate Daily Logs
  const localLogs = await localRepos.dailyLogs.list();
  if (localLogs.length > 0) {
    await firebaseRepos.dailyLogs.bulkPut(localLogs);
  }

  // Clear local DB after successful migration
  await localRepos.profile.clear();
  await localRepos.cycles.clear();
  await localRepos.dailyLogs.clear();
  await localRepos.partnerConnection.clear();
}
