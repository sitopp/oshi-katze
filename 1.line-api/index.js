// index.js
require('dotenv').config();

const express = require('express');
const { Client } = require('@line/bot-sdk');
const { google } = require('googleapis');
const axios = require('axios');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = express();
app.use(express.json());

const lineConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
};

const lineClient = new Client(lineConfig);

const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
    keyFile: '../credentials/google-cloud-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});



const userSheetId = process.env.USER_SHEET_ID;
const talentSheetId = process.env.TALENT_SHEET_ID;

// 暗号化関数
const crypto = require('crypto');

// 暗号化関数の定義
function encrypt(text) {
    // ユーザーIDを暗号化して返す（例：SHA-256ハッシュを使用）
    return crypto.createHash('sha256')
        .update(text)
        .digest('hex')
        .substring(0, 10);  // 最初の10文字だけを使用
}

// Firebase Adminの初期化
const serviceAccount = require('../credentials/firebase-service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});

// Firestoreの参照を取得
const db = getFirestore();

// Firestoreから最新のレコードを取得する関数
const getLatestRecord = async (talent_id, genre) => {
  try {
    const docId = `${talent_id}_${genre}`;
    const docRef = db.collection('information').doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error fetching document:', error);
    throw error;
  }
};

app.get('/webhook', (req, res) => {
    res.send('Webhook endpoint is working! but you must use post');
});

app.post('/webhook', async (req, res) => {
    console.log(`ヘッダー： ${JSON.stringify(req.headers)}`);
    console.log(`ボディ： ${JSON.stringify(req.body)}`);

    const events = req.body.events;
    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
            const userId = event.source.userId;
            // const lineUserId =  event.source.userId; //add
            const encryptedUserId = encrypt(event.source.userId);


            const messageText = event.message.text;
            const replyToken = event.message.replyToken; //add

            if (messageText === '1') {
                //ユーザー登録をリクエストされたとき
                //ユーザー登録画面へのリンクを出力する
                //user_idは暗号化する★
                await lineClient.replyMessage(event.replyToken, {
                    type: 'text',
                    text: `こちらから登録してください: ${process.env.REGISTER_FORM_URL}?secId=${encryptedUserId}`
                });
            } else if (messageText === '2') {
                //最新情報をリクエストされた時
                //知りたい情報の種類を聞く
                //イベント情報が知りたい場合は21を入力してください」というようなメッセージを出力
                await lineClient.replyMessage(event.replyToken, {
                    type: 'text',
                    text: '知りたい情報の番号を入力してください。\n21:物販情報\n22:イベント（ライブ・ファンミーティング）\n23:出演（TV・ラジオ）\n24:雑誌関連情報\n25:写真集'
                });


            } else if (messageText === '21' || messageText === '22' || messageText === '23' || messageText === '24' || messageText === '25') {
                //最新情報リクエストの種類が決定したので、talentマスタから検索用URLを取得し、JsonにしてDifyの調査APIに送る

                //クライアント情報取得
                const authClient = await auth.getClient();



                //usersマスタからtalent_idを取得する
                const userResponse = await sheets.spreadsheets.values.get({
                    auth: authClient,
                    spreadsheetId: userSheetId,
                    range: 'users!A2:D'
                });

                //userRowsを取得
                const userRows = userResponse.data.values;
                const userRow = userRows.find(row => row[1] === encryptedUserId);
                
                let talentId = null;
                if (userRow) {
                    talentId = userRow[3];  // D列は配列の4番目（インデックス3）                           
                } else{
                    await lineClient.replyMessage(event.replyToken, {
                        type: 'text',
                        text: '推しの登録がありません。登録するには、「1」を返信してください。'
                    });
                }
                
                //talent_idを取得する
                const talent_Id = userResponse.data.values[0][3];

                //messageTextの2バイト目をgenreに挿入
                const genre = messageText.charAt(1);
                    
                //Firestoreのinformationコレクションから情報を取得して返答
                const latestRecord = await getLatestRecord(talent_Id, genre);
                if (latestRecord) {
                    await lineClient.replyMessage(event.replyToken, {
                        type: 'text',
                        text: latestRecord.result[0]
                    });
                } else {
                    // データが見つからない場合
                    await lineClient.replyMessage(event.replyToken, {
                        type: 'text',
                        text: '申し訳ありません。該当する情報が見つかりませんでした。'
                    });
                }
            } else {
                //ユーザー登録か最新情報かを入力してもらう
                //「ユーザー登録の場合は1を、最新情報の場合は2を入力してください」というメッセージを出力
                await lineClient.replyMessage(event.replyToken, {
                    type: 'text',
                    text: 'ユーザー登録の場合は「1」を、\nすでに登録済みで推しの最新情報ゲットの場合は「2」を入力してください。'
                });
            }
        }
        res.sendStatus(200);
    };
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});