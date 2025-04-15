import os
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
import threading
import time
import uuid
from flask.ctx import copy_current_request_context

app = Flask(__name__)
app.secret_key = os.urandom(24)  # For session management
load_dotenv()

# Dictionary mapping model IDs to functions (moved to a function to use API keys from session)
def get_model_function(model_id, api_keys):
    from ai_models import (
        create_openAIo3mini, create_openAIo1preview, create_chatgpt4o, create_phi4, 
        create_deepseekv3, create_metallama, create_mistral, create_nvidia_nemotron
    )
    
    github_token = api_keys.get('github_token', '')
    nvidia_key = api_keys.get('nvidia_key', '')
    
    MODEL_FUNCTIONS = {
        'gpt4o': create_chatgpt4o(github_token),
        'o3mini': create_openAIo3mini(github_token),
        'o1preview': create_openAIo1preview(github_token),
        'phi4': create_phi4(github_token),
        'deepseekv3': create_deepseekv3(github_token),
        'metallama': create_metallama(github_token),
        'mistral': create_mistral(github_token),
        'nemotron': create_nvidia_nemotron(nvidia_key)
    }
    
    return MODEL_FUNCTIONS.get(model_id)

MODEL_NAMES = {
    'gpt4o': 'GPT-4o (OpenAI)',
    'o3mini': 'O3-Mini (Azure)',
    'o1preview': 'O1-Preview (Azure)',
    'phi4': 'Phi-4 (Azure)',
    'deepseekv3': 'DeepSeek-V3 (Azure)',
    'metallama': 'Meta Llama-3.2-90B (Azure)',
    'mistral': 'Mistral-Large (Azure)',
    'nemotron': 'Nvidia Nemotron-70B (Nvidia API)'
}

@app.route('/')
def index():
    # Generate a session ID if not present
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        session['conversations'] = {}
        session['api_keys'] = {'github_token': '', 'nvidia_key': ''}
    
    return render_template('index.html', models=MODEL_NAMES)

@app.route('/save_api_keys', methods=['POST'])
def save_api_keys():
    data = request.json
    session['api_keys'] = {
        'github_token': data.get('github_token', ''),
        'nvidia_key': data.get('nvidia_key', '')
    }
    return jsonify({'success': True})

@app.route('/get_api_keys', methods=['GET'])
def get_api_keys():
    return jsonify(session.get('api_keys', {'github_token': '', 'nvidia_key': ''}))

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt')
    selected_model = data.get('model')
    conversation_id = data.get('conversation_id', 'default')
    
    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400
    
    # Save session data without adding to conversation history
    api_keys = session.get('api_keys', {'github_token': '', 'nvidia_key': ''})
    
    if selected_model == 'all':
        return run_all_models(prompt, api_keys)
    
    try:
        model_function = get_model_function(selected_model, api_keys)
        
        if not model_function:
            return jsonify({'error': 'Invalid model selected'}), 400
        
        response = model_function(prompt)
        
        return jsonify({
            'model': MODEL_NAMES.get(selected_model),
            'response': response
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def run_all_models(prompt, api_keys):
    results = {}
    
    # Process models sequentially to avoid threading issues
    for model_id in MODEL_NAMES.keys():
        try:
            model_function = get_model_function(model_id, api_keys)
            if model_function:
                response = model_function(prompt)
                results[model_id] = {
                    'name': MODEL_NAMES.get(model_id),
                    'response': response,
                    'status': 'success'
                }
            else:
                results[model_id] = {
                    'name': MODEL_NAMES.get(model_id),
                    'response': "Model function not available",
                    'status': 'error'
                }
        except Exception as e:
            results[model_id] = {
                'name': MODEL_NAMES.get(model_id),
                'response': f"Error: {str(e)}",
                'status': 'error'
            }
    
    return jsonify({
        'results': results
    })

if __name__ == '__main__':
    app.run(debug=True)