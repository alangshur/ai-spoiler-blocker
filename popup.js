document.addEventListener('DOMContentLoaded', () => {
    const phraseInput = document.getElementById('phraseInput');
    const phraseSaveButton = document.getElementById('phraseSaveButton');
    const currentPhraseSpan = document.getElementById('currentPhrase');

    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKeySaveButton = document.getElementById('apiKeySaveButton');
    const currentApiKeySpan = document.getElementById('currentApiKey');

    const toggleExtensionButton = document.getElementById('toggleExtensionButton');

    chrome.storage.local.get(['blockedPhrase', 'openaiApiKey', 'extensionEnabled'], (result) => {
        const currentPhrase = result.blockedPhrase || 'None';
        currentPhraseSpan.textContent = currentPhrase;
        const currentApiKey = result.openaiApiKey || 'None';
        currentApiKeySpan.textContent = currentApiKey.slice(0, 15) + '...';
        const extensionEnabled = result.extensionEnabled !== false;
        toggleExtensionButton.textContent = extensionEnabled ? 'Disable Extension' : 'Enable Extension';
    });

    phraseSaveButton.addEventListener('click', () => {
        const newPhrase = phraseInput.value.trim();
        if (newPhrase) {
            chrome.storage.local.set({ blockedPhrase: newPhrase }, () => {
                currentPhraseSpan.textContent = newPhrase;
                phraseInput.value = '';
            });
        }
    });

    apiKeySaveButton.addEventListener('click', () => {
        const newApiKey = apiKeyInput.value.trim();
        if (newApiKey) {
            chrome.storage.local.set({ openaiApiKey: newApiKey }, () => {
                currentApiKeySpan.textContent = newApiKey.slice(0, 15) + '...';
                apiKeyInput.value = '';
            });
        }
    });

    toggleExtensionButton.addEventListener('click', () => {
        chrome.storage.local.get('extensionEnabled', (result) => {
            const extensionEnabled = result.extensionEnabled !== false;
            chrome.storage.local.set({ extensionEnabled: !extensionEnabled }, () => {
                toggleExtensionButton.textContent = !extensionEnabled ? 'Disable Extension' : 'Enable Extension';
            });
        });
    });
});
