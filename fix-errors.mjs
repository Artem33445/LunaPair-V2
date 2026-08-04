import { readFileSync, writeFileSync } from "fs";

// 1. Fix firebaseRepositories.ts
let fr = readFileSync("src/db/repositories/firebaseRepositories.ts", "utf-8");
fr = fr.replace(`conn.status = "active";`, `conn.status = "local-preview";`);
writeFileSync("src/db/repositories/firebaseRepositories.ts", fr);

// 2. Fix migrationService.ts
let ms = readFileSync("src/services/migrationService.ts", "utf-8");
ms = ms.replace(/partnerConnections/g, "partnerConnection");
writeFileSync("src/services/migrationService.ts", ms);

// 3. Fix index.ts
let idx = readFileSync("src/db/repositories/index.ts", "utf-8");
idx = idx.replace("partnerConnections: new FirebasePartnerConnectionRepository(uid)", "partnerConnection: new FirebasePartnerConnectionRepository(uid)");
writeFileSync("src/db/repositories/index.ts", idx);

// 4. Fix appStore.ts
let ast = readFileSync("src/stores/appStore.ts", "utf-8");
ast = ast.replace(`await getRepositories(get().authUser?.uid).profile.save(profile);
  await getRepositories(get().authUser?.uid).cycles.clear();
  await getRepositories(get().authUser?.uid).cycles.bulkPut(cycles);
  await getRepositories(get().authUser?.uid).dailyLogs.clear();
  await getRepositories(get().authUser?.uid).dailyLogs.bulkPut(logs);`, 
  `const uid = useAppStore.getState().authUser?.uid;
  await getRepositories(uid).profile.save(profile);
  await getRepositories(uid).cycles.clear();
  await getRepositories(uid).cycles.bulkPut(cycles);
  await getRepositories(uid).dailyLogs.clear();
  await getRepositories(uid).dailyLogs.bulkPut(logs);`);
writeFileSync("src/stores/appStore.ts", ast);

console.log("Fixes applied");
