import React, { useState } from 'react';
import { fal } from "@fal-ai/client";
import './App.css'; // Assuming you want to use a css for loading

fal.config({
  credentials: process.env.REACT_APP_FAL_KEY
});

function App() {
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);
    const [requestId, setRequestId] = useState(null);

    const handleGenerateClick = async () => {
        setLoading(true);
        setError(null);
        setResultData(null);
        setLogs([]);
        setRequestId(null);

        const prompt = "A detailed and delicious photo of spaghetti and meatballs, presented on a rustic plate. The dish should have a rich red sauce, sprinkled with fresh basil and a touch of Parmesan cheese.";

        try {
           const { request_id } = await fal.queue.submit("fal-ai/flux/dev", {
                input: { prompt: prompt },
           });
           setRequestId(request_id);

            console.log("Request submitted with ID:", request_id);

              // Poll for status
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
                      setLoading(false);
                      return;

                    } else if (status.status === "FAILED") {
                        setError("Fal.ai request failed.");
                        setLoading(false);
                        return;

                    } else {
                        setLogs(status.logs.map(log => log.message));
                        setTimeout(checkStatus, 3000); // Check again in 3 seconds
                    }
                } catch (err) {
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
    };


    // Here, we are defining our variable that we are going to use
    const altText = "Generated Image by Fal.ai";

    return (
        <div className="app">
            <h1>Fal.ai Flux</h1>
            <button onClick={handleGenerateClick} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Spaghetti & Meatballs'}
            </button>
              {logs && logs.length > 0 && (
                <div className="logs">
                  <h3>Logs:</h3>
                     {logs.map((log, index) => (
                        <p key={index}>{log}</p>
                     ))}
                </div>
             )}
            {error && <p className="error">Error: {error}</p>}
             {resultData && resultData.images && resultData.images.length > 0 && (
                <div className="result" style={{maxWidth: '300px'}}>
                  <h3>Result:</h3>
                     {/* Note the use of the variable here  */}
                     <img
                           src={resultData.images[0].url}
                            alt={altText} style={{height: 'auto', width: '100%'}}/>
                 </div>
             )}

             {loading && <div className="loading-spinner"></div>}
        </div>
    );
}

export default App;