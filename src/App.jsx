import React, { useState } from 'react';
import { Save, Camera, Printer, CheckCircle, AlertTriangle, User, Scissors, Shirt } from 'lucide-react';

// カードコンポーネント（デザイン枠）
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

// メインアプリ
export default function App() {
  const [formData, setFormData] = useState({
    manageNo: "20231121-001",
    customerName: "",
    itemType: "スーツ上",
    brand: "",
    needs: [],
    stainLocation: "",
    riskAccepted: false,
    processInstruction: "スタンダード",
    specialTreatments: [], // 追加: 洗い指示のオプション用
    finishing: "ソフト仕上げ（ふんわり）",
    resultStatus: "良好・完了",
    finalMessage: ""
  });

  // 配列形式のデータ（悩み・オプション等）のトグル処理
  const handleCheck = (field, value) => {
    const currentArray = formData[field] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    setFormData({ ...formData, [field]: newArray });
  };

  // 汎用的な入力ハンドラ
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800">
      {/* ヘッダーエリア */}
      <header className="flex justify-between items-center mb-6 bg-blue-700 text-white p-4 rounded-lg shadow-md">
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
        
        {/* 左カラム：受付・検品 (Front Desk) */}
        <div className="space-y-6">
          <Card title="1. 受付情報の入力" icon={User}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-600">お客様名</label>
                <input 
                  type="text" 
                  name="customerName"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
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

              <div className={`p-3 rounded border transition-colors ${formData.riskAccepted ? 'bg-red-100 border-red-300' : 'bg-white border-red-200'}`}>
                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    checked={formData.riskAccepted}
                    onChange={(e) => setFormData({...formData, riskAccepted: e.target.checked})}
                  />
                  <span className="font-bold text-red-700">リスク説明・了承済み（サイン代わり）</span>
                </label>
              </div>
              
              <button className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center font-bold hover:bg-gray-300 transition active:scale-95">
                <Camera className="mr-2 w-5 h-5" /> 衣類・シミの写真を撮影
              </button>
            </div>
          </Card>
        </div>

        {/* 右カラム：工場指示・仕上げ (Factory) */}
        <div className="space-y-6">
          <Card title="3. 工場指示 (Instruction)" icon={Scissors}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-600">洗浄コース</label>
                <div className="grid grid-cols-3 gap-2">
                  {['スタンダード', 'デラックス', 'ウェット'].map(course => (
                    <button
                      key={course}
                      onClick={() => setFormData({...formData, processInstruction: course})}
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
                    <label 
                      key={treatment}
                      className={`flex items-center p-2 border rounded cursor-pointer transition-colors ${
                        formData.specialTreatments.includes(treatment) ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'
                      } ${treatment === 'ネット必須' ? 'text-red-600 font-bold' : ''}`}
                    >
                      <input 
                        type="checkbox" 
                        className="mr-2 rounded text-blue-600 focus:ring-blue-500" 
                        checked={formData.specialTreatments.includes(treatment)}
                        onChange={() => handleCheck('specialTreatments', treatment)}
                      /> 
                      {treatment}
                    </label>
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
          <div className="flex gap-4 mt-8 pb-4">
            <button className="flex-1 py-4 bg-gray-600 text-white rounded-lg shadow-lg font-bold text-lg flex items-center justify-center hover:bg-gray-700 transition active:scale-95">
              <Printer className="mr-2" /> タグ発行
            </button>
            <button 
              className="flex-1 py-4 bg-blue-600 text-white rounded-lg shadow-lg font-bold text-lg flex items-center justify-center hover:bg-blue-700 transition active:scale-95"
              onClick={() => {
                alert("データを保存しました\n" + JSON.stringify(formData, null, 2));
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