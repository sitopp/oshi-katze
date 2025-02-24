// Google Sheets APIの設定
require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');

const app = express();
app.use(express.json());

// 環境変数から設定を読み込み
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = process.env.DIFY_API_URL;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Google認証の設定
const auth = new google.auth.GoogleAuth({
    keyFile: '../credentials/google-cloud-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheets = google.sheets('v4');

app.get('/scheduler', (req, res) => {
    res.send('scheduler endpoint is working! but you must use post method.');
});

app.post('/scheduler', async (req, res) => {
    try {

        console.log('Getting auth client...');
        const authClient = await auth.getClient();
        
        //マスタを取得
        console.log('Fetching spreadsheet data...');
        const talentResponse = await sheets.spreadsheets.values.get({
            auth: authClient,
            spreadsheetId: SPREADSHEET_ID,
            range: 'url!A2:D'
        });
        
        const talentRows = talentResponse.data.values;
        console.log(`Found ${talentRows?.length || 0} rows to process`);

        // 各行の処理を非同期で実行
        const processPromises = talentRows.map(async (row) => {
            //デバッグ
            console.log(`ここ通るか？urls+JSON.stringify([row[3]]))`+JSON.stringify([row[3]]));

            //もしJSON.stringify([row[3]]の中身が空でなければ実行
            if (JSON.stringify([row[3]]) === '[]') {
                const rowData = {
                    replyToken: 'dummy',
                    // urls: '[\"' +row[3] + '\"]',
                    urls: JSON.stringify([row[3]]),
                    talent_id: row[1],
                    genre: row[2]
                };

                console.log(`78行目、Processing row:`, rowData);

                try {
                    const difyJson = {
                        inputs: {
                            replyToken: rowData.replyToken,
                            urls: JSON.stringify(Array.isArray(rowData.urls) ? rowData.urls : [rowData.urls]),
                            talent_id: rowData.talent_id,
                            genre: rowData.genre
                        },
                        response_mode: "blocking",
                        user: "abc-123"
                    };

                    console.log(`65 difyJson:`, JSON.stringify(difyJson, null, 2));

                    // Difyへのリクエスト
                    axios({
                        method: 'post',
                        url: DIFY_API_URL,
                        headers: {
                            'Authorization': `Bearer ${DIFY_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        data: difyJson
                    })
                    .then(response => {
                        console.log('Difyレスポンス成功:', JSON.stringify(response.data, null, 2));
                    })
                    .catch(error => {
                        console.error('Difyリクエストエラー:', error.response?.data || error.message);
                    });

                    console.log(`Dify API response for row:`, response.data);

                    return { success: true, data: rowData };
                } catch (error) {
                    console.error('Error processing row:', error.message);
                    return { success: false, error: error.message, data: rowData };
                }
            };  
        });
    } catch (error) {
        console.error('Major error occurred:', error);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
