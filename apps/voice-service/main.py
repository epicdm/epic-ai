import os
from flask import Flask, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

@app.route('/health')
def health_check():
    return jsonify({"status": "healthy", "service": "voice-service"}), 200

@app.route('/')
def home():
    return "Epic AI Voice Service (Stub)", 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
