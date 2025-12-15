import React, { useState, useRef, useEffect } from 'react';
import { Save, Camera, Printer, CheckCircle, AlertTriangle, User, Scissors, Shirt, X, Trash2, History, FileText, Check, ChevronRight, RefreshCw, Cloud, CloudOff, Search, Tag, Maximize2, Image as ImageIcon } from 'lucide-react';

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

// Firebaseの初期化
let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase初期化エラー:", e);
}

// ------------------------------------------------------------------

// カードコンポーネント
const Card = ({ children, title, icon: Icon, color = "bg-white", headerColor = "bg-gray-50" }) => (
  <div className={`mb-6 rounded-xl shadow-sm overflow-hidden border border-gray-200 ${color} transition-shadow hover:shadow-md print:hidden`}>
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

// 今日の日付を取得する関数 (YYYYMMDD形式)
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const initialData = {
    manageNo: "", 
    tagNumber: "", 
    customerName: "",
    itemType: "スーツ上",
    brand: "",
    needs: [],
    stainLocation: "",
    riskAccepted: false,
    processInstruction: "スタンダード",
    specialTreatments: [],
    finishing: "ソフト仕上げ（ふんわり）",
    resultStatus: "良好・完了",
    finalMessage: ""
  };

  const [formData, setFormData] = useState(initialData);
  const [photos, setPhotos] = useState([]); 
  const [previewPhoto, setPreviewPhoto] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  
  const [historyList, setHistoryList] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // useRefは使わず、labelタグでinputを制御します

  // データベースからデータを読み込む
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
      
      // データ読み込み完了時に、新規作成モードなら自動採番
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
    
    setFormData(prev => ({
      ...prev,
      manageNo: `${todayStr}-${nextNum}`
    }));
  };

  const filteredList = historyList.filter((record) => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = record.customerName?.toLowerCase().includes(searchLower);
    const tagMatch = record.tagNumber?.toLowerCase().includes(searchLower);
    const manageNoMatch = record.manageNo?.toLowerCase().includes(searchLower);
    
    return nameMatch || tagMatch || manageNoMatch;
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
  
  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; 
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
          resolve(canvas.toDataURL('image/jpeg', 0.7)); 
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (photos.length >= 3) {
        alert("写真は3枚までです");
        e.target.value = '';
        return;
      }
      try {
        const resizedPhoto = await resizeImage(file);
        setPhotos(prev => [...prev, resizedPhoto]); 
      } catch (error) {
        alert("写真の処理に失敗しました");
      }
    }
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formData.customerName) {
      alert("お客様名を入力してください");
      return;
    }

    if (!db) {
      alert("【設定が必要です】\nFirebaseの設定がまだです。");
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "kartes", editingId), {
          ...formData,
          photos: photos,
          updatedAt: serverTimestamp()
        });
        alert("データを上書き保存しました！");
      } else {
        await addDoc(collection(db, "kartes"), {
          ...formData,
          photos: photos,
          saveDate: new Date().toLocaleString(),
          createdAt: serverTimestamp()
        });
        alert("新しく保存しました！");
      }
      
      if(window.confirm("続けて新規入力しますか？\n（キャンセルすると編集画面のまま残ります）")) {
        handleReset();
      }
    } catch (e) {
      console.error("保存エラー:", e);
      alert("保存に失敗しました。\n" + e.message);
    }
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
    if (window.confirm("本当にこのデータを削除しますか？\nクラウド上から完全に消えます。")) {
      try {
        await deleteDoc(doc(db, "kartes", id));
        if (id === editingId) handleReset();
      } catch (e) {
        alert("削除に失敗しました");
      }
    }
  };

  const handleLoad = (record) => {
    if (window.confirm("このデータを読み込んで編集しますか？\n（現在の入力内容は消えます）")) {
      const { id, saveDate, photoData, photos: savedPhotos, createdAt, ...rest } = record;
      
      setEditingId(id);
      setFormData(rest);
      
      if (savedPhotos && Array.isArray(savedPhotos)) {
        setPhotos(savedPhotos);
      } else if (photoData) {
        setPhotos([photoData]);
      } else {
        setPhotos([]);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ★印刷実行機能
  const handlePrint = () => {
    // 印刷ダイアログを呼び出す
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-800">
      
      {/* =================================================================
          ★印刷用レイアウト（print:blockで表示、画面上は非表示）
          ★ printColorAdjust: 'exact' で背景色などの印刷を強制します
         ================================================================= */}
      <div 
        className="hidden print:block p-8 bg-white text-black w-full h-full"
        style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      >
        <h1 className="text-3xl font-bold mb-2 border-b-2 border-black pb-2">クリーニング受付カルテ</h1>
        <div className="flex justify-between mb-6">
          <div>
            <p className="text-sm">管理No.</p>
            <p className="text-2xl font-mono font-bold">{formData.manageNo}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">受付日: {new Date().toLocaleDateString()}</p>
            <p className="text-xl font-bold">Tag No: {formData.tagNumber || '-----'}</p>
          </div>
        </div>

        <div className="border-2 border-black p-4 mb-6 bg-gray-50">
          <p className="text-sm mb-1">お客様名</p>
          <p className="text-2xl font-bold">{formData.customerName} 様</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-400 p-2">
            <span className="block text-xs font-bold bg-gray-200 px-1">アイテム / ブランド</span>
            <div className="p-2 text-lg">{formData.itemType} / {formData.brand}</div>
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
          </div>
          <div className="border border-gray-300 p-3 min-h-[100px] whitespace-pre-wrap">
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

        <div className="mt-8 pt-4 border-t-2 border-dashed border-gray-400 text-center text-sm text-gray-500">
          Clean Master Tablet System
        </div>
      </div>


      {/* =================================================================
          ★通常画面
         ================================================================= */}
      <div className="print:hidden p-4 pb-32">
        {/* 拡大表示用モーダル */}
        {previewPhoto && (
          <div 
            className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setPreviewPhoto(null)}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={previewPhoto} 
                alt="拡大" 
                className="max-w-full max-h-full object-contain" 
              />
              <button className="absolute top-4 right-4 bg-white/20 text-white p-3 rounded-full hover:bg-white/40">
                <X className="w-8 h-8" />
              </button>
              <p className="absolute bottom-10 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                タップして閉じる
              </p>
            </div>
          </div>
        )}

        {/* ヘッダー */}
        <header className="flex justify-between items-center mb-8 bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 rounded-2xl shadow-lg sticky top-2 z-50 backdrop-blur-sm bg-opacity-95">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md border border-white/30">
              <Shirt className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Clean Master</h1>
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
              onClick={handleReset}
              className="text-xs bg-white/10 hover:bg-white/20 active:bg-white/30 text-white px-4 py-2 rounded-full mb-2 flex items-center ml-auto transition-colors"
            >
              <RefreshCw className="w-3 h-3 mr-2" /> 新規作成
            </button>
            <div className="bg-black/20 px-4 py-1 rounded-lg backdrop-blur-sm border border-white/10">
              <div className="text-[10px] uppercase tracking-wider opacity-70">Case ID</div>
              <div className="text-xl font-mono font-bold tracking-widest">{formData.manageNo}</div>
            </div>
          </div>
        </header>

        {/* 設定未完了時のアラート */}
        {!db && (
          <div className="max-w-6xl mx-auto mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-bold">データベースの設定が必要です：</span>
                  コード内の <code>firebaseConfig</code> をご自身のキーに書き換えてください。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* 左カラム：受付・検品 */}
          <div className="space-y-8">
            <Card title="1. 受付情報の入力" icon={User}>
              <div className="space-y-6">
                {/* タグ番号入力エリア */}
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <label className="block text-sm font-bold mb-2 text-gray-700 flex items-center">
                      <Tag className="w-4 h-4 mr-1 text-blue-600" /> タグNo.
                    </label>
                    <input 
                      type="text" 
                      name="tagNumber"
                      className="w-full p-4 border-2 border-blue-200 rounded-xl bg-blue-50 text-xl font-bold text-blue-800 text-center focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder-blue-200"
                      placeholder="123"
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
              </div>
            </Card>

            <Card title="2. お悩み・検品 (Inspection)" icon={AlertTriangle} color="bg-white border-l-4 border-l-red-400" headerColor="bg-red-50">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-3 text-gray-700">一番の悩み（複数選択可）</label>
                  <div className="flex flex-wrap gap-3">
                    {['シミ・汚れ', '汗・ニオイ', '黄ばみ', 'シワ', '仕上げ重視', '穴・ほつれ', '色落ち'].map(item => (
                      <button
                        key={item}
                        onClick={() => handleCheck('needs', item)}
                        className={`
                          px-5 py-2.5 rounded-full border-2 text-sm font-bold transition-all duration-200 active:scale-95
                          ${formData.needs.includes(item) 
                            ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200' 
                            : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:bg-red-50'
                          }
                        `}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">シミ・汚れの場所/詳細</label>
                  <textarea 
                    name="stainLocation"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl h-28 focus:ring-4 focus:ring-red-100 focus:border-red-400 outline-none resize-none transition-all" 
                    placeholder="例：右袖口にコーヒーのシミ。1週間前。水で軽く拭いたとのこと。"
                    value={formData.stainLocation}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <div 
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer select-none
                    ${formData.riskAccepted 
                      ? 'bg-red-50 border-red-500 shadow-md' 
                      : 'bg-white border-gray-200 hover:border-red-200 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => setFormData(prev => ({...prev, riskAccepted: !prev.riskAccepted}))}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`
                      w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors
                      ${formData.riskAccepted ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'}
                    `}>
                      {formData.riskAccepted && <Check className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">リスク説明・了承済み</div>
                      <div className="text-xs text-gray-500">お客様にリスクを説明し合意を得ました</div>
                    </div>
                  </div>
                </div>
                
                {/* カメラ機能エリア（スマホ対応・label使用） */}
                <div className="space-y-3">
                  {/* inputを完全に隠すのではなく、透明にして背面に配置する（安定性のため） */}
                  <input 
                    id="camera-input"
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={handleFileChange} 
                    className="absolute opacity-0 pointer-events-none"
                  />
                  
                  {/* 写真リスト表示 */}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {photos.map((p, index) => (
                        <div key={index} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img 
                            src={p} 
                            alt={`写真 ${index + 1}`} 
                            className="w-full h-full object-contain cursor-pointer hover:opacity-90"
                            onClick={() => setPreviewPhoto(p)}
                          />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removePhoto(index);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-1 pointer-events-none">
                            <Maximize2 className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 撮影ボタン（labelタグを使用） */}
                  {photos.length < 3 && (
                    <label 
                      htmlFor="camera-input"
                      className="w-full py-4 bg-gray-100 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl flex flex-col items-center justify-center font-bold hover:bg-gray-200 hover:border-gray-400 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <div className="flex items-center">
                        <Camera className="w-5 h-5 mr-2" />
                        <span>写真を追加 ({photos.length}/3)</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* 右カラム：工場指示・仕上げ */}
          <div className="space-y-8">
            <Card title="3. 工場指示 (Instruction)" icon={Scissors}>
              <div className="space-y-6">
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
                        className={`
                          relative flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 select-none active:scale-[0.98]
                          ${formData.specialTreatments.includes(treatment) 
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm' 
                            : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                          }
                          ${treatment === 'ネット必須' ? 'text-red-600 font-bold' : ''}
                        `}
                      >
                        <div className={`
                          w-5 h-5 mr-3 rounded border flex items-center justify-center transition-colors
                          ${formData.specialTreatments.includes(treatment) ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-300'}
                        `}>
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
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                        <ChevronRight className="w-5 h-5 rotate-90" />
                      </div>
                   </div>
                </div>
              </div>
            </Card>

            <Card title="4. 最終確認・申し送り (Final Check)" icon={CheckCircle} color="bg-white border-l-4 border-l-green-500" headerColor="bg-green-50">
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
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-green-600">
                        <ChevronRight className="w-5 h-5 rotate-90" />
                      </div>
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

            {/* アクションボタン */}
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

          </div>
        </div>

        {/* ★保存済みカルテ一覧エリア（検索機能付き・写真表示） */}
        <div className="max-w-6xl mx-auto mt-16 print:hidden">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold text-gray-700 flex items-center">
              <History className="mr-2 text-blue-600" /> クラウド保存済みデータ
              <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">{filteredList.length} 件</span>
            </h2>
            
            {/* ★検索バー */}
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input 
                type="text" 
                className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-xl bg-white focus:ring-blue-500 focus:border-blue-500 shadow-sm" 
                placeholder="お客様名、タグ番号で検索..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {historyList.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center text-gray-400 border-2 border-dashed border-gray-300 flex flex-col items-center">
              <History className="w-12 h-12 mb-3 opacity-20" />
              <p>{isOnline ? "データはまだありません" : "データベースに接続されていません"}</p>
            </div>
          ) : filteredList.length === 0 ? (
             <div className="bg-white p-8 rounded-2xl text-center text-gray-400 border-2 border-dashed border-gray-300">
              <p>検索条件に一致するカルテは見つかりませんでした</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredList.map((record) => (
                <div key={record.id} className={`bg-white p-5 rounded-2xl shadow-sm border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${record.id === editingId ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tag No.</span>
                      <span className="font-mono text-blue-600 font-bold text-lg bg-blue-50 px-2 py-0.5 rounded inline-block w-fit">
                        {record.tagNumber || "No Tag"}
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
                  
                  {/* 履歴リストにも写真を表示 */}
                  {record.photos && record.photos.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {record.photos.map((p, i) => (
                         <img 
                           key={i} 
                           src={p} 
                           alt="履歴写真" 
                           className="w-16 h-16 object-contain bg-gray-100 rounded border border-gray-200 cursor-pointer hover:opacity-80" 
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             setPreviewPhoto(p); 
                           }} 
                         />
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
                    <button 
                      onClick={() => handleDelete(record.id)}
                      className="px-4 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}