import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Save, Camera, Printer, CheckCircle, AlertTriangle, User, Scissors, 
  Shirt, X, Trash2, History, FileText, Check, ChevronRight, RefreshCw, 
  Cloud, CloudOff, Search, Tag, Maximize2, ImageIcon, Mic, 
  MicOff, Edit3, MapPin, Zap, Star, ToggleLeft, ToggleRight, Clock, 
  Calendar, Layers, Palette, Receipt, DollarSign, Factory, ZoomIn, 
  ListChecks, AlertCircle, Focus, Upload, Delete, Info, Keyboard 
} from 'lucide-react';

// Firebase部品
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

// =================================================================
// 1. 補助関数・定数定義
// =================================================================

const getTodayDateStr = () => new Date().toISOString().split('T')[0];

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const getFutureDateStr = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// ★音声再生関数
const playSaveVoice = () => {
  if ('speechSynthesis' in window) {
    const uttr = new SpeechSynthesisUtterance("お客様のカルテを保存しました");
    uttr.lang = "ja-JP";
    uttr.volume = 0.5; // 音量控えめ
    uttr.rate = 1.0;
    window.speechSynthesis.speak(uttr);
  }
};

const INITIAL_FORM_STATE = {
  manageNo: "",
  tagNumber: "",
  customerName: "",
  itemType: "ワイシャツ",
  brand: "",
  accessories: [],
  dueDate: getFutureDateStr(3),
  needs: [],
  stainLocation: "",
  processInstruction: "スタンダード",
  finishing: "ハンガー仕上げ",
  stainRemovalRequest: "なし",
  stainRemovalPrice: 0,
  specialTreatments: []
};

// =================================================================
// 2. イラストコンポーネント (SVG)
// =================================================================

const IllustrationShirt = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-md">
    <rect x="25" y="30" width="50" height="60" rx="4" fill="#EBF5FF" stroke="#3B82F6" strokeWidth="2" />
    <path d="M50 30 L25 15 L35 15 L50 25 L65 15 L75 15 Z" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2" />
    <circle cx="50" cy="45" r="1.5" fill="#3B82F6" /><circle cx="50" cy="60" r="1.5" fill="#3B82F6" />
  </svg>
);
const IllustrationSuit = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-md">
    <rect x="22" y="25" width="56" height="65" rx="4" fill="#F1F5F9" stroke="#475569" strokeWidth="2.5" />
    <path d="M50 25 L22 25 L40 60 L50 45 L60 60 L78 25 Z" fill="#E2E8F0" stroke="#475569" strokeWidth="2" />
  </svg>
);
const IllustrationPants = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-md">
    <path d="M30 15 H70 L75 85 H55 L50 40 L45 85 H25 Z" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="2.5" />
  </svg>
);
const IllustrationSweater = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 drop-shadow-md">
    <path d="M20 35 Q50 25 80 35 L85 85 Q50 90 15 85 Z" fill="#FFF1F2" stroke="#E11D48" strokeWidth="2.5" />
  </svg>
);

// ★修正: セーターのitemTypeを修正、コースをスタンダードに変更
const QUICK_PRESETS = [
  { id: 'shirt', icon: <IllustrationShirt />, title: 'ワイシャツ', style: 'border-blue-200 bg-blue-50/50 text-blue-900', data: { itemType: "ワイシャツ", processInstruction: "スタンダード", finishing: "ハンガー仕上げ", specialTreatments: ["エリ・ソデ重点"] } },
  { id: 'suit', icon: <IllustrationSuit />, title: 'スーツ上', style: 'border-slate-300 bg-slate-50/50 text-slate-900', data: { itemType: "スーツ上", processInstruction: "スタンダード", finishing: "ソフト仕上げ", specialTreatments: [] } },
  { id: 'pants', icon: <IllustrationPants />, title: 'ズボン', style: 'border-indigo-200 bg-indigo-50/50 text-indigo-900', data: { itemType: "ズボン", processInstruction: "スタンダード", finishing: "センタープレス", specialTreatments: [] } },
  { id: 'knit', icon: <IllustrationSweater />, title: 'セーター', style: 'border-rose-200 bg-rose-50/50 text-rose-900', data: { itemType: "セーター", processInstruction: "スタンダード", finishing: "たたみ仕上げ", specialTreatments: ["ネット"] } },
];

const TEXT_TEMPLATES = ["襟の黄ばみ", "袖口汚れ", "食べこぼし", "インク染み", "ボタン欠損", "ほつれ", "色落ち注意"];
const COLORS_LIST = ["黒", "紺", "グレー", "白", "茶", "ベージュ", "ストライプ", "チェック"];
const ACCESSORIES_LIST = ["ベルト", "フード", "ライナー", "ファー", "リボン", "ブローチ"];

// =================================================================
// 3. UI部品コンポーネント (Appより先に定義)
// =================================================================

const SelectButton = ({ selected, onClick, label }) => (
  <button
    type="button"
    onClick={(e) => { e.preventDefault(); onClick && onClick(e); }}
    className={`
      relative w-full p-4 rounded-xl border-2 text-center transition-all duration-200 active:scale-95 font-bold text-sm touch-manipulation
      ${selected ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}
    `}
  >
    {selected && <div className="absolute top-1 right-1 text-blue-500"><Check className="w-4 h-4" /></div>}
    {label}
  </button>
);

const Card = ({ children, title, icon: Icon, headerColor = "bg-gray-50", visible = true }) => {
  if (!visible) return null;
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden w-full mb-6">
      <div className={`${headerColor} px-6 py-4 border-b flex items-center gap-3`}>
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100"><Icon className="w-5 h-5 text-blue-600" /></div>
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-6 space-y-6">
        {children}
      </div>
    </div>
  );
};

const CustomAlert = ({ show, title, message, type, onConfirm, onCancel }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl border-t-8 border-t-blue-500">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${type === 'confirm' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
          {type === 'confirm' ? <Info /> : <CheckCircle />}
        </div>
        <h3 className="text-xl font-black mb-2">{title}</h3>
        <p className="text-gray-600 font-bold mb-8 leading-relaxed whitespace-pre-wrap">{message}</p>
        <div className="flex gap-4">
          {type === 'confirm' && (
            <button type="button" onClick={onCancel} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500">キャンセル</button>
          )}
          <button type="button" onClick={onConfirm} className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-lg active:scale-95 ${type === 'confirm' ? 'bg-blue-600' : 'bg-green-600'}`}>OK</button>
        </div>
      </div>
    </div>
  );
};

const NumPad = ({ value, onChange, onClose }) => {
  const handleNum = (n) => {
    const raw = value ? value.toString().replace(/-/g, '') : '';
    if (raw.length >= 6) return;
    const next = raw + n;
    onChange(next.length > 1 ? next.slice(0, 1) + '-' + next.slice(1) : next);
  };
  const handleBS = () => {
    const raw = value ? value.toString().replace(/-/g, '') : '';
    const next = raw.slice(0, -1);
    onChange(next.length > 1 ? next.slice(0, 1) + '-' + next.slice(1) : next);
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-[3000] flex flex-col justify-end animate-in slide-in-from-bottom duration-300">
      <div className="flex-1" onClick={onClose}></div>
      <div className="bg-white rounded-t-[3rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest text-center">現在入力中の番号</div>
          <div className="text-6xl font-mono font-black text-blue-600 bg-gray-50 w-full py-6 text-center rounded-3xl border-2 border-blue-100 tracking-widest min-h-[100px]">
            {value || "---"}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} type="button" onClick={() => handleNum(String(n))} className="py-6 bg-white rounded-2xl text-3xl font-bold border-b-4 border-gray-200 active:bg-blue-50 active:translate-y-1 transition-all">{n}</button>)}
          <button type="button" onClick={() => onChange("")} className="py-6 bg-red-50 text-red-500 rounded-2xl font-bold border-b-4 border-red-100">クリア</button>
          <button type="button" onClick={() => handleNum('0')} className="py-6 bg-white rounded-2xl text-3xl font-bold border-b-4 border-gray-200">0</button>
          <button type="button" onClick={handleBS} className="py-6 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-700 active:bg-gray-200"><Delete className="w-8 h-8" /></button>
        </div>
        <button type="button" onClick={onClose} className="w-full py-5 bg-blue-600 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform">入力を決定</button>
      </div>
    </div>
  );
};

const CameraModal = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stream = null;
    let mounted = true;
    async function startCamera() {
      try {
        setLoading(true);
        // フルHD画質
        const constraints = { video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } };
        try { stream = await navigator.mediaDevices.getUserMedia(constraints); } catch { stream = await navigator.mediaDevices.getUserMedia({ video: true }); }
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(e => console.error(e));
        }
      } catch (e) { console.error(e); } finally { if (mounted) setLoading(false); }
    }
    startCamera();
    return () => { mounted = false; if(stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);

  const snap = (e) => {
    e.preventDefault();
    const v = videoRef.current;
    if(!v) return;
    const c = document.createElement('canvas');
    c.width = 1920; c.height = v.videoHeight * (1920 / v.videoWidth);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    onCapture(c.toDataURL('image/jpeg', 0.8));
    onClose();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 1920; c.height = img.height * (1920 / img.width);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          onCapture(c.toDataURL('image/jpeg', 0.8));
          onClose();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[4000] flex flex-col items-center justify-center p-4">
      <button type="button" onClick={onClose} className="absolute top-6 right-6 p-4 bg-gray-800/80 rounded-full text-white z-[4010] shadow-xl"><X className="w-8 h-8" /></button>
      {loading && <div className="text-white flex flex-col items-center gap-4 z-50 font-bold"><RefreshCw className="animate-spin w-12 h-12" /><p>カメラを起動中...</p></div>}
      <div className="relative w-full h-full flex flex-col justify-center items-center overflow-hidden rounded-[2.5rem] bg-gray-900 shadow-2xl">
        <video ref={videoRef} playsInline muted autoPlay className={`flex-1 w-full h-full object-cover ${loading ? 'hidden' : 'block'}`} />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[95%] h-[85%] border-4 border-dashed border-white/60 rounded-[2rem] relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
             <div className="absolute -top-12 left-0 right-0 text-center text-white font-black bg-black/50 py-2 px-6 rounded-full w-fit mx-auto shadow-xl">枠内に衣類を合わせて撮影</div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center gap-6">
          <button type="button" onClick={snap} className="w-24 h-24 bg-white rounded-full border-8 border-gray-400 flex items-center justify-center active:scale-75 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.4)]"><div className="w-16 h-16 bg-red-600 rounded-full border-4 border-white"></div></button>
          <button type="button" onClick={() => fileInputRef.current.click()} className="text-white/60 text-sm font-bold flex items-center gap-2 py-2 hover:text-white transition-colors underline"><Upload className="w-4 h-4" /> またはファイルから選択</button>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
        </div>
      </div>
    </div>
  );
};

const PhotoMarkerModal = ({ photoSrc, onClose, onSave }) => {
  const [markers, setMarkers] = useState([]);
  const [markerSize, setMarkerSize] = useState(5); 
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const handleImageClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarkers([...markers, { x, y, size: markerSize }]);
  };
  
  const handleUndo = () => setMarkers(markers.slice(0, -1));
  
  const handleSaveWithMarkers = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    markers.forEach(m => {
      const x = (m.x / 100) * canvas.width;
      const y = (m.y / 100) * canvas.height;
      const radius = (canvas.width * (m.size / 100)) / 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
      ctx.lineWidth = Math.max(radius * 0.15, 5); 
      ctx.strokeStyle = 'red';
      ctx.stroke();
    });
    onSave(canvas.toDataURL('image/jpeg', 0.8));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[5000] flex flex-col items-center justify-center p-4">
      <div className="text-white font-bold mb-4 flex items-center gap-2">
        <Edit3 className="w-5 h-5" /> タップして赤丸（マーカー）を追加
      </div>
      <div className="relative w-full max-w-lg mb-4 bg-gray-900 rounded-lg overflow-hidden">
        <img ref={imgRef} src={photoSrc} alt="edit" className="w-full h-auto max-h-[60vh] object-contain select-none cursor-crosshair" onClick={handleImageClick} />
        {markers.map((m, i) => (
          <div key={i} className="absolute border-4 border-red-500 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow-sm" style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.size}%`, aspectRatio: '1 / 1' }} />
        ))}
      </div>
      <div className="w-full max-w-md bg-gray-800 p-4 rounded-xl mb-4 flex flex-col gap-2">
        <div className="flex justify-between text-white text-xs mb-1 font-bold"><span>マーカーサイズ調整</span><span>{markerSize}</span></div>
        <input type="range" min="2" max="25" value={markerSize} onChange={(e) => setMarkerSize(Number(e.target.value))} className="w-full h-4 bg-gray-600 rounded-lg accent-blue-500 cursor-pointer" />
      </div>
      <div className="flex gap-4 w-full max-w-md">
        <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-600 text-white rounded-2xl font-bold active:scale-95">キャンセル</button>
        <button type="button" onClick={handleUndo} className="flex-1 py-4 bg-yellow-600 text-white rounded-2xl font-bold active:scale-95" disabled={markers.length === 0}>一つ戻す</button>
        <button type="button" onClick={handleSaveWithMarkers} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold active:scale-95 shadow-xl">保存</button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// ★改良: レシートモーダル (B5サイズ & カラー/モノクロ対応)
const ReceiptModal = ({ data, photos, onClose }) => {
  const [isMonochrome, setIsMonochrome] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/90 z-[5000] flex flex-col items-center justify-center p-4">
      {/* プレビューエリア (B5比率に近い形) */}
      <div 
        className={`bg-white w-[182mm] max-w-full p-8 shadow-2xl rounded-sm font-mono text-sm leading-relaxed receipt-paper mx-auto my-auto relative overflow-y-auto max-h-[80vh] ${isMonochrome ? 'grayscale' : ''}`}
        style={{ aspectRatio: '182/257' }}
      >
        <div className="text-center border-b-2 border-black pb-4 mb-6 font-black text-2xl">お預かり伝票（兼タグ）</div>
        <div className="space-y-4 mb-6 border-b border-black pb-6">
          <div className="flex justify-between text-lg"><span>管理No:</span><span className="font-bold">{data.manageNo}</span></div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xl font-bold">Tag No:</span>
            <span className="text-6xl font-black bg-black text-white px-4 py-1 block">{data.tagNumber}</span>
          </div>
          <div className="text-3xl font-black pt-2 border-t border-gray-100">{data.customerName} 様</div>
        </div>
        <div className="space-y-2 mb-6">
          <div className="flex justify-between font-bold text-2xl"><span>{data.itemType}</span><span>{data.brand}</span></div>
          {data.accessories?.length > 0 && <div className="text-lg bg-gray-100 p-2 font-bold">付属品: {data.accessories.join('、')}</div>}
          <div className="text-lg pt-2 mt-4 border-t border-dashed">
             【指示】<br/>
             {data.stainRemovalRequest !== "なし" && <span className="font-bold mr-2 text-blue-600">★シミ抜き有 {data.stainRemovalPrice > 0 && `(${data.stainRemovalPrice}円)`}</span>}
             {data.stainLocation || "特になし"}
          </div>
        </div>
        {photos && photos[0] && (
          <div className="mb-6 text-center border-t border-dashed pt-4">
             <img src={photos[0]} alt="p" className="w-full h-auto grayscale contrast-150 rounded shadow-sm border-2 border-black" />
             <p className="text-xs mt-1 text-gray-500">※汚れ箇所記録</p>
          </div>
        )}
        <div className="text-center border-t-4 border-black pt-6 mt-4">
           <p className="text-sm mb-1 font-black italic">お渡し予定日</p>
           <p className="text-5xl font-black tracking-tighter">{data.dueDate}</p>
        </div>
      </div>
      
      {/* 印刷ボタンエリア */}
      <div className="mt-8 flex flex-col gap-4 w-full max-w-[400px] no-print">
        <div className="flex gap-3">
          <button 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              setIsMonochrome(false);
              setTimeout(() => window.print(), 100);
            }} 
            className="flex-1 py-4 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Printer /> カラー印刷
          </button>
          <button 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              setIsMonochrome(true);
              setTimeout(() => window.print(), 100);
            }} 
            className="flex-1 py-4 bg-gray-800 text-white rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Printer /> モノクロ印刷
          </button>
        </div>
        <button type="button" onClick={(e) => {e.preventDefault(); onClose();}} className="w-full py-4 bg-gray-600 text-white rounded-2xl font-black">閉じる</button>
      </div>
      
      {/* 印刷用CSS: B5サイズ指定 & モノクロ制御 */}
      <style>{`
        @media print { 
          @page { size: B5; margin: 0; }
          body * { visibility: hidden; } 
          .receipt-paper, .receipt-paper * { visibility: visible; } 
          .receipt-paper { 
            position: absolute; left: 0; top: 0; width: 100% !important; height: 100% !important; 
            box-shadow: none; margin: 0; padding: 10mm; 
            filter: ${isMonochrome ? 'grayscale(100%)' : 'none'} !important;
          } 
          .no-print { display: none; } 
        }
      `}</style>
    </div>
  );
};

// =================================================================
// 4. メインアプリケーション
// =================================================================

export default function App() {
  const firebaseConfig = JSON.parse(__firebase_config);
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'cleaning-dx-app';
  const appId = rawAppId.replace(/\//g, '_');

  const [user, setUser] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [formData, setFormData] = useState({ ...INITIAL_FORM_STATE });
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSimpleMode, setIsSimpleMode] = useState(true);
  const [isFactoryMode, setIsFactoryMode] = useState(false);
  const [showNumPad, setShowNumPad] = useState(false);
  const [showBigInput, setShowBigInput] = useState(false); 
  const [bigInputType, setBigInputType] = useState("name"); 
  const [isCamera, setIsCamera] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ show: false, title: "", message: "", type: "alert" });

  const recognitionRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth Error:", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const kartesCollection = collection(db, 'artifacts', appId, 'public', 'data', 'kartes');
    const qRaw = query(kartesCollection);
    
    const unsubscribe = onSnapshot(qRaw, (ss) => {
      const docs = [];
      ss.forEach(d => docs.push({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHistory(docs);
      
      setFormData(prev => {
        if (prev.manageNo) return prev;
        const today = getTodayStr();
        const count = docs.filter(i => i.manageNo?.startsWith(today)).length;
        return { ...prev, manageNo: `${today}-${String(count + 1).padStart(3, '0')}` };
      });
    }, (e) => console.error("Firestore Error:", e));
    return () => unsubscribe();
  }, [user]);

  const filteredHistory = useMemo(() => {
    const s = searchQuery.toLowerCase();
    const sRaw = s.replace(/-/g, '');
    return history.filter(h => {
      const nameMatch = (h.customerName || "").toLowerCase().includes(s);
      const tag = (h.tagNumber || "").toLowerCase();
      const tagRaw = tag.replace(/-/g, '');
      const tagMatch = tag.includes(s) || tagRaw.includes(sRaw);
      return nameMatch || tagMatch;
    });
  }, [history, searchQuery]);

  const todaysTasks = useMemo(() => {
    const today = getTodayDateStr();
    const target = history.filter(item => item.dueDate === today);
    return { total: target.length, stain: target.filter(item => item.stainRemovalRequest !== "なし").length };
  }, [history]);

  const handleSearchChange = (val) => {
    if (/^[0-9-]+$/.test(val)) {
      const raw = val.replace(/-/g, '');
      if (raw.length > 1) {
         setSearchQuery(raw.slice(0, 1) + '-' + raw.slice(1));
      } else {
         setSearchQuery(val);
      }
    } else {
      setSearchQuery(val);
    }
  };

  const handleSave = async (e) => {
    if(e) e.preventDefault();
    if (!formData.customerName) { 
      setAlertConfig({ show: true, title: "入力エラー", message: "お名前を入力してください", type: "alert", onConfirm: () => setAlertConfig({show:false}) }); 
      return; 
    }
    if (!user) return;
    try {
      const kartesCollection = collection(db, 'artifacts', appId, 'public', 'data', 'kartes');
      await addDoc(kartesCollection, {
        ...formData, photos, createdAt: serverTimestamp()
      });
      // ★改良: 音声再生
      playSaveVoice();
      setAlertConfig({ 
        show: true, title: "保存完了", message: "クラウド保存しました！\n続けて次を入力しますか？", type: "confirm", 
        onConfirm: () => { setAlertConfig({show:false}); resetForm(); },
        onCancel: () => setAlertConfig({show:false})
      });
    } catch (e) {
      setAlertConfig({ show: true, title: "エラー", message: "保存に失敗しました。", type: "alert", onConfirm: () => setAlertConfig({show:false}) });
    }
  };

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM_STATE, manageNo: "" });
    setPhotos([]);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadData = (data) => {
    const load = () => {
      setFormData(data);
      setPhotos(data.photos || []);
      setSearchQuery("");
      setShowBigInput(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    if (formData.customerName) setAlertConfig({ show: true, title: "確認", message: "現在の入力を破棄して呼び出しますか？", type: "confirm", onConfirm: () => { setAlertConfig({show:false}); load(); }, onCancel: () => setAlertConfig({show:false}) });
    else load();
  };

  const deleteKarte = (id) => {
    setAlertConfig({
      show: true, title: "削除確認", message: "このカルテを消去しますか？", type: "confirm",
      onConfirm: async () => {
        if (!user) return;
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'kartes', id));
        setAlertConfig({show:false});
      },
      onCancel: () => setAlertConfig({show:false})
    });
  };
  
  const removePhoto = (index) => {
    setAlertConfig({
      show: true, title: "写真の削除", message: "この写真を削除しますか？", type: "confirm",
      onConfirm: () => {
        setPhotos(photos.filter((_, idx) => idx !== index));
        setAlertConfig({show:false});
        if(editingPhotoIndex === index) setEditingPhotoIndex(null);
      },
      onCancel: () => setAlertConfig({show:false})
    });
  };

  const updatePhoto = (newData) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos[editingPhotoIndex] = newData;
      return newPhotos;
    });
    setEditingPhotoIndex(null);
  };

  const handleVoiceInput = (e) => {
    if(e) e.preventDefault();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const r = new SR(); r.lang = 'ja-JP';
    r.onstart = () => setIsListening(true);
    r.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setFormData(prev => ({ ...prev, stainLocation: (prev.stainLocation || "") + " " + text }));
    };
    r.onend = () => setIsListening(false);
    recognitionRef.current = r; r.start();
  };

  const capturePhoto = (e) => {
    if(e) e.preventDefault();
    setIsCamera(true);
  };
  
  // ★改良: デカ文字入力モーダル
  const BigInputModal = ({ title, value, onChange, onClose, placeholder, searchResults, onSelectResult }) => {
    return (
      <div className="fixed inset-0 bg-black/80 z-[3000] flex flex-col justify-end animate-in fade-in">
        <div className="flex-1" onClick={onClose}></div>
        <div className="bg-white rounded-t-[3rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4 px-2">
             <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">{title}</div>
             <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500"><X /></button>
          </div>
          
          <div className="text-4xl font-bold text-gray-800 bg-gray-50 w-full py-6 px-4 text-center rounded-3xl border-2 border-blue-100 shadow-inner min-h-[80px] break-words mb-4">
            {value || <span className="text-gray-300 text-2xl">{placeholder}</span>}
          </div>

          {searchResults && searchResults.length > 0 && (
            <div className="mb-4 flex-1 overflow-y-auto min-h-[150px] bg-yellow-50 rounded-2xl p-2 border border-yellow-200">
              <div className="text-xs font-bold text-yellow-600 mb-2 px-2">候補が見つかりました</div>
              {searchResults.map(h => (
                <button key={h.id} onClick={() => onSelectResult(h)} className="w-full bg-white p-3 rounded-xl shadow-sm border border-yellow-100 mb-2 text-left flex justify-between items-center active:bg-yellow-100">
                  <div>
                    <div className="text-xs font-black text-blue-600">Tag {h.tagNumber}</div>
                    <div className="font-bold">{h.customerName}</div>
                    {/* ★改良: 写真枚数を表示 */}
                    {h.photos?.length > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1 inline-block">📷 {h.photos.length}枚</span>}
                  </div>
                  <div className="text-xs text-gray-400 font-bold">{h.itemType}</div>
                </button>
              ))}
            </div>
          )}

          <div className="mb-4">
            <input
              type="text"
              className="w-full p-4 text-xl border-2 border-blue-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-200"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="ここに入力..."
              autoFocus
            />
          </div>

          <div className="flex gap-3 pb-8">
            <button type="button" onClick={() => onChange("")} className="py-4 px-6 bg-gray-100 text-gray-500 font-bold rounded-2xl">クリア</button>
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-blue-600 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95">決定</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen pb-40 ${isFactoryMode ? 'bg-[#0a0a0a] text-gray-300' : 'bg-slate-50 text-gray-800'} font-sans overflow-x-hidden`}>
      <CustomAlert show={alertConfig.show} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onConfirm={alertConfig.onConfirm} onCancel={alertConfig.onCancel} />
      
      {showNumPad && <NumPad value={formData.tagNumber} onChange={(v) => setFormData({...formData, tagNumber: v})} onClose={() => setShowNumPad(false)} />}
      
      {showBigInput && (
        <BigInputModal 
          title={bigInputType === 'name' ? "お客様名" : "呼び出し検索"}
          placeholder={bigInputType === 'name' ? "名前を入力" : "タグ番号・名前"}
          value={bigInputType === 'name' ? formData.customerName : searchQuery}
          onChange={(val) => bigInputType === 'name' ? setFormData({...formData, customerName: val}) : handleSearchChange(val)}
          onClose={() => setShowBigInput(false)}
          searchResults={bigInputType === 'search' ? filteredHistory : null}
          onSelectResult={loadData}
        />
      )}

      {isCamera && <CameraModal onCapture={(p) => setPhotos([...photos, p])} onClose={() => setIsCamera(false)} />}
      
      {showReceipt && <ReceiptModal data={formData} photos={photos} onClose={() => setShowReceipt(false)} />}
      
      {editingPhotoIndex !== null && (
        <PhotoMarkerModal 
          photoSrc={photos[editingPhotoIndex]} 
          onClose={() => setEditingPhotoIndex(null)} 
          onSave={updatePhoto} 
        />
      )}

      {/* ヘッダー */}
      <header className={`p-4 sticky top-0 z-[100] shadow-xl flex flex-col gap-3 ${isFactoryMode ? 'bg-zinc-900 border-b border-zinc-800' : 'bg-blue-700 text-white'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl shadow-inner"><Shirt className="w-7 h-7" /></div>
            <h1 className="text-xl font-black tracking-tighter">{isFactoryMode ? '工場シミ抜きビューア' : 'Fabric Care カルテ'}</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={(e) => {e.preventDefault(); setIsFactoryMode(!isFactoryMode);}} className="p-3 bg-white/10 rounded-full active:scale-90 transition-all shadow-md"><Factory className="w-5 h-5" /></button>
            <button type="button" onClick={(e) => {e.preventDefault(); setIsSimpleMode(!isSimpleMode);}} className="p-3 bg-white/10 rounded-full active:scale-90 transition-all shadow-md">{isSimpleMode ? <ToggleLeft className="w-7 h-7" /> : <ToggleRight className="w-7 h-7" />}</button>
          </div>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-white transition-colors" />
          <button 
            type="button"
            onClick={() => { setBigInputType('search'); setShowBigInput(true); }}
            className="w-full p-4 pl-12 rounded-2xl bg-white/10 border-2 border-white/5 text-white text-left opacity-90 hover:bg-white/20 transition-all flex items-center"
          >
            {searchQuery || <span className="opacity-50">🔍 呼び出し検索（タップして入力）</span>}
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 工場モードサマリー */}
        {isFactoryMode && !searchQuery && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-zinc-800 p-6 rounded-3xl text-center border border-zinc-700 shadow-xl">
               <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">本日の仕上がり</div>
               <div className="text-4xl font-black text-white">{todaysTasks.total} <span className="text-sm text-gray-500">点</span></div>
            </div>
            <div className="bg-zinc-800 p-6 rounded-3xl text-center border border-yellow-900/40 relative overflow-hidden shadow-xl">
               <div className="absolute top-0 right-0 bg-yellow-600 text-black text-[9px] font-black px-3 py-0.5">PRIORITY</div>
               <div className="text-[10px] font-bold text-yellow-600 mb-1 uppercase tracking-widest">シミ抜きあり</div>
               <div className="text-4xl font-black text-yellow-500">{todaysTasks.stain} <span className="text-sm text-gray-500">点</span></div>
            </div>
          </div>
        )}

        {/* 検索結果（呼び出し候補） */}
        {searchQuery && filteredHistory.length > 0 && !showBigInput && (
          <div className="bg-blue-600 p-5 rounded-[2.5rem] shadow-2xl border-4 border-white/20 animate-in zoom-in duration-300">
             <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2 px-2 uppercase tracking-widest">履歴から呼び出し</h3>
             <div className="flex gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide">
                {filteredHistory.slice(0, 5).map(h => (
                  <button key={h.id} type="button" onClick={() => loadData(h)} className="flex-shrink-0 bg-white/95 backdrop-blur p-4 rounded-[2rem] shadow-xl border border-white text-left min-w-[170px] active:scale-95 transition-all">
                    <div className="text-[10px] font-black text-blue-600 mb-1 uppercase tracking-tighter">Tag {h.tagNumber || "--"}</div>
                    <div className="font-black text-gray-800 truncate text-lg mb-1">{h.customerName} 様</div>
                    {/* ★改良: 写真枚数を表示 */}
                    {h.photos?.length > 0 && <div className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full inline-block mt-1 font-bold">📷 {h.photos.length}枚</div>}
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* ... (以下、入力フォーム部分は既存のまま) ... */}
        {!isFactoryMode && (
          <>
            {/* かんたんセット */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {QUICK_PRESETS.map(p => (
                <button key={p.id} type="button" onClick={(e) => { e.preventDefault(); setFormData({...formData, ...p.data}); }} className={`p-6 rounded-[2.5rem] border-2 shadow-lg flex flex-col items-center gap-3 active:scale-90 active:bg-blue-50 transition-all ${p.style}`}>
                  {p.icon}
                  <span className="font-black text-sm tracking-tighter">{p.title}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-8">
                <Card title="1. 受付情報" icon={User}>
                  {/* ... (省略: 受付情報フォーム) ... */}
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-1/3">
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Tag No.</label>
                        <button type="button" onClick={(e) => { e.preventDefault(); setShowNumPad(true); }} className="w-full p-5 bg-blue-50 border-2 border-blue-200 rounded-3xl text-3xl font-black text-blue-700 shadow-inner active:scale-95 transition-all">
                          {formData.tagNumber || <span className="text-blue-200 text-xs tracking-normal">番号入力</span>}
                        </button>
                      </div>
                      <div className="w-2/3">
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">お客様名</label>
                        <button type="button" onClick={() => { setBigInputType('name'); setShowBigInput(true); }} className="w-full p-5 border-2 border-gray-100 rounded-3xl bg-white text-left shadow-inner flex items-center">
                          {formData.customerName ? <span className="text-xl font-black">{formData.customerName}</span> : <span className="text-gray-300 text-lg">名前を入力...</span>}
                        </button>
                      </div>
                    </div>
                    {/* ... */}
                  </div>
                </Card>

                <Card title="2. 検品・詳細" icon={Camera} color="border-l-8 border-rose-500">
                   {/* ... (省略: カメラ・詳細入力) ... */}
                   <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-3">
                      {photos.map((p, i) => (
                        <div 
                          key={i} 
                          className="relative aspect-square rounded-3xl overflow-hidden border-2 border-gray-100 shadow-md cursor-pointer active:scale-95 transition-transform"
                          onClick={() => setEditingPhotoIndex(i)} 
                        >
                          <img src={p} alt="p" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={(e) => { 
                               e.preventDefault();
                               e.stopPropagation();
                               removePhoto(i); 
                            }} 
                            className="absolute top-0 right-0 p-3 bg-red-600/90 text-white rounded-bl-2xl shadow-xl active:bg-red-800 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      {photos.length < 3 && (
                        <button type="button" onClick={(e) => { e.preventDefault(); setIsCamera(true); }} className="aspect-square bg-gray-50 border-4 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 group active:bg-blue-50 transition-all">
                          <Camera className="w-10 h-10 mb-2 group-active:scale-110 transition-transform" />
                          <span className="text-[10px] font-black uppercase">撮影</span>
                        </button>
                      )}
                    </div>
                    {/* ... */}
                  </div>
                </Card>
              </div>

              <div className="space-y-8">
                <Card title="3. 指示・仕上げ" icon={Scissors}>
                   <div className="space-y-6">
                     <div>
                       <label className="text-[10px] font-black text-gray-400 mb-3 block uppercase tracking-widest px-1">シミ抜き指定</label>
                       <div className="grid grid-cols-3 gap-3">
                         {['なし', '無料', '有料'].map(s => (
                           <button key={s} type="button" onClick={(e) => { e.preventDefault(); setFormData({...formData, stainRemovalRequest: s}); }} className={`py-4 rounded-2xl font-black border-2 transition-all active:scale-95 ${formData.stainRemovalRequest === s ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg scale-105' : 'bg-gray-50 text-gray-400 border-gray-100 active:bg-gray-100'}`}>{s}</button>
                         ))}
                       </div>
                       {formData.stainRemovalRequest === '有料' && (
                         <div className="mt-3 grid grid-cols-3 gap-2 animate-in fade-in">
                           {[500, 800, 1000, 1500, 2000, 3000].map(p => (
                             <button key={p} type="button" onClick={() => setFormData({...formData, stainRemovalPrice: p})} className={`py-2 rounded-lg font-bold border text-xs ${formData.stainRemovalPrice === p ? 'bg-yellow-500 text-white' : 'bg-white'}`}>{p}円</button>
                           ))}
                         </div>
                       )}
                     </div>
                     {/* ... */}
                   </div>
                </Card>

                <div className="flex flex-col gap-5 sticky top-40">
                  <button type="button" onClick={handleSave} className="w-full py-8 bg-emerald-600 text-white rounded-[2.5rem] shadow-2xl text-4xl font-black flex items-center justify-center gap-4 active:scale-90 hover:bg-emerald-700 transition-all">
                    <Save className="w-12 h-12" /> 受付を保存
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowReceipt(true); }} className="w-full py-6 bg-zinc-900 text-white rounded-[2rem] shadow-xl text-xl font-black flex items-center justify-center gap-3 active:scale-95 border-b-8 border-zinc-700 transition-all">
                    <Receipt className="w-7 h-7 text-yellow-400" /> タグ（レシート）を発行
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}