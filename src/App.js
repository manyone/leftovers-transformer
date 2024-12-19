import React, { useState, useEffect } from 'react';
import { fal } from "@fal-ai/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import './App.css'; // Assuming you want to use a css for loading

function App() {
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);
    const [requestId, setRequestId] = useState(null);

    const [leftovers, setLeftovers] = useState("");
    const [cuisine, setCuisine] = useState("French");
    const [recipe, setRecipe] = useState("");
    const [falPrompt, setFalPrompt] = useState("");
    const [generatedImage, setGeneratedImage] = useState(null);
    const [apiKeySetupComplete, setApiKeySetupComplete] = useState(false);
    const [falKey, setFalKey] = useState("");
    const [geminiKey, setGeminiKey] = useState("");

    useEffect(() => {
        const storedFalKey = localStorage.getItem('falKey');
        const storedGeminiKey = localStorage.getItem('geminiKey');

        if (storedFalKey && storedGeminiKey) {
            setFalKey(storedFalKey);
            setGeminiKey(storedGeminiKey);
            setApiKeySetupComplete(true);
              fal.config({
                credentials: storedFalKey
              });
        } else {
            //Show API key prompts
            setApiKeySetupComplete(false);
        }
    }, []);


     const handleApiKeySubmit = () => {
        localStorage.setItem('falKey', falKey);
        localStorage.setItem('geminiKey', geminiKey);
            fal.config({
                credentials: falKey
         });
        setApiKeySetupComplete(true);
    };


   const handleGenerateClick = async () => {
        setLoading(true);
        setError(null);
        setResultData(null);
        setLogs([]);
        setRequestId(null);
       setGeneratedImage(null);

        //Generate Recipe
        try {
             if (!apiKeySetupComplete) {
                setError("API keys not set up correctly.");
                setLoading(false);
                return;
             }

             const genAI = new GoogleGenerativeAI(geminiKey);
             const model = genAI.getGenerativeModel({ model: "gemini-pro" });


            const prompt = `Given the following leftovers: ${leftovers}. Create a recipe for a ${cuisine} dish.`
            console.log("Gemini Prompt:", prompt);
            const result = await model.generateContent(prompt);
            const response = result.response;
            const recipeText = response.text();



              if (recipeText.toLowerCase().includes("cannot generate") ||
                  recipeText.toLowerCase().includes("not possible") ||
                 recipeText.toLowerCase().includes("not suitable")
                  )
                {
                   setRecipe(recipeText);
                    setLoading(false);
                    return;
                } else {
                    setRecipe(recipeText);
               }



             //generate Prompt
              const falPrompt = `A professional and delicious photograph of ${recipeText}, presented on a rustic plate.`
            console.log("Fal Prompt:", falPrompt);
              setFalPrompt(falPrompt)


            // Generate Fal Image
            try {
                const { request_id } = await fal.queue.submit("fal-ai/flux/dev", {
                    input: { prompt: falPrompt },
                });
                setRequestId(request_id);
                console.log("Request submitted with ID:", request_id);


                 const checkStatus = async () => {
                       try {
                           const status = await fal.queue.status("fal-ai/flux/dev", {
                               requestId: request_id,
                               logs: true,
                           });
                           if (status.status === "COMPLETED") {
                               const result = await fal.queue.result("fal-ai/flux/dev", {
                                   requestId: request_id
                               });

                               setResultData(result.data);
                              if (result.data && result.data.images && result.data.images.length > 0) {
                                   setGeneratedImage(result.data.images[0].url)
                               }

                               setLoading(false);
                               return;
                           }
                           else if (status.status === "FAILED") {
                                setError("Fal.ai request failed.");
                                setLoading(false);
                               return;
                           }
                           else {
                                setLogs(status.logs.map(log => log.message));
                               setTimeout(checkStatus, 3000);
                           }
                       }
                       catch (err) {
                            console.error("Error fetching request status:", err);
                            setError("Error fetching request status");
                             setLoading(false);
                       }
                   };
                   checkStatus()



            } catch (err) {
                console.error("Error submitting to fal.ai:", err);
               setError("Error submitting to fal.ai");
                 setLoading(false);
            }

        } catch (err) {
            console.error("Error Generating Recipe:", err);
          setError("Error Generating Recipe");
             setLoading(false);
         }
    };


    const cuisineOptions = [
        "French", // "French" is now first
        "Chinese",
        "Italian",
        "Mexican",
        "Japanese",
        "Indian",
        "Thai",
        "Mediterranean",
        "Korean",
        "American",
        "Vietnamese",
    ];

    // Extract dish name from recipe text using a basic regex
      const extractDishNameFromMarkdown = (recipeText) => {
          if (!recipeText) return "Generated Image";
           const match = recipeText.match(/\*\*(.*?)\*\*/);
          return match ? match[1] : "Generated Image";
     };

    const dishName = extractDishNameFromMarkdown(recipe);
     const imageAltText = recipe ? `Image of ${recipe}` : 'Generated Image by Fal.ai';


    if (!apiKeySetupComplete) {
         return (
             <div className="app" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h1>API Key Setup</h1>
                  <p>Please enter your Fal.ai and Gemini API keys:</p>
                  <input
                        type="text"
                        placeholder="Fal.ai API Key"
                        value={falKey}
                        onChange={(e) => setFalKey(e.target.value)}
                         style={{ marginBottom: '10px', maxWidth:'400px', width:'80%' }}
                  />
                  <input
                       type="text"
                      placeholder="Gemini API Key"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                     style={{ marginBottom: '10px', maxWidth:'400px', width:'80%'  }}
                />


               <button onClick={handleApiKeySubmit}>Submit API Keys</button>
            </div>
        );
   }

    return (
        <div className="app" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ textAlign: 'center' }}>Leftovers Transformer</h1>

            <textarea
                placeholder="Paste your leftover ingredients here..."
                rows="5"
                value={leftovers}
                onChange={(e) => setLeftovers(e.target.value)}
                style={{ width: '80%', marginBottom: '10px', maxWidth: '600px' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', width: '80%', maxWidth: '600px' }}>
                <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}
                     style={{ marginBottom: '10px' }}>
                    {cuisineOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
                <button onClick={handleGenerateClick} disabled={loading} style={{ marginBottom: '10px' }}>
                    {loading ? "Generating..." : "Generate Recipe & Image"}
                 </button>
            </div>

            {logs && logs.length > 0 && (
                <div className="logs">
                    <h3>Logs:</h3>
                     {logs.map((log, index) => (
                        <p key={index}>{log}</p>
                     ))}
                </div>
            )}
            {error && <p className="error">Error: {error}</p>}

            {recipe && (
                <div className="recipe" style={{ width: '80%', maxWidth: '600px' }}>
                   <h3>Generated Recipe:</h3>
                   <textarea value={recipe} readOnly rows="10" style={{ width: '100%' }} />
                </div>
            )}

            {generatedImage && (
                <div className="result" style={{ maxWidth: '480px', maxHeight: '360px' }}>
                      <h3>{dishName}</h3>
                       <img
                           src={generatedImage}
                           alt={imageAltText} style={{ height: 'auto', maxWidth: '100%', maxHeight: '360px' }}/>
                </div>
            )}
            {loading && <div className="loading-spinner"></div>}
        </div>
    );
}

export default App;