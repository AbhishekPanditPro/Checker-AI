// import {AssemblyAI} from "assemblyai";
// import { NextResponse } from "next/server";

// export async function POST() {
//     const apiKey = process.env.ASSEMBLYAI_API_KEY;
//     if (!apiKey) {
//         throw new Error("ASSEMBLY_API_KEY environment variable is not set");
//     }
//     const client = new AssemblyAI({apiKey});
//     try{
//         const token = await client.realtime.createTemporaryToken({expires_in:3600});
//         return Response.json({token});
//     }catch (error){
//         return Response.json({error: "Failed to create token"}, {status: 500});
//     }
    
// }

// app/api/assembly/route.ts
import { AssemblyAI } from "assemblyai";
import { NextResponse } from "next/server";

// app/api/assembly/route.ts
export async function POST() {
  try {
    const key = process.env.ASSEMBLY_API_KEY;

    if (!key) {
      return NextResponse.json({ error: "API Key is missing from environment variables" }, { status: 500 });
    }

    const client = new AssemblyAI({ apiKey: key });
    const tokenResponse = await client.streaming.createTemporaryToken({ 
        expires_in_seconds: 600,  
        max_session_duration_seconds: 3600,
     });

    return NextResponse.json({ token: tokenResponse });
  } catch (error: any) {
    // This will print the actual error from AssemblyAI to your terminal
    console.error("AssemblyAI SDK Error:", error.message || error);
    return NextResponse.json({ 
      error: "Failed to generate token", 
      details: error.message 
    }, { status: 500 });
  }
}