function getElementTextContent(element) {
    let ownTextContent = '';
    element.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
            ownTextContent += child.textContent;
        }
    });

    return ownTextContent;
}

function blackoutElement(element, isChild) {
    element.style.backgroundColor = 'black';
    element.style.color = 'black';
    element.style.pointerEvents = 'none';
    element.style.textDecoration = 'none';

    if (isChild) {
        element.style.display = 'none';
    }

    element.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
            blackoutElement(child, true);
        }
    });
}

function processTextElements(blockedWords) {
    const allElements = document.body.querySelectorAll('*:not(script):not(style)');
    allElements.forEach(element => {
        const textContent = getElementTextContent(element).toLowerCase();
        if (blockedWords.some(word => textContent.includes(word))) {
            blackoutElement(element, false);
        }
    });
}

chrome.storage.sync.get('blockedWords', (data) => {
    const blockedWords = data.blockedWords || [];
    processTextElements(blockedWords);
});
