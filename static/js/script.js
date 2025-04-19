document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const promptInput = document.getElementById('prompt');
    const submitBtn = document.getElementById('submit-btn');
    const modelSelect = document.getElementById('model');
    const loadingIndicator = document.getElementById('loading-indicator');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.querySelector('.close');
    const saveApiKeysBtn = document.getElementById('save-api-keys');
    const githubTokenInput = document.getElementById('github-token');
    const nvidiaKeyInput = document.getElementById('nvidia-key');
    const clearChatBtn = document.getElementById('new-chat-btn'); // ID stays the same for compatibility

    let currentConversationId = null;

    // Configure markdown rendering with syntax highlighting
    marked.setOptions({
        highlight: function(code, lang) {
            return hljs.highlightAuto(code).value;
        },
        breaks: true
    });

    // Initialize app - make sure loading indicator is hidden
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }

    // Auto-resize textarea
    promptInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 150) {
            this.style.height = '150px';
            this.style.overflowY = 'auto';
        } else {
            this.style.overflowY = 'hidden';
        }
    });

    // Event listeners
    submitBtn.addEventListener('click', handleSubmit);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    });

    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
        loadApiKeys();
    });

    closeModalBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    saveApiKeysBtn.addEventListener('click', saveApiKeys);
    
    clearChatBtn.addEventListener('click', clearChat);

    // Functions
    async function handleSubmit() {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        // Create new conversation if none exists
        if (!currentConversationId) {
            currentConversationId = 'conv_' + Date.now();
        }

        // Clear input and reset height
        promptInput.value = '';
        promptInput.style.height = 'auto';

        // Disable submit button and show loading
        submitBtn.disabled = true;
        loadingIndicator.classList.remove('hidden');

        // Add user message to chat
        addMessageToChat('user', prompt);

        // Scroll to bottom
        scrollToBottom();

        try {
            const selectedModel = modelSelect.value;
            const response = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    model: selectedModel,
                    conversation_id: currentConversationId
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (selectedModel === 'all') {
                    // Handle all models response
                    const results = data.results;
                    for (const [modelId, result] of Object.entries(results)) {
                        if (result.status === 'success') {
                            addMessageToChat('assistant', result.response, result.name);
                        } else {
                            addMessageToChat('assistant', `Error: ${result.response}`, result.name);
                        }
                    }
                } else {
                    // Handle single model response
                    addMessageToChat('assistant', data.response, data.model);
                }
            } else {
                throw new Error(data.error || 'Failed to generate response');
            }
        } catch (error) {
            addMessageToChat('assistant', `Error: ${error.message}`, 'System');
        } finally {
            // Re-enable submit button and hide loading
            submitBtn.disabled = false;
            loadingIndicator.classList.add('hidden');
            
            // Scroll to bottom after response
            scrollToBottom();
        }
    }

    function addMessageToChat(role, content, modelName = null) {
        const messageContainer = document.createElement('div');
        messageContainer.className = `message-container ${role}`;

        const message = document.createElement('div');
        message.className = 'message';

        if (role === 'assistant' && modelName) {
            const modelLabel = document.createElement('div');
            modelLabel.className = 'model-label';
            modelLabel.textContent = modelName;
            message.appendChild(modelLabel);
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Parse markdown for assistant messages
        if (role === 'assistant') {
            messageContent.innerHTML = marked.parse(content);
            
            // Apply syntax highlighting to code blocks
            messageContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            // For user messages, preserve line breaks but don't use markdown
            messageContent.textContent = content;
        }

        message.appendChild(messageContent);
        messageContainer.appendChild(message);
        chatMessages.appendChild(messageContainer);
    }

    async function loadApiKeys() {
        try {
            const response = await fetch('/get_api_keys');
            const data = await response.json();
            
            githubTokenInput.value = data.github_token || '';
            nvidiaKeyInput.value = data.nvidia_key || '';
        } catch (error) {
            console.error('Failed to load API keys:', error);
        }
    }

    async function saveApiKeys() {
        try {
            const response = await fetch('/save_api_keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    github_token: githubTokenInput.value,
                    nvidia_key: nvidiaKeyInput.value
                })
            });
            
            if (response.ok) {
                settingsModal.style.display = 'none';
                // Show brief success message
                const successMsg = document.createElement('div');
                successMsg.className = 'loading-indicator';
                successMsg.style.backgroundColor = 'var(--success-color)';
                successMsg.innerHTML = '<i class="fas fa-check"></i> API keys saved successfully';
                document.body.appendChild(successMsg);
                setTimeout(() => {
                    document.body.removeChild(successMsg);
                }, 8000);
            } else {
                alert('Failed to save API keys.');
            }
        } catch (error) {
            console.error('Error saving API keys:', error);
            alert('Error saving API keys: ' + error.message);
        }
    }

    function clearChat() {
        currentConversationId = 'conv_' + Date.now();
        
        // Clear chat area
        chatMessages.innerHTML = '';
        
        // Show welcome message again
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        welcomeMessage.innerHTML = `
            <h2>Welcome to EveryAI!</h2>
            <p>Compare responses from different AI models in a chat interface.</p>
            <p>Choose a model from the sidebar and start chatting!</p>
        `;
        chatMessages.appendChild(welcomeMessage);
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});