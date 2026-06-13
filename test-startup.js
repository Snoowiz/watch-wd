import { exec } from "child_process";
exec("npx -y tsx server.ts", (err, stdout, stderr) => {
  console.log("stdout:", stdout);
  console.error("stderr:", stderr);
  if (err) {
    console.error("Error:", err.message);
  }
});
