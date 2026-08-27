# 剣と魔法のRPG スキルデータ (skillData.js) リファレンス

本リファレンスは、本作のスキル定義ファイルにおけるJSONオブジェクトの構造と、各プロパティの仕様をまとめたものです。新しいスキルを追加・自作する際の設計図として活用してください。

---

## 1. 基本プロパティ (Basic Properties)
スキルの根本的な情報や種別を定義します。

| プロパティ名 | 型 | 説明 |
| :--- | :--- | :--- |
| `name` | String | スキルの表示名 (例: `"攻撃強化"`) |
| `description` | String | スキルの効果に関する説明文 |
| `getdescription` | String | (任意) 取得方法をプレイヤーに提示するための説明文 |

---

## 2. 変数と成長 (Variables & Levels)
スキル独自の変数や、スキル自体がレベルアップする仕組みを定義します。

### `variable` (Object)
スキルが持っている固有変数（初期値）を定義します。
* 例: `"variable": { "level": 0 }`

### `level` (Array)
スキルが成長する段階を定義します。配列の上から順に次の段階へと成長します。
各要素には以下の情報を記載します。

* `name`: レベルの名称 (例: `"小"`, `"Lv2"` など)
* `variable`: このレベルに到達した際に上書きされる変数 (例: `{ "powerp": 5 }`)
* `evoconditions`: このレベルに進化（Evolve）するために必要な条件。簡易条件文字列または従来の条件オブジェクト配列を指定可能。

---

## 3. スキルの動作定義 (Script Context `sc`)
スキルが「いつ取得でき」「いつ発動し」「何を起こすか」を定義するプロパティです。

### 制御プロパティ
`sc` の直下に配置して、スキルの発動頻度やクールタイムを制御します。

* **`tickInterval` (Number)**
  * 常時発動型スキル（`conditions` が空または空文字列）における効果判定・適用を行う間隔を Tick 単位で指定します（例: `20` = 1秒ごと）。
* **`cooldown` (Number)**
  * スキル発動後に、再発動が可能になるまでの待ち時間を秒単位で指定します（例: `60` = 1分間クールダウン）。

### `sc.getconditions` (String | Array)
そのスキルを初めて**習得（取得）**するために満たすべき条件です。
* 文字列で記述した場合、中に含まれるキーワード（`#kill_count` や `#status` など）から、関連するイベントタイプ（討伐時やステータス変化時など）をシステムが自動判別して判定をトリガーします。

### `sc.conditions` (String | Array)
スキルが**発動**するためのトリガー条件です。
* 空文字列 `""` または省略した場合は「常時発動（パッシブ効果）」として扱われます。
* 特定のイベントを監視する場合（例：プレイヤー死亡時 `death` など）は、従来の条件オブジェクトを指定します。

---

## 4. 条件式の記述方法 (Conditions Formulation)
`conditions`, `getconditions`, `evoconditions` は、従来のオブジェクト配列形式に加え、より直感的でシンプルな**簡易条件式（文字列）**で記述できるようになりました。

### 簡易条件式 (推奨)
```javascript
// 単一の条件
conditions: "#status.mp >= 5"

// && を使った複数条件の連結
conditions: "#status.mp >= 5 && #status.hp < #status.maxhp"
```
* **比較演算子**: `==`, `!=`, `>=`, `<=`, `>`, `<` が使用可能です。
* 内部で `&&` によって分割され、すべての条件が満たされた場合に発動します。

### 従来の条件オブジェクト配列 (互換用・特殊イベント用)
特定のイベント（例: 死亡時や攻撃時）のコンテキストフィルタを細かく設定する場合に使用します。
```javascript
conditions: [
    {
        type: "death",
        target: "self",
        selfby: true // 自傷ダメージによる死亡の場合のみ
    }
]
```

---

## 5. 効果とアクションの定義 (Effects & Actions)
スキルが発動したときに何を起こすかを定義します。本作では、純粋な**ステータス干渉（`effects`）**と、ゲーム内で引き起こす**動的処理（各種アクション）**を分別して記述します。

### ステータス効果 (`effects`)
`sc.effects` 内に記述します。`{ ステータス名: 値 }` の平易なオブジェクト形式で記述します。値を文字列にすることで、変数や計算式も使用できます。
* **`add`**: 指定したステータスに数値を加算する。
  * 例: `add: { hp: 1, mp: -5 }`
* **`set`**: 指定したステータスを、指定した数値に強制固定する。
  * 例: `set: { hp: 1 }`
* **`percent`**: 指定したステータスを現在値から n% 上下させる。パッシブスキルの場合はステータス再計算時に自動反映されます。
  * 例: `percent: { str: "v.powerp" }`

---

### アクション (Actions)
`sc` の直下に記述する動的アクションです（旧互換性のために `sc.effects` 内に記述されていても動作します）。

#### 1. `commands` (Minecraftコマンド実行)
発動時に実行される Minecraft コマンドの配列です。実行者は発動したプレイヤーになり、`@s` で自身を対象にできます。
* 例:
  ```javascript
  commands: [
      "playsound random.orb @s ~ ~ ~ 0.3 1.5",
      "particle minecraft:heart_particle ~ ~1.2 ~"
  ]
  ```

#### 2. `message` (メッセージ送信)
プレイヤーに対してメッセージを表示します。`chat` (チャット欄), `actionbar` (ホットバー上のアクションバー), `title` / `subtitle` (画面中央のタイトル表示) に対応しています。文字列内では各種変数やステータスを埋め込んで表示可能です。
* 例:
  ```javascript
  message: {
      chat: "§e[食いしばり] 致命傷を耐えきった！ (クールダウン: 60秒)",
      actionbar: "§6★ 食いしばり発動 ★"
  }
  ```

#### 3. `potion` (ポーション効果付与)
発動時に指定したポーションエフェクトを付与します。
* `id` (String): ポーション効果のID (例: `"regeneration"`, `"resistance"`)
* `duration` (Number | String): 効果時間（秒数）。変数や計算式も指定可能。
* `amplifier` (Number | String): レベル（0がLv1、1がLv2...）。
* `showParticles` (Boolean): 粒子の表示有無 (デフォルトは `true`)
* 例:
  ```javascript
  potion: [
      { id: "regeneration", duration: 5, amplifier: 2, showParticles: true }
  ]
  ```

#### 4. `script` (JavaScriptコード実行)
発動時に、記述された JavaScript コードを動的に評価・実行（eval/new Function相当）します。コマンドだけでは実現できない複雑な動的処理やゲームロジックを直接記述できます。
* **利用可能なコンテキスト変数**:
  * `player`: 発動したプレイヤーオブジェクト (`@minecraft/server`の `Player` 相当)
  * `skillVar`: スキルの固有変数
  * `server`: `@minecraft/server` モジュールそのもの（すべてのAPIへアクセス可能）
  * `util`: システム共通のユーティリティオブジェクト
* 例:
  ```javascript
  script: `
      // プレイヤーのインベントリやタグ、詳細なステータス操作がJSで直接可能
      player.sendMessage("§d[Script] HP: " + player.getComponent("health").currentValue);
      // 例: クリエイティブモードの時は特別な処理をする等
      if (player.name === "Steve") {
          player.addTag("special_user");
      }
  `
  ```

---

## 6. 変数・動的プレースホルダー
条件式やコマンド、メッセージ、効果の値の中では、プレースホルダーを使用して動的に数値を参照・計算させることができます。

* **`#` (システム変数参照)**:
  * `#attack.damage`: 現在与えたダメージ量（攻撃時イベント）
  * `#kill_count`: 討伐イベントに関連した討伐数
  * `#kill_total`: すべてのモブの合計討伐数
  * `#kill.minecraft:zombie`: ゾンビの累計討伐数
  * `#status.hp`, `#status.mp`, `#status.maxhp`, `#status.maxmp`: 各種ステータス
  * `#status.str`, `#status.def`, `#status.int`, `#status.luk`, `#status.agi`: 各種基礎ステータス
  * `#status.hpregen`, `#status.mpregen`: 自然回復量
  * `#memory.KEY`: `Memory` システムに保存されている `KEY` の数値
* **`v.` (スキル固有変数参照)**:
  * `v.NAME`: スキルの `variable` または現在の `level` から引き継いだ変数 `NAME` の値（例: `v.powerp`）
