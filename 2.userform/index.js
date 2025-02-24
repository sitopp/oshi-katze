const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Google Sheets APIの設定
const auth = new google.auth.GoogleAuth({
    credentials: './google-cloud-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

// スプレッドシートIDを環境変数から取得
const TALENT_SHEET_ID = process.env.TALENT_SHEET_ID;
const USER_SHEET_ID = process.env.USER_SHEET_ID;

// 登録フォームの表示
app.get('/register', async (req, res) => {
    try {
        // タレントマスターからデータを取得
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: TALENT_SHEET_ID,
            range: 'talent!A2:B'  // A2からBの最終行まで（ヘッダーを除く）
        });

        const talents = response.data.values.map(row => ({
            talent_id: row[0],
            name: row[1]
        }));

        // デバッグログ
        console.log('Query parameters:', req.query);

        // テンプレートに渡すデータを明示的に定義
        const templateData = {
            talents: talents,
            user_id: req.query.secId || '',  // secIdをuser_idとして使用
            secId: req.query.secId || ''     // バックアップとしてsecIdも渡す
        };

        console.log('Template data:', templateData);  // デバッグログ
        
        res.render('register', templateData);


        // res.render('register', {
        //     talents: talents,
        //     // user_id: req.query.user_id
        //     user_id: req.query.secId
        // });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('エラーが発生しました');
    }
});

// フォームの送信処理
app.post('/register', async (req, res) => {
    try {
        const { nickname, favorite_talent, user_id } = req.body;

        //timestampを取得する
        const timestamp = new Date().toISOString();
        // ユーザーシートに登録
        await sheets.spreadsheets.values.append({
            spreadsheetId: USER_SHEET_ID,
            range: 'users',  // シート名を適切に設定してください
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[timestamp, user_id, nickname, favorite_talent]]
            }
        });

        res.send('登録が完了しました');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('エラーが発生しました');
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});