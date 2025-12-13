import React, { useState, useRef, useEffect } from 'react';
import { Save, Camera, Printer, CheckCircle, AlertTriangle, User, Scissors, Shirt, X, Trash2, History, FileText, Check, ChevronRight, RefreshCw, Cloud, CloudOff } from 'lucide-react';

// ★重要: ここにFirebaseを使うための部品を読み込みます
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

// =================================================================
// ★STEP 1: Firebaseの設定情報（ここをご自身のものに書き換えてください）
// Firebaseコンソール (https://console.firebase.google.com/) で取得できます
// =================================================================
const firebaseConfig = {
  // ↓↓↓ ここをご自身のプロジェクトのキーに書き換えてください ↓↓↓
  apiKey: "AIzaSyBt3YJKQwdK-DqEV7rh3Mlh4BVOGa3Tw2s",
  authDomain: "my-cleaning-app-adf6a.firebaseapp.com",
  projectId: "my-cleaning-app-adf6a",
  storageBucket: "my-cleaning-app-adf6a.firebasestorage.app",
  messagingSenderId: "1086144954064",
  appId: "1:1086144954064:web:f927f4e0a725a6848928d5"
  // ↑↑↑ ここまで ↑↑↑
};

// Firebaseの初期化（設定がまだ空の場合はエラーにならないようにする）
let db;
try {
  // ダミーの設定のままなら初期化しない
  if (firebaseConfig.apiKey !== "AIzaSy...") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Firebase初期化エラー:", e);
}

// ------------------------------------------------------------------

// カードコンポーネント
const Card = ({ children, title, icon: Icon, color = "bg-white", headerColor = "bg-gray-50" }) => (
  <div className={`mb-6 rounded-xl shadow-sm overflow-hidden border border-gray-200 ${color} transition-shadow hover:shadow-md`}>
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

export default function App() {
  const initialData = {
    manageNo: "", 
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

  const [formData, setFormData] = useState({
    ...initialData,
    manageNo: `2023${new Date().getMonth()+1}${new Date().getDate()}-001`
  });

  const [photo, setPhoto] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [isOnline, setIsOnline] = useState(false); // データベース接続状態
  const fileInputRef = useRef(null);

  // ★データベースからデータを読み込む（リアルタイム同期）
  useEffect(() => {
    if (!db) return; // Firebase設定がまだの場合は何もしない

    setIsOnline(true);
    // 'kartes' というコレクション（箱）からデータを取得
    // 日付順（新しい順）に並べ替え
    const q = query(collection(db, "kartes"), orderBy("createdAt", "desc"));
    
    // データが変わるたびに自動更新
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setHistoryList(list);
    }, (error) => {
      console.error("データ取得エラー:", error);
      setIsOnline(false);
    });

    return () => unsubscribe();
  }, []);

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

  const handleCameraClick = () => fileInputRef.current.click();
  
  // 写真の圧縮処理（データベース容量節約のため）
  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // 横幅を800pxに制限
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL(file.type, 0.7)); // 画質70%で圧縮
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // 写真を圧縮してからセット
      const resizedPhoto = await resizeImage(file);
      setPhoto(resizedPhoto);
    }
  };

  // ★データを保存する
  const handleSave = async () => {
    if (!formData.customerName) {
      alert("お客様名を入力してください");
      return;
    }

    if (!db) {
      alert("Firebaseの設定がまだ行われていません。\nコード内の 'firebaseConfig' を設定してください。");
      return;
    }

    try {
      // データベースに追加
      await addDoc(collection(db, "kartes"), {
        ...formData,
        photoData: photo, // 写真データ
        saveDate: new Date().toLocaleString(),
        createdAt: serverTimestamp() // サーバー側の日時
      });

      alert("クラウドデータベースに保存しました！\n他の端末からも確認できます。");
      
      if(window.confirm("続けて次のお客様を入力しますか？")) {
        handleReset();
      }
    } catch (e) {
      console.error("保存エラー:", e);
      alert("保存に失敗しました。\n" + e.message);
    }
  };

  const handleReset = () => {
    const currentNo = formData.manageNo.split('-');
    let nextNo = formData.manageNo;
    if (currentNo.length > 1) {
      const num = parseInt(currentNo[1]) + 1;
      nextNo = `${currentNo[0]}-${String(num).padStart(3, '0')}`;
    }
    setFormData({ ...initialData, manageNo: nextNo });
    setPhoto(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ★データを削除する
  const handleDelete = async (id) => {
    if (!db) return;
    if (window.confirm("本当にこのデータを削除しますか？\nクラウド上から完全に消えます。")) {
      try {
        await deleteDoc(doc(db, "kartes", id));
      } catch (e) {
        alert("削除に失敗しました");
      }
    }
  };

  const handleLoad = (record) => {
    if (window.confirm("このデータを読み込んで編集しますか？\n（現在の入力内容は消えます）")) {
      const { id, saveDate, photoData, createdAt, ...rest } = record;
      setFormData(rest);
      setPhoto(photoData);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-gray-800 pb-32">
      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-8 bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 rounded-2xl shadow-lg sticky top-2 z-50 backdrop-blur-sm bg-opacity-95">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md border border-white/30">
            <Shirt className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Clean Master Tablet</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs md:text-sm font-medium text-blue-100 opacity-90">受付・工場連携システム</p>
              {/* 接続状態の表示 */}
              <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center ${isOnline ? 'bg-green-500/30 text-green-100' : 'bg-red-500/30 text-red-100'}`}>
                {isOnline ? <><Cloud className="w-3 h-3 mr-1" /> Cloud Online</> : <><CloudOff className="w-3 h-3 mr-1" /> Offline / Config Needed</>}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <button 
            onClick={handleReset}
            className="text-xs bg-white/10 hover:bg-white/20 active:bg-white/30 text-white px-4 py-2 rounded-full mb-2 flex items-center ml-auto transition-colors"
          >
            <RefreshCw className="w-3 h-3 mr-2" /> 入力リセット
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
                まだFirebaseの設定が行われていません。コード内の <code>firebaseConfig</code> を書き換えてください。
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
              <div>
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
                    <option>ズボン/スカート</option>
                    <option>コート</option>
                    <option>ダウン</option>
                    <option>ワンピース</option>
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
                  {['シミ・汚れ', '汗・ニオイ', '黄ばみ', 'シワ', '仕上げ重視'].map(item => (
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
              
              <div className="space-y-3">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                
                {!photo ? (
                  <button 
                    onClick={handleCameraClick}
                    className="w-full py-5 bg-gray-100 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl flex flex-col items-center justify-center font-bold hover:bg-gray-200 hover:border-gray-400 transition-all active:scale-[0.98] group"
                  >
                    <div className="bg-white p-3 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6 text-gray-600" />
                    </div>
                    <span>衣類・シミの写真を撮影</span>
                  </button>
                ) : (
                  <div className="relative w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg group">
                    <img src={photo} alt="撮影画像" className="w-full h-auto max-h-72 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <button 
                        onClick={() => setPhoto(null)}
                        className="bg-white text-red-600 px-4 py-2 rounded-full font-bold shadow-lg flex items-center hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> 削除して撮り直す
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" /> 撮影済み
                    </div>
                  </div>
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
                  {['エリ・ソデ重点', '油性処理', '漂白処理', 'ネット必須'].map((treatment) => (
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
                ${isOnline ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
              `}
              onClick={handleSave}
              disabled={!isOnline}
            >
              <Save className="mr-2 w-6 h-6" /> {isOnline ? 'クラウドにカルテ保存' : 'DB設定が必要です'}
            </button>
            <button 
              className="w-full py-3 bg-gray-700 text-white rounded-xl shadow-md font-bold text-md flex items-center justify-center hover:bg-gray-800 transition-all active:scale-[0.98]"
              onClick={() => alert("タグを印刷します（デモ）")}
            >
              <Printer className="mr-2 w-5 h-5" /> タグのみ発行
            </button>
          </div>

        </div>
      </div>

      {/* ★保存済みカルテ一覧エリア（データベース直結） */}
      <div className="max-w-6xl mx-auto mt-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-700 flex items-center">
            <History className="mr-2 text-blue-600" /> クラウド保存済みデータ
            <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">{historyList.length}</span>
          </h2>
        </div>
        
        {historyList.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center text-gray-400 border-2 border-dashed border-gray-300 flex flex-col items-center">
            <History className="w-12 h-12 mb-3 opacity-20" />
            <p>{isOnline ? "データはまだありません" : "データベースに接続されていません"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {historyList.map((record) => (
              <div key={record.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Case ID</span>
                    <span className="font-mono text-blue-600 font-bold">{record.manageNo}</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">{record.saveDate}</span>
                </div>
                
                <h3 className="font-bold text-xl text-gray-800 mb-1">{record.customerName || "名称未設定"} <span className="text-sm font-normal text-gray-500">様</span></h3>
                
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{record.itemType}</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{record.processInstruction}</span>
                </div>

                <div className="border-t border-gray-100 pt-4 flex gap-3">
                  <button 
                    onClick={() => handleLoad(record)}
                    className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center"
                  >
                    <FileText className="w-4 h-4 mr-2" /> 呼び出し
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
  );
}