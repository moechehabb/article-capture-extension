 // Add this CSS for the header bar
const headerStyles = `
.article-save-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 15px 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10000;
  font-family: Arial, sans-serif;
}
.header-text {
  font-weight: bold;
  margin-right: 15px;
}
.header-buttons {
  display: flex;
  gap: 10px;
}
.save-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}
.yes-btn {
  background-color: #4CAF50;
  color: white;
}
.no-btn {
  background-color: #f44336;
  color: white;
}
`;

function removeSaveHeader() {
  const header = document.querySelector('.article-save-header');
  if (header) {
    header.remove();
  }
}

// Create and inject the header bar
function createSaveHeader() {
// Create style element
const style = document.createElement('style');
style.textContent = headerStyles;
document.head.appendChild(style);


// Create header element
const header = document.createElement('div');
header.className = 'article-save-header';
header.innerHTML = `
  <div class="header-text">Would you like to save this article?</div>
  <div class="header-buttons">
    <button class="save-btn yes-btn" id="saveArticleYes">
      <span>✓</span> Yes
    </button>
    <button class="save-btn no-btn" id="saveArticleNo">
      <span>✕</span> No
    </button>
  </div>
`;

// Add to the top of the body
document.body.prepend(header);

// Add event listeners
header.querySelector('#saveArticleYes').addEventListener('click', () => {
  const metadata = extractMetadata();
  chrome.runtime.sendMessage({
    type: "SAVE_ARTICLE",
    data: metadata
  });
  removeSaveHeader();
});

header.querySelector('#saveArticleNo').addEventListener('click', () => {
  removeSaveHeader();
});
}





function getSite() {
  const url = window.location.hostname;
  if (url.includes("nytimes.com")) {
    createSaveHeader()
    return "nytimes"
  }
  if (url.includes("wsj.com")) {
    createSaveHeader()
    return "wsj"
  }
  if (url.includes("theatlantic.com")) {
    createSaveHeader()
    return "atlantic"
  }
  return "generic";
}
 
function extractMetadata() {
  const site = getSite();
  let title = document.title;
  let author = "Unknown";
  let summary = "";
  let topic = "General";

  switch (site) {
    case "nytimes":
      title = document.querySelector("h1")?.innerText || title;
      author = document.querySelector('[itemprop="author"] span')?.innerText ||
               document.querySelector('[name="byl"]')?.content?.replace("By ", "") || "NYT Staff";
      summary = Array.from(document.querySelectorAll("section[name='articleBody'] p"))
        .map(p => p.innerText).slice(0, 3).join(" ");
      break;

    case "wsj":
      title = document.querySelector("h1")?.innerText || title;
      author = document.querySelector(".byline__name")?.innerText || "WSJ Staff";
      summary = Array.from(document.querySelectorAll("div.article-content p"))
        .map(p => p.innerText).slice(0, 3).join(" ");
      break;

    case "atlantic":
      title = document.querySelector("h1")?.innerText || title;
      author = document.querySelector('[rel="author"]')?.innerText || "The Atlantic Staff";
      summary = Array.from(document.querySelectorAll("article p"))
        .map(p => p.innerText).slice(0, 3).join(" ");
      break;

    default:
      title = document.querySelector("h1")?.innerText || document.title;
      author =
        document.querySelector('meta[name="author"]')?.content ||
        document.querySelector('[rel="author"]')?.innerText || "Unknown";
      summary = Array.from(document.querySelectorAll("article p"))
        .map(p => p.innerText).slice(0, 3).join(" ");
      break;
  }

  topic = inferTopic(title + " " + summary);

  return {
    site,
    title,
    author,
    summary,
    topic,
    url: window.location.href
  };
}

function inferTopic(text) {
  const lower = text.toLowerCase();
  if (lower.includes("ai") || lower.includes("machine learning")) return "AI/ML";
  if (lower.includes("economy") || lower.includes("finance")) return "Finance";
  if (lower.includes("politics") || lower.includes("election")) return "Politics";
  if (lower.includes("climate") || lower.includes("environment")) return "Climate";
  if (lower.includes("tech") || lower.includes("startup")) return "Technology";
  return "General";
}

// Listen for popup-triggered manual extraction
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "EXTRACT_NOW") {
    const metadata = extractMetadata();
    sendResponse(metadata);
  }
});

// Auto-extract on page load
const autoMetadata = extractMetadata();
chrome.runtime.sendMessage({ type: "METADATA_EXTRACTED", data: autoMetadata });

