"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";

function HomeContent() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      alert("Please enter a prompt");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // This will trigger the 402 payment flow via middleware
      router.push(`/api/generate-image?prompt=${encodeURIComponent(prompt)}`);
    } catch (error) {
      console.error("Error submitting prompt:", error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-[800px] mx-auto text-center">
        <h1 className="text-3xl font-bold mb-6">402 Pay Image Generation</h1>
        <p className="text-lg mb-8">
          Generate AI images using the HTTP 402 payment protocol.
        </p>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                Image Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={4}
                disabled={isGenerating}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isGenerating ? (
                <>
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Generating...
                </>
              ) : (
                "Generate Image"
              )}
            </button>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              This will trigger a payment request via the HTTP 402 protocol.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-[800px] mx-auto text-center">
          <h1 className="text-3xl font-bold mb-6">402 Pay Image Generation</h1>
          <p className="text-lg mb-8">
            Generate AI images using the HTTP 402 payment protocol.
          </p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
