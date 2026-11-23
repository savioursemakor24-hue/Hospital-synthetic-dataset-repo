# CardioSense AI: Hospital Synthetic Dataset Classification System

An end-to-end Machine Learning classification pipeline, clinical risk-stratification dashboard, and Vercel-ready serverless REST API trained on the Hospital Synthetic Dataset.

---

## 1. Project Overview & Architecture

- **Dataset**: Hospital Synthetic Heart Disease Dataset ($N = 500$ patients, balanced binary target: $53.2\%$ positive, $46.8\%$ negative).
- **All 10 Features Utilized**:
  - **Numerical Features** (Standardized with `StandardScaler`):
    - `age`: Patient age in years ($30 - 79$)
    - `blood_pressure`: Systolic blood pressure in mmHg ($90 - 179$)
    - `cholesterol`: Serum cholesterol level in mg/dL ($150 - 299$)
    - `bmi`: Body Mass Index in $\text{kg}/\text{m}^2$ ($18.1 - 40.0$)
    - `physical_activity`: Days per week of physical activity ($0 - 4$)
    - `stress_level`: Self-reported perceived stress scale ($1 - 9$)
  - **Categorical Features** (Encoded with `OneHotEncoder(drop='first')`):
    - `sex`: `Male`, `Female`
    - `smoker`: `Yes`, `No`
    - `diabetes`: `Yes`, `No`
    - `family_history`: `Yes`, `No`
- **Target Variable**: `heart_disease` ($0 = \text{No Disease}$, $1 = \text{Heart Disease Present}$).

---

## 2. Model Benchmark & Evaluation (5-Fold Stratified Cross Validation)

The classification pipeline was trained with a stratified $80/20$ train-test split ($N_{\text{train}} = 400$, $N_{\text{test}} = 100$) and evaluated through 5-Fold Stratified Cross-Validation across multiple learning algorithms:

| Model Architecture | 5-Fold CV ROC-AUC | 5-Fold CV F1-Score | 5-Fold CV Accuracy | Test Accuracy | Test ROC-AUC |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Gradient Boosting (Champion)** | **0.5632** | **0.5916** | **53.75%** | **51.00%** | **0.5387** |
| **Support Vector Classifier (RBF)** | 0.5342 | 0.5939 | 52.25% | 58.00% | 0.5857 |
| **Logistic Regression (L2)** | 0.5301 | 0.6137 | 53.50% | 55.00% | 0.5046 |
| **Random Forest (150 trees)** | 0.5292 | 0.5865 | 50.50% | 53.00% | 0.5227 |
| **Extra Trees Classifier** | 0.5110 | 0.6044 | 50.50% | 55.00% | 0.5271 |

### Hold-out Test Confusion Matrix ($N = 100$):
- **True Negatives (TN)**: $14$
- **False Positives (FP)**: $33$
- **False Negatives (FN)**: $16$
- **True Positives (TP)**: $37$
- **Hold-out Test F1-Score**: $0.6016$
- **Hold-out Test Precision**: $0.5286$
- **Hold-out Test Recall**: $0.6981$

### Primary Feature Importances:
1. **BMI** ($\approx 26.3\%$ relative importance)
2. **Systolic Blood Pressure** ($\approx 25.4\%$ relative importance)
3. **Total Cholesterol** ($\approx 20.2\%$ relative importance)
4. **Age** ($\approx 12.6\%$ relative importance)
5. **Physical Activity** ($\approx 6.2\%$ relative importance)
6. **Stress Level** ($\approx 4.5\%$ relative importance)

---

## 3. Directory Layout

```
hospital-classification/
├── data/
│   └── hospital_synthetic.csv        # Raw dataset (500 records)
├── model_output/
│   ├── heart_disease_pipeline.joblib # Full Scikit-Learn Pipeline
│   ├── heart_disease_lr_pipeline.joblib
│   ├── model_weights.json            # Portable standardized coefficients
│   └── metrics.json                  # Complete evaluation metrics & benchmark
├── deploy/
│   ├── vercel.json                   # Zero-config Vercel deployment spec
│   ├── requirements.txt              # Python serverless dependencies
│   ├── server.py                     # Standalone local dev & production server
│   ├── api/
│   │   └── index.py                  # Vercel serverless function (BaseHTTPRequestHandler)
│   ├── model_output/                 # Bundled binary artifacts for deployment
│   └── public/
│       ├── index.html                # Responsive clinical dashboard UI
│       ├── style.css                 # Modern CSS styles & animations
│       ├── app.js                    # Client-side reactivity, presets & batch engine
│       ├── metrics.json              # Client metrics feed
│       └── model_weights.json        # Client-side inference weights
├── train_and_evaluate.py             # Training and 5-fold cross-validation script
├── export_weights.py                 # Weight extraction script
└── test_handler.py                   # Automated test script
```

---

## 4. Running the Application Locally

To test the application and REST API locally using Python:

```bash
cd deploy
python server.py 8000
```

Open your browser to:
- **Web Dashboard**: `http://localhost:8000/`
- **REST API Info**: `http://localhost:8000/api/predict`

---

## 5. Deploying to Vercel

The application is pre-configured for Vercel with zero additional configuration needed.

### Method A: Deploy with Vercel CLI (Recommended)
From inside the `deploy/` directory:
```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy directly to Vercel preview
vercel

# Deploy directly to Production
vercel --prod
```

### Method B: Deploy via GitHub / GitLab / Bitbucket
1. Initialize a git repository inside the project or `deploy/` directory:
   ```bash
   git init
   git add .
   git commit -m "Hospital classification pipeline and Vercel web app"
   ```
2. Push to your GitHub repository.
3. Go to [vercel.com/new](https://vercel.com/new) and click **Import**.
4. Leave all settings at default (`vercel.json` automatically configures routes).
5. Click **Deploy**.

---

## 6. REST API Reference

### Single Patient Inference: `POST /api/predict`

**Request Headers**:
`Content-Type: application/json`

**Sample Request Body**:
```json
{
  "age": 54,
  "sex": "Male",
  "blood_pressure": 138,
  "cholesterol": 264,
  "bmi": 36.2,
  "smoker": "No",
  "diabetes": "No",
  "physical_activity": 1,
  "family_history": "Yes",
  "stress_level": 7
}
```

**Sample Response Body**:
```json
{
  "inputs": {
    "age": 54.0,
    "sex": "Male",
    "blood_pressure": 138.0,
    "cholesterol": 264.0,
    "bmi": 36.2,
    "smoker": "No",
    "diabetes": "No",
    "physical_activity": 1,
    "family_history": "Yes",
    "stress_level": 7
  },
  "heart_disease_prediction": 1,
  "heart_disease_label": "Positive (Presence of Heart Disease)",
  "probability": 0.6056,
  "probability_percentage": 60.56,
  "risk_category": "Moderate Risk",
  "badge": "warning",
  "key_risk_factors": [
    {
      "factor": "Pre-hypertensive Blood Pressure (138 mmHg)",
      "impact": "Mild Adverse",
      "type": "negative"
    },
    {
      "factor": "High Total Cholesterol (264 mg/dL)",
      "impact": "High Adverse",
      "type": "negative"
    },
    {
      "factor": "High BMI (36.2 - Obese Range)",
      "impact": "Adverse",
      "type": "negative"
    },
    {
      "factor": "High Reported Stress (7/10)",
      "impact": "Moderate Adverse",
      "type": "negative"
    },
    {
      "factor": "Family History of Heart Disease",
      "impact": "Genetic Indicator",
      "type": "neutral"
    }
  ],
  "engine": "Scikit-Learn GradientBoosting Pipeline"
}
```

### Batch Patient Inference: `POST /api/predict`
Send an array of patient objects or an object with a `"patients"` array to score cohorts in a single call.
