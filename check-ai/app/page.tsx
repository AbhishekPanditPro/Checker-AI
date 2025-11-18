"use client";
import { useState } from "react";
import { motion } from "framer-motion";

type ClaimList = string[];
type FactList = string[];

export default function Home() {
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean | null>(false);
  const [claims, setClaims] = useState<string[]>([]);
  const [facts, setFactualInformation] = useState<string[]>([]);
  const defaultClassName =
    "flex w-fit mb-4 h-auto border-1 font-bold px-5 rounded-lg text-white items-center justify-center align-center transition-transform duration-300 transform hover:scale-105 text-xl bg-opacity-10 p-5 ";
  const negativeClassName = "bg-red-950 border-red-300";
  const positiveClassName = "bg-green-950 border-green-300 ";

  async function handleSearch() {
    setIsLoading(true);
    setError(null);
    setClaims([]);
    setFactualInformation([]);
    if (!query) {
      console.log("There is nothing");
    }
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          // optional: custom system prompt
          systemPrompt:
            "Extract factual claims and return ONLY a JSON array of strings.",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      console.log(data.text);

      try {
        // data.text is the raw string from the AI
        // e.g., "```json\n[\"Claim 1\"]\n```"
        let jsonString = data.text;

        // 1. Remove the Markdown code block fences
        if (jsonString.startsWith("```json")) {
          jsonString = jsonString.substring(7); // Removes "```json\n"
          if (jsonString.endsWith("```")) {
            jsonString = jsonString.substring(0, jsonString.length - 3); // Removes "```"
          }
        }

        // 2. Trim any extra whitespace
        jsonString = jsonString.trim();

        // 3. Now, parse the clean string
        const parsedList: ClaimList = JSON.parse(jsonString);

        console.log("Here is your parsed list:", parsedList);
        if (parsedList[0].includes("😔")) {
          console.log("therer isr saaaaaaaadddd emoji present");
        }
        setClaims([]);
        setClaims(parsedList);
        console.log("The new claim is", claims)
        
      } catch (parseError) {
        setError(false);
        console.error(
          "Failed to parse AI response as JSON:",
          data.text,
          parseError
        );
        // setError("The AI response was not in the expected list format.");
      }
    } catch(err){
      console.log("This is not wrokng")

    }
    finally {
      setIsLoading(false);
    
    }
    setFactualInformation([])
    handlefactualSearch();
  }

  async function handlefactualSearch() {
    console.log("handling the factual information");
    console.log(claims);
    setIsLoading(true);
    setError(null);
    if (claims.length === 0) {
      console.log("There is nothing in the claim for factual search");
      setError(true);
    }
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: claims,
          // optional: custom system prompt
          systemPrompt:
            "Extract factual claims and return ONLY a JSON array of strings.",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      console.log(data.text);

      try {
        // data.text is the raw string from the AI
        // e.g., "```json\n[\"Fact 1\"]\n```"
        let jsonString = data.text;

        // 1. Remove the Markdown code block fences
        if (jsonString.startsWith("```json")) {
          jsonString = jsonString.substring(7); // Removes "```json\n"
          if (jsonString.endsWith("```")) {
            jsonString = jsonString.substring(0, jsonString.length - 3); // Removes "```"
          }
        }

        // 2. Trim any extra whitespace
        jsonString = jsonString.trim();

        // 3. Now, parse the clean string
        const parsedList: FactList = JSON.parse(jsonString);
        console.log("Here is your parsed list:", parsedList);
        setFactualInformation([]);
        setFactualInformation(parsedList);
      } catch (parseError) {
        setError(false);
        console.error(
          "Failed to parse AI response as JSON:",
          data.text,
          parseError
        );
        // setError("The AI response was not in the expected list format.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col h-screen w-screen justify-center items-center bg-gray-500 border-2 border-solid border-red-500">
        <main className="h-[90%] w-[90%] justify-center overflow-scroll items-center border-solid border-2 border-red-500 rounded-2xl p-6 md:p-8">
          <div className="w-full p-6 min-h-[50px] border-solid border-2 border-green-500 rounded-2xl justify-center items-center bg-gray-800">
            <h1 className="text-4xl font-bold text-white text-center">
              AI Fact Checker
            </h1>
            <p className="mb-6 mt-3 font-bold">
              Enter a paragraph (like a speech or article) and the AI will
              extract each verifiable claim and find supporting data from the
              web.
            </p>

            <textarea
              name=""
              id="query-input"
              rows={4}
              placeholder="Paste a paragraph here. For example: The world's population is about 8 billion people. The tallest building in the world is the Burj Khalifa, the capital of Australia is Sydney."
              className="w-full border-2px border-solid p-3 bg-gray-700 border font-bold border-gray-400 focus:outline-none focus:ring-2 rounded-md "
              value={query}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                console.log(e.target.value);
                setQuery(e.target.value);
              }}
              disabled={isLoading}
            ></textarea>
            <button
              id="search-button"
              className=" flex mt-5 mb-10 w-full h-[50px] bg-blue-600 hover:bg-blue-700 font-bold px-5 rounded-lg text-white items-center justify-center"
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="text-2xl">Processing...</span>
                  <span className="inline-block w-6 h-6 border-4 ml-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                </>
              ) : (
                <>
                  <span id="button-text" className="text-2xl">
                    {" "}
                    Extract & Verify Facts
                  </span>
                </>
              )}
            </button>
            <div className="block">
              <ol className="flex p-5 flex-col justify-start ">
                {claims.map((claim, i) => (
                  <motion.li
                    // Framer Motion Properties:
                    initial={{ opacity: 0, y: 20 }} // Starts invisible and 20px below its final position
                    animate={{ opacity: 1, y: 0 }} // Animates to full opacity and correct position
                    exit={{ opacity: 0, x: -20 }} // (Optional) Animates out if the claim is removed
                    transition={{ duration: 0.5 }} // Sets the speed of the animation
                    // Existing CSS Classes (Tailwind):
                    className={`${defaultClassName} ${
                      claim.includes("😞") ||
                      claim.includes("☹") ||
                      claim.includes("😔")
                        ? negativeClassName
                        : positiveClassName
                    }`}
                    key={i}
                  >
                    {"Claim: " + claim}
                  </motion.li>
                ))}
              </ol>

              <ol className="flex flex-col items-end-safe bg-gray-700 rounded-xl mt-10 p-5 transition-all duration-300 ease-in-out hover:bg-gray-600  ">
                {facts.map((fact, i) => (
                  <motion.li
                    initial={{ opacity: 0, y: 20 }} // Starts invisible and 20px below its final position
                    animate={{ opacity: 1, y: 0 }} // Animates to full opacity and correct position
                    exit={{ opacity: 0, x: -20 }} // (Optional) Animates out if the claim is removed
                    transition={{ duration: 0.5 }} // Sets the speed of the animation
                    // Existing CSS Classes (Tailwind):
                    className={`${defaultClassName} ${
                      fact.includes("😞") || fact.includes("😔") || fact.includes("SAD_EMOJI")
                        ? negativeClassName
                        : positiveClassName
                    }`}
                    key={i}
                  >
                    {"Fact: " + fact}
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>
        </main>
        <div></div>
      </div>
    </>
  );
}
