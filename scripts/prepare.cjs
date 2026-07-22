const fs = require("fs");
const src = "scripts/pre-commit";
const dest = ".git/hooks/pre-commit";

fs.copyFileSync(src, dest);
fs.chmodSync(dest, 0o755);
