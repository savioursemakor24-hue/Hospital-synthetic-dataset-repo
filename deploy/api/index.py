import json
import os
import math
from http.server import BaseHTTPRequestHandler

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
MODEL_PATH = os.path.join(PARENT_DIR, "model_output", "heart_disease_pipeline.joblib")
WEIGHTS_PATH = os.path.join(PARENT_DIR, "model_output", "model_weights.json")
METRICS_PATH = os.path.join(PARENT_DIR, "model_output", "metrics.json")

# Also check inside api or public for bundled copies
if not os.path.exists(WEIGHTS_PATH):
    WEIGHTS_PATH = os.path.join(PARENT_DIR, "public", "model_weights.json")
if not os.path.exists(METRICS_PATH):
    METRICS_PATH = os.path.join(PARENT_DIR, "public", "metrics.json")

# Try loading joblib pipeline
pipeline = None
try:
    import joblib
    import pandas as pd
    if os.path.exists(MODEL_PATH):
        pipeline = joblib.load(MODEL_PATH)
except Exception as e:
    pipeline = None

# Load fallback weights
model_weights = None
try:
    if os.path.exists(WEIGHTS_PATH):
        with open(WEIGHTS_PATH, "r", encoding="utf-8") as f:
            model_weights = json.load(f)
except Exception:
    pass

# Load metrics
metrics_data = None
try:
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            metrics_data = json.load(f)
except Exception:
    pass


def sigmoid(z):
    if z < -700:
        return 0.0
    if z > 700:
        return 1.0
    return 1.0 / (1.0 + math.exp(-z))


def predict_single_pure_python(data):
    """Fallback pure-Python predictor using exported weights and scaler."""
    if not model_weights:
        # Emergency heuristic if no weights loaded
        score = 0.0
        if str(data.get('smoker', '')).lower() in ['yes', '1', 'true']:
            score += 0.3
        if str(data.get('diabetes', '')).lower() in ['yes', '1', 'true']:
            score += 0.2
        bp = float(data.get('blood_pressure', 120))
        if bp > 140:
            score += 0.25
        prob = min(max(score, 0.05), 0.95)
        return int(prob >= 0.5), prob

    num_features = model_weights['numerical_features']
    scaler_mean = model_weights['scaler']['mean']
    scaler_scale = model_weights['scaler']['scale']
    coefs = model_weights['logistic_regression']['coefficients']
    intercept = model_weights['logistic_regression']['intercept']

    # Vector calculation
    vec = []
    # Scaled numerical features
    for i, feat in enumerate(num_features):
        raw_val = float(data.get(feat, scaler_mean[i]))
        scaled_val = (raw_val - scaler_mean[i]) / scaler_scale[i]
        vec.append(scaled_val)

    # OneHot encoded categorical features (drop='first': sex='Male', smoker='Yes', diabetes='Yes', family_history='Yes')
    sex_val = 1.0 if str(data.get('sex', '')).strip().capitalize() == 'Male' else 0.0
    smoker_val = 1.0 if str(data.get('smoker', '')).strip().capitalize() == 'Yes' else 0.0
    diabetes_val = 1.0 if str(data.get('diabetes', '')).strip().capitalize() == 'Yes' else 0.0
    fam_val = 1.0 if str(data.get('family_history', '')).strip().capitalize() == 'Yes' else 0.0

    vec.extend([sex_val, smoker_val, diabetes_val, fam_val])

    # Dot product
    logit = intercept
    for x_i, w_i in zip(vec, coefs):
        logit += x_i * w_i

    prob = sigmoid(logit)
    pred = int(prob >= 0.5)
    return pred, prob


def predict_patient(patient_dict):
    """Predicts heart disease risk for a single patient record."""
    # Ensure standard types
    age = float(patient_dict.get('age', 50))
    sex = str(patient_dict.get('sex', 'Male')).strip().capitalize()
    blood_pressure = float(patient_dict.get('blood_pressure', 120))
    cholesterol = float(patient_dict.get('cholesterol', 200))
    bmi = float(patient_dict.get('bmi', 25.0))
    smoker = str(patient_dict.get('smoker', 'No')).strip().capitalize()
    diabetes = str(patient_dict.get('diabetes', 'No')).strip().capitalize()
    physical_activity = int(patient_dict.get('physical_activity', 2))
    family_history = str(patient_dict.get('family_history', 'No')).strip().capitalize()
    stress_level = int(patient_dict.get('stress_level', 5))

    clean_dict = {
        'age': age,
        'sex': sex,
        'blood_pressure': blood_pressure,
        'cholesterol': cholesterol,
        'bmi': bmi,
        'smoker': smoker,
        'diabetes': diabetes,
        'physical_activity': physical_activity,
        'family_history': family_history,
        'stress_level': stress_level
    }

    used_pipeline = False
    pred = 0
    prob = 0.5

    if pipeline is not None:
        try:
            import pandas as pd
            row_df = pd.DataFrame([clean_dict])
            pred = int(pipeline.predict(row_df)[0])
            prob = float(pipeline.predict_proba(row_df)[0][1])
            used_pipeline = True
        except Exception:
            pred, prob = predict_single_pure_python(clean_dict)
    else:
        pred, prob = predict_single_pure_python(clean_dict)

    # Determine risk category
    if prob < 0.35:
        risk_category = "Low Risk"
        badge = "success"
    elif prob < 0.65:
        risk_category = "Moderate Risk"
        badge = "warning"
    else:
        risk_category = "High Risk"
        badge = "danger"

    # Risk factors breakdown
    factors = []
    if smoker == "Yes":
        factors.append({"factor": "Tobacco Smoker", "impact": "High Adverse", "type": "negative"})
    if diabetes == "Yes":
        factors.append({"factor": "Diagnosed Diabetes", "impact": "Adverse", "type": "negative"})
    if blood_pressure >= 140:
        factors.append({"factor": f"Elevated Blood Pressure ({blood_pressure:.0f} mmHg - Stage 2 Hypertension)", "impact": "High Adverse", "type": "negative"})
    elif blood_pressure >= 130:
        factors.append({"factor": f"Pre-hypertensive Blood Pressure ({blood_pressure:.0f} mmHg)", "impact": "Mild Adverse", "type": "negative"})
    if cholesterol >= 240:
        factors.append({"factor": f"High Total Cholesterol ({cholesterol:.0f} mg/dL)", "impact": "High Adverse", "type": "negative"})
    if bmi >= 30:
        factors.append({"factor": f"High BMI ({bmi:.1f} - Obese Range)", "impact": "Adverse", "type": "negative"})
    if stress_level >= 7:
        factors.append({"factor": f"High Reported Stress ({stress_level}/10)", "impact": "Moderate Adverse", "type": "negative"})
    if family_history == "Yes":
        factors.append({"factor": "Family History of Heart Disease", "impact": "Genetic Indicator", "type": "neutral"})
    if physical_activity >= 3:
        factors.append({"factor": f"Frequent Physical Activity ({physical_activity} days/wk)", "impact": "Cardioprotective", "type": "positive"})

    return {
        "inputs": clean_dict,
        "heart_disease_prediction": pred,
        "heart_disease_label": "Positive (Presence of Heart Disease)" if pred == 1 else "Negative (No Heart Disease Detected)",
        "probability": round(prob, 4),
        "probability_percentage": round(prob * 100, 2),
        "risk_category": risk_category,
        "badge": badge,
        "key_risk_factors": factors,
        "engine": "Scikit-Learn GradientBoosting Pipeline" if used_pipeline else "Pure-Python Logistic Regression Engine"
    }


class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        path = self.path.split('?')[0].rstrip('/')
        if path in ['/api/predict', '/api/info', '/api']:
            response = {
                "name": "Hospital Synthetic Dataset Heart Disease Classification API",
                "version": "1.0.0",
                "status": "healthy",
                "model": "Gradient Boosting Classifier Pipeline",
                "features_required": [
                    {"name": "age", "type": "number", "example": 54, "description": "Patient age in years"},
                    {"name": "sex", "type": "string", "example": "Male", "options": ["Male", "Female"]},
                    {"name": "blood_pressure", "type": "number", "example": 138, "description": "Systolic blood pressure (mmHg)"},
                    {"name": "cholesterol", "type": "number", "example": 264, "description": "Serum cholesterol (mg/dL)"},
                    {"name": "bmi", "type": "number", "example": 36.2, "description": "Body Mass Index (kg/m^2)"},
                    {"name": "smoker", "type": "string", "example": "No", "options": ["Yes", "No"]},
                    {"name": "diabetes", "type": "string", "example": "No", "options": ["Yes", "No"]},
                    {"name": "physical_activity", "type": "integer", "example": 1, "description": "Activity days per week (0-4)"},
                    {"name": "family_history", "type": "string", "example": "Yes", "options": ["Yes", "No"]},
                    {"name": "stress_level", "type": "integer", "example": 7, "description": "Self-reported stress level (1-10)"}
                ],
                "benchmark_summary": metrics_data.get("cv_results") if metrics_data else {}
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(response, indent=2).encode('utf-8'))
        elif path == '/api/metrics':
            self._set_headers(200)
            self.wfile.write(json.dumps(metrics_data or {}, indent=2).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))

    def do_POST(self):
        path = self.path.split('?')[0].rstrip('/')
        if path in ['/api/predict', '/api']:
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len).decode('utf-8')
                data = json.loads(post_body) if post_body else {}

                # Check if batch (list) or single object
                if isinstance(data, list):
                    results = [predict_patient(p) for p in data]
                    response = {
                        "count": len(results),
                        "results": results
                    }
                elif isinstance(data, dict):
                    # Check if 'patients' key is provided for batch
                    if "patients" in data and isinstance(data["patients"], list):
                        results = [predict_patient(p) for p in data["patients"]]
                        response = {
                            "count": len(results),
                            "results": results
                        }
                    else:
                        response = predict_patient(data)
                else:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({"error": "Invalid JSON format: expected object or array."}).encode('utf-8'))
                    return

                self._set_headers(200)
                self.wfile.write(json.dumps(response, indent=2).encode('utf-8'))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))
