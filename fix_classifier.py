import pathlib

target = pathlib.Path(r'C:\Users\mithu\AppData\Local\Programs\DevProjects\DevTools\MyApps\copilot-worktrees\cabi-diagnosis\src\offline\vitClassifier.js')
lines = target.read_text(encoding='utf-8').splitlines(keepends=True)

# Find the insertion point: after the comment block ending with "Bangla names follow..."
insert_idx = None
for i, line in enumerate(lines):
    if 'Bangla names follow the project glossary' in line:
        insert_idx = i + 1
        break

print(f"Inserting LABEL_TABLE after line {insert_idx}")

label_table = '''// 15 classes from PlantVillage (imaflower/plantvillage-mobilenetv3).
// Each row: { idx, raw, cropEn, cropBn, diseaseEn, diseaseBn, isHealthy, category }
//   category ∈ {healthy, fungal, bacterial, viral}
// Bangla names follow the project glossary in src/data/cropDiseases.js.
const LABEL_TABLE = [
  { idx: 0, raw: "Pepper__bell___Bacterial_spot", cropEn: "Pepper (Bell)", cropBn: "শ মরিচ", diseaseEn: "Bacterial Spot", diseaseBn: "ব্যাকটেরিয়া দাগ", isHealthy: false, category: "bacterial" },
  { idx: 1, raw: "Pepper__bell___healthy", cropEn: "Pepper (Bell)", cropBn: "শ মরিচ", diseaseEn: "Healthy", diseaseBn: "সুস্থ", isHealthy: true, category: "healthy" },
  { idx: 2, raw: "Potato___Early_blight", cropEn: "Potato", cropBn: "আলু", diseaseEn: "Early Blight", diseaseBn: "প্রারंभিক পুঁজ", isHealthy: false, category: "fungal" },
  { idx: 3, raw: "Potato___Late_blight", cropEn: "Potato", cropBn: "আলু", diseaseEn: "Late Blight", diseaseBn: "বিলম্বিত পুঁজ", isHealthy: false, category: "fungal" },
  { idx: 4, raw: "Potato___healthy", cropEn: "Potato", cropBn: "আলু", diseaseEn: "Healthy", diseaseBn: "সুস্থ", isHealthy: true, category: "healthy" },
  { idx: 5, raw: "Tomato_Bacterial_spot", cropEn: "Tomato", cropBn: "টম্যাটো", diseaseEn: "Bacterial Spot", diseaseBn: "ব্যাকটেরিয়া দাগ", isHealthy: false, category: "bacterial" },
  { idx: 6, raw: "Tomato_Early_blight", cropEn: "Tomato", cropBn: "টম্যাটো", diseaseEn: "Early Blight", diseaseBn: "প্রারंभিক পুঁজ", isHealthy: false, category: "fungal" },
  { idx: 7, raw: "Tomato_Late_blight", cropEn: "Tomato", cropBn: "টম্যাটো", diseaseEn: "Late Blight", diseaseBn: "বিলম্বিত পুঁজ", isHealthy: false, category: "fungal" },
  { idx: 8, raw: "Tomato_Leaf_Mold", cropEn: "Tomato", cropBn: "টম্যাটো", diseaseEn: "Leaf Mold", diseaseBn: "পাতার ফালি", isHealthy: false, category: "fungal" },
  { idx: 9, raw: "Tomato_Septoria_leaf_spot", cropEn: "Tomato", cropBn: "টম্যাটো", diseaseEn: "Septoria Leaf Spot", diseaseBn: "সেপ্টোরিয়া পাতার দাগ", isHealthy: false, category: "fungal" },
  { idx: 10, raw: "Tomato_Spider_mites_Two_spotted_spider_mite", cropEn: "Tomato", cropBn: "টম্যাটো", diseaseEn: "Spider Mites", diseaseBn: "স্পাইডার মাইট", isHealthy: false, category: "invalid" },
  { idx: 11, raw: "Tomato__Target_Spot", cropEn: "Tomato", cropBn: "টম্যাটো", diseaseEn: "Target Spot", diseaseBn: "টার্গেট স্পট", isHealthy: false, category: "fungal" },
  { idx: 12, raw: "Tomato__Tomato_YellowLeaf__Curl_Virus", cropEn: "Tomato", cropBn: "টম্যাটো", diseaseEn: "Yellow Leaf Curl Virus", diseaseBn: "হলদে পাতা মড়ন ভাইরাস", isHealthy: false, category: "viral" },
  { idx: 13, raw: "Tomato__Tomato_mosaic_virus", cropEn: "Tomato", cropBn: "টম্যাটো", diseaseEn: "Mosaic Virus", diseaseBn: "মোজাইক ভাইরাস", isHealthy: false, category: "viral" },
  { idx: 14, raw: "Tomato_healthy", cropEn: "Tomato", cropBn: "টম্যাটো", diseaseEn: "Healthy", diseaseBn: "সুস্থ", isHealthy: true, category: "healthy" },
];

'''

lines.insert(insert_idx, label_table)
target.write_text(''.join(lines), encoding='utf-8')
print("SUCCESS: LABEL_TABLE inserted")

# Verify
content = target.read_text(encoding='utf-8')
print('Pepper present:', 'Pepper__bell' in content)
print('Tomato_healthy present:', 'Tomato_healthy' in content)
print('LABEL_TABLE defined:', 'const LABEL_TABLE' in content)