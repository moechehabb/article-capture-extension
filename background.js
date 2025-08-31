// Add this to the existing message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "METADATA_EXTRACTED") {
    const data = message.data;
    console.log("Metadata was extracted!");
    sendToBackend(data);
  } else if (message.type === "SAVE_ARTICLE") {
    // Forward the save request to the backend
    console.log("Saving article to backend...");
    sendToBackend(message.data)
      .then(() => {
        console.log("Article saved successfully");
        // Optionally, you could show a notification here
      })
      .catch(error => {
        console.error("Failed to save article:", error);
      });
  }
});

async function sendToBackend(metadata) {
  try {
    await fetch("http://readbuddy-nine.vercel.app/api/save-article", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: metadata.url,
        title: metadata.title,
        author: metadata.author,
        summary: metadata.summary,
        topic: metadata.topic,
        site: metadata.site,
        savedAt: new Date().toISOString(),
        synced: false
      })
    });
  } catch (e) {
    console.error("Error saving article:", e);
  }
}

