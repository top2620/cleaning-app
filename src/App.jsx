import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Save, Camera, Printer, CheckCircle, AlertTriangle, User, Scissors, Shirt, X, Trash2, History, FileText, Check, ChevronRight, RefreshCw, Cloud, CloudOff, Search, Tag, Maximize2, Image as ImageIcon, Mic, MicOff, Edit3, MapPin, Zap, Star, ToggleLeft, ToggleRight, Clock, Calendar, Layers, Palette, Receipt, DollarSign, Factory, ZoomIn, ListChecks, AlertCircle, Focus, Upload, Image } from 'lucide-react';

// Firebase部品
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

// =================================================================
// ★Firebase設定
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBt3YJKQwdK-DqEV7rh3Mlh4BVOGa3Tw2s",
  authDomain: "my-cleaning-app-adf6a.firebaseapp.com",
  projectId: "my-cleaning-app-adf6a",
  storageBucket: "my-cleaning-app-adf6a.firebasestorage.app",
  messagingSenderId: "1086144954064",
  appId: "1:1086144954064:web:f927f4e0a725a6848928d5"
};

let db;
try {
  if (firebaseConfig.apiKey !== "AIzaSy...") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Firebase初期化エラー:", e);
}

// --- ヘルパー関数 ---
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const getTodayDateStr = () => new Date().toISOString().split('T')[0];

const getFutureDateStr = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// --- イラストコンポーネント（シンプル＆おしゃれ版） ---

const IllustrationShirt = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-sm">
    <rect x="25" y="30" width="50" height="60" rx="4" fill="#EBF5FF" stroke="#3B82F6" strokeWidth="2" />
    <path d="M50 30 L25 15 L35 15 L50 25 L65 15 L75 15 Z" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="50" cy="45" r="1.5" fill="#3B82F6" />
    <circle cx="50" cy="60" r="1.5" fill="#3B82F6" />
    <circle cx="50" cy="75" r="1.5" fill="#3B82F6" />
  </svg>
);

const IllustrationSuit = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-sm">
    <rect x="22" y="25" width="56" height="65" rx="4" fill="#F1F5F9" stroke="#475569" strokeWidth="2.5" />
    <path d="M50 25 L22 25 L40 60 L50 45 L60 60 L78 25 Z" fill="#E2E8F0" stroke="#475569" strokeWidth="2" />
    <path d="M50 25 V90" stroke="#475569" strokeWidth="1.5" />
  </svg>
);

const IllustrationPants = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-sm">
    <path d="M30 15 H70 L75 85 H55 L50 40 L45 85 H25 Z" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="2.5" strokeLinejoin="round" />
    <rect x="35" y="15" width="30" height="8" fill="white" stroke="#4F46E5" strokeWidth="2" />
  </svg>
);

const IllustrationSweater = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-sm">
    <path d="M20 35 Q50 25 80 35 L85 85 Q50 90 15 85 Z" fill="#FFF1F2" stroke="#E11D48" strokeWidth="2.5" />
    <path d="M20 35 L10 55 L20 60 L25 45" fill="#FFF1F2" stroke="#E11D48" strokeWidth="2" />
    <path d="M80 35 L90 55 L80 60 L75 45" fill="#FFF1F2" stroke="#E11D48" strokeWidth="2" />
  </svg>
);

// ------------------------------------------------------------------

const TEXT_TEMPLATES = [
  "襟の黄ばみあり", "袖口に黒ずみ", "食べこぼしのシミ", 
  "インクのシミ", "全体的にシワ", "ボタン欠損", 
  "ほつれあり", "色落ち注意", "ファスナー動作不良",
  "ポケット内確認済み", "付属品あり"
];
const ACCESSORIES_LIST = ["ベルト", "フード", "ライナー", "ファー", "リボン", "ブローチ"];
const COLORS_LIST = ["黒", "紺", "グレー", "白", "茶", "ベージュ", "ストライプ", "チェック"];

// ★かんたんセット（イラスト版）
const QUICK_PRESETS = [
  { 
    id: 'shirt', 
    icon: <IllustrationShirt />, 
    title: 'ワイシャツ', 
    desc: 'ハンガー・エリ袖', 
    style: 'hover:bg-blue-50 border-blue-200',
    data: { itemType: "ワイシャツ", processInstruction: "スタンダード", finishing: "ハンガー仕上げ", specialTreatments: ["エリ・ソデ重点"] }
  },
  { 
    id: 'suit', 
    icon: <IllustrationSuit />, 
    title: 'スーツ(上)', 
    desc: 'ソフト・標準', 
    style: 'hover:bg-gray-50 border-gray-200',
    data: { itemType: "スーツ上", processInstruction: "スタンダード", finishing: "ソフト仕上げ（ふんわり）", specialTreatments: [] }
  },
  { 
    id: 'suit_bottom', 
    icon: <IllustrationPants />, 
    title: 'ズボン', 
    desc: 'センタープレス', 
    style: 'hover:bg-indigo-50 border-indigo-200',
    data: { itemType: "スーツ下（ズボン）", processInstruction: "スタンダード", finishing: "センタープレス有り", specialTreatments: [] }
  },
  { 
    id: 'delicate', 
    icon: <IllustrationSweater />, 
    title: 'セーター', 
    desc: 'たたみ仕上げ', 
    style: 'hover:bg-rose-50 border-rose-200',
    data: { itemType: "セーター・ニット", processInstruction: "デラックス", finishing: "たたみ仕上げ", specialTreatments: ["ネット必須", "デリケート"] }
  },
];

// ★カスタムカメラコンポーネント（修正版）
const CameraModal = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null); // ファイル選択用のref
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let stream = null;
    let mounted = true;

    async function startCamera() {
      try {
        setIsLoading(true);
        // リアカメラを試行
        const constraints = {
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn("リアカメラ起動失敗、標準カメラで再試行", err);
          // 失敗したら制約なしで再試行
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (mounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          // ★重要: 明示的に再生を開始する（これが真っ暗対策）
          videoRef.current.onloadedmetadata = () => {
            if(videoRef.current) videoRef.current.play().catch(e => console.error("Play error:", e));
          };
          setHasPermission(true);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        // エラー時はアラートを出さず、画面内のUIで代替手段を案内する
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // 画像圧縮
    const resizedCanvas = document.createElement('canvas');
    const MAX_WIDTH = 800;
    const scale = MAX_WIDTH / canvas.width;
    resizedCanvas.width = MAX_WIDTH;
    resizedCanvas.height = canvas.height * scale;
    const resizedCtx = resizedCanvas.getContext('2d');
    resizedCtx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
    
    onCapture(resizedCanvas.toDataURL('image/jpeg', 0.7));
    onClose();
  };

  // ファイル選択ハンドラ（カメラが動かない場合の救済策）
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
         const img = new Image();
         img.onload = () => {
             const canvas = document.createElement('canvas');
             const MAX_WIDTH = 800;
             const scale = MAX_WIDTH / img.width;
             canvas.width = MAX_WIDTH;
             canvas.height = img.height * scale;
             const ctx = canvas.getContext('2d');
             ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
             onCapture(canvas.toDataURL('image/jpeg', 0.7));
             onClose();
         };
         img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[1200] flex flex-col items-center justify-center p-4">
      
      {/* 閉じるボタン（右上） */}
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 p-3 bg-gray-800 text-white rounded-full z-50 hover:bg-gray-700"
      >
        <X className="w-6 h-6" />
      </button>

      {/* ローディング表示 */}
      {isLoading && (
        <div className="text-white flex flex-col items-center gap-4 z-50">
          <RefreshCw className="animate-spin w-10 h-10" /> 
          <p>カメラを起動中...</p>
        </div>
      )}
      
      <div className="relative w-full h-full flex flex-col justify-center items-center">
        {/* ビデオ表示エリア */}
        <video 
          ref={videoRef} 
          playsInline 
          muted 
          autoPlay 
          className={`flex-1 w-full h-full object-cover rounded-lg bg-gray-900 ${isLoading ? 'hidden' : 'block'}`} 
        />
        
        {/* カメラが許可されなかった場合の表示 */}
        {!hasPermission && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900 p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
            <p className="mb-6 font-bold">カメラにアクセスできませんでした</p>
            <p className="text-sm text-gray-400 mb-8">ブラウザの設定を確認するか、<br/>下のボタンから写真を選んでください。</p>
          </div>
        )}

        {/* 撮影ガイド枠（カメラが動いているときのみ） */}
        {hasPermission && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-dashed border-white/60 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
               <div className="absolute -top-8 left-0 right-0 text-center text-white text-xs font-bold bg-black/50 py-1 px-3 rounded-full mx-auto w-fit">
                 枠に合わせて撮影
               </div>
            </div>
          </div>
        )}

        {/* コントロールエリア */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-4">
          
          {/* シャッターボタン (カメラ有効時のみ) */}
          {hasPermission && (
            <button 
              onClick={capture} 
              className="w-20 h-20 bg-white rounded-full border-4 border-gray-400 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
            >
              <div className="w-16 h-16 bg-red-600 rounded-full border-2 border-white"></div>
            </button>
          )}

          {/* 救済策: ファイル選択ボタン */}
          <div className="mt-2">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current.click()} 
              className="flex items-center gap-2 text-white text-sm bg-gray-800/80 px-4 py-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {hasPermission ? "またはファイルを選択" : "ファイルを選択 / 標準カメラ起動"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// カードコンポーネント
const Card = ({ children, title, icon: Icon, color = "bg-white", headerColor = "bg-gray-50", visible = true }) => {
  if (!visible) return null;
  return (
    <div className={`mb-6 rounded-xl shadow-sm overflow-hidden border border-gray-200 ${color} transition-shadow hover:shadow-md print:hidden w-full`}>
      <div className={`${headerColor} px-5 py-4 border-b border-gray-200 flex items-center`}>
        <div className="p-2 bg-white rounded-lg shadow-sm mr-3 flex-shrink-0">
          {Icon && <Icon className="w-5 h-5 text-blue-600" />}
        </div>
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};

// 選択ボタン
const SelectButton = ({ selected, onClick, label, subLabel }) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      relative w-full p-3 rounded-lg border-2 text-left transition-all duration-200 ease-in-out
      flex flex-col items-center justify-center gap-1 touch-manipulation
      ${selected ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}
    `}
  >
    {selected && <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
    <span className="font-bold text-sm">{label}</span>
    {subLabel && <span className="text-xs opacity-70">{subLabel}</span>}
  </button>
);

// レシートモーダル（80mm幅）
const ReceiptModal = ({ data, photos, onClose }) => {
  const safeAccessories = data.accessories || [];
  const safeNeeds = data.needs || [];
  return (
    <div className="fixed inset-0 bg-gray-900/90 z-[1000] flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-[80mm] p-4 shadow-2xl rounded-sm font-mono text-sm leading-relaxed receipt-paper mx-auto my-auto relative z-[1010]">
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <h2 className="text-xl font-bold mb-1">お預かり伝票</h2>
          <p className="text-[10px] text-gray-500">{new Date().toLocaleString()}</p>
        </div>
        <div className="mb-4">
          <div className="flex justify-between items-end mb-1"><span className="text-[10px]">管理No</span><span className="text-lg font-bold">{data.manageNo}</span></div>
          <div className="flex justify-between items-end mb-1"><span className="text-[10px]">Tag No</span><span className="text-2xl font-black border-2 border-black px-2">{data.tagNumber}</span></div>
          <div className="mt-4 pb-2 border-b"><span className="text-lg font-bold block">{data.customerName} 様</span></div>
        </div>
        <div className="mb-4 space-y-1">
          <div className="flex justify-between font-bold"><span>{data.itemType}</span><span>{data.brand}</span></div>
          <div className="text-[10px]">付属品: {safeAccessories.length > 0 ? safeAccessories.join('、') : 'なし'}</div>
        </div>
        {(data.stainRemovalRequest !== 'なし' || safeNeeds.length > 0) && (
          <div className="border-2 border-black p-2 mb-4">
            <div className="flex justify-between font-bold mb-1 text-xs"><span>★シミ抜き:</span><span>{data.stainRemovalRequest} {data.stainRemovalPrice > 0 && `(¥${data.stainRemovalPrice})`}</span></div>
            {safeNeeds.length > 0 && <div className="text-[10px]">内容: {safeNeeds.join('、')}</div>}
          </div>
        )}
        {photos && photos.length > 0 && (
          <div className="mb-4 text-center border-t border-dashed pt-2">
            <img src={photos[0]} alt="シミ位置" className="w-full h-auto grayscale contrast-125 border border-gray-300 rounded" />
          </div>
        )}
        <div className="text-center border-t-2 border-dashed border-gray-300 pt-4 mt-4"><p className="text-xl font-bold">{data.dueDate}</p></div>
      </div>
      <div className="mt-4 flex flex-col gap-3 w-full max-w-[300px] no-print pb-10 relative z-[1010]">
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTimeout(() => window.print(), 50);
          }} 
          className="w-full py-4 bg-blue-600 text-white rounded-full font-bold shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          <Printer className="mr-2 w-5 h-5" /> 印刷する
        </button>
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }} 
          className="w-full py-3 bg-gray-600 text-white rounded-full font-bold cursor-pointer active:scale-95 transition-transform"
        >
          閉じる
        </button>
      </div>
      <style>{`@media print { body * { visibility: hidden; } .receipt-paper, .receipt-paper * { visibility: visible; } .receipt-paper { position: absolute; left: 0; top: 0; width: 80mm !important; margin: 0 !important; box-shadow: none; overflow: visible; } .no-print { display: none; } }`}</style>
    </div>
  );
};

// 写真マーカー編集モーダル
const PhotoMarkerModal = ({ photoSrc, onClose, onSave }) => {
  const [markers, setMarkers] = useState([]);
  const [markerSize, setMarkerSize] = useState(5); 
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const handleImageClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    setMarkers([...markers, { x: ((e.clientX-rect.left)/rect.width)*100, y: ((e.clientY-rect.top)/rect.height)*100, size: markerSize }]);
  };
  const handleSave = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    markers.forEach(m => {
      const x = (m.x/100)*canvas.width; const y = (m.y/100)*canvas.height;
      const r = (canvas.width*(m.size/100))/2;
      ctx.beginPath(); ctx.arc(x,y,r,0,2*Math.PI); ctx.lineWidth=Math.max(r*0.15,3); ctx.strokeStyle='red'; ctx.stroke();
    });
    onSave(canvas.toDataURL('image/jpeg', 0.7)); onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/95 z-[1100] flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg mb-4">
        <img ref={imgRef} src={photoSrc} alt="edit" className="w-full h-auto max-h-[60vh] object-contain bg-gray-800 rounded-lg" onClick={handleImageClick} />
        {markers.map((m, i) => (<div key={i} className="absolute border-4 border-red-500 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow-sm" style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.size}%`, aspectRatio: '1/1' }} />))}
      </div>
      <div className="w-full max-w-md bg-gray-800 p-4 rounded-xl mb-4 flex flex-col gap-2">
        <div className="flex justify-between text-white text-xs mb-1"><span>マーカーサイズ</span><span>{markerSize}</span></div>
        <input type="range" min="2" max="20" value={markerSize} onChange={(e) => setMarkerSize(Number(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg accent-blue-500" />
      </div>
      <div className="flex gap-4 w-full max-w-md">
        <button onClick={onClose} className="flex-1 py-3 bg-gray-600 text-white rounded-full font-bold">キャンセル</button>
        <button onClick={() => setMarkers(markers.slice(0,-1))} className="flex-1 py-3 bg-yellow-600 text-white rounded-full font-bold">一つ戻る</button>
        <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-full font-bold">保存</button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default function App() {
  const initialData = {
    manageNo: "", tagNumber: "", customerName: "", itemType: "スーツ上", brand: "", 
    accessories: [], dueDate: getFutureDateStr(3), needs: [], stainLocation: "", 
    riskAccepted: false, processInstruction: "スタンダード", specialTreatments: [], 
    stainRemovalRequest: "なし", stainRemovalPrice: 0, finishing: "ソフト仕上げ（ふんわり）", 
    resultStatus: "良好・完了", finalMessage: "", status: "temporary"
  };

  const [formData, setFormData] = useState(initialData);
  const [photos, setPhotos] = useState([]); 
  const [editingPhotoIndex, setEditingPhotoIndex] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  const [isSimpleMode, setIsSimpleMode] = useState(true);
  const [isFactoryMode, setIsFactoryMode] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null); // Refを追加

  useEffect(() => {
    if (!db) return;
    setIsOnline(true);
    const q = query(collection(db, "kartes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setHistoryList(list);
      if (!formData.manageNo && !editingId) generateManageNo(list);
    }, () => setIsOnline(false));
    return () => unsubscribe();
  }, [editingId, formData.manageNo]);

  const generateManageNo = (list) => {
    const todayStr = getTodayStr();
    const count = list.filter(item => item.manageNo && item.manageNo.startsWith(todayStr)).length;
    setFormData(prev => ({ ...prev, manageNo: `${todayStr}-${String(count + 1).padStart(3, '0')}` }));
  };

  const filteredList = historyList.filter((record) => {
    const s = searchQuery.toLowerCase();
    return record.customerName?.toLowerCase().includes(s) || record.tagNumber?.toLowerCase().includes(s) || record.manageNo?.toLowerCase().includes(s);
  });

  const todaysTasks = useMemo(() => {
    const today = getTodayDateStr();
    const target = historyList.filter(item => item.dueDate === today);
    const stainCount = target.filter(item => item.stainRemovalRequest && item.stainRemovalRequest !== "なし").length;
    return { total: target.length, stain: stainCount };
  }, [historyList]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'tagNumber') {
      const raw = value.replace(/-/g, '');
      setFormData(prev => ({ ...prev, [name]: raw.length > 1 ? raw.slice(0, 1) + '-' + raw.slice(1) : raw }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    const raw = val.replace(/-/g, '');
    setSearchQuery(/^[0-9-]+$/.test(val) ? (raw.length > 1 ? raw.slice(0, 1) + '-' + raw.slice(1) : raw) : val);
  };

  const handleCheck = (field, value) => {
    setFormData(prev => {
      const cur = prev[field] || [];
      return { ...prev, [field]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] };
    });
  };

  const handleAppendText = (field, text) => setFormData(prev => ({ ...prev, [field]: (prev[field] || "") + (prev[field] ? " " : "") + text }));

  const applyQuickPreset = (presetData) => {
    if (formData.customerName && !window.confirm("現在の入力内容が上書きされます。よろしいですか？")) return;
    setFormData(prev => ({ ...prev, ...presetData }));
  };

  const handleVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const r = new SR(); r.lang = 'ja-JP';
    r.onstart = () => setIsListening(true);
    r.onresult = (e) => handleAppendText('stainLocation', e.results[0][0].transcript);
    r.onend = () => setIsListening(false);
    recognitionRef.current = r; r.start();
  };

  const handleSave = async () => {
    if (!formData.customerName) { alert("お客様名を入力してください"); return; }
    const st = isSimpleMode ? "temporary" : "complete";
    try {
      if (editingId) await updateDoc(doc(db, "kartes", editingId), { ...formData, status: st, photos, updatedAt: serverTimestamp() });
      else await addDoc(collection(db, "kartes"), { ...formData, status: st, photos, saveDate: new Date().toLocaleString(), createdAt: serverTimestamp() });
      if (window.confirm("保存しました！次の入力を始めますか？")) handleReset();
    } catch (e) { alert("保存失敗。写真の枚数を減らすかサイズを調整してください。"); }
  };

  const handleReset = () => {
    setShowReceipt(false); setEditingId(null); setFormData(initialData); setPhotos([]);
    generateManageNo(historyList); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoad = (r) => {
    setEditingId(r.id); setFormData({ ...initialData, ...r });
    setPhotos(r.photos || []); if (!isFactoryMode) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("削除しますか？")) {
      await deleteDoc(doc(db, "kartes", id));
      if (id === editingId) handleReset();
    }
  };

  const onCapturePhoto = (dataUrl) => {
    setPhotos(prev => [...prev, dataUrl]);
  };
  
  // 標準のファイル選択を使用するためのハンドラ
  const handleNativeCamera = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
         const img = new Image();
         img.onload = () => {
             const canvas = document.createElement('canvas');
             const MAX_WIDTH = 800;
             const scale = MAX_WIDTH / img.width;
             canvas.width = MAX_WIDTH;
             canvas.height = img.height * scale;
             const ctx = canvas.getContext('2d');
             ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
             onCapturePhoto(canvas.toDataURL('image/jpeg', 0.7));
         };
         img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset input
  };

  return (
    <div className={`min-h-screen font-sans ${isFactoryMode ? 'bg-[#0f0f0f] text-gray-200' : 'bg-slate-100 text-gray-800'} overflow-x-hidden`}>
      
      {isCameraActive && <CameraModal onCapture={onCapturePhoto} onClose={() => setIsCameraActive(false)} />}
      {editingPhotoIndex !== null && <PhotoMarkerModal photoSrc={photos[editingPhotoIndex]} onClose={() => setEditingPhotoIndex(null)} onSave={(data) => setPhotos(p => {const n=[...p]; n[editingPhotoIndex]=data; return n;})} />}
      {showReceipt && <ReceiptModal data={formData} photos={photos} onClose={() => setShowReceipt(false)} />}
      
      {/* 隠しファイル入力（標準カメラ用） */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      <div className="print:hidden p-2 sm:p-4 pb-32 max-w-full">
        <header className={`flex flex-col gap-4 mb-6 p-4 sm:p-5 rounded-2xl shadow-lg sticky top-2 z-[200] backdrop-blur-sm bg-opacity-95 transition-colors ${isFactoryMode ? 'bg-black border-b border-gray-800' : 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl backdrop-blur-md border ${isFactoryMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-white/20 border-white/30'}`}>
                {isFactoryMode ? <Factory className="w-6 h-6 text-yellow-500" /> : <Shirt className="w-6 h-6 text-white" />}
              </div>
              <h1 className={`text-lg sm:text-2xl font-bold tracking-tight ${isFactoryMode ? 'text-yellow-500' : 'text-white'}`}>{isFactoryMode ? '工場シミ抜きビューア' : 'Fabric Care カルテ'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsFactoryMode(!isFactoryMode)} className={`flex items-center gap-2 px-3 py-2 rounded-full font-bold shadow-lg border-2 ${isFactoryMode ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-gray-800 border-gray-600 text-gray-300'}`}><Factory className="w-4 h-4" /><span className="text-xs hidden sm:inline">{isFactoryMode ? "通常モード" : "工場モード"}</span></button>
              {!isFactoryMode && <button onClick={() => setIsSimpleMode(!isSimpleMode)} className={`flex items-center gap-2 px-3 py-2 rounded-full font-bold shadow-lg border-2 border-white/20 ${isSimpleMode ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-300'}`}>{isSimpleMode ? <ToggleLeft /> : <ToggleRight />}<span className="text-xs hidden sm:inline">スピード受付</span></button>}
            </div>
          </div>
          <div className="relative w-full z-[210]">
            <input type="text" className={`block w-full p-3 pl-10 text-base border rounded-xl outline-none transition-all ${isFactoryMode ? 'bg-gray-800 border-gray-600 text-white focus:border-yellow-500' : 'bg-white/10 border-white/30 text-white focus:bg-white/20'}`} placeholder="🔍 タグ番号、お客様名で検索..." value={searchQuery} onChange={handleSearchChange} />
          </div>
        </header>

        {isFactoryMode && !searchQuery && (
          <div className="max-w-6xl mx-auto mb-8 grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl shadow-xl flex flex-col items-center justify-center text-center"><div className="text-gray-500 mb-1 text-[10px] font-bold uppercase tracking-widest">本日の仕上がり</div><div className="text-3xl sm:text-4xl font-black text-white">{todaysTasks.total}<span className="text-xs font-normal text-gray-600 ml-1">点</span></div></div>
            <div className="bg-gray-900 border border-yellow-900/30 p-5 rounded-3xl shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden"><div className="absolute top-0 right-0 bg-yellow-600 text-black text-[9px] px-2 py-0.5 font-bold uppercase tracking-tighter">重要</div><div className="text-yellow-600 mb-1 text-[10px] font-bold uppercase tracking-widest">シミ抜きあり</div><div className="text-3xl sm:text-4xl font-black text-yellow-500">{todaysTasks.stain}<span className="text-xs font-normal text-gray-600 ml-1">点</span></div></div>
          </div>
        )}

        {isFactoryMode && searchQuery && filteredList.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {filteredList.slice(0, 1).map(record => (
              <div key={record.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-black border-2 border-gray-800 rounded-3xl overflow-hidden relative shadow-2xl aspect-square lg:h-[70vh]">
                   {record.photos && record.photos.length > 0 ? <img src={record.photos[0]} alt="シミ箇所" className="w-full h-full object-contain" /> : <div className="flex items-center justify-center h-full text-gray-700"><ImageIcon className="w-20 h-20 opacity-20" /></div>}
                   <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-xl border border-gray-700 shadow-2xl"><p className="text-[10px] text-gray-500 font-bold mb-0.5">TAG NO.</p><p className="text-3xl sm:text-5xl font-mono font-black text-yellow-400 tracking-tighter">{record.tagNumber}</p></div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 shadow-2xl flex-1 border-t-yellow-500 border-t-4">
                     <h2 className="text-gray-500 text-[10px] mb-2 font-bold uppercase tracking-widest">シミの種類・詳細場所</h2>
                     <div className="text-2xl sm:text-4xl font-bold text-white mb-8 leading-tight whitespace-pre-wrap">{record.stainLocation || "特になし"}</div>
                     <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="bg-black/40 p-4 rounded-2xl border border-gray-800 shadow-inner"><span className="text-yellow-500 font-bold block mb-1 text-[10px] uppercase">シミ抜き指定</span><span className="text-xl sm:text-2xl text-white font-bold">{record.stainRemovalRequest}</span></div>
                       <div className="bg-black/40 p-4 rounded-2xl border border-gray-800 shadow-inner"><span className="text-blue-400 font-bold block mb-1 text-[10px] uppercase">特殊処理</span><span className="text-xl text-white font-bold">{record.specialTreatments?.join("、") || "なし"}</span></div>
                     </div>
                     <h2 className="text-gray-500 text-[10px] mb-2 font-bold uppercase tracking-widest">アイテム情報</h2>
                     <div className="flex items-baseline gap-4"><span className="text-2xl font-bold text-blue-300">{record.itemType}</span><span className="text-lg text-gray-400 font-bold">{record.brand}</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isFactoryMode && searchQuery && filteredList.length > 0 && (
          <div className="mb-8 p-4 bg-white rounded-xl shadow border border-blue-200">
            <h3 className="text-sm font-bold text-gray-500 mb-2">検索結果: {filteredList.length}件</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
               {filteredList.slice(0, 5).map(r => (
                 <button key={r.id} onClick={() => { handleLoad(r); setSearchQuery(""); }} className="flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg p-3 text-left w-40 hover:bg-blue-100 transition-colors">
                    <div className="text-xs text-blue-600 font-bold mb-1">{r.tagNumber || "No Tag"} {r.status === 'temporary' && <span className="text-red-500">●仮</span>}</div>
                    <div className="text-sm font-bold truncate">{r.customerName}</div>
                    <div className="text-xs text-gray-500">{r.itemType}</div>
                 </button>
               ))}
            </div>
          </div>
        )}

        {!isFactoryMode && (
          <>
            <div className="max-w-6xl mx-auto mb-8 animate-in slide-in-from-top-4 duration-500 relative z-[100]">
              <div className="flex items-center mb-4 text-gray-700 font-bold text-sm"><Zap className="w-5 h-5 text-yellow-500 mr-2" /> かんたんセット</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {QUICK_PRESETS.map((preset) => (
                  <button 
                    key={preset.id} 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyQuickPreset(preset.data); }} 
                    className={`
                      relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 shadow-sm 
                      active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden z-[110]
                      ${preset.style}
                    `}
                  >
                    <div className="mb-2">
                      {preset.icon}
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-base leading-tight">{preset.title}</div>
                      <div className="text-[10px] font-bold opacity-60 mt-0.5">{preset.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {isSimpleMode && (
              <div className="max-w-6xl mx-auto mb-6 bg-emerald-50 border-l-8 border-emerald-500 p-5 rounded-r-xl flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-white rounded-full text-emerald-600 shadow-sm flex-shrink-0"><Zap className="w-8 h-8 fill-emerald-100" /></div>
                <div>
                  <h3 className="font-bold text-emerald-900 text-xl mb-1">スピード受付モード</h3>
                  <p className="text-emerald-800 font-bold text-md">入力は <span className="bg-white border-2 border-emerald-200 px-2 py-0.5 rounded text-emerald-700 mx-1">タグNo</span> と <span className="bg-white border-2 border-emerald-200 px-2 py-0.5 rounded text-emerald-700 mx-1">写真</span> だけでOK！</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <div className="space-y-8">
                <Card title="1. 受付情報の入力" icon={User}>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-1/3">
                        <label className="block text-sm font-bold mb-2 text-gray-700">タグNo.</label>
                        <input type="text" name="tagNumber" className="w-full p-4 border-2 border-blue-200 rounded-xl bg-blue-50 text-xl font-bold text-blue-900 text-center" placeholder="1-23" value={formData.tagNumber} onChange={handleChange} />
                      </div>
                      <div className="w-2/3">
                        <label className="block text-sm font-bold mb-2 text-gray-700">お客様名 <span className="text-red-500 ml-1 text-xs">必須</span></label>
                        <input type="text" name="customerName" className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-lg" placeholder="山田 太郎 様" value={formData.customerName} onChange={handleChange} />
                      </div>
                    </div>
                    {/* 復旧した項目 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-700">アイテム</label>
                        <select name="itemType" className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white h-14" value={formData.itemType} onChange={handleChange}>
                          <option>ワイシャツ</option><option>スーツ上</option><option>スーツ下（ズボン）</option><option>スカート</option><option>コート</option><option>ダウン</option><option>ワンピース</option><option>セーター・ニット</option><option>着物・浴衣</option><option>靴・スニーカー</option><option>バッグ・革製品</option><option>その他</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2 text-gray-700">ブランド/色</label>
                        <input type="text" name="brand" className="w-full p-3 border-2 border-gray-200 rounded-xl h-14" placeholder="例：黒・ウール" value={formData.brand} onChange={handleChange} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-2 text-gray-500 flex items-center"><Palette className="w-3 h-3 mr-1" /> 色・柄かんたん入力</label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS_LIST.map(c => <button type="button" key={c} onClick={() => handleAppendText('brand', c)} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-200 hover:bg-gray-200 touch-manipulation">{c}</button>)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <label className="block text-sm font-bold mb-3 text-gray-700 flex items-center"><Layers className="w-4 h-4 mr-1 text-blue-600" /> 付属品チェック</label>
                      <div className="grid grid-cols-3 gap-2">
                        {ACCESSORIES_LIST.map(acc => (
                          <button type="button" key={acc} onClick={() => handleCheck('accessories', acc)} className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all touch-manipulation ${(formData.accessories || []).includes(acc) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-500 border-gray-300'}`}>
                            {acc} {(formData.accessories || []).includes(acc) ? 'あり' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                       <label className="block text-sm font-bold mb-2 text-gray-700 flex items-center"><Calendar className="w-4 h-4 mr-1 text-blue-600" /> お渡し予定日</label>
                        <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700" />
                    </div>
                  </div>
                </Card>

                <Card title="2. お悩み・検品" icon={AlertTriangle} color="bg-white border-l-4 border-l-red-400" headerColor="bg-red-50">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-700">一番の悩み</label>
                      <div className="flex flex-wrap gap-2">{['シミ・汚れ', '汗・ニオイ', '黄ばみ', 'シワ', '仕上げ重視', '穴・ほつれ', '色落ち'].map(item => (<button key={item} onClick={() => handleCheck('needs', item)} className={`px-4 py-2 rounded-full border-2 text-sm font-bold transition-all ${formData.needs.includes(item) ? 'bg-red-500 border-red-500 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500'}`}>{item}</button>))}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-700 flex justify-between items-center"><span>シミ箇所/詳細</span><button onClick={handleVoiceInput} className={`text-xs px-3 py-1.5 rounded-full flex items-center transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700 border'}`}>{isListening ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />} 音声入力</button></label>
                      <textarea name="stainLocation" className="w-full p-4 border-2 border-gray-200 rounded-xl h-24 resize-none focus:border-red-400 outline-none transition-all shadow-inner" placeholder="例：右袖口にコーヒーのシミ。" value={formData.stainLocation} onChange={handleChange}></textarea>
                      {/* ★復旧: 定型文ボタン */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {TEXT_TEMPLATES.map((text, i) => (
                          <button type="button" key={i} onClick={() => handleAppendText('stainLocation', text)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full border border-gray-300 transition-colors touch-manipulation">+ {text}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      {photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                          {photos.map((p, index) => (
                            <div key={index} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 group shadow-sm">
                              <img src={p} alt={`写真 ${index + 1}`} className="w-full h-full object-contain cursor-pointer" onClick={() => setEditingPhotoIndex(index)} />
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removePhoto(index); }} className="absolute top-0 right-0 p-3 z-[150] text-white bg-red-600 rounded-bl-xl shadow-xl active:bg-red-800 transition-colors"><Trash2 className="w-5 h-5" /></button>
                              <div className="absolute bottom-1 right-1 bg-blue-600 text-white p-1 rounded-full text-[10px] pointer-events-none shadow-md"><Edit3 className="w-3 h-3" /></div>
                            </div>
                          ))}
                        </div>
                      )}
                      {photos.length < 3 && (
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => setIsCameraActive(true)}
                            className="w-full py-8 bg-gradient-to-br from-gray-50 to-gray-100 border-4 border-dashed border-gray-300 text-gray-500 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-gray-400 transition-all shadow-inner touch-manipulation group"
                          >
                            <Camera className="w-12 h-12 text-blue-500 group-active:scale-110 transition-transform" />
                            <span className="font-bold text-lg">カメラを起動 ({photos.length}/3)</span>
                            <span className="text-xs opacity-60 font-bold flex items-center gap-1"><Focus className="w-3 h-3" /> ガイドに合わせて撮影</span>
                          </button>
                          
                          {/* ★標準カメラ/ファイル選択ボタン（救済用） */}
                          <button 
                            onClick={handleNativeCamera}
                            className="text-xs text-gray-400 hover:text-gray-600 underline py-2 text-center"
                          >
                            ※カメラが起動しない場合はこちら（ファイル選択/標準カメラ）
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {isSimpleMode && (
                  <div className="flex flex-col gap-4">
                    <button className={`w-full py-6 rounded-2xl shadow-xl font-bold text-2xl flex items-center justify-center transition-all ${isOnline ? 'bg-green-600 text-white active:scale-95' : 'bg-gray-300 text-gray-500'}`} onClick={handleSave} disabled={!isOnline}><Save className="mr-3 w-8 h-8" /> 保存して受付完了</button>
                    <button className="w-full py-4 bg-gray-800 text-white rounded-xl shadow-md font-bold text-lg flex items-center justify-center active:scale-95" onClick={() => setShowReceipt(true)}><Receipt className="mr-2 w-5 h-5" /> タグ（レシート）を発行</button>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <Card title="3. 工場指示" icon={Scissors} visible={!isSimpleMode}>
                  <div className="space-y-6">
                    <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl shadow-inner"><label className="block text-sm font-bold mb-3 text-yellow-800 flex items-center"><Star className="w-4 h-4 mr-1 text-yellow-600 fill-yellow-600" /> しみ抜き指定</label><div className="grid grid-cols-3 gap-2">{['なし', '無料範囲', '有料'].map((type) => (<button key={type} onClick={() => setFormData(prev => ({...prev, stainRemovalRequest: type}))} className={`py-3 rounded-lg font-bold text-sm transition-all ${formData.stainRemovalRequest === type ? 'bg-yellow-500 text-white shadow-md' : 'bg-white border border-yellow-200 text-gray-600'}`}>{type}</button>))}</div>{formData.stainRemovalRequest === '有料' && (<div className="mt-3 pt-3 border-t border-yellow-200 animate-in fade-in slide-in-from-top-2"><label className="block text-xs font-bold mb-2 text-yellow-700 uppercase">金額</label><div className="grid grid-cols-3 gap-2">{[500, 800, 1000, 1500, 2000, 3000].map(price => (<button key={price} onClick={() => setFormData(prev => ({...prev, stainRemovalPrice: price}))} className={`py-2 rounded-lg text-sm font-bold border transition-all ${formData.stainRemovalPrice === price ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-yellow-800 border-yellow-300'}`}>{price}円</button>))}</div></div>)}</div>
                    <div><label className="block text-sm font-bold mb-3 text-gray-700">洗浄コース</label><div className="grid grid-cols-3 gap-3">{['スタンダード', 'デラックス', 'ウェット'].map(course => <SelectButton key={course} label={course} selected={formData.processInstruction === course} onClick={() => setFormData(prev => ({...prev, processInstruction: course}))} />)}</div></div>
                    <div><label className="block text-sm font-bold mb-3 text-gray-700">仕上げ方</label><div className="relative"><select name="finishing" className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 outline-none appearance-none font-bold" value={formData.finishing} onChange={handleChange}><option>ソフト仕上げ（ふんわり）</option><option>ハード（糊付け）</option><option>センタープレス有り</option><option>プレス無し（スチームのみ）</option><option>たたみ仕上げ</option><option>ハンガー仕上げ</option></select><div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500"><ChevronRight className="w-6 h-6 rotate-90" /></div></div></div>
                  </div>
                </Card>
                {!isSimpleMode && (
                  <div className="flex flex-col gap-4 mt-4">
                    <button className={`w-full py-5 rounded-2xl shadow-xl font-black text-2xl flex items-center justify-center transition-all ${isOnline ? 'bg-indigo-600 text-white active:scale-95' : 'bg-gray-300 text-gray-500'}`} onClick={handleSave} disabled={!isOnline}><Save className="mr-3 w-8 h-8" /> 変更を保存</button>
                    <button className="w-full py-4 bg-gray-800 text-white rounded-xl shadow-md font-bold text-lg flex items-center justify-center active:scale-95" onClick={() => setShowReceipt(true)}><Receipt className="mr-2 w-5 h-5" /> タグ（レシート）を発行</button>
                    <button className="w-full py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl shadow-sm font-bold text-lg flex items-center justify-center hover:bg-gray-50" onClick={() => setTimeout(() => window.print(), 100)}><Printer className="mr-2 w-6 h-6" /> 伝票印刷(A4)</button>
                  </div>
                )}
              </div>
            </div>

            {/* ★復旧: 保存済みカルテ一覧エリア（通常モード時のみ） */}
            <div className="max-w-6xl mx-auto mt-16 print:hidden">
              <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-700 flex items-center">
                  <History className="mr-2 text-blue-600" /> クラウド保存済みデータ
                  <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">{filteredList.length} 件</span>
                </h2>
              </div>
              
              {historyList.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl text-center text-gray-400 border-2 border-dashed border-gray-300 flex flex-col items-center">
                  <History className="w-12 h-12 mb-3 opacity-20" />
                  <p>{isOnline ? "データはまだありません" : "データベースに接続されていません"}</p>
                </div>
              ) : filteredList.length === 0 ? (
                 <div className="bg-white p-8 rounded-2xl text-center text-gray-400 border-2 border-dashed border-gray-300"><p>検索条件に一致するカルテは見つかりませんでした</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredList.map((record) => (
                    <div key={record.id} className={`bg-white p-5 rounded-2xl shadow-sm border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${record.id === editingId ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-gray-100'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tag No.</span>
                          <span className="font-mono text-blue-600 font-bold text-lg bg-blue-50 px-2 py-0.5 rounded inline-block w-fit">
                            {record.tagNumber || "No Tag"}
                            {record.status === 'temporary' && <span className="ml-2 bg-red-100 text-red-600 text-[10px] px-1 rounded">未完了</span>}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block uppercase">Case ID</span>
                          <span className="text-xs text-gray-500 font-mono">{record.manageNo}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                         <h3 className="font-bold text-xl text-gray-800">{record.customerName || "名称未設定"} <span className="text-sm font-normal text-gray-500">様</span></h3>
                      </div>
                      
                      {record.photos && record.photos.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                          {record.photos.map((p, i) => (
                             <img key={i} src={p} alt="履歴写真" className="w-16 h-16 object-contain bg-gray-100 rounded border border-gray-200 cursor-pointer hover:opacity-80" onClick={(e) => { e.stopPropagation(); setEditingPhotoIndex(null); }} />
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 flex-wrap">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{record.itemType}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{record.processInstruction}</span>
                      </div>

                      <div className="border-t border-gray-100 pt-4 flex gap-3">
                        <button 
                          onClick={() => handleLoad(record)}
                          className={`flex-1 text-sm py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center ${record.id === editingId ? 'bg-yellow-500 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'}`}
                        >
                          <FileText className="w-4 h-4 mr-2" /> {record.id === editingId ? '編集中' : '編集・呼び出し'}
                        </button>
                        <button onClick={() => handleDelete(record.id)} className="px-4 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center transition-colors" title="削除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}