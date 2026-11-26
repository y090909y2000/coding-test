// 測驗題庫：換主題時只需要改這個檔案
// 1. 修改 STYLES（風格清單）
// 2. 修改 QUESTIONS（題目與選項權重）
// 權重的 key 必須是 STYLES 裡的風格名稱

export const STYLES = ["規劃派", "直覺派", "實驗派", "完美派"] as const;

export type Style = (typeof STYLES)[number];

export type Weights = Partial<Record<Style, number>>;

export type Option = {
  text: string;
  weights: Weights;
};

export type Question = {
  id: number;
  text: string;
  options: Option[];
};

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "接到一個全新的功能需求，你第一件事會做什麼？",
    options: [
      { text: "先畫流程圖、列出任務清單", weights: { 規劃派: 2 } },
      { text: "直接打開編輯器開始寫", weights: { 直覺派: 2 } },
      { text: "先找幾個新工具或套件試玩看看", weights: { 實驗派: 2 } },
      { text: "先研究現有程式碼，確保風格一致", weights: { 完美派: 2 } },
    ],
  },
  {
    id: 2,
    text: "你的專案資料夾通常長什麼樣子？",
    options: [
      { text: "分層清楚、命名有規則，還有 README", weights: { 規劃派: 2, 完美派: 1 } },
      { text: "能跑就好，檔案有點亂但我找得到", weights: { 直覺派: 2 } },
      { text: "有一堆 test、demo、backup 資料夾", weights: { 實驗派: 2 } },
      { text: "每個檔案都經過整理，絕不留垃圾", weights: { 完美派: 2, 規劃派: 1 } },
    ],
  },
  {
    id: 3,
    text: "遇到一個很難找的 bug，你會怎麼處理？",
    options: [
      { text: "系統化排查，一步步縮小範圍", weights: { 規劃派: 2 } },
      { text: "憑感覺猜哪裡出問題，直接改改看", weights: { 直覺派: 2 } },
      { text: "加一堆 console.log，邊試邊看", weights: { 實驗派: 2 } },
      { text: "寫個測試重現問題，修完還要補測試", weights: { 完美派: 2 } },
    ],
  },
  {
    id: 4,
    text: "你怎麼看待「先求有，再求好」？",
    options: [
      { text: "可以，但要先排好之後重構的時程", weights: { 規劃派: 2 } },
      { text: "完全同意，先做出來最重要", weights: { 直覺派: 2 } },
      { text: "先做出原型，不行就丟掉重來", weights: { 實驗派: 2 } },
      { text: "不太能接受，要做就做到好", weights: { 完美派: 2 } },
    ],
  },
  {
    id: 5,
    text: "看到一個很紅的新框架，你的反應是？",
    options: [
      { text: "先評估它適不適合目前的專案", weights: { 規劃派: 2 } },
      { text: "有需要再學，現在的工具夠用", weights: { 直覺派: 1, 完美派: 1 } },
      { text: "馬上拿來做個小玩具試試", weights: { 實驗派: 2 } },
      { text: "先把文件和原始碼讀過一遍", weights: { 完美派: 2 } },
    ],
  },
  {
    id: 6,
    text: "寫程式時，你最常做的事是？",
    options: [
      { text: "照著自己寫的待辦清單一項項完成", weights: { 規劃派: 2 } },
      { text: "想到什麼寫什麼，邊寫邊調整", weights: { 直覺派: 2 } },
      { text: "同時開好幾個分支測不同做法", weights: { 實驗派: 2 } },
      { text: "反覆調整命名和排版直到滿意", weights: { 完美派: 2 } },
    ],
  },
  {
    id: 7,
    text: "Deadline 前一天，你的狀態是？",
    options: [
      { text: "早就留了緩衝，進度都在掌握中", weights: { 規劃派: 2 } },
      { text: "靠腎上腺素衝刺，通常也趕得出來", weights: { 直覺派: 2 } },
      { text: "臨時換了更好的做法，重寫一半", weights: { 實驗派: 2 } },
      { text: "還在修細節，覺得還不夠好", weights: { 完美派: 2 } },
    ],
  },
  {
    id: 8,
    text: "別人 review 你的程式碼，你最期待聽到什麼？",
    options: [
      { text: "架構清楚，之後好擴充", weights: { 規劃派: 2 } },
      { text: "沒想到可以這樣寫，而且真的能跑", weights: { 直覺派: 1, 實驗派: 1 } },
      { text: "這個做法很有創意", weights: { 實驗派: 2 } },
      { text: "乾淨、一致，找不到可挑剔的地方", weights: { 完美派: 2 } },
    ],
  },
];
