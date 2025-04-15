import os
from dotenv import load_dotenv
from openai import OpenAI
from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
from mistralai import Mistral, UserMessage, SystemMessage
import concurrent.futures

# Load environment variables
load_dotenv()
token = os.getenv('GIT_HUB_TOKEN')
nvkey = os.getenv('NVIDIA_KEY')

def openAIo3mini(prompt):
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

def openAIo1preview(prompt):
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


def chatgpt4o(prompt):
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
        temperature=0.7, #balanced mode. lower values give more factual responses, higher give more creative responses
        top_p=0.8, #to control randomness. lower values give less random responses
        max_tokens=1024, #optimal response length. increase or decrease depending on need [ and your quota limit :( ]
        model=model_name
    )

    return response.choices[0].message.content

def phi4(prompt):
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
        temperature=0.7, #balanced mode. lower values give more factual responses, higher give more creative responses
        top_p=0.8, #to control randomness. lower values give less random responses
        max_tokens=1024, #optimal response length. increase or decrease depending on need [ and your quota limit :( ]
        model=model_name
    )

    return response.choices[0].message.content

def deepseekv3(prompt):
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

def metallama(prompt):
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
        temperature=0.7, #balanced mode. lower values give more factual responses, higher give more creative responses
        top_p=0.8, #to control randomness. lower values give less random responses
        max_tokens=1024, #optimal response length. increase or decrease depending on need [ and your quota limit :( ]
        model=model_name
    )

    return response.choices[0].message.content

def mistral(prompt):
    endpoint = "https://models.inference.ai.azure.com"
    model_name = "Mistral-Large-2411"

    client = Mistral(api_key=token, server_url=endpoint)

    response = client.chat.complete(
    model=model_name,
    messages=[
        SystemMessage(content="You are a helpful assistant."),
        UserMessage(content=prompt),
    ],
    temperature=0.7, #balanced mode. lower values give more factual responses, higher give more creative responses
    top_p=0.8, #to control randomness. lower values give less random responses
    max_tokens=1024, #optimal response length. increase or decrease depending on need [ and your quota limit :( ]
    )

    return response.choices[0].message.content

#claude was meant to go here but API isn't free :(

def nvidia_nemotron(prompt):
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=nvkey
    )

    completion = client.chat.completions.create(
        model="nvidia/llama-3.1-nemotron-70b-instruct",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        top_p=0.8,
        max_tokens=1024,
        stream=True  # Streaming enabled
    )

    full_response = ""  # Store the full output
    for chunk in completion:
        if chunk.choices[0].delta.content is not None:
            full_response += chunk.choices[0].delta.content

    return full_response


def main():
    prompt = input("Enter the prompt: ")
    print("\nAvailable Models:")
    print("[1] GPT-4o (OpenAI)")
    print("[2] O3-Mini (Azure)")
    print("[3] O1-Preview (Azure)")
    print("[4] Phi-4 (Azure)")
    print("[5] DeepSeek-V3 (Azure)")
    print("[6] Meta Llama-3.2-90B (Azure)")
    print("[7] Mistral-Large (Azure)")
    print("[8] Nvidia Nemotron-70B (Nvidia API)")
    print("[9] Run ALL models in parallel")

    choice = int(input("\nChoose an option (1-9): "))

    models = {
        1: chatgpt4o,
        2: openAIo3mini,
        3: openAIo1preview,
        4: phi4,
        5: deepseekv3,
        6: metallama,
        7: mistral,
        8: nvidia_nemotron
    }

    if choice in models:
        print("\n" + "="*80)
        print(f"\n🔹 Response from {models[choice].__name__}:\n")
        print(models[choice](prompt))
        print("\n" + "="*80)
    
    elif choice == 9:
        print("\n🔹 Running all models in parallel...\n" + "="*80 + "\n")

        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_to_model = {executor.submit(model, prompt): model.__name__ for model in models.values()}

            for future in concurrent.futures.as_completed(future_to_model):
                model_name = future_to_model[future]
                try:
                    response = future.result()
                    print(f"\n📌 Response from **{model_name}**:\n")
                    print(response)
                    print("\n" + "="*80 + "\n")
                except Exception as e:
                    print(f"\n❌ Error in {model_name}: {e}\n" + "="*80 + "\n")

if __name__ == '__main__':
    main()
