import os
from flask import Flask, render_template, request, jsonify, session, Response, stream_with_context
from dotenv import load_dotenv
import threading
import time
import uuid
import json
from flask.ctx import copy_current_request_context
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
import queue

app = Flask(__name__)
app.secret_key = os.urandom(24)  # For session management
load_dotenv()

# Add a timeout constant you can adjust as needed
MODEL_TIMEOUT_SECONDS = 60  # Timeout after 60 seconds

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
    'gpt4o': 'GPT-4o',
    'o3mini': 'O3-Mini',
    'o1preview': 'O1-Preview',
    'phi4': 'Phi-4',
    'deepseekv3': 'DeepSeek-V3',
    'metallama': 'Meta Llama-3.2-90B',
    'mistral': 'Mistral-Large',
    'nemotron': 'Nvidia Nemotron-70B'
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

@app.route('/generate', methods=['POST', 'GET'])
def generate():
    # Handle both GET and POST requests
    if request.method == 'GET':
        prompt = request.args.get('prompt')
        selected_model = request.args.get('model')
        conversation_id = request.args.get('conversation_id', 'default')
    else:
        data = request.json
        prompt = data.get('prompt')
        selected_model = data.get('model')
        conversation_id = data.get('conversation_id', 'default')
    
    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400
    
    # Save session data without adding to conversation history
    api_keys = session.get('api_keys', {'github_token': '', 'nvidia_key': ''})
    
    if selected_model == 'all':
        return stream_all_models(prompt, api_keys)
    
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

def stream_all_models(prompt, api_keys):
    def generate():
        event_queue = queue.Queue()
        executor = ThreadPoolExecutor(max_workers=len(MODEL_NAMES))
        
        def process_model(model_id):
            try:
                model_function = get_model_function(model_id, api_keys)
                
                # Send model starting event
                event_data = {
                    'event': 'model_started',
                    'model_id': model_id,
                    'model_name': MODEL_NAMES.get(model_id)
                }
                event_queue.put(f"data: {json.dumps(event_data)}\n\n")
                
                # Create a Future for the model response with a timeout
                future = executor.submit(model_function, prompt)
                try:
                    # Wait for the model to respond with a timeout
                    response = future.result(timeout=MODEL_TIMEOUT_SECONDS)
                    
                    # Send model completed event
                    event_data = {
                        'event': 'model_completed',
                        'model_id': model_id,
                        'model_name': MODEL_NAMES.get(model_id),
                        'response': response,
                        'status': 'success'
                    }
                    event_queue.put(f"data: {json.dumps(event_data)}\n\n")
                except TimeoutError:
                    # Cancel the future if possible
                    future.cancel()
                    # Send timeout event
                    event_data = {
                        'event': 'model_error',
                        'model_id': model_id,
                        'model_name': MODEL_NAMES.get(model_id),
                        'error': f"Model response timed out after {MODEL_TIMEOUT_SECONDS} seconds",
                        'status': 'timeout'
                    }
                    event_queue.put(f"data: {json.dumps(event_data)}\n\n")
                    
            except Exception as e:
                # Send error event
                event_data = {
                    'event': 'model_error',
                    'model_id': model_id,
                    'model_name': MODEL_NAMES.get(model_id),
                    'error': str(e),
                    'status': 'error'
                }
                event_queue.put(f"data: {json.dumps(event_data)}\n\n")
        
        # Start all models in parallel
        futures = []
        for model_id in MODEL_NAMES:
            thread_func = copy_current_request_context(process_model)
            futures.append(executor.submit(thread_func, model_id))
        
        # Start a monitoring thread to check for completion
        all_done = threading.Event()
        
        def monitor_futures():
            try:
                for future in futures:
                    # Wait for all threads with a reasonable timeout
                    future.result(timeout=MODEL_TIMEOUT_SECONDS + 5)  # Give a little extra time for cleanup
            except TimeoutError:
                # Just log this, individual model timeouts are handled in process_model
                pass
            except Exception as e:
                print(f"Error in monitor_futures: {str(e)}")
            finally:
                # Always set all_done to ensure we exit properly
                all_done.set()
                # Send completion event
                event_queue.put(f"data: {json.dumps({'event': 'all_completed'})}\n\n")
        
        monitor_thread = threading.Thread(target=monitor_futures)
        monitor_thread.daemon = True
        monitor_thread.start()
        
        # Set an overall timeout in case the monitor thread itself gets stuck
        overall_timeout = threading.Timer(
            MODEL_TIMEOUT_SECONDS * 1.5,  # 150% of the model timeout
            lambda: all_done.set() if not all_done.is_set() else None
        )
        overall_timeout.daemon = True
        overall_timeout.start()
        
        # Yield events as they become available
        while not (all_done.is_set() and event_queue.empty()):
            try:
                # Get events with a timeout to check if we're done
                event = event_queue.get(timeout=0.1)
                yield event
            except queue.Empty:
                # No events right now, continue checking
                pass
                
        # Clean up the overall timeout if it's still active
        if overall_timeout.is_alive():
            overall_timeout.cancel()
    
    return Response(stream_with_context(generate()), 
                   mimetype='text/event-stream',
                   headers={'Cache-Control': 'no-cache',
                           'X-Accel-Buffering': 'no'})

if __name__ == '__main__':
    app.run(debug=True)