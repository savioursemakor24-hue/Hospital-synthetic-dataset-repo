// CardioSense AI Frontend Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let modelWeights = null;
  let metricsData = null;
  let batchResults = [];

  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const form = document.getElementById('predictionForm');
  const presetSelect = document.getElementById('presetSelect');
  const bmiInput = document.getElementById('bmi');
  const bmiCategoryBadge = document.getElementById('bmiCategoryBadge');
  const stressInput = document.getElementById('stress_level');
  const stressValue = document.getElementById('stressValue');
  const gaugeFill = document.getElementById('gaugeFill');
  const gaugePercentage = document.getElementById('gaugePercentage');
  const riskStatusPill = document.getElementById('riskStatusPill');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const engineBadge = document.getElementById('engineBadge');
  const riskFactorsList = document.getElementById('riskFactorsList');
  const recommendationBox = document.getElementById('recommendationBox');
  const recommendationText = document.getElementById('recommendationText');

  // Load Model Weights and Metrics
  async function loadData() {
    try {
      const wRes = await fetch('model_weights.json');
      if (wRes.ok) modelWeights = await wRes.json();
    } catch (e) {
      console.warn('Could not load local model_weights.json:', e);
    }

    try {
      const mRes = await fetch('metrics.json');
      if (mRes.ok) {
        metricsData = await mRes.json();
        renderFeatureImportance(metricsData.feature_importances);
      }
    } catch (e) {
      console.warn('Could not load local metrics.json:', e);
    }
  }
  loadData();

  // Tab Navigation
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');
    });
  });

  // Dynamic BMI Category Badge
  function updateBMIBadge() {
    const val = parseFloat(bmiInput.value);
    if (isNaN(val)) return;
    if (val < 18.5) {
      bmiCategoryBadge.textContent = 'Underweight';
      bmiCategoryBadge.style.background = '#e0f2fe';
      bmiCategoryBadge.style.color = '#0369a1';
    } else if (val < 25.0) {
      bmiCategoryBadge.textContent = 'Normal';
      bmiCategoryBadge.style.background = '#ecfdf5';
      bmiCategoryBadge.style.color = '#047857';
    } else if (val < 30.0) {
      bmiCategoryBadge.textContent = 'Overweight';
      bmiCategoryBadge.style.background = '#fffbeb';
      bmiCategoryBadge.style.color = '#b45309';
    } else {
      bmiCategoryBadge.textContent = 'Obese';
      bmiCategoryBadge.style.background = '#fef2f2';
      bmiCategoryBadge.style.color = '#b91c1c';
    }
  }
  bmiInput.addEventListener('input', updateBMIBadge);
  updateBMIBadge();

  // Stress Level Slider Text
  stressInput.addEventListener('input', () => {
    stressValue.textContent = stressInput.value;
  });

  // Presets
  const presets = {
    high_risk: {
      age: 68, sex: 'Male', blood_pressure: 156, cholesterol: 255, bmi: 34.2,
      smoker: 'Yes', diabetes: 'Yes', physical_activity: 0, family_history: 'Yes', stress_level: 8
    },
    low_risk: {
      age: 35, sex: 'Female', blood_pressure: 110, cholesterol: 175, bmi: 21.5,
      smoker: 'No', diabetes: 'No', physical_activity: 4, family_history: 'No', stress_level: 2
    },
    borderline: {
      age: 52, sex: 'Male', blood_pressure: 130, cholesterol: 215, bmi: 26.8,
      smoker: 'No', diabetes: 'No', physical_activity: 2, family_history: 'Yes', stress_level: 5
    },
    random: () => {
      const sexes = ['Male', 'Female'];
      const yesNo = ['No', 'Yes'];
      return {
        age: Math.floor(Math.random() * (78 - 30) + 30),
        sex: sexes[Math.floor(Math.random() * 2)],
        blood_pressure: Math.floor(Math.random() * (180 - 90) + 90),
        cholesterol: Math.floor(Math.random() * (300 - 150) + 150),
        bmi: parseFloat((Math.random() * (40 - 18) + 18).toFixed(1)),
        smoker: yesNo[Math.floor(Math.random() * 2)],
        diabetes: yesNo[Math.floor(Math.random() * 2)],
        physical_activity: Math.floor(Math.random() * 5),
        family_history: yesNo[Math.floor(Math.random() * 2)],
        stress_level: Math.floor(Math.random() * 10) + 1
      };
    }
  };

  presetSelect.addEventListener('change', (e) => {
    const key = e.target.value;
    if (!key) return;
    const data = typeof presets[key] === 'function' ? presets[key]() : presets[key];

    document.getElementById('age').value = data.age;
    document.getElementById('sex').value = data.sex;
    document.getElementById('blood_pressure').value = data.blood_pressure;
    document.getElementById('cholesterol').value = data.cholesterol;
    document.getElementById('bmi').value = data.bmi;
    document.getElementById('physical_activity').value = data.physical_activity;
    document.getElementById('stress_level').value = data.stress_level;
    stressValue.textContent = data.stress_level;

    const smokerRadio = document.querySelector(`input[name="smoker"][value="${data.smoker}"]`);
    if (smokerRadio) smokerRadio.checked = true;

    const diabetesRadio = document.querySelector(`input[name="diabetes"][value="${data.diabetes}"]`);
    if (diabetesRadio) diabetesRadio.checked = true;

    const famRadio = document.querySelector(`input[name="family_history"][value="${data.family_history}"]`);
    if (famRadio) famRadio.checked = true;

    updateBMIBadge();
    runInference();
  });

  // Client-Side Fallback Predictor
  function predictClientSide(p) {
    if (!modelWeights) {
      return { pred: 0, prob: 0.45, engine: "Client Rule Evaluator" };
    }
    const num = modelWeights.numerical_features;
    const mean = modelWeights.scaler.mean;
    const scale = modelWeights.scaler.scale;
    const coefs = modelWeights.logistic_regression.coefficients;
    const intercept = modelWeights.logistic_regression.intercept;

    let vec = [];
    for (let i = 0; i < num.length; i++) {
      const raw = parseFloat(p[num[i]]) || mean[i];
      vec.push((raw - mean[i]) / scale[i]);
    }
    vec.push(p.sex === 'Male' ? 1.0 : 0.0);
    vec.push(p.smoker === 'Yes' ? 1.0 : 0.0);
    vec.push(p.diabetes === 'Yes' ? 1.0 : 0.0);
    vec.push(p.family_history === 'Yes' ? 1.0 : 0.0);

    let z = intercept;
    for (let i = 0; i < vec.length; i++) {
      z += vec[i] * coefs[i];
    }
    const prob = 1.0 / (1.0 + Math.exp(-z));
    return {
      pred: prob >= 0.5 ? 1 : 0,
      prob: prob,
      engine: "Client-Side Standardized Logistic Engine"
    };
  }

  // Collect Form Data
  function getFormData() {
    return {
      age: parseFloat(document.getElementById('age').value),
      sex: document.getElementById('sex').value,
      blood_pressure: parseFloat(document.getElementById('blood_pressure').value),
      cholesterol: parseFloat(document.getElementById('cholesterol').value),
      bmi: parseFloat(document.getElementById('bmi').value),
      smoker: document.querySelector('input[name="smoker"]:checked')?.value || 'No',
      diabetes: document.querySelector('input[name="diabetes"]:checked')?.value || 'No',
      physical_activity: parseInt(document.getElementById('physical_activity').value, 10),
      family_history: document.querySelector('input[name="family_history"]:checked')?.value || 'No',
      stress_level: parseInt(document.getElementById('stress_level').value, 10)
    };
  }

  // Update UI with Result
  function displayResult(result) {
    const prob = result.probability || result.prob;
    const pred = result.heart_disease_prediction !== undefined ? result.heart_disease_prediction : result.pred;
    const pct = Math.round(prob * 100);

    // Gauge Update: Arc length = 251.2
    const totalDash = 251.2;
    const offset = totalDash * (1 - (pct / 100));
    gaugeFill.style.strokeDashoffset = offset;
    gaugePercentage.textContent = `${pct}%`;

    // Colors
    let color = '#10b981';
    let category = 'Low Risk';
    let pillClass = 'low';

    if (pct >= 60) {
      color = '#ef4444';
      category = 'High Risk';
      pillClass = 'high';
    } else if (pct >= 40) {
      color = '#f59e0b';
      category = 'Moderate Risk';
      pillClass = 'moderate';
    }

    gaugeFill.style.stroke = color;
    riskStatusPill.className = `risk-status-pill ${pillClass}`;
    statusIcon.textContent = pred === 1 ? '⚠️' : '✅';
    statusText.textContent = `${category} (${pred === 1 ? 'Positive Indicator' : 'Negative Indicator'})`;

    engineBadge.textContent = result.engine || "Active Pipeline";

    // Risk factors
    const factors = result.key_risk_factors || buildClientFactors(getFormData());
    if (factors.length === 0) {
      riskFactorsList.innerHTML = `<p class="empty-state">No elevated risk factors detected for this profile.</p>`;
    } else {
      riskFactorsList.innerHTML = factors.map(f => `
        <div class="factor-item">
          <span>${f.factor}</span>
          <span class="factor-tag ${f.type || 'negative'}">${f.impact}</span>
        </div>
      `).join('');
    }

    // Recommendation
    if (pct >= 60) {
      recommendationBox.className = 'recommendation-box high-alert';
      recommendationText.innerHTML = `<strong>Priority Referral Advised:</strong> High probability of cardiovascular complications. Recommend comprehensive ECG, lipid profile review, BP monitoring, and cardiovascular lifestyle intervention.`;
    } else if (pct >= 40) {
      recommendationBox.className = 'recommendation-box';
      recommendationBox.style.borderLeftColor = '#f59e0b';
      recommendationText.innerHTML = `<strong>Moderate Vigilance Recommended:</strong> Patient exhibits borderline cardiovascular metrics. Encourage aerobic physical activity, dietary sodium management, and periodic 6-month checkup.`;
    } else {
      recommendationBox.className = 'recommendation-box';
      recommendationBox.style.borderLeftColor = '#10b981';
      recommendationText.innerHTML = `<strong>Routine Maintenance:</strong> Baseline indicators fall within healthy parameters. Maintain regular physical activity and annual health screening.`;
    }
  }

  function buildClientFactors(data) {
    const factors = [];
    if (data.smoker === "Yes") factors.push({ factor: "Tobacco Smoker", impact: "High Adverse", type: "negative" });
    if (data.diabetes === "Yes") factors.push({ factor: "Diagnosed Diabetes", impact: "Adverse", type: "negative" });
    if (data.blood_pressure >= 140) factors.push({ factor: `Elevated BP (${data.blood_pressure} mmHg)`, impact: "High Adverse", type: "negative" });
    if (data.cholesterol >= 240) factors.push({ factor: `High Total Cholesterol (${data.cholesterol} mg/dL)`, impact: "Adverse", type: "negative" });
    if (data.bmi >= 30) factors.push({ factor: `High BMI (${data.bmi} - Obese)`, impact: "Adverse", type: "negative" });
    if (data.stress_level >= 7) factors.push({ factor: `Elevated Stress (${data.stress_level}/10)`, impact: "Mild Adverse", type: "negative" });
    if (data.physical_activity >= 3) factors.push({ factor: `Regular Exercise (${data.physical_activity} days/wk)`, impact: "Cardioprotective", type: "positive" });
    return factors;
  }

  // Run Inference (Tries API first, falls back to client-side)
  async function runInference() {
    const payload = getFormData();
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        displayResult(data);
        return;
      }
    } catch (err) {
      console.log('API call fallback to client model:', err);
    }

    // Client-side execution
    const clientRes = predictClientSide(payload);
    displayResult(clientRes);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runInference();
  });

  // Initial calculation
  runInference();

  // Reset Button
  document.getElementById('resetBtn').addEventListener('click', () => {
    form.reset();
    updateBMIBadge();
    stressValue.textContent = '5';
    runInference();
  });

  // Feature Importance List Rendering
  function renderFeatureImportance(featMap) {
    const container = document.getElementById('featureImportanceList');
    if (!container || !featMap) return;

    const labels = {
      'blood_pressure': 'Systolic Blood Pressure (mmHg)',
      'bmi': 'Body Mass Index (BMI)',
      'cholesterol': 'Total Cholesterol (mg/dL)',
      'age': 'Patient Age',
      'physical_activity': 'Physical Activity (Days/Week)',
      'stress_level': 'Perceived Stress Level',
      'diabetes_Yes': 'Diabetes Status (Yes/No)',
      'smoker_Yes': 'Tobacco Smoker (Yes/No)',
      'family_history_Yes': 'Family Cardiovascular History',
      'sex_Yes': 'Biological Sex'
    };

    const entries = Object.entries(featMap).sort((a, b) => b[1] - a[1]);
    const maxVal = entries[0][1] || 1;

    container.innerHTML = entries.map(([key, val]) => {
      const pct = Math.round((val / maxVal) * 100);
      const name = labels[key] || key;
      return `
        <div class="feat-bar-row">
          <div class="feat-bar-header">
            <span>${name}</span>
            <span>${(val * 100).toFixed(1)}%</span>
          </div>
          <div class="feat-bar-track">
            <div class="feat-bar-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Batch CSV Handling
  const dropZone = document.getElementById('dropZone');
  const csvFileInput = document.getElementById('csvFileInput');
  const batchResultsSection = document.getElementById('batchResultsSection');
  const batchTableBody = document.getElementById('batchTableBody');
  const downloadSampleBtn = document.getElementById('downloadSampleBtn');
  const exportResultsBtn = document.getElementById('exportResultsBtn');
  const batchSearchInput = document.getElementById('batchSearchInput');

  dropZone.addEventListener('click', () => csvFileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      processCSVFile(e.dataTransfer.files[0]);
    }
  });

  csvFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processCSVFile(e.target.files[0]);
    }
  });

  function processCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      parseAndClassifyCSV(text);
    };
    reader.readAsText(file);
  }

  function parseAndClassifyCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map(p => p.trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx];
      });

      // Prepare standard patient object
      const patient = {
        age: parseFloat(row['age'] || 50),
        sex: (row['sex'] || 'Male').capitalize(),
        blood_pressure: parseFloat(row['blood_pressure'] || 120),
        cholesterol: parseFloat(row['cholesterol'] || 200),
        bmi: parseFloat(row['bmi'] || 25),
        smoker: (row['smoker'] || 'No').capitalize(),
        diabetes: (row['diabetes'] || 'No').capitalize(),
        physical_activity: parseInt(row['physical_activity'] || 2, 10),
        family_history: (row['family_history'] || 'No').capitalize(),
        stress_level: parseInt(row['stress_level'] || 5, 10)
      };

      const predRes = predictClientSide(patient);
      patient.predicted_class = predRes.pred;
      patient.probability = predRes.prob;
      patient.probability_pct = (predRes.prob * 100).toFixed(1);
      patient.risk_band = predRes.prob >= 0.6 ? 'High Risk' : (predRes.prob >= 0.4 ? 'Moderate' : 'Low Risk');
      rows.push(patient);
    }

    batchResults = rows;
    renderBatchResults();
  }

  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
  };

  function renderBatchResults() {
    batchResultsSection.style.display = 'block';

    const total = batchResults.length;
    const highRiskCount = batchResults.filter(r => r.predicted_class === 1).length;
    const lowRiskCount = total - highRiskCount;
    const avgRisk = (batchResults.reduce((sum, r) => sum + r.probability, 0) / total * 100).toFixed(1);

    document.getElementById('totalProcessed').textContent = total;
    document.getElementById('totalHighRisk').textContent = highRiskCount;
    document.getElementById('totalLowRisk').textContent = lowRiskCount;
    document.getElementById('avgCohortRisk').textContent = `${avgRisk}%`;

    renderTableRows(batchResults);
  }

  function renderTableRows(records) {
    batchTableBody.innerHTML = records.map((r, i) => {
      const badgeClass = r.predicted_class === 1 ? 'background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;' : 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;';
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${r.age}</td>
          <td>${r.sex}</td>
          <td>${r.blood_pressure}</td>
          <td>${r.cholesterol}</td>
          <td>${r.bmi}</td>
          <td>${r.smoker}</td>
          <td>${r.diabetes}</td>
          <td>${r.physical_activity}</td>
          <td>${r.family_history}</td>
          <td>${r.stress_level}</td>
          <td><span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-weight:700;font-size:11px;${badgeClass}">${r.predicted_class === 1 ? 'Positive (1)' : 'Negative (0)'}</span></td>
          <td><strong>${r.probability_pct}%</strong></td>
          <td>${r.risk_band}</td>
        </tr>
      `;
    }).join('');
  }

  batchSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = batchResults.filter(r => 
      r.sex.toLowerCase().includes(q) ||
      r.smoker.toLowerCase().includes(q) ||
      r.risk_band.toLowerCase().includes(q) ||
      r.age.toString().includes(q)
    );
    renderTableRows(filtered);
  });

  // Download Sample CSV
  downloadSampleBtn.addEventListener('click', () => {
    const sample = `age,sex,blood_pressure,cholesterol,bmi,smoker,diabetes,physical_activity,family_history,stress_level\n68,Male,156,225,28.8,No,Yes,1,No,5\n48,Female,156,236,23.4,Yes,No,3,Yes,1\n37,Female,145,166,22,No,Yes,4,Yes,1\n40,Male,121,255,27.8,No,No,4,Yes,1\n53,Male,150,287,25.2,No,No,3,No,3`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_hospital_cohort.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Export Results
  exportResultsBtn.addEventListener('click', () => {
    if (batchResults.length === 0) return;
    const header = ['age','sex','blood_pressure','cholesterol','bmi','smoker','diabetes','physical_activity','family_history','stress_level','predicted_heart_disease','probability_percent','risk_band'];
    const lines = [header.join(',')];
    batchResults.forEach(r => {
      lines.push([r.age, r.sex, r.blood_pressure, r.cholesterol, r.bmi, r.smoker, r.diabetes, r.physical_activity, r.family_history, r.stress_level, r.predicted_class, r.probability_pct, `"${r.risk_band}"`].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cardiosense_scored_cohort.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  // API Tester Button
  const testApiBtn = document.getElementById('testApiBtn');
  const apiTestResponse = document.getElementById('apiTestResponse');
  const apiResponseCode = document.getElementById('apiResponseCode');

  testApiBtn.addEventListener('click', async () => {
    testApiBtn.disabled = true;
    testApiBtn.textContent = 'Sending POST request to /api/predict...';
    const samplePayload = {
      age: 54,
      sex: "Male",
      blood_pressure: 138,
      cholesterol: 264,
      bmi: 36.2,
      smoker: "No",
      diabetes: "No",
      physical_activity: 1,
      family_history: "Yes",
      stress_level: 7
    };
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload)
      });
      const data = await res.json();
      apiResponseCode.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      // Local demo response
      const clientRes = predictClientSide(samplePayload);
      apiResponseCode.textContent = JSON.stringify({
        status: "client_fallback_mode",
        note: "Direct browser calculation active (API endpoint is accessible when server is running or deployed on Vercel)",
        result: clientRes
      }, null, 2);
    } finally {
      apiTestResponse.style.display = 'block';
      testApiBtn.disabled = false;
      testApiBtn.textContent = 'Send Sample POST Request to /api/predict';
    }
  });
});
