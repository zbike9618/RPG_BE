# 剣と魔法のRPG スキルデータ (skillData.js) リファレンス

本リファレンスは、本作のスキル定義ファイル (`skillData.js`) におけるJSONオブジェクトの構造と、各プロパティの仕様をまとめたものです。新しいスキルを追加・自作する際の設計図として活用してください。

---

## 1. 基本プロパティ (Basic Properties)
スキルの根本的な情報や種別を定義します。

| プロパティ名 | 型 | 説明 |
| :--- | :--- | :--- |
| `name` | String | スキルの表示名 (例: `"攻撃強化"`) |
| `description` | String | スキルの効果に関する説明文 |
| `getdescription` | String | (任意) 取得方法をプレイヤーに提示するための説明文 |
| `type` | Number | スキルの種類。<br>`0` = パッシブスキル (常時発動・自動発動)<br>`1` = アクティブスキル (任意に発動する) |

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
* `variable`: このレベルに到達した際に上書きされる変数 (例: `{ "level": 1 }`)
* `evoconditions`: このレベルに進化（Evolve）するために必要な条件の配列

---

## 3. スキルの動作定義 (Script Context `sc`)
スキルが「いつ取得でき」「いつ発動し」「何を起こすか」を定義する最重要プロパティです。

### `sc.getconditions` (Array)
そのスキルを初めて**習得（取得）**するために満たすべき条件のリストです。

### `sc.conditions` (Array)
スキルが**発動**するためのトリガー条件のリストです。
* `type: "always"`: 常に発動状態（永続ステータスアップなど）
* `type: "death"`: プレイヤーのHPが0以下になった瞬間に発動
* （今後拡張可能：`attacked`, `jump`, `sneak` など）

### `sc.result` (Object)
条件を満たしたときに**何が起こるか**を定義します。

#### `status`
プレイヤーのステータスに対する干渉を定義します。配列形式で複数指定可能です。
* `add`: 指定したステータスに**数値を加算**する。
  * `type`: 対象のステータス名 (`"str"`, `"hp"`, `"def"` など)
  * `value`: 加算量（計算式使用可）
* `set`: 指定したステータスを、指定した数値に**強制固定**する。
  * `type`: 対象のステータス名 (`"hp"` など)
  * `value`: 設定値
* `percent`: 指定したステータスを**現在値から n% 上下**させる。(`status_set.js` で加算として反映)
  * `type`: 対象のステータス名 (`"str"`, `"def"` など)
  * `value`: 補正率 (例: `20` = +20%, `-10` = -10%, 計算式使用可)
  * `id`: (任意) 補正の識別子。同じIDを再度 `add` すると上書きになる。省略時は `"skill_{スキルID}_{stat}"` が自動生成される。

```javascript
// 例: strを現在値の +20% 上昇させる (パッシブ・常時発動)
result: {
    status: {
        percent: [
            { type: "str", value: "20", id: "my_str_up" }
        ]
    }
}

// 例: スキルレベルに応じた % 上昇 (v.levelが2なら +10%)
result: {
    status: {
        percent: [
            { type: "str", value: "v.level * 5" }
        ]
    }
}
```

> **注意**: `percent` は `add` や装備補正が加算された後の `result` 値に対して掛け算されます。  
> パッシブ (`conditions: []` や `type: "always"`) の場合は `status_set.js` の毎ステータス計算時に自動反映されます。  
> イベント発動型 (`type: "death"` など) の場合は `executeResult` でその瞬間に適用されます。

---

## 4. 条件式の解説 (Conditions Formulation)
`evoconditions` や `getconditions` 等で使用する条件式ブロックは、以下のプロパティで構成されます。

```json
{
    "type": "attack",
    "operation": ">=",
    "value": "#attack.damage",
    "value2": 50
}
```

* **`type`**: 判定のカテゴリ (`"attack"` = 攻撃時, `"status"` = ステータス依存)
* **`value`**: 判定に使用するAの値
* **`operation`**: 比較演算子 (`">="`, `">"`, `"=="`, `"<"`, `"<="`)
* **`value2`**: 判定に使用するBの値（目標値や閾値）

つまり上記の例では **「与えた攻撃ダメージ (#attack.damage) が 50 以上 (>=) になった時」** と読めます。

---

## 5. 変数参照・動的フォーマット
`value` や `value2` などの数値指定箇所では、文字列を使って動的な変数を参照して計算させることができます。（`util.simpleEval` により処理されます）

* **`#` (システム変数参照)**:
  * `#attack.damage`: 現在与えたダメージ量
  * `#kill_count`: (**重要: contextual**) `type: "kill"` の条件内で、そのモブやファミリーに合致した討伐数を自動的に返します。フィルタ解除時は合計討伐数（Memory: kill_count）になります。
  * `#kill_total`: 全てのモブの合計討伐数（Memoryの `kill_count` スロットを参照）
  * `#kill.minecraft:zombie`: 指定したIDのモブの討伐数を直接参照 (DyPro)
  * `#memory.KEY`: `Memory` システムに保存されている `KEY` の数値を参照
  * `#status.hp`, `#status.mp`, `#status.maxhp`, `#status.maxmp`: 各種ステータス
  * `#status.hpregen`, `#status.mpregen`: 自然回復量
  * `#status.str`, `#status.def`, `#status.int`, `#status.luk`, `#status.agi`: 各種基礎ステータス
* **`v.` (スキル固有変数参照)**:
  * `v.level`: 自身の `variable` 内に定義されている `level` の数値
  * `value: "v.level * 0.1"` と記述すると、スキルレベル変数 × 0.1 が計算されて適用されます。

---

## 6. 特殊な条件タイプ (Special Condition Types)

### `type: "kill"` (討伐条件)
モブを倒した際に判定されます。

* **`target`**: 特定のモブIDを指定 (例: `"minecraft:zombie"`)
* **`target_family`**: 特定のファミリーを指定 (例: `"undead"`)
* これらを指定した場合、`#kill_count` はそのフィルターに合致した数値を自動的に返します。

```javascript
// 例: ゾンビを30体以上倒している場合に習得
getconditions: [
    {
        type: "kill",
        target: "minecraft:zombie",
        operation: ">=",
        value: "#kill_count",
        value2: 30
    }
]
```
