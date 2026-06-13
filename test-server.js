import { spawn } from "child_process";

const child = spawn("npx", ["-y", "tsx", "server.ts"], { stdio: "pipe" });

child.stdout.on("data", (data) => console.log(data.toString()));
child.stderr.on("data", (data) => console.error(data.toString()));

setTimeout(() => {
  console.log("Killing child process...");
  child.kill();
}, 2000);
