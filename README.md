# Update _(15/04/2025)_
---
Great news! **EveryAI** is now fully ready to be deployed locally with a sleek frontend! 🎉 You can now interact with all your favorite AI models right from your browser—no more command-line hassle!

### How to Run It Locally

1. **Clone the Repo**:
   Grab the latest version of the project:
   ```bash
   git clone https://github.com/itstanayhere/EveryAI.git
   cd everyai
   ```

2. **Install the Dependencies**:
   Install all the required packages with a single command:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run It**:
   Launch the magic by running:
   ```bash
   python app.py
   ```
   Your shiny new frontend will be up and running at `http://127.0.0.1:5000`. ✨

4. **Enjoy the Interface**:
   Open your browser, go to `http://127.0.0.1:5000`, and get ready to send prompts and receive lightning-fast responses from multiple AI models. You can choose which model you want to query or hit them all at once for the ultimate AI showdown! 🤖⚡

   How to use:
  i) 


# EveryAI

EveryAI is a powerful AI response aggregator that queries multiple AI models simultaneously, providing rapid, diverse responses in a single execution. By leveraging parallel processing, it significantly reduces wait times, making it ideal for research, content generation, and AI benchmarking. 

_(At present the models used aren't configured to store message history. If you want that let me know!)_

## Features
- 🚀 **Parallel AI Processing** – Queries multiple AI models at once for faster responses.
- 🤖 **Multi-Model Support** – Integrates with OpenAI, Azure AI, Mistral, and NVIDIA.
- 🔒 **Secure API Key Handling** – Uses a `.env` file for storing credentials safely.
- 🛠 **Scalable & Modular** – Easily add new AI models with minimal changes.
- 📊 **Diverse AI Responses** – Compare how different models interpret the same prompt.

## Installation
Clone the repository and install the required dependencies:
```bash
pip install -r requirements.txt
```

## Configuration
Create a `.env` file in the root directory and add your API keys:
```ini
GIT_HUB_TOKEN=your_github_marketplace_pat
NVIDIA_API_KEY=your_nvidia_api_key
```
> **Note:** The GitHub Marketplace PAT is used for authenticating multiple AI services, while the NVIDIA API key is specific to NVIDIA's model access.

## Usage
Run EveryAI and interact with multiple AI models at once:
```bash
python everyai.py
```
Simply enter your prompt and choose whether to query a specific model or get responses from all supported AI models simultaneously.

## Dependencies
Ensure you have the following installed (handled via `requirements.txt`):
```
openai
azure-ai-inference
azure-core
mistralai
python-dotenv
```

## Contributing
I welcome contributions! If you have ideas for improvements or new model integrations, feel free to fork the repo and submit a pull request.

---
### Why EveryAI?
I bulit EveryAI to eliminate the frustration of waiting for sequential AI queries by introducing a seamless, high-speed experience. Whether you're a researcher, developer, or AI enthusiast, EveryAI empowers you with instant access to multiple AI engines, ensuring you get the best possible responses in record time.

No more switching between platforms or waiting for one model to finish before querying another—EveryAI lets you harness the power of AI like never before. Join the future of AI interaction – faster, smarter, and more efficient! 🚀
