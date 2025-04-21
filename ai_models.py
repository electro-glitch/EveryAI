from openai import OpenAI
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage as AzureSystemMessage, UserMessage as AzureUserMessage
from azure.core.credentials import AzureKeyCredential
from mistralai import Mistral, UserMessage, SystemMessage

# Factory functions to create model function with API keys
def create_openAIo3(token):
    def openAIo3(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.github.ai/inference"
        model_name = "openai/o3"

        client = OpenAI(
            base_url=endpoint,
            api_key=token,
        )

        response = client.chat.completions.create(
            messages=[
                {
                    "role": "developer",
                    "content": "You are a helpful assistant.",
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=model_name
        )    
        return response.choices[0].message.content
    return openAIo3

def create_openAIo4preview(token):
    def openAIo4preview(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.github.ai/inference"
        model_name = "openai/o4-mini"

        client = OpenAI(
            base_url=endpoint,
            api_key=token,
        )

        response = client.chat.completions.create(
            messages=[
                {
                    "role": "developer",
                    "content": "You are a helpful assistant.",
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=model_name
        )

        return response.choices[0].message.content
    return openAIo4preview

def create_chatgpt41(token):
    def chatgpt41(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.github.ai/inference"
        model_name = "openai/gpt-4.1"

        client = OpenAI(
            base_url=endpoint,
            api_key=token,
        )

        response = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant.",
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            temperature=1.0,
            top_p=1.0,
            max_tokens=1024,
            model=model_name
        )

        return response.choices[0].message.content
    return chatgpt41

def create_phi4(token):
    def phi4(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.inference.ai.azure.com"
        model_name = "Phi-4"
            
        client = ChatCompletionsClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(token),
        )

        response = client.complete(
        messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            top_p=0.8,
            max_tokens=1024,
            model=model_name
        )

        return response.choices[0].message.content
    return phi4

def create_deepseekv30324(token):
    def deepseekv30324(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.github.ai/inference"
        model_name = "deepseek/DeepSeek-V3-0324"
        
        client = ChatCompletionsClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(token),
        )

        response = client.complete(
            messages=[
                AzureSystemMessage("You are a helpful assistant."),
                AzureUserMessage(prompt)
            ],
            temperature=1.0,
            top_p=1.0,
            max_tokens=1000,
            model=model_name
        )

        return response.choices[0].message.content
    return deepseekv30324

def create_metallama(token):
    def metallama(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.inference.ai.azure.com"
        model_name = "Llama-3.2-90B-Vision-Instruct"
        client = ChatCompletionsClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(token),
        )

        response = client.complete(
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            top_p=0.8,
            max_tokens=1024,
            model=model_name
        )

        return response.choices[0].message.content
    return metallama

def create_mistral(token):
    def mistral(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.inference.ai.azure.com"
        model_name = "Mistral-Large-2411"

        client = Mistral(api_key=token, server_url=endpoint)

        response = client.chat.complete(
        model=model_name,
        messages=[
            SystemMessage(content="You are a helpful assistant."),
            UserMessage(content=prompt),
        ],
        temperature=0.7,
        top_p=0.8,
        max_tokens=1024,
        )

        return response.choices[0].message.content
    return mistral

def create_nvidia_nemotron(nvkey):
    def nvidia_nemotron(prompt):
        if not nvkey:
            return "API key not provided. Please enter your Nvidia API key in the settings."
            
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=nvkey
        )

        try:
            # Using non-streaming version for simplicity in the web app
            completion = client.chat.completions.create(
                model="nvidia/llama-3.1-nemotron-70b-instruct",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                top_p=0.8,
                max_tokens=1024,
                stream=False
            )
            return completion.choices[0].message.content
        except Exception as e:
            return f"Error with Nvidia API: {str(e)}"
    return nvidia_nemotron
