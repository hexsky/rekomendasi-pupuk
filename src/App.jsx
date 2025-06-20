import React, { useState, useRef, useEffect } from 'react';

// =============================================
// Helper Functions (Logic from original JS)
// =============================================

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  let d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s, v: v };
}

function fuzzyLogicCalculation(age, leafColor, rainfall, soilType) {
  let ageYoung = Math.max(0, Math.min(1, (40 - age) / 40));
  let ageMature = Math.max(0, Math.min(1, age <= 30 ? 0 : age >= 70 ? 0 : age <= 50 ? (age - 30) / 20 : (70 - age) / 20));
  let ageOld = Math.max(0, Math.min(1, (age - 50) / 70));
  let leafYellow = Math.max(0, Math.min(1, (4 - leafColor) / 3));
  let leafMedium = Math.max(0, Math.min(1, leafColor <= 3 ? 0 : leafColor >= 8 ? 0 : leafColor <= 5.5 ? (leafColor - 3) / 2.5 : (8 - leafColor) / 2.5));
  let leafGreen = Math.max(0, Math.min(1, (leafColor - 6) / 4));
  let rainHigh = Math.max(0, Math.min(1, (rainfall - 180) / 320));
  let soilFactor = { 'lempung': 1.0, 'liat': 0.9, 'pasir': 1.2, 'organik': 0.8 }[soilType] || 1.0;
  const out_HighNPK = [120, 60, 80], out_MediumNPK = [80, 50, 60], out_LowN_HighPK = [40, 70, 90], out_MediumN_LowPK = [70, 40, 40], out_HighN_MediumPK = [110, 55, 70];
  let rules = [
    { strength: Math.min(ageYoung, leafYellow), output: out_HighNPK },
    { strength: Math.min(ageMature, leafMedium), output: out_MediumNPK },
    { strength: Math.min(ageOld, leafGreen), output: out_LowN_HighPK },
    { strength: Math.min(ageYoung, leafMedium), output: out_HighN_MediumPK },
    { strength: Math.min(ageMature, leafYellow), output: out_HighNPK },
    { strength: Math.min(ageOld, leafMedium), output: out_MediumN_LowPK },
    { strength: Math.min(ageYoung, leafGreen), output: out_MediumNPK },
    { strength: Math.min(ageMature, leafGreen), output: out_MediumN_LowPK },
    { strength: Math.min(ageOld, leafYellow), output: out_LowN_HighPK }
  ];
  let totalStrength = 0, weightedN = 0, weightedP = 0, weightedK = 0;
  rules.forEach(rule => {
    if (rule.strength > 0) {
      totalStrength += rule.strength;
      weightedN += rule.strength * rule.output[0];
      weightedP += rule.strength * rule.output[1];
      weightedK += rule.strength * rule.output[2];
    }
  });
  let nitrogenNeed, phosphorusNeed, potassiumNeed;
  if (totalStrength === 0) {
    [nitrogenNeed, phosphorusNeed, potassiumNeed] = out_MediumNPK;
  } else {
    nitrogenNeed = weightedN / totalStrength;
    phosphorusNeed = weightedP / totalStrength;
    potassiumNeed = weightedK / totalStrength;
  }
  if (rainHigh > 0.3) {
    nitrogenNeed *= (1 - rainHigh * 0.3);
    phosphorusNeed *= (1 - rainHigh * 0.2);
    potassiumNeed *= (1 - rainHigh * 0.25);
  }
  nitrogenNeed *= soilFactor;
  phosphorusNeed *= soilFactor;
  potassiumNeed *= soilFactor;
  return {
    nitrogen: Math.round(nitrogenNeed),
    phosphorus: Math.round(phosphorusNeed),
    potassium: Math.round(potassiumNeed),
    justification: generateJustification(age, leafColor, rainfall, soilType)
  };
}

function generateJustification(age, leafColor, rainfall, soilType) {
  let agePhase = age <= 30 ? "vegetatif awal" : age <= 60 ? "vegetatif aktif" : "generatif";
  let leafStatus = leafColor <= 4 ? "kuning (defisiensi)" : leafColor <= 7 ? "hijau sedang" : "hijau tua";
  let rainStatus = rainfall <= 100 ? "rendah" : rainfall <= 200 ? "sedang" : "tinggi";
  return `Berdasarkan umur tanaman ${age} hari (fase ${agePhase}), tingkat kehijauan ${leafStatus.split(' ')[0]} (${leafColor.toFixed(1)}), curah hujan ${rainStatus} (${rainfall}mm), dan jenis tanah ${soilType}, sistem merekomendasikan pemupukan yang disesuaikan.`;
}

// =============================================
// React Components
// =============================================

const GlobalStyles = () => {
  const css = `
    #root {
        width: 100%; height: 100%;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background-color: #16a34a; min-height: 100vh; height: 100%; padding: 20px; }
    .container { 
        width: 100%;
        max-width: 1200px;
        margin: 0 auto; 
        background: white; 
        border-radius: 20px; 
        box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
    }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    .header p { font-size: 1.1rem; opacity: 0.9; }
    .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 30px; }
    .input-section, .output-section { padding: 25px; border-radius: 15px; }
    .input-section { background: #f8fafc; border: 2px solid #e2e8f0; }
    .output-section { background: #f0f9ff; border: 2px solid #bae6fd; }
    .section-title { font-size: 1.5rem; color: #1e293b; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 1rem; }
    .form-group input, .form-group select { width: 100%; padding: 12px 15px; border: 2px solid #d1d5db; border-radius: 10px; font-size: 1rem; transition: all 0.3s ease; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #059669; box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
    .slider-container { position: relative; margin-top: 10px; }
    .slider-value { position: absolute; right: 0; top: -25px; background: #059669; color: white; padding: 2px 8px; border-radius: 5px; font-size: 0.9rem; font-weight: 600; }
    .lcc-input-method { background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .method-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .method-tab { flex: 1; padding: 10px 15px; background: #e2e8f0; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; }
    .method-tab.active { background: #059669; color: white; }
    .method-content { display: none; }
    .method-content.active { display: block; }
    .upload-area { border: 3px dashed #3498db; border-radius: 15px; padding: 30px; text-align: center; background: #f8f9fa; transition: all 0.3s ease; cursor: pointer; margin-bottom: 15px; }
    .upload-area:hover { border-color: #2980b9; background: #e3f2fd; }
    .upload-icon { font-size: 2.5em; color: #3498db; margin-bottom: 10px; }
    .upload-text { font-size: 1.1em; color: #34495e; margin-bottom: 5px; }
    .upload-subtext { color: #7f8c8d; font-size: 0.9em; }
    .image-preview { text-align: center; margin: 15px 0; }
    .preview-img { max-width: 100%; max-height: 200px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
    .lcc-result { background: #ecfccb; border: 2px solid #bef264; border-radius: 8px; padding: 15px; margin-top: 10px; text-align: center; }
    .lcc-score { font-size: 2em; font-weight: bold; color: #059669; margin-bottom: 5px; }
    .lcc-status { color: #374151; font-weight: 600; }
    .calculate-btn { width: 100%; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; border: none; padding: 15px 25px; border-radius: 10px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; margin-top: 20px; }
    .calculate-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(5, 150, 105, 0.3); }
    .calculate-btn:disabled { background: #9ca3af; cursor: not-allowed; transform: none; }
    .result-card { background: white; border-radius: 10px; padding: 20px; margin-bottom: 15px; border-left: 5px solid #059669; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
    .result-title { font-size: 1.2rem; font-weight: 600; color: #1e293b; margin-bottom: 10px; }
    .nutrient-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .nutrient-item:last-child { border-bottom: none; }
    .nutrient-item .small-text { font-size: 0.9em; color: #6b7280; }
    .nutrient-name { font-weight: 600; color: #374151; }
    .nutrient-value { font-size: 1.1rem; font-weight: 700; color: #059669; }
    .justification { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin-top: 15px; font-style: italic; color: #92400e; }
    .schedule { background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px; padding: 15px; margin-top: 15px; margin-bottom: 15px; }
    .schedule-item { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.95rem; border-bottom: 1px dashed #d1d5db; }
    .schedule-item:last-child { border-bottom: none; }
    .schedule-item.missed { opacity: 0.5; text-decoration: line-through; }
    .schedule-item .missed-label { font-weight: bold; color: #ef4444; margin-left: 8px; }
    .warning-card { background: #fff1f2; border: 1px solid #ffb1b8; border-left: 5px solid #ef4444; border-radius: 8px; padding: 20px; margin-top: 15px; margin-bottom: 15px; }
    .warning-card strong { color: #b91c1c; font-size: 1.1em; display: block; margin-bottom: 10px; }
    .warning-card p { color: #450a0a; }
    @media (max-width: 768px) { .main-content { grid-template-columns: 1fr; gap: 20px; padding: 20px; } .header h1 { font-size: 2rem; } }
    .loading { display: none; text-align: center; padding: 20px; }
    .spinner { border: 4px solid #f3f4f6; border-top: 4px solid #059669; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .hidden { display: none; }
    canvas { display: none; }
    .reset-lcc-btn { background: #6b7280; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 0.9rem; margin-top: 10px; }
    footer { text-align: center; padding: 20px; margin-top: 20px; color: #f0fdf4; font-size: 0.9em; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4); }
    footer p { margin-bottom: 8px; }
  `;
  return <style>{css}</style>;
};

function App() {
  const [plantAge, setPlantAge] = useState(45);
  const [leafColor, setLeafColor] = useState(5);
  const [rainfall, setRainfall] = useState(150);
  const [soilType, setSoilType] = useState('lempung');
  const [inputMethod, setInputMethod] = useState('manual');
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [imageLccScore, setImageLccScore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendation, setRecommendation] = useState(null);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const currentLCCValue = inputMethod === 'image' ? imageLccScore : leafColor;

  const handleCalculate = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (plantAge > 90) {
        alert("⚠️ Tanaman sudah melewati fase pemupukan yang efektif. Rekomendasi mungkin tidak diperlukan.");
      }

      if (currentLCCValue !== null) {
        const result = fuzzyLogicCalculation(plantAge, currentLCCValue, rainfall, soilType);
        setRecommendation(result);
      }
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImageLoad = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let leafPixels = 0, totalHue = 0;
    for (let i = 0; i < data.length; i += 4) {
      const hsv = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      if ((hsv.h >= 70 && hsv.h <= 160) && (hsv.s > 0.25) && (hsv.v > 0.2 && hsv.v < 0.95)) {
        leafPixels++;
        totalHue += hsv.h;
      }
    }
    if (leafPixels < 100) {
      alert('Tidak dapat mendeteksi area daun yang cukup.');
      resetLccImage();
      return;
    }
    const avgHue = totalHue / leafPixels;
    let lccScore;
    if (avgHue < 85) { lccScore = 1 + ((avgHue - 70) / 15) * 2; }
    else if (avgHue < 100) { lccScore = 3 + ((avgHue - 85) / 15) * 2; }
    else if (avgHue < 120) { lccScore = 5 + ((avgHue - 100) / 20) * 3; }
    else { lccScore = 8 + ((avgHue - 120) / 40) * 2; }
    setImageLccScore(Math.max(1, Math.min(10, lccScore)));
  };

  const resetLccImage = () => {
    setImagePreviewUrl(null);
    setImageLccScore(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <React.Fragment>
      <GlobalStyles />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="container" style={{ flex: 1 }}>
          <header className="header">
            <h1>Sistem Rekomendasi Pemupukan Padi</h1>
            <p>Berbasis Fuzzy Logic dan Analisis LCC untuk Optimasi Nutrisi Tanaman</p>
          </header>
          <main className="main-content">
            <section className="input-section">
              <h2 className="section-title">📊 Input Data Tanaman</h2>
              <div className="form-group">
                <label htmlFor="plantAge">Umur Tanaman (hari setelah tanam)</label>
                <div className="slider-container">
                  <input type="range" id="plantAge" min="1" max="120" value={plantAge} onChange={(e) => setPlantAge(Number(e.target.value))} />
                  <span className="slider-value">{plantAge} hari</span>
                </div>
              </div>
              <div className="form-group">
                <label>Tingkat Kehijauan Daun (LCC)</label>
                <div className="lcc-input-method">
                  <div className="method-tabs">
                    <button className={`method-tab ${inputMethod === 'manual' ? 'active' : ''}`} onClick={() => setInputMethod('manual')}>Manual</button>
                    <button className={`method-tab ${inputMethod === 'image' ? 'active' : ''}`} onClick={() => setInputMethod('image')}>Analisis Gambar</button>
                  </div>
                  {inputMethod === 'manual' && (
                    <div className="method-content active">
                      <div className="slider-container">
                        <input type="range" id="leafColor" min="1" max="10" value={leafColor} onChange={(e) => setLeafColor(Number(e.target.value))} />
                        <span className="slider-value">{leafColor}/10</span>
                      </div>
                    </div>
                  )}
                  {inputMethod === 'image' && (
                    <div className="method-content active">
                      <div className="upload-area" onClick={() => fileInputRef.current.click()}>
                        <div className="upload-icon">📸</div>
                        <div className="upload-text">Klik untuk upload foto daun padi</div>
                        <div className="upload-subtext">atau drag & drop file gambar di sini</div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                      </div>
                      {imagePreviewUrl && (
                        <>
                          <div className="image-preview">
                            <img ref={imageRef} src={imagePreviewUrl} alt="Preview Daun" className="preview-img" onLoad={handleImageLoad} />
                          </div>
                          {imageLccScore && (
                            <div className="lcc-result">
                              <div className="lcc-score">{imageLccScore.toFixed(1)}</div>
                              <div className="lcc-status">Skor LCC dari Analisis Gambar</div>
                              <button className="reset-lcc-btn" onClick={resetLccImage}>Reset Analisis</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="rainfall">Curah Hujan (mm/bulan)</label>
                <div className="slider-container">
                  <input type="range" id="rainfall" min="0" max="500" value={rainfall} onChange={(e) => setRainfall(Number(e.target.value))} />
                  <span className="slider-value">{rainfall} mm</span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="soilType">Jenis Tanah</label>
                <select id="soilType" value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                  <option value="lempung">Lempung</option>
                  <option value="liat">Liat</option>
                  <option value="pasir">Pasir</option>
                  <option value="organik">Organik</option>
                </select>
              </div>
              <button className="calculate-btn" onClick={handleCalculate} disabled={isLoading}>
                {isLoading ? 'Menghitung...' : '🧮 Hitung Rekomendasi'}
              </button>
            </section>
            <section className="output-section">
              <h2 className="section-title">📋 Hasil Rekomendasi</h2>
              {isLoading ? (
                <div className="loading" style={{ display: 'block' }}>
                  <div className="spinner"></div>
                  <p>Memproses data dengan fuzzy logic...</p>
                </div>
              ) : recommendation ? (
                <div id="results">
                  <ResultCard title="💊 Dosis Hara Total Rekomendasi">
                    <NutrientItem label="Nitrogen (N)" value={recommendation.nitrogen} />
                    <NutrientItem label="Fosfor (P₂O₅)" value={recommendation.phosphorus} />
                    <NutrientItem label="Kalium (K₂O)" value={recommendation.potassium} />
                  </ResultCard>
                  <ScheduleCard recommendation={recommendation} plantAge={plantAge} />
                  <ResultCard title="🛒 Estimasi Kebutuhan Pupuk Tunggal" style={{ backgroundColor: '#f7fee7' }}>
                    <NutrientItem label="Urea" value={Math.round(recommendation.nitrogen / 0.46)} />
                    <NutrientItem label="SP-36" value={Math.round(recommendation.phosphorus / 0.36)} />
                    <NutrientItem label="KCl" value={Math.round(recommendation.potassium / 0.60)} />
                    <div className="small-text" style={{ textAlign: 'center', marginTop: '10px' }}>
                      *Estimasi berdasarkan kandungan hara pupuk tunggal murni.
                    </div>
                  </ResultCard>
                  <div className="justification">
                    <strong>💡 Justifikasi:</strong>
                    <p>{recommendation.justification}</p>
                  </div>
                </div>
              ) : (
                <p>Silakan sesuaikan input untuk mendapatkan rekomendasi.</p>
              )}
            </section>
          </main>
        </div>
        <AppFooter />
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </React.Fragment>
  );
}

const ResultCard = ({ title, children, style }) => (
  <div className="result-card" style={style}>
    <h3 className="result-title">{title}</h3>
    {children}
  </div>
);

const NutrientItem = ({ label, value }) => (
  <div className="nutrient-item">
    <span className="nutrient-name">{label}</span>
    <span className="nutrient-value">{value} kg/ha</span>
  </div>
);

const ScheduleCard = ({ recommendation, plantAge }) => {
  const app_times = {
    base: { day: 7, label: 'Pupuk Dasar' },
    follow_up1: { day: 30, label: 'Pupuk Susulan I' },
    follow_up2: { day: 45, label: 'Pupuk Susulan II' },
  };
  if (plantAge > app_times.follow_up2.day + 5 || plantAge > 90) {
    return (
      <div className="warning-card">
        {plantAge > app_times.follow_up2.day + 5 && (
          <>
            <strong>⚠️ Semua Jadwal Terlewat</strong>
            <p>Tanaman sudah memasuki fase pematangan. Pemupukan pada tahap ini umumnya tidak lagi efektif dan tidak direkomendasikan.</p>
          </>
        )}
        {plantAge > 90 && (
          <>
            <strong>⚠️ Fase Pemupukan Terlambat</strong>
            <p>Umur tanaman telah melebihi 90 HST. Pemupukan lanjutan tidak disarankan karena efektivitasnya sangat rendah.</p>
          </>
        )}
      </div>
    );
  }
  const { nitrogen: n_total, phosphorus: p_total, potassium: k_total } = recommendation;
  const n1 = Math.round(n_total / 3);
  const p1 = p_total;
  const k1 = Math.round(k_total / 2);
  const n2 = Math.round(n_total / 3);
  const n3 = n_total - n1 - n2;
  const k3 = k_total - k1;
  const scheduleItems = [
    { dose: `N: ${n1}kg, P: ${p1}kg, K: ${k1}kg`, missed: plantAge > (app_times.base.day + 3), ...app_times.base },
    { dose: `N: ${n2}kg`, missed: plantAge > (app_times.follow_up1.day + 5), ...app_times.follow_up1, condition: n2 > 0 },
    { dose: `N: ${n3}kg, K: ${k3}kg`, missed: plantAge > (app_times.follow_up2.day + 5), ...app_times.follow_up2, condition: n3 > 0 || k3 > 0 },
  ];
  return (
    <div className="schedule">
      <strong>📅 Jadwal Pemupukan Dinamis:</strong>
      {scheduleItems.filter(item => item.condition !== false).map(item => (
        <div key={item.label} className={`schedule-item ${item.missed ? 'missed' : ''}`}>
          <span>{item.label} (~{item.day} HST)</span>
          <span>{item.dose} {item.missed && <span className="missed-label">(Terlewat)</span>}</span>
        </div>
      ))}
    </div>
  );
};

const AppFooter = () => (
  <footer>
    <p>&copy; 2025 Sistem Rekomendasi Pemupukan Padi. All rights reserved.</p>
    <p>Dibuat oleh: Abraham Arvin Pratama (L0123004) &bull; Achmad Fitto Rizky (L0123005) &bull; Bintang Cahaya Putra (L0123037)</p>
  </footer>
);

export default App;
