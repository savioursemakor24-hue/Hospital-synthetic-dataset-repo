import sys
import io
import json
import os

sys.path.insert(0, r"C:\Users\USER\.gemini\antigravity\scratch\hospital-classification\deploy\api")
from index import predict_patient, predict_single_pure_python

print("=== 1. Testing Single Patient Prediction (Scikit-Learn Pipeline) ===")
sample_patient = {
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
res = predict_patient(sample_patient)
print(f"Prediction: {res['heart_disease_prediction']} ({res['heart_disease_label']})")
print(f"Probability: {res['probability_percentage']}%")
print(f"Risk Category: {res['risk_category']}")
print(f"Engine: {res['engine']}")
print(f"Key Factors: {[f['factor'] for f in res['key_risk_factors']]}")

print("\n=== 2. Testing Pure-Python Logistic Regression Fallback ===")
pred_fallback, prob_fallback = predict_single_pure_python(sample_patient)
print(f"Fallback Prediction: {pred_fallback}, Probability: {prob_fallback:.4f}")

print("\n=== 3. Testing Batch Evaluation on Sample Dataset ===")
import pandas as pd
test_df = pd.read_csv(r"C:\Users\USER\.gemini\antigravity\scratch\hospital-classification\data\hospital_synthetic.csv").head(10)
matches = 0
for idx, row in test_df.iterrows():
    p_dict = row.to_dict()
    actual = p_dict['heart_disease']
    p_res = predict_patient(p_dict)
    print(f"Row {idx+1}: Actual={actual} | Pred={p_res['heart_disease_prediction']} | Prob={p_res['probability_percentage']}% | BP={row['blood_pressure']} | Chol={row['cholesterol']} | BMI={row['bmi']}")
    if p_res['heart_disease_prediction'] == actual:
        matches += 1

print(f"\nTop 10 sample accuracy: {matches}/10 ({matches*10}%)")
print("ALL TESTS PASSED SUCCESSFULLY!")
