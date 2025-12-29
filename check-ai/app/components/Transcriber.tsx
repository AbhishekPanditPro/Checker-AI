'use client';
import { useState, useRef } from "react";
import { StreamingTranscriber } from "assemblyai";

export default function Transcriber(){
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [allTranscript, setAllTranscript] = useState("");
    const rtRef = useRef<StreamingTranscriber | null> (null);
    const audioContextRef = useRef<AudioContext | null> (null);

    const startTranscription = async () =>{
        try{
            // request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});

            console.log("teh stream")
            
            // get temporary token from our api
            const response = await fetch("/api/assembly", {method: "POST"});

            if (!response.ok) {
            // This will tell you if it's a 404 (Not Found) or 500 (Server Error)
            console.error(`Fetch failed with status: ${response.status}`);
            const errorBody = await response.text();
            console.error("Response body:", errorBody);
            return;
}




            const {token} = await response.json();
            console.log("the token is : ", token)
            // initialize realtime transcriber
            const rt = new StreamingTranscriber({
                token,
                sampleRate: 16000,
          
            });
            rt.on("turn", (turn) => {
            const text = turn?.transcript ?? "";
  if (!text) return;

  if (turn.end_of_turn) {
    setAllTranscript((prev) => (prev ? prev + " " : "") + text);
    setTranscript(""); // clear partial
  } else {
    setTranscript(text); // partial
  }

            });

            rt.on("error", (err)=> console.error("Streaming error: ",err));

            await rt.connect();
            rtRef.current = rt;

            // process audio via audiocontext
            const audioContext = new AudioContext({sampleRate: 16000});
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);

            source.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = (e) =>{
                if (!rtRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);

                for (let i = 0; i < inputData.length; i++){
                    pcmData[i] = Math.max(-1, Math.min(1,inputData[i])) * 0x7fff;

                }
                rt.sendAudio(pcmData);
            };

            setIsRecording(true);

        

        }catch(err){
            console.error("Microphone access denied or error", err)
        }
    };

    const stopTranscription = async () => {
        setIsRecording(false);
        await rtRef.current?.close();
        audioContextRef.current?.close();
    }






    return (
        <div className="p-10 border rounded-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">Live Transcription</h2>
            <button 
                onClick={isRecording? stopTranscription: startTranscription}
                className={`px-4 py-2 rounded ${isRecording? 'bg-red-500': 'bg-blue-500'}`}
                >
                    {isRecording ? "Stop Recording": "Start Recording"}
            </button>
            <div className="mt-4 p-3  min-h-[100px] rounded">
                  {(allTranscript + (transcript ? " " + transcript : "")).trim() || "Speak to see transcription..."}

            </div>

        </div>
    )

}