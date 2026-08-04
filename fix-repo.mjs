import { readFileSync, writeFileSync } from "fs";
let ast = readFileSync("src/stores/appStore.ts", "utf-8");
ast = ast.replace("await repositories.profile.save(updated);", "await getRepositories(get().authUser?.uid).profile.save(updated);");
writeFileSync("src/stores/appStore.ts", ast);
