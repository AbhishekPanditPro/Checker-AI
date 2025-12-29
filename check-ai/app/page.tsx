"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { StreamingTranscriber } from "assemblyai";

type ClaimList = string[];
type FactList = string[];

type InputMode = "type" | "record";

function stripJsonFences(raw: string): string {
  let s = raw.trim();

  // Remove ```json ... ``` or ``` ... ```
  if (s.startsWith("```")) {
    // remove first fence line
    const firstNewline = s.indexOf("\n");
    if (firstNewline !== -1) s = s.slice(firstNewline + 1);
    // remove trailing fence
    if (s.endsWith("```")) s = s.slice(0, -3);
  }

  return s.trim();
}

export default function Home() {
  // ====== Fact-checking state ======
  const [mode, setMode] = useState<InputMode>("type");
  const [typedText, setTypedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean | null>(null);
  const [claims, setClaims] = useState<string[]>([]);
  const [facts, setFactualInformation] = useState<string[]>([]);

  const defaultClassName =
    "flex w-fit mb-4 h-auto border-1 font-bold px-5 rounded-lg text-white items-center justify-center align-center transition-transform duration-300 transform hover:scale-105 text-xl bg-opacity-10 p-5 ";
  const negativeClassName = "bg-red-950 border-red-300";
  const positiveClassName = "bg-green-950 border-green-300 ";

  // ====== Transcription state (separate) ======
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState("");
  const [partial, setPartial] = useState("");

  const rtRef = useRef<StreamingTranscriber | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const displayTranscript = (recordedText + (partial ? " " + partial : "")).trim();

  async function handleSearch() {
    stopTranscription();
    const queryToUse = (mode === "type" ? typedText : recordedText).trim();

    setError(null);
    setClaims([]);
    setFactualInformation([]);

    if (!queryToUse) {
      console.log("There is nothing to search");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: queryToUse,
          systemPrompt: "Extract factual claims and return ONLY a JSON array of strings.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      const jsonString = stripJsonFences(data.text);
      const parsedList: ClaimList = JSON.parse(jsonString);

      setClaims(parsedList);
      await handlefactualSearch(parsedList);
    } catch (err) {
      console.error("handleSearch error:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlefactualSearch(newClaims: string[]) {
    if (newClaims.length === 0) {
      console.log("There is nothing in the claim for factual search");
      setError(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: newClaims,
          systemPrompt: "Extract factual claims and return ONLY a JSON array of strings.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      const jsonString = stripJsonFences(data.text);
      const parsedList: FactList = JSON.parse(jsonString);

      setFactualInformation(parsedList);
    } catch (err) {
      console.error("handlefactualSearch error:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }

  // ====== Start/Stop transcription ======
  const startTranscription = async () => {
    try {

      if (typeof window === "undefined") return;

    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("getUserMedia is not available.");
      alert(
        "Microphone not available in this browser/context.\n\n" +
        "Make sure you're on HTTPS (or localhost) and open in Safari/Chrome (not an in-app browser)."
      );
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });



      // Only allow recording mode when recording
      setMode("record");
      setTypedText("");

      // const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const response = await fetch("/api/assembly", { method: "POST" });
      if (!response.ok) {
        console.error(`Token fetch failed: ${response.status}`);
        console.error("Response body:", await response.text());
        return;
      }

      const { token } = await response.json();

      // IMPORTANT: use actual browser sample rate to avoid mismatch
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const sampleRate = audioContext.sampleRate;
      console.log("AudioContext sampleRate:", sampleRate);

      const rt = new StreamingTranscriber({
        token,
        sampleRate,
      });

      rt.on("turn", (turn) => {
        const text = turn?.transcript ?? "";
        if (!text) return;

        if (turn.end_of_turn) {
          setRecordedText((prev) => (prev ? prev + " " : "") + text);
          setPartial("");
        } else {
          setPartial(text);
        }
      });

      rt.on("error", (err) => console.error("Streaming error:", err));

      await rt.connect();
      rtRef.current = rt;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        if (!rtRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Float32 -> PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s * 0x7fff;
        }

        // Send as bytes (most robust across SDK versions)
        rtRef.current.sendAudio(pcm16.buffer);
      };

      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
    }
  };

  const stopTranscription = async () => {
    setIsRecording(false);

    await rtRef.current?.close();
    rtRef.current = null;

    await audioContextRef.current?.close();
    audioContextRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // ====== Actions for transcript/typing split ======
  const useTranscript = () => {
    // copy transcript into typed input, switch to typing
    setTypedText(recordedText.trim());
    setMode("type");
  };

  const clearTranscript = () => {
    setRecordedText("");
    setPartial("");
  };

  const textareaValue = mode === "type" ? typedText : displayTranscript;

  return (
    <div className="flex flex-col h-screen w-screen justify-center items-center bg-gray-500 border-2 border-solid border-red-500">
      <main className="h-[90%] w-[90%] justify-center overflow-scroll items-center border-solid border-2 border-red-500 rounded-2xl p-6 md:p-8">
        <div className="w-full p-6 min-h-[50px] border-solid border-2 border-green-500 rounded-2xl justify-center items-center bg-gray-800">
          <h1 className="text-4xl font-bold text-white text-center">AI Fact Checker</h1>

          <p className="mb-6 mt-3 font-bold">
            Enter a paragraph (like a speech or article) and the AI will extract each verifiable claim and find
            supporting data from the web.
          </p>

          {/* Mode buttons + recording controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              className={`px-4 py-2 rounded ${mode === "type" ? "bg-purple-600" : "bg-gray-600"}`}
              onClick={() => setMode("type")}
              disabled={isRecording}
            >
              Type
            </button>

            <button
              className={`px-4 py-2 rounded ${mode === "record" ? "bg-purple-600" : "bg-gray-600"}`}
              onClick={() => setMode("record")}
            >
              Transcribe
            </button>

            {mode === "record" && (
              <button
                onClick={isRecording ? stopTranscription : startTranscription}
                className={`px-4 py-2 rounded ${isRecording ? "bg-red-500" : "bg-blue-500"}`}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </button>
            )}

            {mode === "record" && (
              <>
                <button
                  className="px-4 py-2 rounded bg-green-600"
                  onClick={useTranscript}
                  disabled={isRecording || !recordedText.trim()}
                >
                  Use Transcript
                </button>

                <button
                  className="px-4 py-2 rounded bg-gray-700"
                  onClick={clearTranscript}
                  disabled={isRecording}
                >
                  Clear Transcript
                </button>
              </>
            )}
          </div>

          {/* Optional live transcript preview box */}
          

          {/* One textarea: either typing OR transcript (readOnly in record mode) */}
          <textarea
            id="query-input"
            rows={4}
            placeholder={
              mode === "type"
                ? "Type or paste here..."
                : "Transcribing... (Click “Use Transcript” when done)"
            }
            className="w-full mt-4 p-3 bg-gray-700 border font-bold border-gray-400 focus:outline-none focus:ring-2 rounded-md"
            value={textareaValue}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              if (mode === "type") setTypedText(e.target.value);
            }}
            readOnly={mode === "record"}
            disabled={isLoading}
          />

          <button
            id="search-button"
            className="flex mt-5 mb-10 w-full h-[50px] bg-blue-600 hover:bg-blue-700 font-bold px-5 rounded-lg text-white items-center justify-center"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="text-2xl">Processing...</span>
                <span className="inline-block w-6 h-6 border-4 ml-2 border-white/50 border-t-white rounded-full animate-spin"></span>
              </>
            ) : (
              <span id="button-text" className="text-2xl">
                Extract &amp; Verify Facts
              </span>
            )}
          </button>

          <div className="block">
            <ol className="flex p-5 flex-col justify-start">
              {claims.map((claim, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`${defaultClassName} ${
                    claim.includes("😞") || claim.includes("☹") || claim.includes("😔")
                      ? negativeClassName
                      : positiveClassName
                  }`}
                >
                  {"Claim: " + claim}
                </motion.li>
              ))}
            </ol>

            <ol className="flex flex-col items-end-safe bg-gray-700 rounded-xl mt-10 p-5 transition-all duration-300 ease-in-out hover:bg-gray-600">
              {facts.map((fact, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`${defaultClassName} ${
                    fact.includes("😞") || fact.includes("😔") || fact.includes("SAD_EMOJI")
                      ? negativeClassName
                      : positiveClassName
                  }`}
                >
                  {"Fact: " + fact}
                </motion.li>
              ))}
            </ol>

            {error ? (
              <div className="mt-6 p-3 rounded bg-red-900 text-white font-bold">
                There is nothing in the claim for factual search.
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
