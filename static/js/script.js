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
    const clearChatBtn = document.getElementById('new-chat-btn');

    let currentConversationId = null;
    let eventSource = null;
    let activeModelResponses = {};

    // Configure markdown rendering with syntax highlighting
    marked.setOptions({
        highlight: function(code, lang) {
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });

    // Initialize app 
    loadingIndicator.classList.add('hidden');
    currentConversationId = 'conv_' + Date.now();

    // Replace the existing autoResizeTextarea function with this improved version
    function autoResizeTextarea(textarea) {
        // Store the current scroll position
        const scrollPos = window.scrollY;
        
        // Reset height to auto and hide overflow to calculate actual content height
        textarea.style.height = 'auto';
        textarea.style.overflow = 'hidden';
        
        // Calculate new height with a small buffer to prevent flickering
        const newHeight = Math.min(textarea.scrollHeight, 200);
        
        // Apply height with smooth transition
        requestAnimationFrame(() => {
            textarea.style.height = newHeight + 'px';
        });
        
        // Add or remove classes based on content state
        const inputContainer = document.querySelector('.input-container');
        if (textarea.value.trim().length > 0) {
            inputContainer.classList.add('input-filled');
        } else {
            inputContainer.classList.remove('input-filled');
            // Animate back to initial height when empty
            textarea.style.height = '56px';
        }
        
        // Restore scroll position to prevent page jump
        window.scrollTo(0, scrollPos);
    }

    // Initialize textarea with proper height on page load
    autoResizeTextarea(promptInput);
    
    // Add a delay before focusing to let animations complete
    setTimeout(() => {
        promptInput.focus();
    }, 300);

    // Enhanced auto-resize textarea
    promptInput.addEventListener('input', function() {
        autoResizeTextarea(this);
    });

    // Also resize on focus to handle any pre-filled content
    promptInput.addEventListener('focus', function() {
        autoResizeTextarea(this);
    });

    // Reset height when the form is submitted
    submitBtn.addEventListener('click', function() {
        if (promptInput.value.trim()) {
            // After submission, reset textarea height
            requestAnimationFrame(() => {
                promptInput.style.height = '56px';
            });
        }
    });

    // Add keydown listener to handle Enter key and resize
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
            
            // Reset textarea height after send with animation
            requestAnimationFrame(() => {
                promptInput.style.height = '56px';
            });
        } else if (e.key === 'Enter' && e.shiftKey) {
            // When shift+enter is pressed, resize after new line is added
            requestAnimationFrame(() => {
                autoResizeTextarea(promptInput);
            });
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

        // Disable submit button and show loading
        submitBtn.disabled = true;
        loadingIndicator.classList.remove('hidden');

        // Add user message to chat
        addMessageToChat('user', prompt);

        // Reset input
        promptInput.value = '';
        promptInput.style.height = 'auto';
        
        // Scroll to bottom
        scrollToBottom();

        try {
            const selectedModel = modelSelect.value;
            
            if (selectedModel === 'all') {
                // Close previous EventSource if exists
                if (eventSource) {
                    eventSource.close();
                }
                
                // Reset active models tracking
                activeModelResponses = {};
                
                // Create new EventSource connection for streaming
                eventSource = new EventSource(`/generate?prompt=${encodeURIComponent(prompt)}&model=all&conversation_id=${currentConversationId}`);
                
                // Handle SSE events
                eventSource.addEventListener('message', function(event) {
                    const data = JSON.parse(event.data);
                    
                    if (data.event === 'model_started') {
                        // Create placeholder for streaming response
                        const modelId = data.model_id;
                        const modelName = data.model_name;
                        
                        // Track this model
                        activeModelResponses[modelId] = { 
                            elementId: `response-${modelId}-${Date.now()}`,
                            name: modelName
                        };
                        
                        // Create placeholder with typing indicator
                        createResponsePlaceholder(modelId, modelName);
                        scrollToBottom();
                    }
                    else if (data.event === 'model_completed') {
                        // Update with completed response
                        const modelId = data.model_id;
                        const response = data.response;
                        
                        if (activeModelResponses[modelId]) {
                            updateModelResponse(modelId, response, true);
                            scrollToBottom();
                        }
                    }
                    else if (data.event === 'model_error') {
                        // Handle error
                        const modelId = data.model_id;
                        const error = data.error;
                        
                        if (activeModelResponses[modelId]) {
                            updateModelResponse(modelId, `**Error:** ${error}`, false, true);
                            scrollToBottom();
                        }
                    }
                    else if (data.event === 'all_completed') {
                        // Cleanup
                        eventSource.close();
                        eventSource = null;
                        loadingIndicator.classList.add('hidden');
                        submitBtn.disabled = false;
                    }
                });
                
                eventSource.addEventListener('error', function() {
                    console.error('EventSource connection error');
                    eventSource.close();
                    eventSource = null;
                    loadingIndicator.classList.add('hidden');
                    submitBtn.disabled = false;
                    
                    // Show error for incomplete responses
                    for (const [modelId, info] of Object.entries(activeModelResponses)) {
                        const responseElement = document.getElementById(info.elementId);
                        if (responseElement && responseElement.querySelector('.typing-indicator')) {
                            updateModelResponse(modelId, '**Error:** Connection lost', false, true);
                        }
                    }
                });
            } else {
                // Single model request
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
                    addMessageToChat('assistant', data.response, data.model);
                } else {
                    throw new Error(data.error || 'Failed to generate response');
                }
                
                loadingIndicator.classList.add('hidden');
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error:', error);
            addMessageToChat('assistant', `**Error:** ${error.message}`, 'System');
            loadingIndicator.classList.add('hidden');
            submitBtn.disabled = false;
        }
    }

    function createResponsePlaceholder(modelId, modelName) {
        if (!activeModelResponses[modelId]) return;
        
        const elementId = activeModelResponses[modelId].elementId;
        
        // Create container
        const container = document.createElement('div');
        container.className = 'message-container assistant';
        container.id = elementId;
        
        // Create message
        const message = document.createElement('div');
        message.className = 'message';
        
        // Add model name
        const modelLabel = document.createElement('div');
        modelLabel.className = 'model-label';
        modelLabel.textContent = modelName;
        message.appendChild(modelLabel);
        
        // Add content area with typing indicator
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        content.appendChild(typingIndicator);
        
        message.appendChild(content);
        container.appendChild(message);
        chatMessages.appendChild(container);
    }
    
    function updateModelResponse(modelId, content, completed = false, isError = false) {
        if (!activeModelResponses[modelId]) return;
        
        const elementId = activeModelResponses[modelId].elementId;
        const container = document.getElementById(elementId);
        
        if (container) {
            const messageContent = container.querySelector('.message-content');
            
            // Remove typing indicator
            const typingIndicator = messageContent.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            // Add content with markdown
            messageContent.innerHTML = marked.parse(content);
            
            // Apply syntax highlighting
            messageContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
            
            // Add styling for errors
            if (isError) {
                container.classList.add('error');
            }
            
            // Add completion class
            if (completed) {
                container.classList.add('completed');
            }
        }
    }

    function addMessageToChat(role, content, modelName = null) {
        const container = document.createElement('div');
        container.className = `message-container ${role}`;
        
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
        
        if (role === 'assistant') {
            messageContent.innerHTML = marked.parse(content);
            
            messageContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            messageContent.textContent = content;
        }
        
        message.appendChild(messageContent);
        container.appendChild(message);
        chatMessages.appendChild(container);
        
        scrollToBottom();
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
                
                // Show success notification
                const notification = document.createElement('div');
                notification.className = 'loading-indicator';
                notification.style.backgroundColor = 'var(--success-color)';
                notification.innerHTML = '<i class="fas fa-check"></i> <span>API keys saved</span>';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            } else {
                alert('Failed to save API keys');
            }
        } catch (error) {
            console.error('Error saving API keys:', error);
            alert('Error saving API keys: ' + error.message);
        }
    }

    function clearChat() {
        // Close EventSource if open
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        
        // Reset tracking
        activeModelResponses = {};
        
        // Clear messages
        chatMessages.innerHTML = '';
        
        // Add welcome message
        const welcomeContainer = document.createElement('div');
        welcomeContainer.className = 'welcome-container';
        welcomeContainer.innerHTML = `
            <h1>Welcome to EveryAI!</h1>
            <p>Compare responses from different AI models in real-time.</p>
            <p class="subtitle">Choose a model from the sidebar and start chatting!</p>
        `;
        chatMessages.appendChild(welcomeContainer);
        
        // Reset state
        submitBtn.disabled = false;
        loadingIndicator.classList.add('hidden');
        currentConversationId = 'conv_' + Date.now();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});