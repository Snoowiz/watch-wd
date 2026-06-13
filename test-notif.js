import { get } from "http";
get("http://localhost:3000/api/notifications/1/read", (res) => {
  let d = "";
  res.on("data", (c) => d+=c);
  res.on("end", () => console.log("CODE:", res.statusCode, "DATA:", d));
});
