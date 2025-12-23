import React, { useState, useRef, useEffect } from 'react';
import { Save, Camera, Printer, CheckCircle, AlertTriangle, User, Scissors, Shirt, X, Trash2, History, FileText, Check, ChevronRight, RefreshCw, Cloud, CloudOff, Search, Tag, Maximize2, Image as ImageIcon, Mic, MicOff, Edit3, MapPin, Zap, Star, ToggleLeft, ToggleRight, Clock, Calendar, Layers, Palette, Receipt, DollarSign, Factory, ZoomIn } from 'lucide-react';

// ★重要: ここにFirebaseを使うための部品を読み込みます
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

// =================================================================
// ★STEP 1: Firebaseの設定情報
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

// ------------------------------------------------------------------

const TEXT_TEMPLATES = [
  "襟の黄ばみあり", "袖口に黒ずみ", "食べこぼしのシミ", 
  "インクのシミ", "全体的にシワ", "ボタン欠損", 
  "ほつれあり", "色落ち注意", "ファスナー動作不良",
  "ポケット内確認済み", "付属品あり"
];
const ACCESSORIES_LIST = ["ベルト", "フード", "ライナー", "ファー", "リボン", "ブローチ"];
const COLORS_LIST = ["黒", "紺", "グレー", "白", "茶", "ベージュ", "ストライプ", "チェック"];

// カードコンポーネント
const Card = ({ children, title, icon: Icon, color = "bg-white", headerColor = "bg-gray-50", visible = true }) => {
  if (!visible) return null;
  return (
    <div className={`mb-6 rounded-xl shadow-sm overflow-hidden border border-gray-200 ${color} transition-shadow hover:shadow-md print:hidden animate-in fade-in zoom-in duration-300`}>
      <div className={`${headerColor} px-5 py-4 border-b border-gray-200 flex items-center`}>
        <div className="p-2 bg-white rounded-lg shadow-sm mr-3">
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
    onClick={onClick}
    className={`
      relative w-full p-3 rounded-lg border-2 text-left transition-all duration-200 ease-in-out
      flex flex-col items-center justify-center gap-1
      ${selected 
        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md transform scale-[1.02]' 
        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-gray-50'
      }
    `}
  >
    {selected && <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
    <span className="font-bold text-sm">{label}</span>
    {subLabel && <span className="text-xs opacity-70">{subLabel}</span>}
  </button>
);

// レシートモーダル
const ReceiptModal = ({ data, photos, onClose }) => {
  // 安全なデータアクセスのためにデフォルト値を設定
  const safeAccessories = data.accessories || [];
  const safeNeeds = data.needs || [];
  const safeSpecialTreatments = data.specialTreatments || [];

  return (
    <div className="fixed inset-0 bg-gray-900/90 z-[100] flex flex-col items-center justify-center p-4">
      <div className="bg-white w-[350px] max-h-[85vh] overflow-y-auto p-4 shadow-2xl rounded-sm font-mono text-sm leading-relaxed receipt-paper">
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <h2 className="text-xl font-bold mb-1">お預かり伝票（兼タグ）</h2>
          <p className="text-xs text-gray-500">{new Date().toLocaleString()}</p>
        </div>
        <div className="mb-4">
          <div className="flex justify-between items-end mb-2">
            <span className="text-gray-500 text-xs">管理No</span>
            <span className="text-xl font-bold">{data.manageNo}</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-gray-500 text-xs">Tag No</span>
            <span className="text-2xl font-black border-2 border-black px-2">{data.tagNumber}</span>
          </div>
          <div className="mt-4 pb-2 border-b border-gray-300">
            <span className="text-gray-500 text-xs block">お客様名</span>
            <span className="text-lg font-bold block">{data.customerName} 様</span>
          </div>
        </div>
        <div className="mb-4 space-y-2">
          <div className="flex justify-between"><span>{data.itemType}</span><span>{data.brand}</span></div>
          <div className="text-xs text-gray-600">付属品: {safeAccessories.length > 0 ? safeAccessories.join('、') : 'なし'}</div>
          <div className="flex justify-between font-bold mt-2"><span>{data.processInstruction}</span><span>{data.finishing}</span></div>
        </div>
        {(data.stainRemovalRequest !== 'なし' || safeNeeds.length > 0) && (
          <div className="border-2 border-black p-2 mb-4">
            <div className="font-bold text-center bg-black text-white text-xs mb-2">工場への指示</div>
            {data.stainRemovalRequest !== 'なし' && (
               <div className="flex justify-between font-bold mb-1"><span>★シミ抜き:</span><span>{data.stainRemovalRequest} {data.stainRemovalPrice > 0 && `(¥${data.stainRemovalPrice})`}</span></div>
            )}
            {safeNeeds.length > 0 && <div className="text-xs">悩み: {safeNeeds.join('、')}</div>}
            {safeSpecialTreatments.length > 0 && <div className="text-xs mt-1 font-bold">処理: {safeSpecialTreatments.join('、')}</div>}
          </div>
        )}
        {photos && photos.length > 0 && (
          <div className="mb-4 text-center">
            <div className="text-xs mb-1 font-bold">- シミ箇所確認図 -</div>
            <img src={photos[0]} alt="シミ位置" className="w-full h-auto grayscale contrast-125 border border-gray-300" />
            <p className="text-[10px] text-gray-500 mt-1">※黒ペン等で加筆してください</p>
          </div>
        )}
        <div className="text-center border-t-2 border-dashed border-gray-300 pt-4 mt-4">
           <p className="text-xs">お渡し予定日</p><p className="text-xl font-bold">{data.dueDate}</p>
        </div>
      </div>
      <div className="mt-6 flex gap-4 no-print">
        <button onClick={onClose} className="px-6 py-3 bg-gray-600 text-white rounded-full font-bold">閉じる</button>
        <button onClick={() => window.print()} className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg flex items-center"><Printer className="mr-2 w-5 h-5" /> 印刷する</button>
      </div>
      <style>{`@media print { body * { visibility: hidden; } .receipt-paper, .receipt-paper * { visibility: visible; } .receipt-paper { position: absolute; left: 0; top: 0; width: 80mm; box-shadow: none; overflow: visible; max-height: none; } .no-print { display: none; } }`}</style>
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMarkers([...markers, { x: (x/rect.width)*100, y: (y/rect.height)*100, size: markerSize }]);
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
      ctx.lineWidth = Math.max(radius * 0.15, 3);
      ctx.strokeStyle = 'red';
      ctx.stroke();
    });
    onSave(canvas.toDataURL('image/jpeg', 0.8));
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4">
      <div className="relative max-w-full max-h-[70vh] mb-4">
        <img ref={imgRef} src={photoSrc} alt="edit" className="max-w-full max-h-[70vh] object-contain select-none" onClick={handleImageClick} />
        {markers.map((m, i) => (<div key={i} className="absolute border-4 border-red-500 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow-sm" style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.size}%`, aspectRatio: '1 / 1' }} />))}
      </div>
      <div className="w-full max-w-md bg-gray-800 p-4 rounded-xl mb-4 flex flex-col gap-2">
        <div className="flex justify-between text-white text-xs mb-1"><span>マーカーサイズ</span><span>{markerSize}</span></div>
        <input type="range" min="2" max="20" step="1" value={markerSize} onChange={(e) => setMarkerSize(Number(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg accent-blue-500" />
      </div>
      <div className="flex gap-4">
        <button onClick={onClose} className="px-6 py-3 bg-gray-600 text-white rounded-full font-bold">キャンセル</button>
        <button onClick={handleUndo} className="px-6 py-3 bg-yellow-600 text-white rounded-full font-bold" disabled={markers.length === 0}>戻る</button>
        <button onClick={handleSaveWithMarkers} className="px-6 py-3 bg-blue-600 text-white rounded-full font-bold">保存</button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};
const getFutureDateStr = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
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
  
  // ★工場モードフラグ
  const [isFactoryMode, setIsFactoryMode] = useState(false);
  
  const [historyList, setHistoryList] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!db) return;
    setIsOnline(true);
    const q = query(collection(db, "kartes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setHistoryList(list);
      if (!formData.manageNo && !editingId) generateManageNo(list);
    }, (e) => { console.error(e); setIsOnline(false); });
    return () => unsubscribe();
  }, [editingId]);

  const generateManageNo = (list) => {
    const todayStr = getTodayStr();
    const count = list.filter(item => item.manageNo && item.manageNo.startsWith(todayStr)).length;
    setFormData(prev => ({ ...prev, manageNo: `${todayStr}-${String(count + 1).padStart(3, '0')}` }));
  };

  const filteredList = historyList.filter((record) => {
    const s = searchQuery.toLowerCase();
    return record.customerName?.toLowerCase().includes(s) || record.tagNumber?.toLowerCase().includes(s) || record.manageNo?.toLowerCase().includes(s);
  });

  const formatTagNumber = (value) => {
    const raw = value.replace(/-/g, '');
    return raw.length > 1 ? raw.slice(0, 1) + '-' + raw.slice(1) : raw;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'tagNumber') { setFormData(prev => ({ ...prev, [name]: formatTagNumber(value) })); return; }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(/^[0-9-]+$/.test(val) ? formatTagNumber(val) : val);
  };

  const handleCheck = (field, value) => {
    setFormData(prev => {
      const cur = prev[field] || [];
      return { ...prev, [field]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] };
    });
  };

  const handleAppendText = (field, text) => setFormData(prev => ({ ...prev, [field]: (prev[field] || "") + (prev[field] ? " " : "") + text }));

  const applyQuickPreset = (type) => {
    let p = {};
    switch(type) {
      case 'shirt': p = { itemType: "ワイシャツ", processInstruction: "スタンダード", finishing: "ハンガー仕上げ", specialTreatments: ["エリ・ソデ重点"] }; break;
      case 'suit': p = { itemType: "スーツ上", processInstruction: "スタンダード", finishing: "ソフト仕上げ（ふんわり）", specialTreatments: [] }; break;
      case 'suit_bottom': p = { itemType: "スーツ下（ズボン）", processInstruction: "スタンダード", finishing: "センタープレス有り", specialTreatments: [] }; break;
      case 'delicate': p = { itemType: "セーター・ニット", processInstruction: "デラックス", finishing: "たたみ仕上げ", specialTreatments: ["ネット必須", "デリケート"] }; break;
      default: return;
    }
    setFormData(prev => ({ ...prev, ...p }));
  };

  const handleVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("音声入力非対応"); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    try {
      const r = new SR();
      r.lang = 'ja-JP';
      r.onstart = () => setIsListening(true);
      r.onresult = (e) => handleAppendText('stainLocation', e.results[0][0].transcript);
      r.onend = () => setIsListening(false);
      recognitionRef.current = r;
      r.start();
    } catch (e) { alert("音声入力エラー"); }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          const max = 1000;
          const s = max / img.width;
          c.width = img.width > max ? max : img.width;
          c.height = img.width > max ? img.height * s : img.height;
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          setPhotos(p => [...p, c.toDataURL('image/jpeg', 0.8)]);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    }
    e.target.value = '';
  };

  const handleUpdatePhoto = (data) => setPhotos(p => { const n = [...p]; n[editingPhotoIndex] = data; return n; });

  const handleSave = async () => {
    if (!formData.customerName) { alert("お客様名を入力してください"); return; }
    if (!db) { alert("DB設定が必要です"); return; }
    const st = isSimpleMode ? "temporary" : "complete";
    try {
      if (editingId) {
        await updateDoc(doc(db, "kartes", editingId), { ...formData, status: st, photos, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "kartes"), { ...formData, status: st, photos, saveDate: new Date().toLocaleString(), createdAt: serverTimestamp() });
      }
      
      const msg = isSimpleMode 
        ? "保存しました！\n\n【OK】続けて次の衣類を入力（新規入力へ）\n【キャンセル】この画面に留まる（レシート発行など）" 
        : "保存しました！\n続けて新規入力しますか？";
      
      if (window.confirm(msg)) {
        handleReset();
      }
    } catch (e) { alert("保存失敗: " + e.message); }
  };

  const handleReset = () => {
    setShowReceipt(false);
    setEditingId(null);
    setFormData(initialData);
    setPhotos([]);
    generateManageNo(historyList);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoad = (r) => {
    const { id, saveDate, photoData, photos: sp, createdAt, ...rest } = r;
    setEditingId(id);
    setFormData({ ...initialData, ...rest });
    setPhotos(sp && Array.isArray(sp) ? sp : photoData ? [photoData] : []);
    
    if (isFactoryMode) {
      setSearchQuery("");
    } else {
      if (window.confirm("読み込みますか？")) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("削除しますか？")) {
      await deleteDoc(doc(db, "kartes", id));
      if (id === editingId) handleReset();
    }
  };

  return (
    <div className={`min-h-screen font-sans ${isFactoryMode ? 'bg-[#1a1a1a] text-gray-200' : 'bg-slate-100 text-gray-800'}`}>
      
      {editingPhotoIndex !== null && <PhotoMarkerModal photoSrc={photos[editingPhotoIndex]} onClose={() => setEditingPhotoIndex(null)} onSave={handleUpdatePhoto} />}
      {showReceipt && <ReceiptModal data={formData} photos={photos} onClose={() => { setShowReceipt(false); }} />}

      <div className="hidden print:block p-8 bg-white text-black w-full h-full" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
        <h1 className="text-3xl font-bold mb-2 border-b-2 border-black pb-2">クリーニング受付カルテ</h1>
        <div className="flex justify-between mb-6">
          <div><p className="text-sm">管理No.</p><p className="text-2xl font-mono font-bold">{formData.manageNo}</p></div>
          <div className="text-right"><p className="text-sm">受付日: {new Date().toLocaleDateString()}</p><p className="text-xl font-bold">Tag No: {formData.tagNumber || '-----'}</p><p className="text-md font-bold mt-1">お渡し予定: {formData.dueDate}</p></div>
        </div>
        <div className="border-2 border-black p-4 mb-6 bg-gray-50"><p className="text-sm mb-1">お客様名</p><p className="text-2xl font-bold">{formData.customerName} 様</p></div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-400 p-2"><span className="block text-xs font-bold bg-gray-200 px-1">アイテム / ブランド / 付属品</span><div className="p-2 text-lg">{formData.itemType} / {formData.brand}<br/><span className="text-sm">付属品: {formData.accessories?.length > 0 ? formData.accessories.join('、') : 'なし'}</span></div></div>
          <div className="border border-gray-400 p-2"><span className="block text-xs font-bold bg-gray-200 px-1">コース / 仕上げ</span><div className="p-2 text-lg">{formData.processInstruction} / {formData.finishing}</div></div>
        </div>
        <div className="mb-6">
          <span className="block text-sm font-bold border-b border-gray-400 mb-2">ご要望・指示事項</span>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.needs?.map(n => <span key={n} className="border border-black px-2 py-1 rounded bg-red-50 font-bold">{n}</span>)}
            {formData.specialTreatments?.map(t => <span key={t} className="border border-black px-2 py-1 rounded bg-blue-50 font-bold">{t}</span>)}
            {formData.stainRemovalRequest !== "なし" && <span className="border border-black px-2 py-1 rounded bg-yellow-50 font-bold">しみ抜き：{formData.stainRemovalRequest}</span>}
          </div>
          <div className="border border-gray-300 p-3 min-h-[100px] whitespace-pre-wrap text-lg">{formData.stainLocation}</div>
        </div>
        {photos.length > 0 && <div className="mb-6"><p className="text-sm font-bold mb-2">記録写真</p><div className="flex gap-4">{photos.map((p, i) => <img key={i} src={p} alt="print" className="w-1/3 h-48 object-contain border border-gray-300 bg-gray-100" />)}</div></div>}
      </div>

      <div className="print:hidden p-4 pb-32">
        <header className={`flex flex-col gap-4 mb-6 p-5 rounded-2xl shadow-lg sticky top-2 z-50 backdrop-blur-sm bg-opacity-95 transition-colors ${isFactoryMode ? 'bg-gradient-to-r from-gray-900 to-black border-b border-gray-700' : 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl backdrop-blur-md border ${isFactoryMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-white/20 border-white/30'}`}>
                {isFactoryMode ? <Factory className="w-8 h-8 text-yellow-500" /> : <Shirt className="w-8 h-8 text-white" />}
              </div>
              <div>
                <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isFactoryMode ? 'text-yellow-500' : 'text-white'}`}>
                  {isFactoryMode ? '工場シミ抜きビューア' : 'Fabric Care カルテ'}
                </h1>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center ${isOnline ? 'bg-green-500/30 text-green-100' : 'bg-red-500/30 text-red-100'}`}>
                    {isOnline ? <><Cloud className="w-3 h-3 mr-1" /> Online</> : <><CloudOff className="w-3 h-3 mr-1" /> Offline</>}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right flex items-center gap-2">
              <button 
                onClick={() => { setIsFactoryMode(!isFactoryMode); if(!isFactoryMode){ setIsSimpleMode(false); } }} 
                className={`
                   relative flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-lg border-2 
                   ${isFactoryMode 
                     ? 'bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-400' 
                     : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
                   }
                `}
              >
                <Factory className="w-5 h-5" />
                <span className="text-sm hidden md:inline">{isFactoryMode ? "通常モードに戻る" : "工場モード"}</span>
              </button>

              {!isFactoryMode && (
                <button onClick={() => setIsSimpleMode(!isSimpleMode)} className={`relative flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-lg border-2 border-white/20 ${isSimpleMode ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-800 hover:bg-gray-900 text-gray-300'}`}>
                  {isSimpleMode ? <ToggleLeft className="w-6 h-6" /> : <ToggleRight className="w-6 h-6" />}
                  <span className="text-sm hidden md:inline">{isSimpleMode ? "スピード受付" : "工場詳細入力"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><Search className="w-5 h-5 text-gray-400" /></div>
            <input 
              type="text" 
              className={`block w-full p-4 pl-12 text-lg border rounded-xl transition-all outline-none ${isFactoryMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/50' : 'bg-white/10 border-white/30 text-white placeholder-gray-300 focus:bg-white/20'}`} 
              placeholder={isFactoryMode ? "タグ番号を入力 (例: 1-23) で即表示" : "🔍 過去の履歴を検索（お客様名、タグ番号）"}
              value={searchQuery} 
              onChange={handleSearchChange}
              autoFocus={isFactoryMode}
            />
          </div>
        </header>

        {isFactoryMode && searchQuery && filteredList.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {filteredList.slice(0, 1).map(record => (
              <div key={record.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-black border-2 border-gray-700 rounded-2xl overflow-hidden shadow-2xl relative aspect-square lg:aspect-auto lg:h-[70vh]">
                   {record.photos && record.photos.length > 0 ? (
                     <img src={record.photos[0]} alt="シミ箇所" className="w-full h-full object-contain" />
                   ) : (
                     <div className="flex items-center justify-center h-full text-gray-600"><ImageIcon className="w-20 h-20" /><p>写真なし</p></div>
                   )}
                   <div className="absolute top-4 left-4 bg-black/70 backdrop-blur text-white px-4 py-2 rounded-lg border border-gray-600">
                      <p className="text-xs text-gray-400">TAG NO.</p>
                      <p className="text-4xl font-mono font-bold text-yellow-400 tracking-widest">{record.tagNumber}</p>
                   </div>
                   {record.photos && record.photos.length > 1 && (
                     <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
                       {record.photos.slice(1).map((p, i) => (
                         <img key={i} src={p} className="w-20 h-20 border-2 border-white rounded-lg object-cover bg-black" />
                       ))}
                     </div>
                   )}
                </div>

                <div className="flex flex-col gap-4">
                  <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl flex-1">
                     <h2 className="text-gray-400 text-sm mb-2 font-bold uppercase tracking-wider">シミの種類・場所</h2>
                     <div className="text-3xl font-bold text-white mb-4 leading-relaxed whitespace-pre-wrap">
                       {record.stainLocation || "特になし"}
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4 mb-6">
                       <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                         <span className="text-yellow-500 font-bold block mb-1">シミ抜き指定</span>
                         <span className="text-2xl text-white font-bold">{record.stainRemovalRequest}</span>
                       </div>
                       <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                          <span className="text-blue-400 font-bold block mb-1">特殊処理</span>
                          <span className="text-xl text-white font-bold">{record.specialTreatments?.length > 0 ? record.specialTreatments.join("、") : "なし"}</span>
                       </div>
                     </div>

                     <h2 className="text-gray-400 text-sm mb-2 font-bold uppercase tracking-wider">アイテム情報</h2>
                     <div className="flex items-baseline gap-4 mb-4">
                        <span className="text-2xl font-bold text-blue-300">{record.itemType}</span>
                        <span className="text-xl text-gray-300">{record.brand}</span>
                     </div>
                     
                     {record.needs?.length > 0 && (
                       <div className="mb-4">
                         <span className="text-red-400 font-bold mr-2">悩み:</span>
                         <span className="text-xl text-white">{record.needs.join("、")}</span>
                       </div>
                     )}

                     {record.accessories?.length > 0 && (
                       <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-xl mt-auto">
                         <span className="text-red-400 font-bold block text-sm mb-1 uppercase">⚠️ 付属品あり</span>
                         <span className="text-2xl text-white font-bold">{record.accessories.join("、")}</span>
                       </div>
                     )}
                  </div>
                  
                  <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 flex justify-between items-center">
                    <div>
                       <p className="text-xs text-gray-500">お客様名</p>
                       <p className="text-lg font-bold text-gray-300">{record.customerName}</p>
                    </div>
                    <div>
                       <p className="text-xs text-gray-500">お渡し予定</p>
                       <p className="text-lg font-bold text-gray-300">{record.dueDate}</p>
                    </div>
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
            <div className="max-w-6xl mx-auto mb-8 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center mb-2"><Zap className="w-5 h-5 text-yellow-500 mr-2" /><span className="text-sm font-bold text-gray-600">かんたんセット</span></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => applyQuickPreset('shirt')} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:bg-blue-50 hover:border-blue-300 text-left group">
                   <div className="text-2xl mb-1">👔</div><div className="font-bold text-gray-700 text-sm">ワイシャツ</div><div className="text-[10px] text-gray-400">ハンガー・エリ袖</div>
                </button>
                <button onClick={() => applyQuickPreset('suit')} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:bg-blue-50 hover:border-blue-300 text-left group">
                   <div className="text-2xl mb-1">🧥</div><div className="font-bold text-gray-700 text-sm">スーツ（上）</div><div className="text-[10px] text-gray-400">ソフト・標準</div>
                </button>
                <button onClick={() => applyQuickPreset('suit_bottom')} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:bg-blue-50 hover:border-blue-300 text-left group">
                   <div className="text-2xl mb-1">👖</div><div className="font-bold text-gray-700 text-sm">ズボン</div><div className="text-[10px] text-gray-400">センタープレス</div>
                </button>
                <button onClick={() => applyQuickPreset('delicate')} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:bg-blue-50 hover:border-blue-300 text-left group">
                   <div className="text-2xl mb-1">🧶</div><div className="font-bold text-gray-700 text-sm">セーター</div><div className="text-[10px] text-gray-400">デラックス・たたみ</div>
                </button>
              </div>
            </div>

            {isSimpleMode && (
              <div className="max-w-6xl mx-auto mb-6 bg-emerald-50 border-l-8 border-emerald-500 p-5 rounded-r-xl flex items-center gap-4 shadow-md">
                <div className="p-3 bg-white rounded-full text-emerald-600 shadow-sm">
                  <Zap className="w-8 h-8 fill-emerald-100" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900 text-xl mb-1">スピード受付モード</h3>
                  <p className="text-emerald-800 font-bold text-md">
                    入力は <span className="bg-white border-2 border-emerald-200 px-2 py-0.5 rounded text-emerald-700 mx-1">タグNo</span> と <span className="bg-white border-2 border-emerald-200 px-2 py-0.5 rounded text-emerald-700 mx-1">写真</span> だけでOK！
                  </p>
                  <p className="text-xs text-emerald-600 mt-1 opacity-80">※お名前も必須です。細かい指示は後から入力できます。</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <div className="space-y-8">
                <Card title="1. 受付情報の入力" icon={User} visible={true}>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-1/3">
                        <label className="block text-sm font-bold mb-2 text-gray-700 flex items-center"><Tag className="w-4 h-4 mr-1 text-blue-600" /> タグNo.</label>
                        <input type="text" name="tagNumber" className="w-full p-4 border-2 border-blue-200 rounded-xl bg-blue-50 text-xl font-bold text-blue-800 text-center" placeholder="1-23" value={formData.tagNumber} onChange={handleChange} />
                      </div>
                      <div className="w-2/3">
                        <label className="block text-sm font-bold mb-2 text-gray-700">お客様名 <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">必須</span></label>
                        <input type="text" name="customerName" className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-lg" placeholder="例：山田 太郎 様" value={formData.customerName} onChange={handleChange} />
                      </div>
                    </div>
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
                        {COLORS_LIST.map(c => <button key={c} onClick={() => handleAppendText('brand', c)} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-200 hover:bg-gray-200">{c}</button>)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <label className="block text-sm font-bold mb-3 text-gray-700 flex items-center"><Layers className="w-4 h-4 mr-1 text-blue-600" /> 付属品 (預かりチェック)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {ACCESSORIES_LIST.map(acc => (
                          <button key={acc} onClick={() => handleCheck('accessories', acc)} className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${(formData.accessories || []).includes(acc) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300'}`}>
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

                <Card title="2. お悩み・検品" icon={AlertTriangle} color="bg-white border-l-4 border-l-red-400" headerColor="bg-red-50" visible={true}>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-700">一番の悩み</label>
                      <div className="flex flex-wrap gap-3">
                        {['シミ・汚れ', '汗・ニオイ', '黄ばみ', 'シワ', '仕上げ重視', '穴・ほつれ', '色落ち'].map(item => (
                          <button key={item} onClick={() => handleCheck('needs', item)} className={`px-5 py-2.5 rounded-full border-2 text-sm font-bold transition-all ${formData.needs.includes(item) ? 'bg-red-500 border-red-500 text-white shadow' : 'bg-white border-gray-200 text-gray-500'}`}>
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2 text-gray-700 flex justify-between items-center">
                        <span>シミ・汚れの場所/詳細</span>
                        <button onClick={handleVoiceInput} className={`text-xs px-3 py-1 rounded-full flex items-center transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                          {isListening ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />} 音声入力
                        </button>
                      </label>
                      <textarea name="stainLocation" className="w-full p-4 border-2 border-gray-200 rounded-xl h-24 resize-none transition-all mb-2" placeholder="例：右袖口にコーヒーのシミ。" value={formData.stainLocation} onChange={handleChange}></textarea>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {TEXT_TEMPLATES.map((text, i) => <button key={i} onClick={() => handleAppendText('stainLocation', text)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full border border-gray-300 transition-colors">+ {text}</button>)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <input id="camera-input" type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="absolute opacity-0 pointer-events-none"/>
                      {photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {photos.map((p, index) => (
                            <div key={index} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                              <img src={p} alt={`写真 ${index + 1}`} className="w-full h-full object-contain cursor-pointer hover:opacity-90" onClick={() => setEditingPhotoIndex(index)} />
                              <button onClick={(e) => { e.stopPropagation(); removePhoto(index); }} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      {photos.length < 3 && (
                        <label htmlFor="camera-input" className="w-full py-4 bg-gray-100 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl flex flex-col items-center justify-center font-bold hover:bg-gray-200 cursor-pointer">
                          <div className="flex items-center"><Camera className="w-5 h-5 mr-2" /><span>写真を追加 ({photos.length}/3)</span></div>
                        </label>
                      )}
                    </div>
                  </div>
                </Card>

                {isSimpleMode && (
                  <div className="flex flex-col gap-4">
                    {/* スピードモード時のボタン分離 */}
                    <button className={`w-full py-5 rounded-xl shadow-lg font-bold text-xl flex items-center justify-center transition-all ${isOnline ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 cursor-not-allowed'}`} onClick={handleSave} disabled={!isOnline}>
                      <Save className="mr-2 w-6 h-6" /> 保存して終了（受付完了）
                    </button>
                    <button className="w-full py-3 bg-gray-800 text-white rounded-xl shadow-md font-bold text-lg flex items-center justify-center hover:bg-gray-900 transition-all" onClick={() => setShowReceipt(true)}>
                      <Receipt className="mr-2 w-5 h-5" /> タグ（レシート）発行
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <Card title="3. 工場指示" icon={Scissors} visible={!isSimpleMode}>
                  <div className="space-y-6">
                    <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl">
                      <label className="block text-sm font-bold mb-3 text-yellow-800 flex items-center"><Star className="w-4 h-4 mr-1 text-yellow-600 fill-yellow-600" /> しみ抜き指定</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['なし', '無料範囲', '有料'].map((type) => (
                          <button key={type} onClick={() => setFormData(prev => ({...prev, stainRemovalRequest: type}))} className={`py-3 rounded-lg font-bold text-sm transition-all ${formData.stainRemovalRequest === type ? 'bg-yellow-500 text-white shadow-md' : 'bg-white border border-yellow-200 text-gray-600'}`}>{type}</button>
                        ))}
                      </div>
                      {formData.stainRemovalRequest === '有料' && (
                        <div className="mt-3 pt-3 border-t border-yellow-200 animate-in fade-in slide-in-from-top-2">
                          <label className="block text-xs font-bold mb-2 text-yellow-700">金額</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[500, 800, 1000, 1500, 2000, 3000].map(price => (
                              <button key={price} onClick={() => setFormData(prev => ({...prev, stainRemovalPrice: price}))} className={`py-2 rounded-lg text-sm font-bold border transition-all ${formData.stainRemovalPrice === price ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-yellow-800 border-yellow-300'}`}>{price}円</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-700">洗浄コース</label>
                      <div className="grid grid-cols-3 gap-3">
                        {['スタンダード', 'デラックス', 'ウェット'].map(course => <SelectButton key={course} label={course} selected={formData.processInstruction === course} onClick={() => setFormData(prev => ({...prev, processInstruction: course}))} />)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-700">仕上げ方</label>
                      <div className="relative">
                         <select name="finishing" className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 outline-none appearance-none" value={formData.finishing} onChange={handleChange}>
                            <option>ソフト仕上げ（ふんわり）</option><option>ハード（糊付け）</option><option>センタープレス有り</option><option>プレス無し（スチームのみ）</option><option>たたみ仕上げ</option><option>ハンガー仕上げ</option>
                          </select>
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500"><ChevronRight className="w-5 h-5 rotate-90" /></div>
                       </div>
                    </div>
                  </div>
                </Card>

                {!isSimpleMode && (
                  <div className="flex flex-col gap-4 mt-4">
                    {/* 詳細モード時のボタン分離 */}
                    <button className={`w-full py-4 rounded-xl shadow-lg font-bold text-lg flex items-center justify-center transition-all ${isOnline ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-gray-300 cursor-not-allowed'}`} onClick={handleSave} disabled={!isOnline}>
                      <Save className="mr-2 w-6 h-6" /> 変更を保存
                    </button>
                    <button className="w-full py-3 bg-gray-800 text-white rounded-xl shadow-md font-bold text-lg flex items-center justify-center hover:bg-gray-900 transition-all" onClick={() => setShowReceipt(true)}>
                      <Receipt className="mr-2 w-5 h-5" /> タグ（レシート）発行
                    </button>
                    <button className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl shadow-sm font-bold text-md flex items-center justify-center hover:bg-gray-50 transition-all" onClick={() => setTimeout(() => window.print(), 100)}>
                      <Printer className="mr-2 w-5 h-5" /> 印刷プレビュー（A4）
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}