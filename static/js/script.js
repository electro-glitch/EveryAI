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
            
            // Add the animation class here too for keyboard submissions
            submitBtn.classList.add('sending');
            
            // Remove it after the animation duration
            setTimeout(() => {
                submitBtn.classList.remove('sending');
            }, 700);
            
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

    // Add mobile menu functionality
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    // Sidebar collapse functionality for desktop
    const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
    const mainContent = document.getElementById('main-content');
    const appContainer = document.querySelector('.app-container');
    
    // Check if we have a stored preference for sidebar state
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    
    // Set initial state based on saved preference
    if (sidebarCollapsed && window.innerWidth > 768) {
        sidebar.classList.add('collapsed');
    }
    
    // Toggle sidebar collapse state
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', () => {
            // Only handle collapse for desktop view
            if (window.innerWidth > 768) {
                sidebar.classList.toggle('collapsed');
                
                // Store preference
                localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
                
                // Force resize of textarea after sidebar animation completes
                setTimeout(() => {
                    if (promptInput) autoResizeTextarea(promptInput);
                    window.dispatchEvent(new Event('resize'));
                }, 300);
            }
        });
    }
    
    // Handle mobile menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
    }
    
    // Close sidebar when clicking outside
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    // Close sidebar when selecting a model on mobile
    if (modelSelect && window.innerWidth <= 768) {
        modelSelect.addEventListener('change', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    // Close sidebar when clicking action buttons on mobile
    const sidebarButtons = document.querySelectorAll('.sidebar-actions button');
    if (window.innerWidth <= 768) {
        sidebarButtons.forEach(button => {
            button.addEventListener('click', () => {
                setTimeout(() => {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                }, 100);
            });
        });
    }
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        adjustForScreenSize();
    });
    
    // Handle window resize
    window.addEventListener('resize', debounce(() => {
        adjustForScreenSize();
    }, 250));
    
    // Function to adjust UI based on screen size
    function adjustForScreenSize() {
        if (window.innerWidth <= 768) {
            // Mobile behavior
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            
            // Reset collapse state on mobile
            if (sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
            }
        } else {
            // Desktop behavior
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            
            // Restore collapse state from localStorage
            const shouldBeCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (shouldBeCollapsed && !sidebar.classList.contains('collapsed')) {
                sidebar.classList.add('collapsed');
            }
        }
        
        // Recalculate textarea height
        if (promptInput) autoResizeTextarea(promptInput);
    }
    
    // Debounce function for resize events
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Also add touchstart listeners for better mobile experience
    if (submitBtn) {
        submitBtn.addEventListener('touchstart', () => {
            submitBtn.classList.add('active');
        });
        submitBtn.addEventListener('touchend', () => {
            submitBtn.classList.remove('active');
        });
    }
    
    // Initialize based on screen size
    adjustForScreenSize();

    // Functions
    async function handleSubmit() {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        // Disable submit button while processing
        submitBtn.disabled = true;
        
        // Add animation class to the button
        submitBtn.classList.add('sending');
        
        // Add user message to chat
        addMessageToChat('user', prompt);

        // Reset input
        promptInput.value = '';
        promptInput.style.height = 'auto';
        
        // Scroll to bottom
        scrollToBottom();
        
        // Remove animation class after a delay
        setTimeout(() => {
            submitBtn.classList.remove('sending');
        }, 700); // Match animation duration

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
                            name: modelName,
                            hasTimedOut: false // Add flag to track timeout state
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
                            // Even if timed out before, replace with the actual response
                            // and remove error styling
                            updateModelResponse(modelId, response, true, false);
                            scrollToBottom();
                            
                            // Clear the timeout flag since we now have a proper response
                            activeModelResponses[modelId].hasTimedOut = false;
                        }
                    }
                    else if (data.event === 'model_error') {
                        // Handle error
                        const modelId = data.model_id;
                        const error = data.error;
                        
                        if (activeModelResponses[modelId]) {
                            updateModelResponse(modelId, `**Error:** ${error}`, false, true);
                            activeModelResponses[modelId].hasTimedOut = true;
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
            submitBtn.disabled = false;
        }
    }

    // Update the timeout in the createResponsePlaceholder function
    function createResponsePlaceholder(modelId, modelName) {
        const elementId = activeModelResponses[modelId].elementId;
        
        const container = document.createElement('div');
        container.className = 'message-container assistant';
        container.id = elementId;
        
        const message = document.createElement('div');
        message.className = 'message';
        
        const modelLabel = document.createElement('div');
        modelLabel.className = 'model-label';
        modelLabel.textContent = modelName;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Add typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        messageContent.appendChild(typingIndicator);
        
        message.appendChild(modelLabel);
        message.appendChild(messageContent);
        container.appendChild(message);
        
        chatMessages.appendChild(container);
        
        // Update the timeout to match backend (60 seconds)
        const timeoutSeconds = 60; // Match the backend MODEL_TIMEOUT_SECONDS
        activeModelResponses[modelId].timeout = setTimeout(() => {
            // Check if this model response is still showing the typing indicator
            const responseElement = document.getElementById(elementId);
            if (responseElement && responseElement.querySelector('.typing-indicator')) {
                // If we get here, it means the model hasn't completed yet
                updateModelResponse(
                    modelId, 
                    "**Response taking too long.** The model may be overloaded or experiencing issues.", 
                    false, 
                    true
                );
            }
        }, timeoutSeconds * 1000); // Convert to milliseconds
    }
    
    // Update the updateModelResponse function to clear the timeout
    function updateModelResponse(modelId, content, completed = false, isError = false) {
        if (!activeModelResponses[modelId]) return;
        
        const elementId = activeModelResponses[modelId].elementId;
        const container = document.getElementById(elementId);
        
        // Clear the timeout since we got a response
        if (activeModelResponses[modelId].timeout) {
            clearTimeout(activeModelResponses[modelId].timeout);
            activeModelResponses[modelId].timeout = null;
        }
        
        if (container) {
            const message = container.querySelector('.message');
            const messageContent = container.querySelector('.message-content');
            
            // Remove typing indicator
            const typingIndicator = messageContent.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            // Check if this is a successful completion after a timeout error
            const isRecovery = completed && container.classList.contains('error');
            
            // If this is a successful response after an error, remove error styling
            if (isRecovery) {
                container.classList.remove('error');
                message.classList.remove('error-message');
            }
            
            // Add content with markdown
            messageContent.innerHTML = marked.parse(content);
            
            // Apply syntax highlighting
            messageContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
            
            // Only apply error styling if this is a new error, not a recovery
            if (isError && !completed) {
                container.classList.add('error');
                message.classList.add('error-message');
                activeModelResponses[modelId].hasTimedOut = true;
            }
            
            // Add completion class
            if (completed) {
                container.classList.add('completed');
            }
            
            // Apply dynamic sizing based on content length
            if (content.length < 10) {
                message.classList.add('short-message');
            } else {
                message.classList.remove('short-message');
            }
            
            adjustMessageSize(message);
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