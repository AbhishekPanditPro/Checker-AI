import { AssemblyAI } from "assemblyai";
const client = new AssemblyAI({ apiKey: "d68c962ee493414796b80ea0b604261a" });

async function test() {
  try {
    const transcripts = await client.transcripts.list();
    console.log("✅ Connection Successful! Your API key is working.", transcripts);
  } catch (e) {
    console.error("❌ Auth Failed:", e.message);
  }
}
test();