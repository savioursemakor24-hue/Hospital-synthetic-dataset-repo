// CardioPulse AI — Interactive Application Engine
document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let modelWeights = null;
  let metricsData = null;
  let currentCohort = [];
  let currentSnippetLang = 'curl';

  // DOM Elements
  const tabButtons = document.querySelectorAll('.nav-hub-btn');
  const tabViews = document.querySelectorAll('.tab-view');

  // Input Elements
  const ageInput = document.getElementById('age');
  const ageValDisplay = document.getElementById('ageValDisplay');
  const sexInputs = document.querySelectorAll('input[name="sex"]');
  const bpInput = document.getElementById('blood_pressure');
  const bpTag = document.getElementById('bpTag');
  const cholInput = document.getElementById('cholesterol');
  const cholTag = document.getElementById('cholTag');
  const bmiInput = document.getElementById('bmi');
  const bmiTag = document.getElementById('bmiTag');
  const smokerInputs = document.querySelectorAll('input[name="smoker"]');
  const diabetesInputs = document.querySelectorAll('input[name="diabetes"]');
  const familyHistoryInputs = document.querySelectorAll('input[name="family_history"]');
  const activityChips = document.querySelectorAll('.day-chip');
  const activityHiddenInput = document.getElementById('physical_activity');
  const activityDisplay = document.getElementById('activityDisplay');
  const activityHint = document.getElementById('activityHint');
  const stressInput = document.getElementById('stress_level');
  const stressValDisplay = document.getElementById('stressValDisplay');

  // Verdict Elements
  const gaugeProgress = document.getElementById('gaugeProgress');
  const riskScoreDisplay = document.getElementById('riskScoreDisplay');
  const verdictBanner = document.getElementById('verdictBanner');
  const bannerIcon = document.getElementById('bannerIcon');
  const verdictHeading = document.getElementById('verdictHeading');
  const verdictSub = document.getElementById('verdictSub');
  const driverBarsContainer = document.getElementById('driverBarsContainer');
  const recommendationText = document.getElementById('recommendationText');
  const activeEngineBadge = document.getElementById('activeEngineBadge');

  // Preset Buttons
  const presetButtons = document.querySelectorAll('.preset-btn');
  const resetFormBtn = document.getElementById('resetFormBtn');

  // Batch Screener Elements
  const uploadDropzone = document.getElementById('uploadDropzone');
  const batchFileInput = document.getElementById('batchFileInput');
  const browseFileBtn = document.getElementById('browseFileBtn');
  const loadPrebuiltCohortBtn = document.getElementById('loadPrebuiltCohortBtn');
  const downloadSampleCsvBtn = document.getElementById('downloadSampleCsvBtn');
  const batchResultsWrap = document.getElementById('batchResultsWrap');
  const cohortTableBody = document.getElementById('cohortTableBody');
  const cohortSearchInput = document.getElementById('cohortSearchInput');
  const riskFilterSelect = document.getElementById('riskFilterSelect');
  const exportScoredCsvBtn = document.getElementById('exportScoredCsvBtn');

  const kpiTotalCount = document.getElementById('kpiTotalCount');
  const kpiPositiveCount = document.getElementById('kpiPositiveCount');
  const kpiPositivePct = document.getElementById('kpiPositivePct');
  const kpiNegativeCount = document.getElementById('kpiNegativeCount');
  const kpiNegativePct = document.getElementById('kpiNegativePct');
  const kpiMeanProb = document.getElementById('kpiMeanProb');

  // Developer API Elements
  const codeTabs = document.querySelectorAll('.code-tab-btn');
  const codeSnippetBox = document.getElementById('codeSnippetBox');
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  const testApiEndpointBtn = document.getElementById('testApiEndpointBtn');
  const responseViewer = document.getElementById('responseViewer');
  const responseBodyBox = document.getElementById('responseBodyBox');
  const responseStatusBadge = document.getElementById('responseStatusBadge');

  // =================================================================
  // 1. Data Bootstrap
  // =================================================================
  async function loadMetadata() {
    try {
      const wRes = await fetch('model_weights.json');
      if (wRes.ok) modelWeights = await wRes.json();
    } catch (e) {
      console.warn('Local model_weights.json load deferred:', e);
    }

    try {
      const mRes = await fetch('metrics.json');
      if (mRes.ok) {
        metricsData = await mRes.json();
        renderFeatureImportance(metricsData.feature_importances);
      }
    } catch (e) {
      console.warn('Local metrics.json load deferred:', e);
    }
  }
  loadMetadata();

  // =================================================================
  // 2. Navigation Tab Switching
  // =================================================================
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.add('active');
    });
  });

  // =================================================================
  // 3. Clinical Biomarker Indicator Updates
  // =================================================================
  function updateAge() {
    ageValDisplay.textContent = `${ageInput.value} yrs`;
    triggerEvaluation();
  }
  ageInput.addEventListener('input', updateAge);

  function updateBP() {
    const val = parseFloat(bpInput.value) || 120;
    if (val < 120) {
      bpTag.textContent = 'Normal';
      bpTag.style.color = '#34d399';
      bpTag.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      bpTag.style.background = 'rgba(16, 185, 129, 0.15)';
    } else if (val < 130) {
      bpTag.textContent = 'Elevated';
      bpTag.style.color = '#fbbf24';
      bpTag.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      bpTag.style.background = 'rgba(245, 158, 11, 0.15)';
    } else if (val < 140) {
      bpTag.textContent = 'HTN Stage 1';
      bpTag.style.color = '#f97316';
      bpTag.style.borderColor = 'rgba(249, 115, 22, 0.4)';
      bpTag.style.background = 'rgba(249, 115, 22, 0.15)';
    } else {
      bpTag.textContent = 'HTN Stage 2';
      bpTag.style.color = '#f43f5e';
      bpTag.style.borderColor = 'rgba(244, 63, 94, 0.4)';
      bpTag.style.background = 'rgba(244, 63, 94, 0.15)';
    }
    triggerEvaluation();
  }
  bpInput.addEventListener('input', updateBP);
  updateBP();

  function updateChol() {
    const val = parseFloat(cholInput.value) || 200;
    if (val < 200) {
      cholTag.textContent = 'Desirable';
      cholTag.style.color = '#34d399';
      cholTag.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      cholTag.style.background = 'rgba(16, 185, 129, 0.15)';
    } else if (val < 240) {
      cholTag.textContent = 'Borderline';
      cholTag.style.color = '#fbbf24';
      cholTag.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      cholTag.style.background = 'rgba(245, 158, 11, 0.15)';
    } else {
      cholTag.textContent = 'High Risk';
      cholTag.style.color = '#f43f5e';
      cholTag.style.borderColor = 'rgba(244, 63, 94, 0.4)';
      cholTag.style.background = 'rgba(244, 63, 94, 0.15)';
    }
    triggerEvaluation();
  }
  cholInput.addEventListener('input', updateChol);
  updateChol();

  function updateBMI() {
    const val = parseFloat(bmiInput.value) || 25.0;
    if (val < 18.5) {
      bmiTag.textContent = 'Underweight';
      bmiTag.style.color = '#38bdf8';
      bmiTag.style.borderColor = 'rgba(56, 189, 248, 0.4)';
      bmiTag.style.background = 'rgba(56, 189, 248, 0.15)';
    } else if (val < 25.0) {
      bmiTag.textContent = 'Normal';
      bmiTag.style.color = '#34d399';
      bmiTag.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      bmiTag.style.background = 'rgba(16, 185, 129, 0.15)';
    } else if (val < 30.0) {
      bmiTag.textContent = 'Overweight';
      bmiTag.style.color = '#fbbf24';
      bmiTag.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      bmiTag.style.background = 'rgba(245, 158, 11, 0.15)';
    } else if (val < 35.0) {
      bmiTag.textContent = 'Obese Class I';
      bmiTag.style.color = '#f97316';
      bmiTag.style.borderColor = 'rgba(249, 115, 22, 0.4)';
      bmiTag.style.background = 'rgba(249, 115, 22, 0.15)';
    } else {
      bmiTag.textContent = 'Obese Class II+';
      bmiTag.style.color = '#f43f5e';
      bmiTag.style.borderColor = 'rgba(244, 63, 94, 0.4)';
      bmiTag.style.background = 'rgba(244, 63, 94, 0.15)';
    }
    triggerEvaluation();
  }
  bmiInput.addEventListener('input', updateBMI);
  updateBMI();

  // Activity Chips
  activityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      activityChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.getAttribute('data-val');
      activityHiddenInput.value = val;
      activityDisplay.textContent = `${val} ${val === '1' ? 'day' : 'days'}`;
      if (val === '0') activityHint.textContent = 'Sedentary lifestyle (elevated risk)';
      else if (val === '1') activityHint.textContent = 'Light weekly activity';
      else if (val === '2') activityHint.textContent = 'Moderate regular activity';
      else if (val === '3') activityHint.textContent = 'Active cardioprotective routine';
      else activityHint.textContent = 'Very active cardioprotective routine';
      triggerEvaluation();
    });
  });

  // Stress Slider
  function updateStress() {
    const val = parseInt(stressInput.value, 10);
    let desc = 'Low';
    if (val >= 7) desc = 'Severe';
    else if (val >= 4) desc = 'Moderate';
    stressValDisplay.textContent = `${val}/10 ${desc}`;
    triggerEvaluation();
  }
  stressInput.addEventListener('input', updateStress);

  // Radio button change listeners
  [...sexInputs, ...smokerInputs, ...diabetesInputs, ...familyHistoryInputs].forEach(input => {
    input.addEventListener('change', triggerEvaluation);
  });

  // =================================================================
  // 4. Data Extraction & Scoring Engine
  // =================================================================
  function getPatientData() {
    return {
      age: parseFloat(ageInput.value),
      sex: document.querySelector('input[name="sex"]:checked')?.value || 'Male',
      blood_pressure: parseFloat(bpInput.value) || 120,
      cholesterol: parseFloat(cholInput.value) || 200,
      bmi: parseFloat(bmiInput.value) || 25,
      smoker: document.querySelector('input[name="smoker"]:checked')?.value || 'No',
      diabetes: document.querySelector('input[name="diabetes"]:checked')?.value || 'No',
      physical_activity: parseInt(activityHiddenInput.value, 10) || 1,
      family_history: document.querySelector('input[name="family_history"]:checked')?.value || 'No',
      stress_level: parseInt(stressInput.value, 10) || 5
    };
  }

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

  // Debounced Evaluation Trigger
  let evalTimeout = null;
  function triggerEvaluation() {
    clearTimeout(evalTimeout);
    evalTimeout = setTimeout(runEvaluation, 80);
  }

  async function runEvaluation() {
    const patient = getPatientData();
    updateCodeSnippets(patient);

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      });
      if (response.ok) {
        const data = await response.json();
        renderVerdict(data);
        return;
      }
    } catch (e) {
      // Fallback to client
    }

    const clientRes = predictClientSide(patient);
    renderVerdict({
      heart_disease_prediction: clientRes.pred,
      probability: clientRes.prob,
      engine: clientRes.engine
    });
  }

  // =================================================================
  // 5. Render Verdict UI
  // =================================================================
  function renderVerdict(res) {
    const prob = res.probability !== undefined ? res.probability : 0.5;
    const pred = res.heart_disease_prediction !== undefined ? res.heart_disease_prediction : (prob >= 0.5 ? 1 : 0);
    const pct = Math.round(prob * 100);

    // Update Percentage counter
    riskScoreDisplay.innerHTML = `${pct}<span class="pct-sign">%</span>`;

    // Radial Gauge Animation
    // Total perimeter = 2 * PI * 92 = 578.05
    const totalCircumference = 578.05;
    const targetOffset = totalCircumference * (1 - (pct / 100));
    gaugeProgress.style.strokeDashoffset = targetOffset;

    // Verdict Banner & Styling
    if (pct >= 60) {
      verdictBanner.className = 'verdict-banner banner-danger';
      bannerIcon.textContent = '🚨';
      verdictHeading.textContent = 'HIGH CARDIAC RISK DETECTED';
      verdictSub.textContent = 'Classification: Positive (1) • Elevated CAD Likelihood';
    } else if (pct >= 40) {
      verdictBanner.className = 'verdict-banner banner-warning';
      bannerIcon.textContent = '⚠️';
      verdictHeading.textContent = 'MODERATE BORDERLINE RISK';
      verdictSub.textContent = `Classification: ${pred === 1 ? 'Positive (1)' : 'Negative (0)'} • Close Vigilance Indicated`;
    } else {
      verdictBanner.className = 'verdict-banner banner-success';
      bannerIcon.textContent = '✅';
      verdictHeading.textContent = 'LOW CARDIAC RISK PROFILE';
      verdictSub.textContent = 'Classification: Negative (0) • Parameters Within Range';
    }

    if (res.engine) activeEngineBadge.textContent = res.engine;

    // Render Biomarker Drivers
    const patient = getPatientData();
    renderDriverBars(patient);

    // Clinical Narrative
    renderClinicalNarrative(patient, pct);
  }

  function renderDriverBars(p) {
    const drivers = [];
    if (p.blood_pressure >= 140) drivers.push({ name: `Systolic BP (${p.blood_pressure} mmHg)`, impact: 'Severe Adverse', type: 'adverse' });
    else if (p.blood_pressure >= 130) drivers.push({ name: `Systolic BP (${p.blood_pressure} mmHg)`, impact: 'Mild Adverse', type: 'adverse' });

    if (p.cholesterol >= 240) drivers.push({ name: `Cholesterol (${p.cholesterol} mg/dL)`, impact: 'High Adverse', type: 'adverse' });
    else if (p.cholesterol >= 200) drivers.push({ name: `Cholesterol (${p.cholesterol} mg/dL)`, impact: 'Borderline', type: 'adverse' });

    if (p.bmi >= 30) drivers.push({ name: `BMI (${p.bmi} kg/m²)`, impact: 'Adverse (Obese)', type: 'adverse' });
    if (p.smoker === 'Yes') drivers.push({ name: 'Tobacco Smoking Status', impact: 'High Adverse', type: 'adverse' });
    if (p.diabetes === 'Yes') drivers.push({ name: 'Diagnosed Diabetes', impact: 'Adverse Comorbidity', type: 'adverse' });
    if (p.stress_level >= 7) drivers.push({ name: `Stress Level (${p.stress_level}/10)`, impact: 'Adverse', type: 'adverse' });
    if (p.physical_activity >= 3) drivers.push({ name: `Regular Exercise (${p.physical_activity} d/wk)`, impact: 'Cardioprotective', type: 'protect' });

    if (drivers.length === 0) {
      driverBarsContainer.innerHTML = `<div class="driver-row"><span class="driver-name">No elevated risk biomarkers detected</span><span class="driver-badge badge-protect">Optimal Baseline</span></div>`;
    } else {
      driverBarsContainer.innerHTML = drivers.map(d => `
        <div class="driver-row">
          <span class="driver-name">${d.name}</span>
          <span class="driver-badge ${d.type === 'adverse' ? 'badge-adverse' : 'badge-protect'}">${d.impact}</span>
        </div>
      `).join('');
    }
  }

  function renderClinicalNarrative(p, pct) {
    let narrative = "";
    if (pct >= 60) {
      narrative = `Patient exhibits elevated cardiac probability (${pct}%). Key contributing factors include systolic BP (${p.blood_pressure} mmHg), serum cholesterol (${p.cholesterol} mg/dL), and BMI (${p.bmi}). Strongly advise comprehensive 12-lead ECG, fasting lipid subfraction testing, and cardiology consultation.`;
    } else if (pct >= 40) {
      narrative = `Patient falls in the intermediate risk tier (${pct}%). Recommend therapeutic lifestyle intervention (DASH diet, 150 min/wk moderate aerobic exercise), stress mitigation, and re-evaluation in 3 to 6 months.`;
    } else {
      narrative = `Patient presents with low predicted heart disease likelihood (${pct}%). Current biomarkers fall within manageable limits. Reinforce maintenance of current active lifestyle and standard annual wellness checkups.`;
    }
    recommendationText.textContent = narrative;
  }

  // =================================================================
  // 6. Presets Configuration
  // =================================================================
  const presetProfiles = {
    high_risk: {
      age: 68, sex: 'Male', blood_pressure: 156, cholesterol: 255, bmi: 34.2,
      smoker: 'Yes', diabetes: 'Yes', physical_activity: 0, family_history: 'Yes', stress_level: 8
    },
    borderline: {
      age: 54, sex: 'Male', blood_pressure: 138, cholesterol: 264, bmi: 36.2,
      smoker: 'No', diabetes: 'No', physical_activity: 1, family_history: 'Yes', stress_level: 7
    },
    low_risk: {
      age: 35, sex: 'Female', blood_pressure: 110, cholesterol: 175, bmi: 21.5,
      smoker: 'No', diabetes: 'No', physical_activity: 4, family_history: 'No', stress_level: 2
    },
    random: () => ({
      age: Math.floor(Math.random() * (78 - 30) + 30),
      sex: Math.random() > 0.5 ? 'Male' : 'Female',
      blood_pressure: Math.floor(Math.random() * (175 - 95) + 95),
      cholesterol: Math.floor(Math.random() * (290 - 160) + 160),
      bmi: parseFloat((Math.random() * (39 - 19) + 19).toFixed(1)),
      smoker: Math.random() > 0.6 ? 'Yes' : 'No',
      diabetes: Math.random() > 0.7 ? 'Yes' : 'No',
      physical_activity: Math.floor(Math.random() * 5),
      family_history: Math.random() > 0.5 ? 'Yes' : 'No',
      stress_level: Math.floor(Math.random() * 10) + 1
    })
  };

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-preset');
      const data = typeof presetProfiles[key] === 'function' ? presetProfiles[key]() : presetProfiles[key];
      applyFormData(data);
    });
  });

  function applyFormData(data) {
    ageInput.value = data.age;
    ageValDisplay.textContent = `${data.age} yrs`;

    const sexRadio = document.querySelector(`input[name="sex"][value="${data.sex}"]`);
    if (sexRadio) sexRadio.checked = true;

    bpInput.value = data.blood_pressure;
    cholInput.value = data.cholesterol;
    bmiInput.value = data.bmi;

    const smokerRadio = document.querySelector(`input[name="smoker"][value="${data.smoker}"]`);
    if (smokerRadio) smokerRadio.checked = true;

    const diabetesRadio = document.querySelector(`input[name="diabetes"][value="${data.diabetes}"]`);
    if (diabetesRadio) diabetesRadio.checked = true;

    const famRadio = document.querySelector(`input[name="family_history"][value="${data.family_history}"]`);
    if (famRadio) famRadio.checked = true;

    activityHiddenInput.value = data.physical_activity;
    activityChips.forEach(c => {
      if (c.getAttribute('data-val') == data.physical_activity) c.classList.add('active');
      else c.classList.remove('active');
    });
    activityDisplay.textContent = `${data.physical_activity} days`;

    stressInput.value = data.stress_level;
    stressValDisplay.textContent = `${data.stress_level}/10`;

    updateBP();
    updateChol();
    updateBMI();
  }

  resetFormBtn.addEventListener('click', () => {
    applyFormData({
      age: 50, sex: 'Male', blood_pressure: 120, cholesterol: 200, bmi: 25.0,
      smoker: 'No', diabetes: 'No', physical_activity: 2, family_history: 'No', stress_level: 5
    });
  });

  // Export / Print Diagnostic Summary
  document.getElementById('printReportBtn').addEventListener('click', () => {
    window.print();
  });

  // =================================================================
  // 7. Cohort Batch Screener
  // =================================================================
  browseFileBtn.addEventListener('click', () => batchFileInput.click());
  uploadDropzone.addEventListener('click', (e) => {
    if (e.target !== browseFileBtn) batchFileInput.click();
  });

  uploadDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadDropzone.classList.add('dragover');
  });

  uploadDropzone.addEventListener('dragleave', () => {
    uploadDropzone.classList.remove('dragover');
  });

  uploadDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleCsvFile(e.dataTransfer.files[0]);
    }
  });

  batchFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleCsvFile(e.target.files[0]);
    }
  });

  function handleCsvFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => processRawCsv(e.target.result);
    reader.readAsText(file);
  }

  // Pre-Built Synthetic Cohort (Loaded directly with 1 click)
  const prebuilt20CohortCsv = `age,sex,blood_pressure,cholesterol,bmi,smoker,diabetes,physical_activity,family_history,stress_level
68,Male,105,191,38,Yes,Yes,0,No,2
58,Female,97,249,22,Yes,Yes,0,No,4
44,Female,93,190,23.2,No,Yes,0,No,8
72,Male,93,183,39.4,No,No,3,Yes,1
37,Female,145,166,22,No,Yes,4,Yes,1
50,Male,114,271,36.8,Yes,No,2,Yes,5
68,Male,156,225,28.8,No,Yes,1,No,5
48,Female,156,236,23.4,Yes,No,3,Yes,1
52,Female,116,266,37.2,No,Yes,2,No,6
40,Male,121,255,27.8,No,No,4,Yes,1
40,Male,139,235,29.3,No,Yes,0,Yes,5
53,Male,150,176,25.9,No,No,4,No,9
65,Female,140,206,31,Yes,No,1,No,5
69,Male,108,180,21.6,Yes,No,3,Yes,6
53,Male,110,283,26.6,No,No,3,Yes,8
32,Male,94,247,39.3,Yes,No,1,No,1
51,Female,171,161,23.7,No,No,2,Yes,2
31,Male,131,202,32.4,No,Yes,2,Yes,9
53,Male,150,287,25.2,No,No,3,No,3
73,Female,111,294,35,No,Yes,3,Yes,6`;

  loadPrebuiltCohortBtn.addEventListener('click', () => {
    processRawCsv(prebuilt20CohortCsv);
  });

  downloadSampleCsvBtn.addEventListener('click', () => {
    const blob = new Blob([prebuilt20CohortCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cardiopulse_hospital_cohort_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  function processRawCsv(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map(p => p.trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx];
      });

      const p = {
        id: `PT-${String(i).padStart(3, '0')}`,
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

      const evalRes = predictClientSide(p);
      p.predicted_class = evalRes.pred;
      p.probability = evalRes.prob;
      p.probability_pct = (evalRes.prob * 100).toFixed(1);
      p.risk_tier = evalRes.prob >= 0.6 ? 'High' : (evalRes.prob >= 0.4 ? 'Moderate' : 'Low');
      records.push(p);
    }

    currentCohort = records;
    displayCohortSummary();
  }

  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
  };

  function displayCohortSummary() {
    batchResultsWrap.style.display = 'block';

    const total = currentCohort.length;
    const positiveCount = currentCohort.filter(r => r.predicted_class === 1).length;
    const negativeCount = total - positiveCount;
    const meanProb = (currentCohort.reduce((acc, r) => acc + r.probability, 0) / total * 100).toFixed(1);

    kpiTotalCount.textContent = total;
    kpiPositiveCount.textContent = positiveCount;
    kpiPositivePct.textContent = `${((positiveCount / total) * 100).toFixed(0)}% of cohort`;
    kpiNegativeCount.textContent = negativeCount;
    kpiNegativePct.textContent = `${((negativeCount / total) * 100).toFixed(0)}% of cohort`;
    kpiMeanProb.textContent = `${meanProb}%`;

    renderCohortTable(currentCohort);
  }

  function renderCohortTable(records) {
    cohortTableBody.innerHTML = records.map(r => {
      const isPos = r.predicted_class === 1;
      const classPill = isPos ? 'pill-danger' : 'pill-success';
      const tierColor = r.risk_tier === 'High' ? 'color:#f43f5e;' : (r.risk_tier === 'Moderate' ? 'color:#fbbf24;' : 'color:#34d399;');

      return `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${r.age}</td>
          <td>${r.sex}</td>
          <td>${r.blood_pressure} mmHg</td>
          <td>${r.cholesterol} mg/dL</td>
          <td>${r.bmi}</td>
          <td>${r.smoker}</td>
          <td>${r.diabetes}</td>
          <td>${r.physical_activity} d/wk</td>
          <td>${r.family_history}</td>
          <td>${r.stress_level}/10</td>
          <td><span class="${classPill}">${isPos ? 'Positive (1)' : 'Negative (0)'}</span></td>
          <td><strong>${r.probability_pct}%</strong></td>
          <td><span style="font-weight:700; ${tierColor}">${r.risk_tier} Risk</span></td>
        </tr>
      `;
    }).join('');
  }

  // Search & Filter
  function applyCohortFilters() {
    const q = cohortSearchInput.value.toLowerCase();
    const tier = riskFilterSelect.value;

    const filtered = currentCohort.filter(r => {
      const matchQ = (
        r.id.toLowerCase().includes(q) ||
        r.sex.toLowerCase().includes(q) ||
        r.age.toString().includes(q) ||
        r.risk_tier.toLowerCase().includes(q)
      );
      const matchTier = tier === 'all' || r.risk_tier.toLowerCase() === tier;
      return matchQ && matchTier;
    });

    renderCohortTable(filtered);
  }

  cohortSearchInput.addEventListener('input', applyCohortFilters);
  riskFilterSelect.addEventListener('change', applyCohortFilters);

  // Export Scored CSV
  exportScoredCsvBtn.addEventListener('click', () => {
    if (currentCohort.length === 0) return;
    const headers = [
      'patient_id','age','sex','blood_pressure','cholesterol','bmi','smoker','diabetes',
      'physical_activity','family_history','stress_level','predicted_class','probability_pct','risk_tier'
    ];
    const rows = [headers.join(',')];
    currentCohort.forEach(r => {
      rows.push([
        r.id, r.age, r.sex, r.blood_pressure, r.cholesterol, r.bmi, r.smoker, r.diabetes,
        r.physical_activity, r.family_history, r.stress_level, r.predicted_class, r.probability_pct, `"${r.risk_tier}"`
      ].join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardiopulse_scored_cohort_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // =================================================================
  // 8. Feature Importance Bar Rendering
  // =================================================================
  function renderFeatureImportance(featMap) {
    const container = document.getElementById('featureImportanceGrid');
    if (!container || !featMap) return;

    const readableNames = {
      'bmi': 'Body Mass Index (BMI)',
      'blood_pressure': 'Systolic Blood Pressure (mmHg)',
      'cholesterol': 'Serum Cholesterol (mg/dL)',
      'age': 'Patient Age (years)',
      'physical_activity': 'Physical Activity (days/week)',
      'stress_level': 'Perceived Stress Scale (1-10)',
      'diabetes_Yes': 'Diagnosed Diabetes (Comorbidity)',
      'smoker_Yes': 'Tobacco Smoker Status',
      'family_history_Yes': 'Family Cardiovascular History',
      'sex_Yes': 'Biological Sex (Male Indicator)'
    };

    const entries = Object.entries(featMap).sort((a, b) => b[1] - a[1]);
    const maxVal = entries[0][1] || 1;

    container.innerHTML = entries.map(([k, val]) => {
      const pct = ((val / maxVal) * 100).toFixed(0);
      const absPct = (val * 100).toFixed(1);
      const name = readableNames[k] || k;

      return `
        <div class="feat-row">
          <div class="feat-row-header">
            <span>${name}</span>
            <span class="feat-pct">${absPct}%</span>
          </div>
          <div class="feat-track">
            <div class="feat-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // =================================================================
  // 9. Developer API Code Generator
  // =================================================================
  function updateCodeSnippets(p) {
    const jsonPayload = JSON.stringify(p, null, 2);

    if (currentSnippetLang === 'curl') {
      codeSnippetBox.textContent = `curl -X POST https://your-deployment.vercel.app/api/predict \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(p)}'`;
    } else if (currentSnippetLang === 'python') {
      codeSnippetBox.textContent = `import requests

url = "https://your-deployment.vercel.app/api/predict"
payload = ${jsonPayload}

response = requests.post(url, json=payload)
data = response.json()
print("Heart Disease Prediction:", data["heart_disease_prediction"])
print("Risk Probability:", data["probability_percentage"], "%")`;
    } else if (currentSnippetLang === 'javascript') {
      codeSnippetBox.textContent = `const response = await fetch("https://your-deployment.vercel.app/api/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(${jsonPayload})
});
const data = await response.json();
console.log(data);`;
    }
  }

  codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      codeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSnippetLang = tab.getAttribute('data-lang');
      updateCodeSnippets(getPatientData());
    });
  });

  copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(codeSnippetBox.textContent);
    copyCodeBtn.innerHTML = `✅ Copied!`;
    setTimeout(() => {
      copyCodeBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      `;
    }, 2000);
  });

  testApiEndpointBtn.addEventListener('click', async () => {
    const patient = getPatientData();
    testApiEndpointBtn.disabled = true;
    testApiEndpointBtn.textContent = 'Executing request...';

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      });
      const data = await res.json();
      responseViewer.style.display = 'block';
      responseStatusBadge.textContent = `${res.status} ${res.statusText || 'OK'}`;
      responseBodyBox.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      // Local demo response
      const clientRes = predictClientSide(patient);
      responseViewer.style.display = 'block';
      responseStatusBadge.textContent = '200 OK (Client Engine)';
      responseBodyBox.textContent = JSON.stringify({
        status: "success",
        note: "Response computed via client standardized model",
        inputs: patient,
        heart_disease_prediction: clientRes.pred,
        probability: clientRes.prob,
        probability_percentage: Math.round(clientRes.prob * 100),
        engine: clientRes.engine
      }, null, 2);
    } finally {
      testApiEndpointBtn.disabled = false;
      testApiEndpointBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Send Live Test Request to API
      `;
    }
  });

  // Initial trigger
  triggerEvaluation();
});
