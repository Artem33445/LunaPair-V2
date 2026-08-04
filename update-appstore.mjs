import { readFileSync, writeFileSync } from "fs";

let content = readFileSync("src/stores/appStore.ts", "utf-8");

// Update imports
content = content.replace(
  `import { repositories } from "../db/repositories/localRepositories";`,
  `import { getRepositories } from "../db/repositories";\nimport { migrateLocalToFirebaseIfNeeded } from "../services/migrationService";`
);

// Add helper inside AppState (actually just inside the store closure or create a helper that reads `get().authUser?.uid`)
// Wait, we can't easily inject `const repo = () => getRepositories(get().authUser?.uid)` everywhere unless it's inside `create`.
// Let's replace all `repositories.` with `getRepositories(get().authUser?.uid).`
content = content.replaceAll(/repositories\./g, `getRepositories(get().authUser?.uid).`);

// Update setAuthUser and hydrate
// Currently:
// setAuthUser: (user) => set({ authUser: user }),
// We need to change it to:
// setAuthUser: async (user) => { ... }
const oldSetAuthUser = `setAuthUser: (user) => set({ authUser: user }),`;
const newSetAuthUser = `setAuthUser: async (user) => {
    set({ authUser: user });
    if (user) {
      set({ loading: true });
      await migrateLocalToFirebaseIfNeeded(user.uid);
      await get().hydrate();
    }
  },`;
content = content.replace(oldSetAuthUser, newSetAuthUser);

writeFileSync("src/stores/appStore.ts", content);
console.log("Replaced appStore.ts successfully.");
