import React, { useState, useRef } from 'react';
import { Save, Camera, Printer, CheckCircle, AlertTriangle, User, Scissors, Shirt, X } from 'lucide-react';

// カードコンポーネント
const Card = ({ children, title, icon: Icon, color = "bg-white" }) => (
  <div className={`mb-6 rounded-lg shadow-lg overflow-hidden border border-gray-200 ${color}`}>
    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
      {Icon && <Icon className="w-5 h-5 mr-2 text-blue-600" />}
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
    </div>
    <div className="p-4">
      {children}
    </div>
  </div>
);

export default function App() {
  const [formData, setFormData] = useState({
    manageNo: "20231211-001",
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
  });

  // 写真データを保存する変数
  const [photo, setPhoto] = useState(null);
  const fileInputRef = useRef(null);

  // 入力ハンドラ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 複数選択ボタンのハンドラ
  const handleCheck = (field, value) => {
    setFormData(prev => {
      const currentArray = prev[field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  };

  // カメラ起動ハンドラ
  const handleCameraClick = () => {
    fileInputRef.current.click();
  };

  // 写真が撮られたときの処理
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800 pb-20">
      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-6 bg-blue-700 text-white p-4 rounded-lg shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Shirt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Clean Master Tablet</h1>
            <p className="text-xs md:text-sm opacity-80">受付・工場連携システム</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs md:text-sm opacity-80">管理No</div>
          <div className="text-xl md:text-2xl font-mono font-bold tracking-wider">{formData.manageNo}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        
        {/* 左カラム：受付・検品 */}
        <div className="space-y-6">
          <Card title="1. 受付情報の入力" icon={User}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-600">お客様名</label>
                <input 
                  type="text" 
                  name="customerName"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例：山田 太郎 様"
                  value={formData.customerName}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-600">アイテム</label>
                  <select 
                    name="itemType"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white h-12 focus:ring-2 focus:ring-blue-500 outline-none"
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
                  <label className="block text-sm font-bold mb-1 text-gray-600">ブランド/色</label>
                  <input 
                    type="text" 
                    name="brand"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="例：黒・ウール" 
                    value={formData.brand}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card title="2. お悩み・検品 (Inspection)" icon={AlertTriangle} color="bg-red-50 border-red-100">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">一番の悩み（複数可）</label>
                <div className="flex flex-wrap gap-2">
                  {['シミ・汚れ', '汗・ニオイ', '黄ばみ', 'シワ', '仕上げ重視'].map(item => (
                    <button
                      key={item}
                      onClick={() => handleCheck('needs', item)}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                        formData.needs.includes(item) 
                          ? 'bg-red-500 text-white border-red-600 shadow-sm' 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-red-50'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">シミ・汚れの場所/詳細</label>
                <textarea 
                  name="stainLocation"
                  className="w-full p-3 border border-gray-300 rounded-lg h-24 focus:ring-2 focus:ring-red-500 outline-none resize-none" 
                  placeholder="例：右袖口にコーヒーのシミ。1週間前。水で軽く拭いたとのこと。"
                  value={formData.stainLocation}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div 
                className={`p-3 rounded border transition-colors cursor-pointer ${formData.riskAccepted ? 'bg-red-100 border-red-300' : 'bg-white border-red-200'}`}
                onClick={() => setFormData(prev => ({...prev, riskAccepted: !prev.riskAccepted}))}
              >
                <div className="flex items-center space-x-3 select-none">
                  <div className={`w-6 h-6 rounded border flex items-center justify-center ${formData.riskAccepted ? 'bg-red-600 border-red-600' : 'bg-white border-gray-400'}`}>
                    {formData.riskAccepted && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <span className="font-bold text-red-700">リスク説明・了承済み（サイン代わり）</span>
                </div>
              </div>
              
              {/* カメラ機能エリア */}
              <div className="space-y-2">
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
                    className="w-full py-4 bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center font-bold hover:bg-gray-300 transition active:scale-95 shadow-sm border border-gray-300"
                  >
                    <Camera className="mr-2 w-6 h-6" /> 衣類・シミの写真を撮影
                  </button>
                ) : (
                  <div className="relative w-full rounded-lg overflow-hidden border border-gray-300 shadow-md">
                    <img src={photo} alt="撮影画像" className="w-full h-auto max-h-64 object-cover" />
                    <button 
                      onClick={() => setPhoto(null)}
                      className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                      撮影済み
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* 右カラム：工場指示・仕上げ */}
        <div className="space-y-6">
          <Card title="3. 工場指示 (Instruction)" icon={Scissors}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-600">洗浄コース</label>
                <div className="grid grid-cols-3 gap-2">
                  {['スタンダード', 'デラックス', 'ウェット'].map(course => (
                    <button
                      key={course}
                      onClick={() => setFormData(prev => ({...prev, processInstruction: course}))}
                      className={`p-2 rounded border text-center font-bold text-sm transition-all ${
                        formData.processInstruction === course 
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300 ring-offset-1' 
                          : 'bg-white text-gray-600 hover:bg-blue-50'
                      }`}
                    >
                      {course}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-600">前処理・洗い指示</label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {['エリ・ソデ重点', '油性処理', '漂白処理', 'ネット必須'].map((treatment) => (
                    <div 
                      key={treatment}
                      onClick={() => handleCheck('specialTreatments', treatment)}
                      className={`flex items-center p-2 border rounded cursor-pointer transition-colors select-none ${
                        formData.specialTreatments.includes(treatment) ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'
                      } ${treatment === 'ネット必須' ? 'text-red-600 font-bold' : ''}`}
                    >
                      <div className={`w-4 h-4 mr-2 rounded border flex items-center justify-center ${formData.specialTreatments.includes(treatment) ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-400'}`}>
                         {formData.specialTreatments.includes(treatment) && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      {treatment}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-600">仕上げ方</label>
                 <select 
                    name="finishing"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.finishing}
                    onChange={handleChange}
                  >
                    <option>ソフト仕上げ（ふんわり）</option>
                    <option>ハード（糊付け）</option>
                    <option>センタープレス有り</option>
                    <option>プレス無し（スチームのみ）</option>
                  </select>
              </div>
            </div>
          </Card>

          <Card title="4. 最終確認・申し送り (Final Check)" icon={CheckCircle} color="bg-green-50 border-green-100">
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-bold mb-1 text-green-800">仕上がり結果</label>
                 <select 
                    name="resultStatus"
                    className="w-full p-3 border border-green-200 rounded-lg bg-white focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.resultStatus}
                    onChange={handleChange}
                  >
                    <option>良好・完了</option>
                    <option>シミ残りあり（生地保護のため中断）</option>
                    <option>再洗いが必要</option>
                  </select>
               </div>
               <div>
                <label className="block text-sm font-bold mb-1 text-green-800">お客様への申し送り事項</label>
                <textarea 
                  name="finalMessage"
                  className="w-full p-3 border border-green-200 rounded-lg h-20 focus:ring-2 focus:ring-green-500 outline-none" 
                  placeholder="例：古いシミのため薄く残りましたが、これ以上は生地を傷めるためストップしました。"
                  value={formData.finalMessage}
                  onChange={handleChange}
                ></textarea>
              </div>
             </div>
          </Card>

          {/* アクションボタン */}
          <div className="flex gap-4 mt-8 pb-8">
            <button 
              className="flex-1 py-4 bg-gray-600 text-white rounded-lg shadow-lg font-bold text-lg flex items-center justify-center hover:bg-gray-700 transition active:scale-95"
              onClick={() => alert("タグを印刷します（デモ）")}
            >
              <Printer className="mr-2" /> タグ発行
            </button>
            <button 
              className="flex-1 py-4 bg-blue-600 text-white rounded-lg shadow-lg font-bold text-lg flex items-center justify-center hover:bg-blue-700 transition active:scale-95"
              onClick={() => {
                const message = `
【保存完了】
管理No: ${formData.manageNo}
お名前: ${formData.customerName}
アイテム: ${formData.itemType}
コース: ${formData.processInstruction}
写真: ${photo ? 'あり' : 'なし'}
                `;
                alert(message);
              }}
            >
              <Save className="mr-2" /> カルテ保存
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}