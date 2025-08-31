let lastMetadata = null;

function displayMetadata(data) {
  lastMetadata = data;
  const metaEl = document.getElementById("metadata");
  if (!data || !data.title) {
    metaEl.textContent = "No article detected.";
    return;
  }

  metaEl.innerText = `
Title: ${data.title}
Author: ${data.author}
Topic: ${data.topic}
Summary: ${data.summary}
URL: ${data.url}
  `.trim();
}

function showStatus(msg, isError = false) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "red" : "green";
}

async function saveLocally(article) {
  const result = await chrome.storage.local.get("savedArticles");
  const saved = result.savedArticles || [];
  saved.push({ ...article, savedAt: new Date().toISOString(), synced: false });
  await chrome.storage.local.set({ savedArticles: saved });
  showStatus("💾 Saved locally (offline)");
  renderSavedArticles();
}

async function saveToBackend(article) {
  console.log(article)
    const res = await fetch("http://readbuddy-nine.vercel.app/api/save-article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: article.url,
        title: article.title,
        author: article.author,
        summary: article.summary,
        topic: article.topic,
        site: article.site,
        savedAt: new Date().toISOString(),
        synced: false
      }),
    });

    if (!res.ok) {
      console.log(res)
      throw new Error("Failed to save article to ReadBuddy");
    }

    showStatus("✅ Article saved to ReadBuddy");

    // Optionally mark as synced in local if already saved
    await markAsSynced(article.url);
  
}

async function markAsSynced(url) {
  const result = await chrome.storage.local.get("savedArticles");
  let saved = result.savedArticles || [];
  saved = saved.map((a) =>
    a.url === url ? { ...a, synced: true } : a
  );
  await chrome.storage.local.set({ savedArticles: saved });
}

async function renderSavedArticles() {
  const el = document.getElementById("saved-articles");
  const result = await chrome.storage.local.get("savedArticles");
  const saved = result.savedArticles || [];

  if (!saved.length) {
    el.innerText = "No saved articles.";
    return;
  }

  el.innerHTML = saved
    .map((a) => `• ${a.title} (${a.synced ? "✅" : "🕒"})`)
    .join("\n");
}

// Initial fetch of metadata
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { type: "EXTRACT_NOW" }, (response) => {
    if (chrome.runtime.lastError) {
      displayMetadata(null);
    } else {
      displayMetadata(response);
    }
  });
});

// Save Button
document.getElementById("saveBtn").addEventListener("click", async () => {
  if (!lastMetadata) return showStatus("No metadata to save.", true);
  await saveToBackend(lastMetadata);
});

// Retry Sync Button
document.getElementById("retryBtn").addEventListener("click", async () => {
  const result = await chrome.storage.local.get("savedArticles");
  const unsynced = result.savedArticles?.filter(a => !a.synced) || [];

  for (const article of unsynced) {
    try {
      await saveToBackend(article);
    } catch (e) {
      console.log("Still failed:", article.url);
    }
  }

  renderSavedArticles();
});

// Load saved on popup open
renderSavedArticles();

