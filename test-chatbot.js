import fetch from "node-fetch";
import "dotenv/config";

async function main() {
  const API_KEY = process.env.GEMINI_API_KEY;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
  );

  const data = await res.json();
  console.log(data.models.map(m => m.name));
}

main();
