import http from "http";
http.get("http://localhost:3000/api/features", (res) => {
  console.log("HEADERS:", res.headers);
  let d = "";
  res.on("data", c => d+=c);
  res.on("end", () => console.log("BODY:", d));
});
