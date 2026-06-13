import http from "http";
http.get("http://localhost:3000/api/admin/tasks", (res) => {
  let d = "";
  res.on("data", (c) => d+=c);
  res.on("end", () => console.log("CODE:", res.statusCode, "DATA:", d));
});
