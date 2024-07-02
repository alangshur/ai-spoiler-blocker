const MIN_CHARACTERS_PER_BLOCK = 30;
const MIN_COSINE_SIMILARITY = 0.20;
const DEBUG_MODE = true;

const ALLOWED_TAGS = [
    'P', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5',
    'H6', 'A', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'B',
    'STRONG', 'I', 'EM'
];

const processedNodes = new Set();

function getStorage(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, function (result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}

function setStorage(items) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(items, function () {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

async function getEmbedding(input, apiKey) {
    return fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            input: input,
            model: "text-embedding-3-small",
            encoding_format: "float"
        })
    })
        .then(response => response.json())
        .then(responseData => {
            if (!responseData || responseData.error) {
                throw new Error(responseData.error.message);
            }

            return responseData.data[0].embedding;
        });
}

async function calculateCosineSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
        throw new Error("Embeddings must have the same length");
    }

    const dotProduct = embedding1.reduce((sum, value, index) => sum + value * embedding2[index], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, value) => sum + value * value, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, value) => sum + value * value, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
        throw new Error("Embedding magnitude cannot be zero");
    }

    const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);
    return cosineSimilarity;
}

function getNodeTextContent(node) {
    let textContents = [];
    node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
            textContents.push(child.textContent.trim());
        }
    });

    return textContents.join(' ');
}

function blackoutNode(node, isChild) {
    node.style.backgroundColor = 'black';
    node.style.color = 'black';
    node.style.pointerEvents = 'none';
    node.style.textDecoration = 'none';

    if (isChild) {
        node.style.display = 'none';
    }

    node.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
            blackoutNode(child, true);
        }
    });
}

function isLeafNode(node) {
    return ![...node.childNodes].some(child => child.nodeType === Node.ELEMENT_NODE);
}

async function processTextNode(node, blockedPhraseEmbedding, openaiApiKey) {

    // skip node if already processed
    if (processedNodes.has(node)) {
        return;
    }

    // skip node if not a leaf node
    if (!isLeafNode(node)) {
        return;
    }

    // skip node if not allowed tag
    if (!ALLOWED_TAGS.includes(node.tagName)) {
        return;
    }

    // skip node if its text content is too short
    const textContent = getNodeTextContent(node).trim();
    if (textContent.length < MIN_CHARACTERS_PER_BLOCK) {
        return;
    }

    // calculate cosine similarity
    const embedding = await getEmbedding(textContent, openaiApiKey);
    const cosineSimilarity = await calculateCosineSimilarity(embedding, blockedPhraseEmbedding);

    // block node if cosine similarity is high
    if (cosineSimilarity >= MIN_COSINE_SIMILARITY) {
        blackoutNode(node, false);
    }

    // log debug info
    if (DEBUG_MODE) {
        console.log(`> Text content: ${textContent}\n> Cosine similarity: ${cosineSimilarity}\n> Blocked: ${cosineSimilarity >= MIN_COSINE_SIMILARITY}\n`);
    }

    // mark node as processed
    processedNodes.add(node);
}

async function main() {

    // get blocked phrase and api key from storage
    const { blockedPhrase, openaiApiKey } = await getStorage(['blockedPhrase', 'openaiApiKey']);
    if (!blockedPhrase || !openaiApiKey) {
        console.error('Blocked phrase or OpenAI API key not set');
        return;
    }

    // embed blocked phrase or retrieve from storage
    let { blockedPhraseEmbedding, embeddedBlockedPhrase } = await getStorage(['blockedPhraseEmbedding, embeddedBlockedPhrase']);
    if (!blockedPhraseEmbedding || blockedPhrase !== embeddedBlockedPhrase) {
        blockedPhraseEmbedding = await getEmbedding(blockedPhrase.trim(), openaiApiKey);
        await setStorage({ blockedPhraseEmbedding, embeddedBlockedPhrase: blockedPhrase });
    }

    // first run on existing nodes
    const allNodes = document.body.querySelectorAll('*');
    allNodes.forEach(node => processTextNode(node, blockedPhraseEmbedding, openaiApiKey));

    // observe for new nodes
    new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                node.querySelectorAll('*').forEach(childNode => {
                    processTextNode(childNode, blockedPhraseEmbedding, openaiApiKey);
                });
            });
        });
    }).observe(document.body, {
        childList: true,
        subtree: true
    });
}

main();