import React, { useState, useRef, useEffect } from 'react';
import { Save, Camera, Printer, CheckCircle, AlertTriangle, User, Scissors, Shirt, X, Trash2, History, FileText, Check, ChevronRight, RefreshCw, Cloud, CloudOff, Search, Tag, Maximize2, Image as ImageIcon, Mic, MicOff, Edit3, MapPin, Zap, Star, ToggleLeft, ToggleRight, Clock, Calendar, Layers, Palette } from 'lucide-react';

// ★重要: ここにFirebaseを使うための部品を読み込みます
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

// =================================================================
// ★STEP 1: Firebaseの設定情報
// ここをご自身のキーに書き換えてください
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBt3YJKQwdK-DqEV7rh3Mlh4BVOGa3Tw2s",
  authDomain: "my-cleaning-app-adf6a.firebaseapp.com",
  projectId: "my-cleaning-app-adf6a",
  storageBucket: "my-cleaning-app-adf6a.firebasestorage.app",
  messagingSenderId: "1086144954064",
  appId: "1:1086144954064:web:f927f4e0a725a6848928d5"
};

// Firebaseの初期化
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

// 定型文リスト
const TEXT_TEMPLATES = [
  "襟の黄ばみあり", "袖口に黒ずみ", "食べこぼしのシミ", 
  "インクのシミ", "全体的にシワ", "ボタン欠損", 
  "ほつれあり", "色落ち注意", "ファスナー動作不良",
  "ポケット内確認済み", "付属品あり"
];

// よくある付属品リスト
const ACCESSORIES_LIST = ["ベルト", "フード", "ライナー", "ファー", "リボン", "ブローチ"];

// よくある色・柄リスト
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

// 選択ボタンコンポーネント
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
    {selected && (
      <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-0.5">
        <Check className="w-3 h-3" />
      </div>
    )}
    <span className="font-bold text-sm">{label}</span>
    {subLabel && <span className="text-xs opacity-70">{subLabel}</span>}
  </button>
);

// ★写真編集モーダル（マーカー機能付き・サイズ調整可能）
const PhotoMarkerModal = ({ photoSrc, onClose, onSave }) => {
  const [markers, setMarkers] = useState([]);
  const [markerSize, setMarkerSize] = useState(5); // マーカーサイズの初期値（%）
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  // 画像上のクリックした位置にマーカーを追加
  const handleImageClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 画像の表示サイズに対する割合(%)で保存
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    // サイズも保存（その時点でのスライダーの値）
    setMarkers([...markers, { x: xPercent, y: yPercent, size: markerSize }]);
  };

  const handleUndo = () => {
    setMarkers(markers.slice(0, -1));
  };

  // マーカーを合成して保存
  const handleSaveWithMarkers = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    // キャンバスサイズを画像の実サイズに合わせる
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // 画像を描画
    ctx.drawImage(img, 0, 0);

    // マーカーを描画
    markers.forEach(m => {
      const x = (m.x / 100) * canvas.width;
      const y = (m.y / 100) * canvas.height;
      // 画像の横幅に対する割合で半径を計算
      const radius = (canvas.width * (m.size / 100)) / 2;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
      ctx.lineWidth = Math.max(radius * 0.15, 3); // 線の太さもサイズに合わせて調整（最低3px）
      ctx.strokeStyle = 'red';
      ctx.stroke();
    });

    // 画像データとして出力
    onSave(canvas.toDataURL('image/jpeg', 0.8));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4">
      <div className="relative max-w-full max-h-[70vh] mb-4">
        <img 
          ref={imgRef}
          src={photoSrc} 
          alt="編集対象" 
          className="max-w-full max-h-[70vh] object-contain select-none"
          onClick={handleImageClick}
        />
        {/* 画面上のマーカー表示（プレビュー用） */}
        {markers.map((m, i) => (
          <div 
            key={i}
            className="absolute border-4 border-red-500 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow-sm"
            style={{ 
              left: `${m.x}%`, 
              top: `${m.y}%`,
              width: `${m.size}%`, // 画像幅に対する％で表示
              aspectRatio: '1 / 1'
            }}
          />
        ))}
      </div>
      
      {/* マーカーサイズ調整エリア */}
      <div className="w-full max-w-md bg-gray-800 p-4 rounded-xl mb-4 flex flex-col gap-2">
        <div className="flex justify-between text-white text-xs mb-1">
          <span>マーカーサイズ調整</span>
          <span>{markerSize}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-red-500 rounded-full"></div>
          <input 
            type="range" 
            min="2" 
            max="20" 
            step="1"
            value={markerSize} 
            onChange={(e) => setMarkerSize(Number(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="w-8 h-8 border-4 border-red-500 rounded-full"></div>
        </div>
        <p className="text-gray-400 text-xs text-center mt-1">
          スライダーで大きさを決めてから、写真の上をタップしてください
        </p>
      </div>

      <div className="flex gap-4">
        <button onClick={onClose} className="px-6 py-3 bg-gray-600 text-white rounded-full font-bold hover:bg-gray-700">
          キャンセル
        </button>
        <button onClick={handleUndo} className="px-6 py-3 bg-yellow-600 text-white rounded-full font-bold hover:bg-yellow-700" disabled={markers.length === 0}>
          一つ戻る
        </button>
        <button onClick={handleSaveWithMarkers} className="px-6 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700">
          保存
        </button>
      </div>
      
      {/* 合成用キャンバス（非表示） */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};


// 今日の日付を取得する関数
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

// 指定日後の日付を取得する関数(デフォルト用)
const getFutureDateStr = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function App() {
  const initialData = {
    manageNo: "", 
    tagNumber: "", 
    customerName: "",
    itemType: "スーツ上",
    brand: "",
    accessories: [], // 付属品
    dueDate: getFutureDateStr(3), // お渡し予定日（デフォルト3日後）
    needs: [],
    stainLocation: "",
    riskAccepted: false,
    processInstruction: "スタンダード",
    specialTreatments: [],
    stainRemovalRequest: "なし", 
    stainRemovalPrice: 0, 
    finishing: "ソフト仕上げ（ふんわり）",
    resultStatus: "良好・完了",
    finalMessage: "",
    status: "temporary"
  };

  const [formData, setFormData] = useState(initialData);
  const [photos, setPhotos] = useState([]); 
  const [editingPhotoIndex, setEditingPhotoIndex] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  const [isSimpleMode, setIsSimpleMode] = useState(true);
  const [historyList, setHistoryList] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!db) return;

    setIsOnline(true);
    const q = query(collection(db, "kartes"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setHistoryList(list);
      
      if (!formData.manageNo && !editingId) {
        generateManageNo(list);
      }
    }, (error) => {
      console.error("データ取得エラー:", error);
      setIsOnline(false);
    });

    return () => unsubscribe();
  }, [editingId]);

  const generateManageNo = (list) => {
    const todayStr = getTodayStr();
    const todaysCount = list.filter(item => item.manageNo && item.manageNo.startsWith(todayStr)).length;
    const nextNum = String(todaysCount + 1).padStart(3, '0');
    setFormData(prev => ({ ...prev, manageNo: `${todayStr}-${nextNum}` }));
  };

  const filteredList = historyList.filter((record) => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = record.customerName?.toLowerCase().includes(searchLower);
    const tagMatch = record.tagNumber?.toLowerCase().includes(searchLower);
    const manageNoMatch = record.manageNo?.toLowerCase().includes(searchLower);
    return nameMatch || tagMatch || manageNoMatch;
  });

  // ハイフン自動挿入ロジック（共通化）
  const formatTagNumber = (value) => {
    const raw = value.replace(/-/g, '');
    let formatted = raw;
    if (raw.length > 1) {
      formatted = raw.slice(0, 1) + '-' + raw.slice(1);
    }
    return formatted;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'tagNumber') {
      setFormData(prev => ({ ...prev, [name]: formatTagNumber(value) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 検索バー入力ハンドラ（数字のみの場合はハイフン付与）
  const handleSearchChange = (e) => {
    const val = e.target.value;
    // 入力値が数字とハイフンのみで構成されている場合のみ自動整形を適用
    // (名前検索で「田中1」と入力したい場合などを邪魔しないため)
    if (/^[0-9-]+$/.test(val)) {
      setSearchQuery(formatTagNumber(val));
    } else {
      setSearchQuery(val);
    }
  };

  const handleCheck = (field, value) => {
    setFormData(prev => {
      const currentArray = prev[field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  };

  const handleAppendText = (field, text) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || "") + (prev[field] ? " " : "") + text
    }));
  };

  const applyQuickPreset = (type) => {
    let preset = {};
    switch(type) {
      case 'shirt':
        preset = { itemType: "ワイシャツ", processInstruction: "スタンダード", finishing: "ハンガー仕上げ", specialTreatments: ["エリ・ソデ重点"] }; break;
      case 'suit':
        preset = { itemType: "スーツ上", processInstruction: "スタンダード", finishing: "ソフト仕上げ（ふんわり）", specialTreatments: [] }; break;
      case 'suit_bottom':
        preset = { itemType: "スーツ下（ズボン）", processInstruction: "スタンダード", finishing: "センタープレス有り", specialTreatments: [] }; break;
      case 'delicate':
        preset = { itemType: "セーター・ニット", processInstruction: "デラックス", finishing: "たたみ仕上げ", specialTreatments: ["ネット必須", "デリケート"] }; break;
      default: return;
    }
    setFormData(prev => ({ ...prev, ...preset }));
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("音声入力非対応ブラウザです"); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => handleAppendText('stainLocation', e.results[0][0].transcript);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) { alert("音声入力エラー"); }
  };
  
  const handleCameraClick = () => {
    if (photos.length >= 3) { alert("写真は3枚までです"); return; }
    fileInputRef.current.click();
  };
  
  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000; 
          const scaleSize = MAX_WIDTH / img.width;
          if (img.width > MAX_WIDTH) {
             canvas.width = MAX_WIDTH;
             canvas.height = img.height * scaleSize;
          } else {
             canvas.width = img.width;
             canvas.height = img.height;
          }
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8)); 
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resizedPhoto = await resizeImage(file);
        setPhotos(prev => [...prev, resizedPhoto]); 
      } catch (error) { alert("写真処理エラー"); }
    }
    e.target.value = '';
  };

  const removePhoto = (index) => setPhotos(prev => prev.filter((_, i) => i !== index));
  const handleUpdatePhoto = (newPhotoData) => setPhotos(prev => {
    const newPhotos = [...prev];
    newPhotos[editingPhotoIndex] = newPhotoData;
    return newPhotos;
  });

  const handleSave = async () => {
    if (!formData.customerName) { alert("お客様名を入力してください"); return; }
    if (!db) { alert("DB設定が必要です"); return; }
    const currentStatus = isSimpleMode ? "temporary" : "complete";
    try {
      if (editingId) {
        await updateDoc(doc(db, "kartes", editingId), { ...formData, status: currentStatus, photos, updatedAt: serverTimestamp() });
        alert(isSimpleMode ? "仮保存しました！" : "更新しました！");
      } else {
        await addDoc(collection(db, "kartes"), { ...formData, status: currentStatus, photos, saveDate: new Date().toLocaleString(), createdAt: serverTimestamp() });
        alert(isSimpleMode ? "仮保存しました！" : "保存しました！");
      }
      if (isSimpleMode || window.confirm("続けて新規入力しますか？")) handleReset();
    } catch (e) { alert("保存失敗: " + e.message); }
  };

  const handleReset = () => {
    setEditingId(null);
    setFormData(initialData);
    setPhotos([]);
    generateManageNo(historyList);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!db) return;
    if (window.confirm("本当に削除しますか？")) {
      try { await deleteDoc(doc(db, "kartes", id)); if (id === editingId) handleReset(); } catch (e) { alert("削除失敗"); }
    }
  };

  const handleLoad = (record) => {
    if (window.confirm("読み込みますか？")) {
      const { id, saveDate, photoData, photos: savedPhotos, createdAt, ...rest } = record;
      setEditingId(id);
      
      // ★修正箇所: 既存データ(rest)をinitialDataにマージすることで
      // 古いデータに新しい項目(accessories等)がない場合でもundefinedにならず初期値が入るようにする
      setFormData({ ...initialData, ...rest });

      setPhotos(savedPhotos && Array.isArray(savedPhotos) ? savedPhotos : photoData ? [photoData] : []);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrint = () => setTimeout(() => window.print(), 100);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800">
      
      {editingPhotoIndex !== null && (
        <PhotoMarkerModal 
          photoSrc={photos[editingPhotoIndex]} 
          onClose={() => setEditingPhotoIndex(null)}
          onSave={handleUpdatePhoto}
        />
      )}

      {/* 印刷用レイアウト */}
      <div className="hidden print:block p-8 bg-white text-black w-full h-full" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
        <h1 className="text-3xl font-bold mb-2 border-b-2 border-black pb-2">クリーニング受付カルテ</h1>
        <div className="flex justify-between mb-6">
          <div>
            <p className="text-sm">管理No.</p>
            <p className="text-2xl font-mono font-bold">{formData.manageNo}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">受付日: {new Date().toLocaleDateString()}</p>
            <p className="text-xl font-bold">Tag No: {formData.tagNumber || '-----'}</p>
            <p className="text-md font-bold mt-1">お渡し予定: {formData.dueDate}</p>
          </div>
        </div>
        <div className="border-2 border-black p-4 mb-6 bg-gray-50">
          <p className="text-sm mb-1">お客様名</p>
          <p className="text-2xl font-bold">{formData.customerName} 様</p>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-400 p-2">
            <span className="block text-xs font-bold bg-gray-200 px-1">アイテム / ブランド / 付属品</span>
            <div className="p-2 text-lg">
              {formData.itemType} / {formData.brand}<br/>
              {/* 安全なアクセス: (formData.accessories || []) */}
              <span className="text-sm">付属品: {(formData.accessories || []).length > 0 ? (formData.accessories || []).join('、') : 'なし'}</span>
            </div>
          </div>
          <div className="border border-gray-400 p-2">
            <span className="block text-xs font-bold bg-gray-200 px-1">コース / 仕上げ</span>
            <div className="p-2 text-lg">{formData.processInstruction} / {formData.finishing}</div>
          </div>
        </div>
        <div className="mb-6">
          <span className="block text-sm font-bold border-b border-gray-400 mb-2">ご要望・指示事項</span>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.needs.map(n => <span key={n} className="border border-black px-2 py-1 rounded bg-red-50 font-bold">{n}</span>)}
            {formData.specialTreatments.map(t => <span key={t} className="border border-black px-2 py-1 rounded bg-blue-50 font-bold">{t}</span>)}
            {formData.stainRemovalRequest !== "なし" && (
              <span className="border border-black px-2 py-1 rounded bg-yellow-50 font-bold">
                しみ抜き：{formData.stainRemovalRequest}
                {formData.stainRemovalRequest === '有料' && formData.stainRemovalPrice > 0 && ` (${formData.stainRemovalPrice}円)`}
              </span>
            )}
          </div>
          <div className="border border-gray-300 p-3 min-h-[100px] whitespace-pre-wrap text-lg">
            {formData.stainLocation}
          </div>
        </div>
        {photos.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-bold mb-2">記録写真</p>
            <div className="flex gap-4">
              {photos.map((p, i) => (
                <img key={i} src={p} alt="print" className="w-1/3 h-48 object-contain border border-gray-300 bg-gray-100" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 通常画面 */}
      <div className="print:hidden p-4 pb-32">
        <header className="flex flex-col gap-4 mb-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 rounded-2xl shadow-lg sticky top-2 z-50 backdrop-blur-sm bg-opacity-95">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md border border-white/30">
                <Shirt className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Fabric Care カルテ</h1>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center ${isOnline ? 'bg-green-500/30 text-green-100' : 'bg-red-500/30 text-red-100'}`}>
                    {isOnline ? <><Cloud className="w-3 h-3 mr-1" /> Online</> : <><CloudOff className="w-3 h-3 mr-1" /> Offline</>}
                  </span>
                  {editingId && <span className="bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded animate-pulse">編集モード</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <button 
                onClick={() => setIsSimpleMode(!isSimpleMode)}
                className={`
                   relative flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-lg border-2 border-white/20
                   ${isSimpleMode ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-800 hover:bg-gray-900 text-gray-300'}
                `}
              >
                {isSimpleMode ? <ToggleLeft className="w-6 h-6" /> : <ToggleRight className="w-6 h-6" />}
                <span className="text-sm hidden md:inline">
                  {isSimpleMode ? "⚡ スピード受付モード" : "🔧 詳細入力 (工場用)"}
                </span>
                <span className="text-sm md:hidden">
                  {isSimpleMode ? "スピード" : "詳細"}
                </span>
              </button>
            </div>
          </div>

          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-200" />
            </div>
            <input 
              type="text" 
              className="block w-full p-3 pl-10 text-sm text-white border border-white/30 rounded-xl bg-white/10 placeholder-gray-300 focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all outline-none" 
              placeholder="🔍 過去の履歴を検索（お客様名、タグ番号）" 
              value={searchQuery}
              onChange={handleSearchChange} // 自動ハイフン付与ロジック適用
            />
          </div>
        </header>

        {/* 検索結果 */}
        {searchQuery && filteredList.length > 0 && (
          <div className="mb-8 p-4 bg-white rounded-xl shadow border border-blue-200">
            <h3 className="text-sm font-bold text-gray-500 mb-2">検索結果: {filteredList.length}件（タップで呼び出し）</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
               {filteredList.slice(0, 5).map(record => (
                 <button 
                   key={record.id}
                   onClick={() => { handleLoad(record); setSearchQuery(""); }}
                   className="flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg p-3 text-left w-40 hover:bg-blue-100 transition-colors"
                 >
                    <div className="text-xs text-blue-600 font-bold mb-1">
                      {record.tagNumber || "No Tag"}
                      {record.status === 'temporary' && <span className="ml-1 text-red-500">●仮</span>}
                    </div>
                    <div className="text-sm font-bold truncate">{record.customerName}</div>
                    <div className="text-xs text-gray-500">{record.itemType}</div>
                 </button>
               ))}
            </div>
          </div>
        )}

        {/* かんたんセット */}
        <div className="max-w-6xl mx-auto mb-8 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center mb-2">
            <Zap className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-sm font-bold text-gray-600">かんたんセット（ワンタップで入力）</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button onClick={() => applyQuickPreset('shirt')} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:bg-blue-50 hover:border-blue-300 transition-all text-left group">
               <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">👔</div>
               <div className="font-bold text-gray-700 text-sm">ワイシャツ</div>
               <div className="text-[10px] text-gray-400">ハンガー・エリ袖</div>
            </button>
            <button onClick={() => applyQuickPreset('suit')} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:bg-blue-50 hover:border-blue-300 transition-all text-left group">
               <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🧥</div>
               <div className="font-bold text-gray-700 text-sm">スーツ（上）</div>
               <div className="text-[10px] text-gray-400">ソフト・標準</div>
            </button>
            <button onClick={() => applyQuickPreset('suit_bottom')} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:bg-blue-50 hover:border-blue-300 transition-all text-left group">
               <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">👖</div>
               <div className="font-bold text-gray-700 text-sm">ズボン</div>
               <div className="text-[10px] text-gray-400">センタープレス</div>
            </button>
            <button onClick={() => applyQuickPreset('delicate')} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:bg-blue-50 hover:border-blue-300 transition-all text-left group">
               <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🧶</div>
               <div className="font-bold text-gray-700 text-sm">セーター</div>
               <div className="text-[10px] text-gray-400">デラックス・たたみ</div>
            </button>
          </div>
        </div>

        {isSimpleMode && (
          <div className="max-w-6xl mx-auto mb-6 bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3 animate-pulse">
            <div className="p-2 bg-green-100 rounded-full text-green-600"><Clock className="w-5 h-5" /></div>
            <div>
              <p className="font-bold text-green-800">スピード受付中</p>
              <p className="text-xs text-green-700">受付では写真とお客様名だけ入力し、「仮保存」してください。</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* 左カラム：基本情報 */}
          <div className="space-y-8">
            <Card title="1. 受付情報の入力" icon={User} visible={true}>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <label className="block text-sm font-bold mb-2 text-gray-700 flex items-center">
                      <Tag className="w-4 h-4 mr-1 text-blue-600" /> タグNo.
                    </label>
                    <input 
                      type="text" 
                      name="tagNumber"
                      className="w-full p-4 border-2 border-blue-200 rounded-xl bg-blue-50 text-xl font-bold text-blue-800 text-center focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder-blue-200"
                      placeholder="1-23"
                      value={formData.tagNumber}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="w-2/3">
                    <label className="block text-sm font-bold mb-2 text-gray-700 flex items-center">
                      お客様名 <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">必須</span>
                    </label>
                    <input 
                      type="text" 
                      name="customerName"
                      className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                      placeholder="例：山田 太郎 様"
                      value={formData.customerName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">アイテム</label>
                    <select 
                      name="itemType"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white h-14 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none cursor-pointer"
                      value={formData.itemType}
                      onChange={handleChange}
                    >
                      <option>ワイシャツ</option>
                      <option>スーツ上</option>
                      <option>スーツ下（ズボン）</option>
                      <option>スカート</option>
                      <option>コート</option>
                      <option>ダウン</option>
                      <option>ワンピース</option>
                      <option>セーター・ニット</option>
                      <option>着物・浴衣</option>
                      <option>靴・スニーカー</option>
                      <option>バッグ・革製品</option>
                      <option>その他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">ブランド/色</label>
                    <input 
                      type="text" 
                      name="brand"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none h-14" 
                      placeholder="例：黒・ウール" 
                      value={formData.brand}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* ★新規追加: 色・柄かんたん入力ボタン */}
                <div>
                  <label className="block text-xs font-bold mb-2 text-gray-500 flex items-center">
                    <Palette className="w-3 h-3 mr-1" /> 色・柄かんたん入力
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS_LIST.map(c => (
                      <button
                        key={c}
                        onClick={() => handleAppendText('brand', c)}
                        className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-200 hover:bg-gray-200 hover:border-gray-300 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ★新規追加: 付属品チェックリスト（トラブル防止） */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="block text-sm font-bold mb-3 text-gray-700 flex items-center">
                    <Layers className="w-4 h-4 mr-1 text-blue-600" /> 付属品 (預かりチェック)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ACCESSORIES_LIST.map(acc => (
                      <button
                        key={acc}
                        onClick={() => handleCheck('accessories', acc)}
                        className={`
                          py-2 px-1 text-xs font-bold rounded-lg border transition-all
                          ${(formData.accessories || []).includes(acc)
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
                          }
                        `}
                      >
                        {acc} {(formData.accessories || []).includes(acc) ? 'あり' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ★新規追加: お渡し予定日 */}
                <div>
                   <label className="block text-sm font-bold mb-2 text-gray-700 flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-blue-600" /> お渡し予定日
                    </label>
                    <input 
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold text-gray-700"
                    />
                </div>
              </div>
            </Card>

            <Card title="2. お悩み・検品 (Inspection)" icon={AlertTriangle} color="bg-white border-l-4 border-l-red-400" headerColor="bg-red-50" visible={true}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-3 text-gray-700">一番の悩み</label>
                  <div className="flex flex-wrap gap-3">
                    {['シミ・汚れ', '汗・ニオイ', '黄ばみ', 'シワ', '仕上げ重視', '穴・ほつれ', '色落ち'].map(item => (
                      <button
                        key={item}
                        onClick={() => handleCheck('needs', item)}
                        className={`
                          px-5 py-2.5 rounded-full border-2 text-sm font-bold transition-all duration-200 active:scale-95
                          ${formData.needs.includes(item) ? 'bg-red-500 border-red-500 text-white shadow' : 'bg-white border-gray-200 text-gray-500'}
                        `}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700 flex justify-between items-center">
                    <span>シミ・汚れの場所/詳細</span>
                    <button onClick={handleVoiceInput} className={`text-xs px-3 py-1 rounded-full flex items-center transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                      {isListening ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
                      {isListening ? '聞いています...' : '音声で入力'}
                    </button>
                  </label>
                  <textarea 
                    name="stainLocation"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl h-24 focus:ring-4 focus:ring-red-100 focus:border-red-400 outline-none resize-none transition-all mb-2" 
                    placeholder="例：右袖口にコーヒーのシミ。"
                    value={formData.stainLocation}
                    onChange={handleChange}
                  ></textarea>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {TEXT_TEMPLATES.map((text, i) => (
                      <button key={i} onClick={() => handleAppendText('stainLocation', text)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full border border-gray-300 transition-colors">
                        + {text}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <input id="camera-input" type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="absolute opacity-0 pointer-events-none"/>
                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {photos.map((p, index) => (
                        <div key={index} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img src={p} alt={`写真 ${index + 1}`} className="w-full h-full object-contain cursor-pointer hover:opacity-90" onClick={() => setEditingPhotoIndex(index)} />
                          <button onClick={(e) => { e.stopPropagation(); removePhoto(index); }} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 z-10"><X className="w-3 h-3" /></button>
                          <div className="absolute bottom-1 right-1 bg-blue-600 rounded-full p-1 pointer-events-none shadow-md"><Edit3 className="w-3 h-3 text-white" /></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {photos.length < 3 && (
                    <label htmlFor="camera-input" className="w-full py-4 bg-gray-100 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl flex flex-col items-center justify-center font-bold hover:bg-gray-200 hover:border-gray-400 transition-all active:scale-[0.98] cursor-pointer">
                      <div className="flex items-center"><Camera className="w-5 h-5 mr-2" /><span>写真を追加 ({photos.length}/3)</span></div>
                    </label>
                  )}
                </div>
              </div>
            </Card>

            {isSimpleMode && (
              <button 
                className="w-full py-5 rounded-xl shadow-lg font-bold text-xl flex items-center justify-center transition-all active:scale-[0.98] bg-green-600 hover:bg-green-700 text-white animate-pulse"
                onClick={handleSave}
                disabled={!isOnline}
              >
                <Save className="mr-2 w-6 h-6" /> 
                仮保存して次へ（受付完了）
              </button>
            )}
          </div>

          {/* 右カラム：工場指示・仕上げ */}
          <div className="space-y-8">
            <Card title="3. 工場指示 (Instruction)" icon={Scissors} visible={!isSimpleMode}>
              <div className="space-y-6">
                
                <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl">
                  <label className="block text-sm font-bold mb-3 text-yellow-800 flex items-center">
                    <Star className="w-4 h-4 mr-1 text-yellow-600 fill-yellow-600" /> しみ抜き指定（必須）
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['なし', '無料範囲', '有料'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFormData(prev => ({...prev, stainRemovalRequest: type}))}
                        className={`
                          py-3 rounded-lg font-bold text-sm transition-all duration-200
                          ${formData.stainRemovalRequest === type
                            ? 'bg-yellow-500 text-white shadow-md transform scale-[1.02]' 
                            : 'bg-white border border-yellow-200 text-gray-600 hover:bg-yellow-100'
                          }
                        `}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {formData.stainRemovalRequest === '有料' && (
                    <div className="mt-3 pt-3 border-t border-yellow-200 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-xs font-bold mb-2 text-yellow-700">有料金額を選択</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[500, 800, 1000, 1500, 2000, 3000].map(price => (
                          <button
                            key={price}
                            onClick={() => setFormData(prev => ({...prev, stainRemovalPrice: price}))}
                            className={`py-2 rounded-lg text-sm font-bold border transition-all duration-200 ${formData.stainRemovalPrice === price ? 'bg-yellow-600 text-white border-yellow-600' : 'bg-white text-yellow-800 border-yellow-300'}`}
                          >
                            {price}円
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3 text-gray-700">洗浄コース</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['スタンダード', 'デラックス', 'ウェット'].map(course => (
                      <SelectButton 
                        key={course}
                        label={course}
                        selected={formData.processInstruction === course}
                        onClick={() => setFormData(prev => ({...prev, processInstruction: course}))}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3 text-gray-700">前処理・洗い指示</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['エリ・ソデ重点', '油性処理', '漂白処理', 'ネット必須', 'デリケート', '色止め'].map((treatment) => (
                      <div 
                        key={treatment}
                        onClick={() => handleCheck('specialTreatments', treatment)}
                        className={`relative flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 select-none active:scale-[0.98] ${formData.specialTreatments.includes(treatment) ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm' : 'bg-white border-gray-200'} ${treatment === 'ネット必須' ? 'text-red-600 font-bold' : ''}`}
                      >
                        <div className={`w-5 h-5 mr-3 rounded border flex items-center justify-center transition-colors ${formData.specialTreatments.includes(treatment) ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-300'}`}>
                           {formData.specialTreatments.includes(treatment) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-bold">{treatment}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3 text-gray-700">仕上げ方</label>
                   <div className="relative">
                     <select 
                        name="finishing"
                        className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                        value={formData.finishing}
                        onChange={handleChange}
                      >
                        <option>ソフト仕上げ（ふんわり）</option>
                        <option>ハード（糊付け）</option>
                        <option>センタープレス有り</option>
                        <option>プレス無し（スチームのみ）</option>
                        <option>たたみ仕上げ</option>
                        <option>ハンガー仕上げ</option>
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500"><ChevronRight className="w-5 h-5 rotate-90" /></div>
                   </div>
                </div>
              </div>
            </Card>

            <Card title="4. 最終確認・申し送り (Final Check)" icon={CheckCircle} color="bg-white border-l-4 border-l-green-500" headerColor="bg-green-50" visible={!isSimpleMode}>
               <div className="space-y-6">
                 <div>
                   <label className="block text-sm font-bold mb-2 text-green-800">仕上がり結果</label>
                   <div className="relative">
                     <select 
                        name="resultStatus"
                        className="w-full p-4 border-2 border-green-200 rounded-xl bg-white focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none appearance-none cursor-pointer font-bold text-green-900"
                        value={formData.resultStatus}
                        onChange={handleChange}
                      >
                        <option>良好・完了</option>
                        <option>シミ残りあり（生地保護のため中断）</option>
                        <option>再洗いが必要</option>
                        <option>要確認（お客様へ連絡）</option>
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-green-600"><ChevronRight className="w-5 h-5 rotate-90" /></div>
                   </div>
                 </div>
                 <div>
                  <label className="block text-sm font-bold mb-2 text-green-800">お客様への申し送り事項</label>
                  <textarea 
                    name="finalMessage"
                    className="w-full p-4 border-2 border-green-200 rounded-xl h-24 focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none placeholder-green-300 transition-all" 
                    placeholder="特記事項があれば入力してください"
                    value={formData.finalMessage}
                    onChange={handleChange}
                  ></textarea>
                </div>
               </div>
            </Card>

            {!isSimpleMode && (
              <div className="flex flex-col gap-3 mt-4">
                <button 
                  className={`w-full py-4 rounded-xl shadow-lg font-bold text-lg flex items-center justify-center transition-all active:scale-[0.98] active:shadow-none
                    ${isOnline 
                      ? (editingId ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white')
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                  onClick={handleSave}
                  disabled={!isOnline}
                >
                  <Save className="mr-2 w-6 h-6" /> 
                  {isOnline ? (editingId ? '変更を上書き保存' : 'クラウドにカルテ保存') : 'DB設定が必要です'}
                </button>
                
                <button 
                  className="w-full py-3 bg-gray-700 text-white rounded-xl shadow-md font-bold text-md flex items-center justify-center hover:bg-gray-800 transition-all active:scale-[0.98]"
                  onClick={handlePrint}
                >
                  <Printer className="mr-2 w-5 h-5" /> 印刷プレビューを開く
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}