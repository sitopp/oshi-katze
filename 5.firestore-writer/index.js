//Difyから起動
//postで受け取った内容をFirestoreに書き込む

const dummy_post = {
  "result": [
    "- NEW YEAR 2025 着ぐるみキーホルダー/FANTASTICS\n  - 発売日：2025年1月\n  - 詳細URL：https://www.exiletribestation.jp/item/detail/1_7_90025120032_1/1131\n- NEW YEAR 2025 だるまぬいぐるみチャーム/FANTASTICS\n  - 発売日：2025年1月\n  - 詳細URL：https://www.exiletribestation.jp/item/detail/1_7_90025120044_1/1131\n- NEW YEAR 2025 手毬飴入りちりめん巾着/FANTASTICS\n  - 発売日：2025年1月\n  - 詳細URL：https://www.exiletribestation.jp/item/detail/1_7_90025120056_1/1131\n- NEW YEAR 2025 年賀状3枚セット/FANTASTICS\n  - 発売日：2025年1月\n  - 詳細URL：https://www.exiletribestation.jp/item/detail/1_7_90025120007_1/1131\n- NEW YEAR 2025 ポチ袋3枚セット/FANTASTICS\n  - 発売日：2025年1月\n  - 詳細URL：https://www.exiletribestation.jp/item/detail/1_7_90025120019_1/1131\n- FANTASTICS 2025 スケジュール帳\n  - 発売日：2025年1月\n  - 詳細URL：https://www.exiletribestation.jp/item/detail/1_7_90024120072_1/1131\n- FANTASTICS 2025 カレンダー/壁掛け\n  - 発売日：2025年1月\n  - 詳細URL：https://www.exiletribestation.jp/item/detail/1_7_90024100066_1/1131\n- FANTASTICS 2025 カレンダー/卓上\n  - 発売日：2025年1月\n  - 詳細URL：https://www.exiletribestation.jp/item/detail/1_7_90024100067_1/1131\n"
  ],
  "talent_id": "1",
  "genre": "1"
}


const express = require('express');
const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const app = express();
app.use(express.json());

//Firebase Adminの初期化
const serviceAccount = require('./firebase-service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});

//なぜか以下の書き方だと.jsonファイルを認識できずビルドエラー
// // Firebase Adminの初期化
// const serviceAccount = require('../credentials/firebase-service-account.json');
// initializeApp({
// credential: cert(serviceAccount)
// });


// Firestoreの参照を取得
const db = admin.firestore();

// ヘルスチェック用のエンドポイント
app.get('/', (req, res) => {
res.status(200).send('OK');
});

app.post('/', async (req, res) => {
try {
  // リクエストボディが空の場合はdummy_postを使用
  const data = Object.keys(req.body).length === 0 ? dummy_post : req.body;
  
  const { result, talent_id, genre } = data;
  
  if (!talent_id || !genre) {
    return res.status(400).json({ error: 'talent_id and genre are required' });
  }

  // タイムスタンプを追加
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const documentData = {
    ...data,
    timestamp: timestamp
  };

  // ドキュメントIDを talent_id_genre の形式で作成
  const docId = `${talent_id}_${genre}`;

  // Firestoreにデータを書き込む
  const docRef = db.collection('information').doc(docId);
  await docRef.set(documentData);

  console.log('Document written with ID: ', docId);
  res.status(200).json({ 
    message: 'Data successfully written to Firestore',
    documentId: docId
  });
} catch (error) {
  console.error('Error writing to Firestore:', error);
  res.status(500).json({ error: 'Failed to write data to Firestore' });
}
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
console.log(`Server is running on port ${port}`);
});