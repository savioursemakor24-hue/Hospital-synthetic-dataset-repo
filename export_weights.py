import json
import joblib
import numpy as np

OUTPUT_DIR = r"C:\Users\USER\.gemini\antigravity\scratch\hospital-classification\model_output"
final_pipe = joblib.load(rf"{OUTPUT_DIR}\heart_disease_pipeline.joblib")
lr_pipe = joblib.load(rf"{OUTPUT_DIR}\heart_disease_lr_pipeline.joblib")

preprocessor = final_pipe.named_steps['preprocessor']
scaler = preprocessor.named_transformers_['num']
encoder = preprocessor.named_transformers_['cat']

num_features = ['age', 'blood_pressure', 'cholesterol', 'bmi', 'physical_activity', 'stress_level']
cat_features = ['sex', 'smoker', 'diabetes', 'family_history']

# Categorical categories
cat_categories = {}
for feat, cats in zip(cat_features, encoder.categories_):
    cat_categories[feat] = list(cats)

lr_clf = lr_pipe.named_steps['classifier']
scaler_lr = lr_pipe.named_steps['preprocessor'].named_transformers_['num']

weights_payload = {
    'numerical_features': num_features,
    'scaler': {
        'mean': [float(m) for m in scaler.mean_],
        'scale': [float(s) for s in scaler.scale_]
    },
    'categorical_features': cat_features,
    'categories': cat_categories,
    'feature_order': [
        'age', 'blood_pressure', 'cholesterol', 'bmi', 'physical_activity', 'stress_level',
        'sex_Male', 'smoker_Yes', 'diabetes_Yes', 'family_history_Yes'
    ],
    'logistic_regression': {
        'intercept': float(lr_clf.intercept_[0]),
        'coefficients': [float(c) for c in lr_clf.coef_[0]]
    }
}

with open(rf"{OUTPUT_DIR}\model_weights.json", "w") as f:
    json.dump(weights_payload, f, indent=2)

print("Exported model_weights.json successfully!")
print("Categories:", cat_categories)
print("Coefficients:", lr_clf.coef_[0])
