import http from "http";
setTimeout(() => {
  http.get("http://localhost:3000/api/features", (res) => {
    let d = "";
    res.on("data", (c) => d+=c);
    res.on("end", () => console.log("CODE:", res.statusCode, "DATA:", d));
  }).on("error", (err) => console.log("Error:", err.message));
}, 1000);
