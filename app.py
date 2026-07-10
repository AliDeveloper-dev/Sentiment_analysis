from flask import Flask, render_template, request, jsonify
import joblib
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem.porter import PorterStemmer

nltk.download('stopwords', quiet=True)

app = Flask(__name__)

model = joblib.load('sentiment_logistic_model.pkl')
vectorizer = joblib.load('sentiment_vectorizer.pkl')

port_stem = PorterStemmer()
STOP_WORDS = set(stopwords.words('english'))


def clean_text(content):
    content = re.sub('[^a-zA-Z]', ' ', content)
    content = content.lower()
    tokens = content.split()
    tokens = [port_stem.stem(w) for w in tokens if w not in STOP_WORDS]
    return ' '.join(tokens)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(silent=True) or {}
    raw_text = (data.get('text') or '').strip()

    if not raw_text:
        return jsonify({'error': 'EMPTY_INPUT'}), 400

    cleaned = clean_text(raw_text)
    if not cleaned:
        return jsonify({'error': 'NO_VALID_TOKENS'}), 400

    vec = vectorizer.transform([cleaned])
    pred = int(model.predict(vec)[0])
    proba = model.predict_proba(vec)[0]
    confidence = float(max(proba))

    if 0.45 <= proba[1] <= 0.55:
        label = 'NEUTRAL'
    else:
        label = 'POSITIVE' if pred == 1 else 'NEGATIVE'

    return jsonify({
        'label': label,
        'confidence': round(confidence * 100, 2),
        'neg_score': round(float(proba[0]) * 100, 2),
        'pos_score': round(float(proba[1]) * 100, 2),
        'cleaned_input': cleaned
    })


if __name__ == '__main__':
    app.run(debug=True)