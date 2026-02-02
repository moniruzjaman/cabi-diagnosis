
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, Leaf, AlertTriangle, CheckCircle, Info, ChevronRight, Sprout, Bug, FlaskConical, BookOpen, X, Zap, ShieldCheck, Target, Eye, Microscope, Ruler, ClipboardCheck, Scissors, Search, GraduationCap, ChevronLeft, HelpCircle, Layers, Lightbulb } from 'lucide-react';
import { AppStep, DiagnosisResult, TrainingModule } from './types';
import { analyzeCropImage } from './services/geminiService';
import { trainingModules } from './services/trainingData';

const BACKEND_URL = "http://localhost:8000";

const ANALYSIS_STAGES = [
  "নমুনা লোড করা হচ্ছে...",
  "বিভাজন রেখা যাচাই করা হচ্ছে (ID 1)...",
  "পোকার আক্রমণ বা কামড়ের চিহ্ন খোঁজা হচ্ছে (ID 15)...",
  "ছত্রাক নাকি ব্যাকটেরিয়া, পার্থক্য করা হচ্ছে (ID 32)...",
  "পুষ্টির অভাবের ধরণ মেলানো হচ্ছে (ID 23)...",
  "অভ্যন্তরীণ লক্ষণ বিশ্লেষণ করা হচ্ছে (ID 118)...",
  "চড়ান্ত রিপোর্ট তৈরি করা হচ্ছে..."
];

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showReference, setShowReference] = useState(false);
  const [showTraining, setShowTraining] = useState(false);
  
  // Training State
  const [activeModule, setActiveModule] = useState<TrainingModule | null>(null);
  const [trainingMode, setTrainingMode] = useState<'lesson' | 'flashcard' | 'quiz' | 'home'>('home');
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);

  const [refTab, setRefTab] = useState<'biotic' | 'pests' | 'big5' | 'internal'>('biotic');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: number;
    if (step === AppStep.ANALYZING) {
      setLoadingProgress(0);
      setLoadingMessageIndex(0);
      interval = window.setInterval(() => {
        setLoadingProgress(prev => (prev >= 95 ? prev : prev + Math.random() * 5));
        setLoadingMessageIndex(prev => (prev >= ANALYSIS_STAGES.length - 1 ? prev : prev + 1));
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [step]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fullBase64 = reader.result as string;
        setImage(fullBase64);
        const cleanBase64 = fullBase64.split(',')[1];
        processImage(cleanBase64, fullBase64);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const processImage = async (base64: string, fullImage: string) => {
    setStep(AppStep.ANALYZING);
    setError(null);
    try {
      const diagnosis = await analyzeCropImage(base64);
      setLoadingProgress(100);
      setTimeout(() => {
        setResult(diagnosis);
        setStep(AppStep.RESULT);
        syncToBackend(diagnosis, fullImage);
      }, 400);
    } catch (err) {
      setError("দুঃখিত, সমস্যা হয়েছে। ইন্টারনেটে আবার চেষ্টা করুন।");
      setStep(AppStep.IDLE);
    }
  };

  const syncToBackend = async (diag: DiagnosisResult, img: string) => {
    setSyncStatus('syncing');
    try {
      const response = await fetch(`${BACKEND_URL}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...diag, imageData: img })
      });
      setSyncStatus(response.ok ? 'success' : 'error');
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const reset = () => {
    setStep(AppStep.IDLE);
    setImage(null);
    setResult(null);
    setError(null);
    setSyncStatus('idle');
  };

  const switchTrainingMode = (mode: typeof trainingMode) => {
    setTrainingMode(mode);
    setTrainingIndex(0);
    setFlashFlipped(false);
    setQuizSelected(null);
    setQuizResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-white shadow-xl overflow-hidden relative font-['Hind_Siliguri']">
      <header className="bg-green-700 text-white p-5 sticky top-0 z-10 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl"><Sprout size={24} /></div>
          <div>
            <h1 className="text-lg font-bold">শস্য সমাধান</h1>
            <p className="text-[10px] opacity-80 uppercase tracking-widest font-medium">CABI Plant Doctor Academy</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowTraining(true); setTrainingMode('home'); setActiveModule(null); }} className="p-2 bg-amber-500/20 text-amber-200 rounded-xl border border-amber-500/30">
            <GraduationCap size={20} />
          </button>
          <button onClick={() => setShowReference(true)} className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl text-xs font-bold">
            <BookOpen size={16} /> লাইব্রেরি
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-24 overflow-y-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-3 rounded-r-lg">
            <AlertTriangle size={20} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {step === AppStep.IDLE && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-[2.5rem] border border-green-100 text-center space-y-6 shadow-inner">
              <div className="mx-auto w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-green-600 shadow-xl border border-green-50 relative">
                <Leaf size={48} />
                <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-2 rounded-full shadow-lg"><Zap size={16} fill="currentColor"/></div>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-green-900 tracking-tight leading-none">একজন দক্ষ শস্য চিকিৎসক হোন</h2>
                <p className="text-sm text-gray-500 px-4">বাংলাদেশি ফসল ও রোগ দমনে CABI প্রোটোকল ভিত্তিক প্রশিক্ষণ।</p>
              </div>
              <button onClick={() => { setShowTraining(true); setTrainingMode('home'); }} className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-amber-200 flex items-center justify-center gap-3 active:scale-95 transition-all">
                <GraduationCap size={24}/> একাডেমি প্রশিক্ষণ শুরু করুন
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center gap-3 bg-green-600 hover:bg-green-700 text-white p-7 rounded-[2.5rem] font-bold text-lg transition-all shadow-xl active:scale-95">
                <Camera size={32} />
                <span>ক্যামেরা</span>
              </button>
              <button onClick={() => galleryInputRef.current?.click()} className="flex flex-col items-center gap-3 bg-white border-2 border-green-600 text-green-700 p-7 rounded-[2.5rem] font-bold text-lg transition-all shadow-xl active:scale-95">
                <ImageIcon size={32} />
                <span>গ্যালারি</span>
              </button>
              <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" className="hidden" capture="environment" />
              <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
          </div>
        )}

        {step === AppStep.ANALYZING && (
          <div className="flex flex-col items-center justify-center py-16 space-y-12 text-center h-full">
            <div className="relative group">
              <div className="absolute -inset-4 bg-green-500/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="w-40 h-40 border-[4px] border-green-100 border-t-green-600 rounded-full animate-spin relative z-10"></div>
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="w-20 h-20 bg-green-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl animate-bounce">
                  <Search size={40} />
                </div>
              </div>
            </div>
            <div className="w-full max-w-sm space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-black text-green-800 uppercase tracking-widest animate-pulse">{ANALYSIS_STAGES[loadingMessageIndex]}</span>
                  <span className="text-lg font-black text-green-900 tracking-tighter">{Math.round(loadingProgress)}%</span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300 relative" style={{ width: `${loadingProgress}%` }}>
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.2)_50%,rgba(255,255,255,.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress_1s_linear_infinite]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === AppStep.RESULT && result && (
          <div className="space-y-6 animate-slideIn">
            <div className="relative">
              <img src={image!} alt="Crops" className="w-full h-72 object-cover rounded-[3rem] shadow-2xl border-4 border-white" />
              <div className="absolute top-4 right-4"><SyncIndicator status={syncStatus} onRetry={() => syncToBackend(result, image!)} /></div>
            </div>

            <div className={`bg-gradient-to-br ${result.category === 'Pest' ? 'from-amber-600 to-amber-500' : result.category === 'Nutrient' ? 'from-indigo-600 to-indigo-500' : 'from-green-700 to-green-600'} text-white p-8 rounded-[3rem] shadow-lg`}>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{result.category} - নিশ্চিতকরণ: {Math.round(result.confidence * 100)}%</span>
              <h3 className="text-3xl font-black tracking-tight leading-none">{result.diseaseName}</h3>
              <div className="mt-4 pt-4 border-t border-white/20 italic text-xs opacity-90">"{result.deductionLogic}"</div>
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-8 space-y-8">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-3"><ShieldCheck size={28} className="text-green-600" /> সমন্বিত বালাই ব্যবস্থাপনা (IPM)</h3>
              <div className="space-y-6">
                <StrategySection title="চাষাবাদ পদ্ধতি" content={result.management.cultural} icon={<Sprout size={20}/>} color="green" />
                {result.management.biological && <StrategySection title="জৈবিক নিয়ন্ত্রণ" content={result.management.biological} icon={<Bug size={20}/>} color="blue" />}
                {result.management.chemical && <StrategySection title="রাসায়নিক সমাধান" content={result.management.chemical} icon={<FlaskConical size={20}/>} color="red" />}
              </div>
            </div>
            <button onClick={reset} className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black flex items-center justify-center gap-3">
              <RefreshCw size={24} /> নতুন ছবি পরীক্ষা করুন
            </button>
          </div>
        )}
      </main>

      {/* Academy Overlay */}
      {showTraining && (
        <div className="fixed inset-0 z-50 bg-green-900/95 backdrop-blur-xl animate-fadeIn flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl flex flex-col relative overflow-hidden animate-slideIn h-[85vh]">
            <header className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-20">
              <div className="flex items-center gap-3">
                {trainingMode !== 'home' ? (
                  <button onClick={() => switchTrainingMode('home')} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
                ) : <GraduationCap className="text-green-600" size={24} />}
                <h2 className="text-lg font-black text-gray-800">{activeModule ? activeModule.title : "প্ল্যান্ট ডক্টর একাডেমি"}</h2>
              </div>
              <button onClick={() => setShowTraining(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              {trainingMode === 'home' ? (
                <div className="space-y-6">
                   <div className="p-6 bg-green-50 rounded-[2rem] border border-green-100 mb-4">
                      <p className="text-xs text-green-800 font-bold leading-relaxed">এই মডিউলগুলো আপনাকে CABI Plantwise প্রোটোকল অনুযায়ী মাঠ পর্যায়ে রোগ শনাক্ত করতে সাহায্য করবে।</p>
                   </div>
                   <div className="grid gap-4">
                      {trainingModules.map((mod) => (
                        <button key={mod.id} onClick={() => { setActiveModule(mod); switchTrainingMode('lesson'); }} className="flex items-center gap-5 p-5 bg-gray-50 rounded-3xl hover:bg-green-50 border border-gray-100 transition-all group">
                           <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><Layers className="text-green-600" size={24}/></div>
                           <div className="text-left">
                              <h4 className="font-black text-gray-800 text-sm">{mod.title}</h4>
                              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">{mod.description}</p>
                           </div>
                           <ChevronRight className="ml-auto text-gray-300" size={20}/>
                        </button>
                      ))}
                   </div>
                </div>
              ) : trainingMode === 'lesson' && activeModule ? (
                <div className="space-y-8">
                   <div className="flex justify-center gap-2 mb-4">
                      <button onClick={() => switchTrainingMode('lesson')} className="px-4 py-2 bg-green-600 text-white rounded-full text-[10px] font-black uppercase">পাঠ</button>
                      <button onClick={() => switchTrainingMode('flashcard')} className="px-4 py-2 bg-gray-100 text-gray-400 rounded-full text-[10px] font-black uppercase hover:bg-amber-100 hover:text-amber-600 transition-colors">ফ্ল্যাশকার্ড</button>
                      <button onClick={() => switchTrainingMode('quiz')} className="px-4 py-2 bg-gray-100 text-gray-400 rounded-full text-[10px] font-black uppercase hover:bg-blue-100 hover:text-blue-600 transition-colors">কুইজ</button>
                   </div>
                   <div className="space-y-6">
                      {activeModule.lessons.map((lesson, idx) => (
                        <div key={idx} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-3">
                           <h4 className="text-sm font-black text-green-800">{lesson.title}</h4>
                           <p className="text-xs text-gray-600 leading-relaxed">{lesson.content}</p>
                           {lesson.tip && (
                             <div className="flex gap-2 p-3 bg-white rounded-xl text-[10px] font-bold text-amber-600 border border-amber-50">
                                <Lightbulb size={16} className="shrink-0"/> <p>{lesson.tip}</p>
                             </div>
                           )}
                        </div>
                      ))}
                   </div>
                   <button onClick={() => switchTrainingMode('flashcard')} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">পরবর্তী: ফ্ল্যাশকার্ড <ChevronRight size={18}/></button>
                </div>
              ) : trainingMode === 'flashcard' && activeModule ? (
                <div className="space-y-8 flex flex-col items-center">
                   <div className="text-center space-y-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600">দৃষ্টিভ্রম সংশোধন</h4>
                      <p className="text-xs text-gray-500 font-bold">কার্ডে ক্লিক করে সঠিক উত্তর দেখুন</p>
                   </div>
                   <div 
                    onClick={() => setFlashFlipped(!flashFlipped)}
                    className="w-full h-64 perspective-1000 cursor-pointer group"
                   >
                     <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${flashFlipped ? 'rotate-y-180' : ''}`}>
                        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-amber-50 to-white border-4 border-amber-200 rounded-[3rem] flex items-center justify-center p-8 text-center shadow-xl">
                           <p className="text-lg font-black text-amber-900 leading-snug">{activeModule.flashcards[trainingIndex].front}</p>
                        </div>
                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-green-600 text-white border-4 border-green-400 rounded-[3rem] flex flex-col items-center justify-center p-8 text-center shadow-xl">
                           <CheckCircle size={40} className="mb-4 text-green-100"/>
                           <p className="text-xl font-black leading-tight">{activeModule.flashcards[trainingIndex].back}</p>
                        </div>
                     </div>
                   </div>
                   <div className="flex gap-4 w-full">
                      <button 
                        disabled={trainingIndex === 0}
                        onClick={() => { setTrainingIndex(prev => prev - 1); setFlashFlipped(false); }}
                        className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black disabled:opacity-30"
                      >আগেরটি</button>
                      <button 
                        onClick={() => {
                          if (trainingIndex < activeModule.flashcards.length - 1) {
                            setTrainingIndex(prev => prev + 1);
                            setFlashFlipped(false);
                          } else {
                            switchTrainingMode('quiz');
                          }
                        }}
                        className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black"
                      >{trainingIndex === activeModule.flashcards.length - 1 ? "কুইজ শুরু করুন" : "পরবর্তী"}</button>
                   </div>
                </div>
              ) : trainingMode === 'quiz' && activeModule ? (
                <div className="space-y-8">
                   <div className="text-center">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">প্রশ্ন {trainingIndex + 1} / {activeModule.quizzes.length}</p>
                      <h3 className="text-lg font-black text-gray-800 leading-snug mt-2">{activeModule.quizzes[trainingIndex].question}</h3>
                   </div>
                   <div className="grid gap-3">
                      {activeModule.quizzes[trainingIndex].options.map((option, idx) => (
                        <button 
                          key={idx}
                          disabled={quizSelected !== null}
                          onClick={() => {
                            setQuizSelected(idx);
                            setQuizResult(idx === activeModule.quizzes[trainingIndex].correctIndex ? 'correct' : 'wrong');
                          }}
                          className={`p-5 rounded-3xl text-left text-sm font-bold border-2 transition-all ${
                            quizSelected === idx 
                              ? (idx === activeModule.quizzes[trainingIndex].correctIndex ? 'bg-green-50 border-green-600 text-green-800' : 'bg-red-50 border-red-600 text-red-800')
                              : (quizSelected !== null && idx === activeModule.quizzes[trainingIndex].correctIndex ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-100 text-gray-700 hover:border-blue-300')
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                   </div>
                   {quizResult && (
                     <div className={`p-6 rounded-[2rem] border-2 animate-fadeIn ${quizResult === 'correct' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                        <div className="flex items-center gap-2 mb-2">
                           {quizResult === 'correct' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                           <span className="font-black uppercase text-xs">{quizResult === 'correct' ? "সঠিক উত্তর!" : "ভুল হয়েছে!"}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed font-bold">{activeModule.quizzes[trainingIndex].explanation}</p>
                        <button 
                          onClick={() => {
                            if (trainingIndex < activeModule.quizzes.length - 1) {
                              setTrainingIndex(prev => prev + 1);
                              setQuizSelected(null);
                              setQuizResult(null);
                            } else {
                              switchTrainingMode('home');
                            }
                          }}
                          className="w-full mt-4 bg-gray-900 text-white py-3 rounded-xl font-black text-xs"
                        >{trainingIndex === activeModule.quizzes.length - 1 ? "মডিউল শেষ করুন" : "পরবর্তী প্রশ্ন"}</button>
                     </div>
                   )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showReference && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="absolute bottom-0 left-0 right-0 max-w-2xl mx-auto h-[90vh] bg-white rounded-t-[3rem] flex flex-col shadow-2xl animate-slideIn overflow-hidden">
            <header className="p-6 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-700 rounded-xl"><BookOpen size={24} /></div>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">নির্দেশিকা লাইব্রেরি</h2>
              </div>
              <button onClick={() => setShowReference(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
            </header>
            <div className="flex bg-gray-50 border-b overflow-x-auto no-scrollbar px-6 gap-6">
               <TabButton active={refTab === 'biotic'} onClick={() => setRefTab('biotic')} text="Biotic vs Abiotic" />
               <TabButton active={refTab === 'pests'} onClick={() => setRefTab('pests')} text="পোকা (Scale)" />
               <TabButton active={refTab === 'big5'} onClick={() => setRefTab('big5')} text="Big 5 Rules" />
               <TabButton active={refTab === 'internal'} onClick={() => setRefTab('internal')} text="Internal Signs" />
            </div>
            <div className="flex-1 overflow-y-auto p-8">
               {refTab === 'biotic' && (
                 <div className="space-y-4">
                    <ReferenceItem title="জীবন্ত (Biotic)" desc="স্পষ্ট বিভাজন রেখা (Sharp divide) থাকে।" color="green" />
                    <ReferenceItem title="নির্জীব (Abiotic)" desc="বর্ডার অস্পষ্ট। পুরো পাতায় সমানভাবে হলুদ ভাব থাকে।" color="amber" />
                 </div>
               )}
               {/* Additional tabs can be populated similarly */}
            </div>
          </div>
        </div>
      )}

      <footer className="p-6 text-center text-[10px] text-gray-400 bg-gray-50 border-t uppercase tracking-widest font-bold">
        <p>© ২০২৪ শস্য সমাধান। সূত্র: CABI Plantwise 1-120</p>
      </footer>
    </div>
  );
};

const ReferenceItem: React.FC<{title: string, desc: string, color: string}> = ({ title, desc, color }) => (
  <div className={`p-4 rounded-2xl bg-${color}-50 border-l-4 border-${color}-400 shadow-sm`}>
    <h4 className={`font-bold text-sm text-${color}-900 mb-1`}>{title}</h4>
    <p className="text-[11px] text-gray-700 leading-tight">{desc}</p>
  </div>
);

const StrategySection: React.FC<{title: string, content: string, icon: any, color: string}> = ({ title, content, icon, color }) => (
  <div className="flex gap-5 p-2 rounded-3xl group transition-all">
    <div className={`p-4 bg-${color}-50 text-${color}-600 rounded-3xl shrink-0 h-fit shadow-inner group-hover:scale-110 transition-transform`}>{icon}</div>
    <div className="space-y-1.5">
      <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight">{title}</h4>
      <p className="text-[11px] text-gray-600 leading-snug font-medium">{content}</p>
    </div>
  </div>
);

const TabButton: React.FC<{active: boolean, onClick: () => void, text: string}> = ({ active, onClick, text }) => (
  <button onClick={onClick} className={`py-4 px-1 text-xs font-black border-b-2 transition-all shrink-0 uppercase tracking-widest ${active ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400'}`}>
    {text}
  </button>
);

const SyncIndicator: React.FC<{status: string, onRetry: () => void}> = ({ status, onRetry }) => {
  if (status === 'syncing') return <div className="bg-white/95 p-3 rounded-full shadow-2xl animate-spin text-green-600"><RefreshCw size={18} /></div>;
  if (status === 'success') return <div className="bg-green-600 p-4 rounded-full shadow-2xl text-white scale-110"><CheckCircle size={20} /></div>;
  if (status === 'error') return <button onClick={onRetry} className="bg-red-600 p-4 rounded-full shadow-2xl text-white hover:scale-110 transition-transform"><AlertTriangle size={20} /></button>;
  return null;
};

export default App;
