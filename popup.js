document.getElementById('wordsSaveButton').addEventListener('click', () => {
    const input = document.getElementById('wordsInput').value;
    const words = input.split(',').map(word => word.trim().toLowerCase()).filter(word => word.length > 0);

    chrome.storage.sync.set({ blockedWords: words }, () => {
        alert('Blocked words saved.');
    });
});
