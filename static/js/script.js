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
    const abortButton = document.getElementById('abort-button');
    let currentConversationId = null;
    let eventSource = null;
    let activeModelResponses = {};
    let operationInProgress = false;

    // Add to your initialization code section
    abortButton.classList.remove('active'); // Ensure it's hidden initially
    operationInProgress = false;

    // Update the marked configuration section in your DOMContentLoaded event handler
    marked.setOptions({
        highlight: function(code, lang) {
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true,
        pedantic: false,
        sanitize: false, // Allow HTML for full compatibility
        smartypants: true
    });

    // Add custom renderer to handle math expressions
    const renderer = new marked.Renderer();

    // Store the original code renderer
    const originalCodeRenderer = renderer.code;

    // Override the code renderer to handle LaTeX blocks
    renderer.code = function(code, language) {
        // Check if this is a math block (indicated by 'math' or 'latex' language)
        if (language === 'math' || language === 'latex') {
            return `<div class="math-block">\\[${code}\\]</div>`;
        }
        
        // Otherwise use the original renderer
        return originalCodeRenderer.call(this, code, language);
    };

    // Add special handling for inline math
    const originalInlineCode = renderer.codespan;
    renderer.codespan = function(code) {
        // Check if this looks like an inline math expression
        if (code.startsWith('$') && code.endsWith('$')) {
            return `<span class="math-inline">\\(${code.slice(1, -1)}\\)</span>`;
        }
        return originalInlineCode.call(this, code);
    };

    // Update marked with our custom renderer
    marked.use({ renderer });

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

    submitBtn.addEventListener('click', () => {
        // Add the sending animation class
        submitBtn.classList.add('sending');
        
        // Remove the animation class after animation completes
        setTimeout(() => {
            submitBtn.classList.remove('sending');
        }, 700);
        
        // Call the submit handler
        handleSubmit();
    });

    settingsBtn.addEventListener('click', () => {
        // Add active spin class while modal is open
        settingsBtn.classList.add('active-spin');
        
        settingsModal.style.display = 'block';
        loadApiKeys();
    });

    closeModalBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
        settingsBtn.classList.remove('active-spin');
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    saveApiKeysBtn.addEventListener('click', saveApiKeys);
    clearChatBtn.addEventListener('click', () => {
        clearChatBtn.classList.add('clearing');
        
        // Remove class after animation completes
        setTimeout(() => {
            clearChatBtn.classList.remove('clearing');
        }, 800); // Match animation duration
        
        clearChat();
    });

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

    // Initialize API key status
    checkApiKeys();

    // Add this function to process MathJax after rendering content
    function processMathJax(element) {
        if (window.MathJax) {
            // Tell MathJax to process the element
            MathJax.typesetPromise([element]).catch((err) => {
                console.error('MathJax error:', err);
            });
        }
    }

    // Add this function to your script.js file
    function cleanMathExpression(mathExpr) {
        // Fix common LaTeX commands
        let cleaned = mathExpr
            // Fix backslash escaping issues
            .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
            .replace(/\\\\([^a-zA-Z])/g, '\\$1')
            
            // Fix specific commands that often have issues
            .replace(/\\log\s+([a-zA-Z])/g, '\\log $1')
            .replace(/\\frac\{(\d+)\}\{(\d+)\}/g, '\\frac{$1}{$2}')
            .replace(/\\frac(\d)(\d)/g, '\\frac{$1}{$2}')
            
            // Remove stray dollar signs
            .replace(/\$(x|y|z|t|u|v|a|b|n)\$/g, '$1')
            .replace(/\$\((.*?)\)\$/g, '($1)');
            
        return cleaned;
    }

    // Fix dollar sign appearing in rendered math
    function processMathInContent(content) {
        // First fix concatenated words in formulas
        content = content.replace(/([a-z])([A-Z])/g, '$1 $2');
        
        // Fix spacing in math equations - add spaces between text segments
        content = content.replace(/([a-zA-Z]+)([0-9]+)/g, '$1 $2');
        
        // Remove dollar signs within math expressions that aren't part of LaTeX
        // This regex helps clean up accidental dollar signs
        content = content.replace(/\[\s*(.+?)\s*\]/gs, function(match, p1) {
            // Remove any stray $ characters in math content
            let cleaned = p1.replace(/\$(x)\$/g, '$1');
            cleaned = cleaned.replace(/\$\(x\)\$/g, '(x)');
            
            // Don't process if it looks like a link or code reference
            if (cleaned.includes('](') || cleaned.startsWith('http')) {
                return match;
            }
            
            // If it already contains LaTeX commands, preserve spacing
            if (cleaned.includes('\\begin') || cleaned.includes('\\frac') || cleaned.includes('\\boxed')) {
                return '$$' + cleaned + '$$';
            }
            
            // For simple expressions, ensure proper spacing
            return '$$' + cleaned + '$$';
        });
        
        // Fix LaTeX commands with double backslashes
        content = content.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
        
        // Fix inline math with parentheses
        content = content.replace(/\(\s*([a-zA-Z0-9+\-*/=]+)\s*\)/g, '$\\($1\\)$');

        // Replace square brackets with display math delimiters more intelligently
        let processedContent = content.replace(/\[\s*(.+?)\s*\]/gs, function(match, p1) {
            return '$$' + cleanMathExpression(p1.trim()) + '$$';
        });
        
        // Fix inline math expressions
        processedContent = processedContent.replace(/\\\((.*?)\\\)/g, function(match, p1) {
            return '\\(' + cleanMathExpression(p1) + '\\)';
        });
        
        return processedContent;
    }

    // Add this function to automatically resize containers with math content
    function adjustContainerForMath(container) {
        // Check if container contains MathJax elements
        const hasMath = container.querySelector('mjx-container');
        
        if (hasMath) {
            // Allow container to expand for math content
            container.style.maxWidth = '95%';
            container.style.width = 'auto';
            
            // Add a class that allows expansion for math
            container.classList.add('contains-math');
            
            // Make sure the message width adjusts to content
            const message = container.querySelector('.message');
            if (message) {
                message.style.width = 'auto';
                message.style.maxWidth = '100%';
            }
        }
    }

    // Functions
    async function handleSubmit() {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        // Disable submit button while processing
        submitBtn.disabled = true;
        
        // Set operation status
        operationInProgress = true;
        
        // Show abort button
        abortButton.classList.add('active');
        
        // Add animation class to the button
        submitBtn.classList.add('sending');
        
        // Switch to fast spin when sending requests
        settingsBtn.classList.remove('slow-spin');
        settingsBtn.classList.add('fast-spin');
        
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
                        
                        // Return to slow spin if keys are valid
                        settingsBtn.classList.remove('fast-spin');
                        checkApiKeys(); // This will add slow-spin if keys are valid
                        
                        submitBtn.disabled = false;
                        
                        // Hide abort button
                        abortButton.classList.remove('active');
                        
                        // Reset operation status
                        operationInProgress = false;
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
                    
                    // Return to slow spin if keys are valid
                    settingsBtn.classList.remove('fast-spin');
                    checkApiKeys(); // This will add slow-spin if keys are valid
                    
                    // Hide abort button
                    abortButton.classList.remove('active');
                    
                    // Reset operation status
                    operationInProgress = false;
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
                    
                    // Hide abort button
                    abortButton.classList.remove('active');
                    
                    // Reset operation status
                    operationInProgress = false;
                } else {
                    throw new Error(data.error || 'Failed to generate response');
                }
                
                loadingIndicator.classList.add('hidden');
                
                // Return to slow spin if keys are valid
                settingsBtn.classList.remove('fast-spin');
                checkApiKeys(); // This will add slow-spin if keys are valid
                
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error:', error);
            addMessageToChat('assistant', `**Error:** ${error.message}`, 'System');
            submitBtn.disabled = false;
            
            // Hide abort button
            abortButton.classList.remove('active');
            
            // Reset operation status
            operationInProgress = false;
            
            // Return to slow spin if keys are valid
            settingsBtn.classList.remove('fast-spin');
            checkApiKeys(); // This will add slow-spin if keys are valid
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
    
    // Update the updateModelResponse function
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
            
            // Process content to convert LaTeX properly
            const processedContent = processMathInContent(content);
            
            // Check if content contains error indicators
            const hasErrorContent = processedContent.toLowerCase().includes('error:') || 
                                   processedContent.toLowerCase().includes('api key not provided') ||
                                   processedContent.toLowerCase().includes('timed out');
            
            // Apply error styling for any error message
            if (isError || hasErrorContent) {
                container.classList.add('error');
                message.classList.add('error-message');
            }
            
            // Add content with markdown
            messageContent.innerHTML = marked.parse(processedContent);
            
            // Apply syntax highlighting
            messageContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
            
            // Trigger MathJax to process the newly added content
            if (window.MathJax) {
                window.MathJax.typesetPromise([messageContent]).then(() => {
                    // After MathJax has processed, adjust the container
                    adjustContainerForMath(container);
                    
                    // Fix specific rendering issues
                    const mathElements = messageContent.querySelectorAll('mjx-container');
                    mathElements.forEach(mathEl => {
                        // Fix integral signs
                        const integrals = mathEl.querySelectorAll('mjx-mo[data-c="222B"]');
                        integrals.forEach(integral => {
                            integral.style.marginRight = '0.15em';
                        });
                        
                        // Fix log display
                        const logs = mathEl.querySelectorAll('mjx-mi:contains("log")');
                        logs.forEach(log => {
                            log.style.marginRight = '0.1em';
                        });
                        
                        // Add custom class to math containers that need horizontal scrolling
                        if (mathEl.scrollWidth > mathEl.clientWidth) {
                            mathEl.classList.add('scrollable');
                        }
                    });
                }).catch(err => {
                    console.error('MathJax error:', err);
                });
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

    // Also update the addMessageToChat function
    function addMessageToChat(role, content, modelName = null) {
        // Process LaTeX in the content if it's from an assistant
        const processedContent = role === 'assistant' ? processMathInContent(content) : content;
        
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
            messageContent.innerHTML = marked.parse(processedContent);
            
            messageContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
            
            // Trigger MathJax processing
            if (window.MathJax) {
                window.MathJax.typesetPromise([messageContent]).catch(err => {
                    console.error('MathJax error:', err);
                });
            }
        } else {
            messageContent.textContent = processedContent;
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

    // Update the saveApiKeys function to properly show red indicators for missing keys
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
                // Close the modal
                settingsModal.style.display = 'none';
                settingsBtn.classList.remove('active-spin');
                
                // Check if BOTH API keys are provided
                if (githubTokenInput.value && githubTokenInput.value.trim() !== '' &&
                    nvidiaKeyInput.value && nvidiaKeyInput.value.trim() !== '') {
                    // Both keys provided - show green indicator
                    settingsBtn.classList.add('api-valid');
                    settingsBtn.classList.remove('api-invalid');
                    settingsBtn.classList.add('slow-spin'); // Start slow spin for valid keys
                } else {
                    // Missing at least one key after save - show red indicator
                    settingsBtn.classList.remove('api-valid');
                    settingsBtn.classList.add('api-invalid'); // Show red indicator
                    settingsBtn.classList.remove('slow-spin');
                    
                    // Keep the red indicator visible for 5 seconds
                    setTimeout(() => {
                        if (!document.getElementById('settings-modal').style.display === 'block') {
                            settingsBtn.classList.remove('api-invalid');
                        }
                    }, 5000);
                }
            } else {
                settingsBtn.classList.add('api-invalid');
                settingsBtn.classList.remove('api-valid');
                setTimeout(() => {
                    settingsBtn.classList.remove('api-invalid');
                }, 5000);
                alert('Failed to save API keys');
            }
        } catch (error) {
            console.error('Error saving API keys:', error);
            settingsBtn.classList.add('api-invalid');
            settingsBtn.classList.remove('api-valid');
            setTimeout(() => {
                settingsBtn.classList.remove('api-invalid');
            }, 5000);
            alert('Error saving API keys: ' + error.message);
        }
    }

    // Also update the checkApiKeys function for consistency
    async function checkApiKeys() {
        try {
            const response = await fetch('/get_api_keys');
            const data = await response.json();
            
            // Check if both keys are provided and non-empty
            const githubKeyValid = data.github_token && data.github_token.trim() !== '';
            const nvidiaKeyValid = data.nvidia_key && data.nvidia_key.trim() !== '';
            
            if (githubKeyValid && nvidiaKeyValid) {
                // Both keys valid - green indicator
                settingsBtn.classList.add('api-valid');
                settingsBtn.classList.remove('api-invalid');
                settingsBtn.classList.add('slow-spin');
            } else if (githubKeyValid || nvidiaKeyValid) {
                // Some keys present but incomplete - red indicator
                settingsBtn.classList.remove('api-valid');
                settingsBtn.classList.add('api-invalid');
                settingsBtn.classList.remove('slow-spin');
            } else {
                // No keys - no indicator
                settingsBtn.classList.remove('api-valid');
                settingsBtn.classList.remove('api-invalid');
                settingsBtn.classList.remove('slow-spin');
            }
        } catch (error) {
            console.error('Failed to check API keys:', error);
            // Remove indicators on error
            settingsBtn.classList.remove('api-valid');
            settingsBtn.classList.remove('api-invalid');
            settingsBtn.classList.remove('slow-spin');
        }
    }

    // Update the clearChat function in script.js
    function clearChat() {
        // Cancel any in-progress requests
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        
        // Reset tracking
        activeModelResponses = {};
        
        // Abort any pending fetch requests if there are any
        // Re-enable the submit button to ensure UI is consistent
        submitBtn.disabled = false;
        
        // Remove any gear animation
        settingsBtn.classList.remove('fast-spin');
        checkApiKeys(); // This will restore slow-spin if keys are valid
        
        // Clear messages
        chatMessages.innerHTML = '';
        
        // Recreate the welcome message with EXACT same content as initial load
        const welcomeContainer = document.createElement('div');
        welcomeContainer.className = 'welcome-container';
        
        const welcomeHeading = document.createElement('h1');
        welcomeHeading.textContent = 'Welcome to EveryAI'; // Added the exclamation mark to match original
        
        const welcomeText = document.createElement('p');
        welcomeText.textContent = 'Compare responses from different AI models in real-time.';
        
        const subtitleText = document.createElement('p');
        subtitleText.className = 'subtitle';
        subtitleText.textContent = 'Enter your API keys, choose a model from the sidebar and start chatting!';
        
        const keysLinkContainer = document.createElement('p');
        keysLinkContainer.className = 'subtitle';
        
        const keysLink = document.createElement('a');
        keysLink.href = 'https://youtu.be/2Hm5EPra1YA';
        keysLink.target = '_blank';
        keysLink.style.color = '#6b4fff';
        keysLink.textContent = 'Click here';
        
        keysLinkContainer.appendChild(keysLink);
        keysLinkContainer.appendChild(document.createTextNode(' if you don\'t have your API keys'));
        
        const githubContainer = document.createElement('p');
        githubContainer.className = 'subtitle';
        githubContainer.style.color = 'inherit';
        githubContainer.textContent = 'Interested in contributing? Check out the project on ';
        
        const githubLink = document.createElement('a');
        githubLink.href = 'https://github.com/itstanayhere/EveryAI'; // Note: capital E and A to match HTML
        githubLink.target = '_blank'; // Added target blank to match HTML
        githubLink.style.color = '#6b4fff';
        githubLink.textContent = 'GitHub';
        
        githubContainer.appendChild(githubLink);
        
        welcomeContainer.appendChild(welcomeHeading);
        welcomeContainer.appendChild(welcomeText);
        welcomeContainer.appendChild(subtitleText);
        welcomeContainer.appendChild(keysLinkContainer);
        welcomeContainer.appendChild(githubContainer);
        
        chatMessages.appendChild(welcomeContainer);
        
        // Apply animation to the welcome heading
        setTimeout(() => {
            const welcomeHeading = document.querySelector('.welcome-container h1');
            if (welcomeHeading) {
                // Make sure the heading has the gradient animation applied
                welcomeHeading.style.backgroundSize = '300% 100%'; 
                welcomeHeading.style.webkitBackgroundClip = 'text';
                welcomeHeading.style.backgroundClip = 'text';
                welcomeHeading.style.color = 'transparent';
                welcomeHeading.style.animation = 'gradientFlow 12s ease infinite';
            }
        }, 100);
        
        // Reset conversation ID to terminate any pending operations
        currentConversationId = 'conv_' + Date.now();
        
        // Hide abort button if visible
        abortButton.classList.remove('active');
        
        // Reset operation status
        operationInProgress = false;
    }

    // Helper function for animating the welcome heading if you have that feature
    function animateWelcomeHeading() {
        const welcomeHeading = document.querySelector('.welcome-container h1');
        if (welcomeHeading) {
            const text = welcomeHeading.textContent;
            welcomeHeading.textContent = '';
            
            // Create individual spans for each character
            for (let i = 0; i < text.length; i++) {
                const span = document.createElement('span');
                span.textContent = text[i];
                span.style.setProperty('--char-index', i);
                welcomeHeading.appendChild(span);
            }
        }
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Add event listener for the abort button
    abortButton.addEventListener('click', () => {
        // Visual feedback
        abortButton.classList.add('clicked');
        setTimeout(() => {
            abortButton.classList.remove('clicked');
        }, 300);
        
        // Abort the operation
        abortCurrentOperation();
    });

    // Replace your existing abortCurrentOperation function

    // Function to abort the current operation
    function abortCurrentOperation() {
        // Only perform abort if an operation is in progress
        if (!operationInProgress) return;
        
        // First notify the server to cancel the operations
        fetch('/cancel_operations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversation_id: currentConversationId
            })
        }).catch(error => {
            console.error('Failed to notify server about cancellation:', error);
        });
        
        // Close EventSource if exists
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        
        // For all active model responses that are still processing,
        // mark them as aborted
        for (const [modelId, info] of Object.entries(activeModelResponses)) {
            const elementId = info.elementId;
            const container = document.getElementById(elementId);
            
            if (container && container.querySelector('.typing-indicator')) {
                // Replace typing indicator with aborted message
                updateModelResponse(
                    modelId,
                    "**Operation aborted by user.**",
                    true,
                    true
                );
            }
        }
        
        // Reset tracking
        activeModelResponses = {};
        
        // Re-enable submit button
        submitBtn.disabled = false;
        
        // Reset gear animation
        settingsBtn.classList.remove('fast-spin');
        checkApiKeys(); // Restore slow-spin if keys are valid
        
        // Hide abort button
        abortButton.classList.remove('active');
        
        // Reset operation status
        operationInProgress = false;
        
        // Create a new conversation ID for future requests
        currentConversationId = 'conv_' + Date.now();
    }

    // Add a beforeunload handler to warn users if they try to leave during an operation
    window.addEventListener('beforeunload', (event) => {
        if (operationInProgress) {
            // Standard way to show a warning when leaving the page
            const message = 'Operation in progress. Are you sure you want to leave?';
            event.returnValue = message;
            return message;
        }
    });
});