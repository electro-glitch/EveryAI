from openai import OpenAI
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage as AzureSystemMessage, UserMessage as AzureUserMessage
from azure.core.credentials import AzureKeyCredential
from mistralai import Mistral, UserMessage, SystemMessage

# Factory functions to create model function with API keys
def create_openAIo3mini(token):
    def openAIo3mini(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.inference.ai.azure.com"
        model_name = "o3-mini"

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
    return openAIo3mini

def create_openAIo1preview(token):
    def openAIo1preview(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.inference.ai.azure.com"
        model_name = "o1-preview"

        client = OpenAI(
            base_url=endpoint,
            api_key=token,
        )

        response = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=model_name
        )

        return response.choices[0].message.content
    return openAIo1preview

def create_chatgpt4o(token):
    def chatgpt4o(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.inference.ai.azure.com"
        model_name = "gpt-4o"

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
            temperature=0.7,
            top_p=0.8,
            max_tokens=1024,
            model=model_name
        )

        return response.choices[0].message.content
    return chatgpt4o

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

def create_deepseekv3(token):
    def deepseekv3(prompt):
        if not token:
            return "API key not provided. Please enter your GitHub token in the settings."
            
        endpoint = "https://models.inference.ai.azure.com"
        model_name = "DeepSeek-V3"
        client = ChatCompletionsClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(token),
        )

        response = client.complete(
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=1024,
            model=model_name
        )

        return response.choices[0].message.content
    return deepseekv3

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
