import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report, roc_curve
)
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, ExtraTreesClassifier
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier

DATA_PATH = r"C:\Users\USER\.gemini\antigravity\scratch\hospital-classification\data\hospital_synthetic.csv"
OUTPUT_DIR = r"C:\Users\USER\.gemini\antigravity\scratch\hospital-classification\model_output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

df = pd.read_csv(DATA_PATH)
print("=== Dataset Summary ===")
print(f"Total rows: {len(df)}")
print(f"Features: {list(df.columns)}")
print(f"Class distribution (heart_disease):")
print(df['heart_disease'].value_counts(normalize=True))

categorical_features = ['sex', 'smoker', 'diabetes', 'family_history']
numerical_features = ['age', 'blood_pressure', 'cholesterol', 'bmi', 'physical_activity', 'stress_level']
target = 'heart_disease'

X = df[categorical_features + numerical_features]
y = df[target]

# Train-test split (80-20 stratified)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_features),
        ('cat', OneHotEncoder(drop='first', sparse_output=False), categorical_features)
    ]
)

models = {
    'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
    'Random Forest': RandomForestClassifier(n_estimators=150, max_depth=5, min_samples_split=4, random_state=42),
    'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, learning_rate=0.05, max_depth=3, random_state=42),
    'Extra Trees': ExtraTreesClassifier(n_estimators=150, max_depth=5, random_state=42),
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scoring = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']

cv_results = {}
test_evaluations = {}

print("\n=== Model Benchmark & Cross-Validation (5-Fold CV) ===")
best_model_name = None
best_score = -1

for name, clf in models.items():
    pipe = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', clf)
    ])
    
    cv_score = cross_validate(pipe, X_train, y_train, cv=cv, scoring=scoring)
    
    mean_acc = np.mean(cv_score['test_accuracy'])
    mean_prec = np.mean(cv_score['test_precision'])
    mean_rec = np.mean(cv_score['test_recall'])
    mean_f1 = np.mean(cv_score['test_f1'])
    mean_auc = np.mean(cv_score['test_roc_auc'])
    
    cv_results[name] = {
        'accuracy': float(mean_acc),
        'precision': float(mean_prec),
        'recall': float(mean_rec),
        'f1': float(mean_f1),
        'roc_auc': float(mean_auc)
    }
    
    # Train on full train set and evaluate on test set
    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_test)
    y_prob = pipe.predict_proba(X_test)[:, 1]
    
    test_acc = accuracy_score(y_test, y_pred)
    test_prec = precision_score(y_test, y_pred, zero_division=0)
    test_rec = recall_score(y_test, y_pred, zero_division=0)
    test_f1 = f1_score(y_test, y_pred, zero_division=0)
    test_auc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred).tolist()
    
    test_evaluations[name] = {
        'test_accuracy': float(test_acc),
        'test_precision': float(test_prec),
        'test_recall': float(test_rec),
        'test_f1': float(test_f1),
        'test_roc_auc': float(test_auc),
        'confusion_matrix': cm
    }
    
    print(f"{name:26} | CV ROC-AUC: {mean_auc:.4f} | CV F1: {mean_f1:.4f} | Test Acc: {test_acc:.4f} | Test AUC: {test_auc:.4f}")
    
    if mean_auc > best_score:
        best_score = mean_auc
        best_model_name = name

print(f"\n>>> Selected Best Model by CV ROC-AUC: {best_model_name}")

# Fit best model on all training data
best_pipe = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', models[best_model_name])
])
best_pipe.fit(X_train, y_train)

# Detailed evaluation of best model
y_pred = best_pipe.predict(X_test)
y_prob = best_pipe.predict_proba(X_test)[:, 1]

fpr, tpr, _ = roc_curve(y_test, y_prob)
roc_data = [{'fpr': float(f), 'tpr': float(t)} for f, t in zip(fpr, tpr)]

cm = confusion_matrix(y_test, y_pred)
tn, fp, fn, tp = cm.ravel()
clf_report = classification_report(y_test, y_pred, output_dict=True)

# Feature importance analysis
feature_names = numerical_features + [f"{cat}_Yes" for cat in categorical_features]
feature_importances = {}
clf_step = best_pipe.named_steps['classifier']
if hasattr(clf_step, 'feature_importances_'):
    for feat_name, imp in zip(feature_names, clf_step.feature_importances_):
        feature_importances[feat_name] = float(imp)
elif hasattr(clf_step, 'coef_'):
    for feat_name, coef in zip(feature_names, clf_step.coef_[0]):
        feature_importances[feat_name] = float(coef)

# Also train logistic regression for explicit odds ratio interpretability
lr_pipe = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', LogisticRegression(max_iter=1000, random_state=42))
])
lr_pipe.fit(X_train, y_train)
lr_coefs = dict(zip(feature_names, [float(c) for c in lr_pipe.named_steps['classifier'].coef_[0]]))

# Also fit on the entire dataset for final deployment artifact
final_pipe = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', models[best_model_name])
])
final_pipe.fit(X, y)

# Save pipeline model
joblib.dump(final_pipe, os.path.join(OUTPUT_DIR, "heart_disease_pipeline.joblib"))
joblib.dump(best_pipe, os.path.join(OUTPUT_DIR, "heart_disease_test_pipeline.joblib"))
joblib.dump(lr_pipe, os.path.join(OUTPUT_DIR, "heart_disease_lr_pipeline.joblib"))

metrics_summary = {
    'dataset': {
        'total_samples': len(df),
        'features': categorical_features + numerical_features,
        'categorical_features': categorical_features,
        'numerical_features': numerical_features,
        'target': target,
        'positive_class_prevalence': float(y.mean()),
    },
    'best_model': best_model_name,
    'cv_results': cv_results,
    'test_evaluations': test_evaluations,
    'final_test_metrics': {
        'accuracy': float(accuracy_score(y_test, y_pred)),
        'precision': float(precision_score(y_test, y_pred)),
        'recall': float(recall_score(y_test, y_pred)),
        'f1': float(f1_score(y_test, y_pred)),
        'roc_auc': float(roc_auc_score(y_test, y_prob)),
        'confusion_matrix': {
            'true_negative': int(tn),
            'false_positive': int(fp),
            'false_negative': int(fn),
            'true_positive': int(tp)
        },
        'classification_report': clf_report,
        'roc_curve': roc_data
    },
    'feature_importances': feature_importances,
    'logistic_regression_coefficients': lr_coefs
}

with open(os.path.join(OUTPUT_DIR, "metrics.json"), "w") as f:
    json.dump(metrics_summary, f, indent=2)

print("\n=== Model Metrics Exported Successfully ===")
print(f"Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")
print(f"Test Accuracy: {metrics_summary['final_test_metrics']['accuracy']:.4f}")
print(f"Test ROC-AUC: {metrics_summary['final_test_metrics']['roc_auc']:.4f}")
print(f"Test F1-Score: {metrics_summary['final_test_metrics']['f1']:.4f}")
