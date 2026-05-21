# GiftWear → StyleMate 移植インベントリ

GiftWear (`~/FX/giftwear/`) の何を StyleMate に持ち込むかの全リスト。

---

## ✅ 移植する（コード単位）

### コア機能
| GiftWear 内パス | 機能 | 移植先（StyleMate） |
|---|---|---|
| `components/FacePhotoPicker.tsx` | マルチ写真選択 + 品質フィルタ | `src/components/` |
| `lib/image.ts` の `analyzeFacePhoto` | Laplacian variance ブラー検出 | `src/lib/image.ts` |
| `lib/blobStore.ts` | IndexedDB Blob ストア（顔写真保存用） | `src/lib/` |
| `lib/useBlobUrl.ts` | 画像ref → 表示URL 解決 hook | `src/lib/` |
| `app/api/tryon/route.ts` | IDM-VTON 試着 API | `app/api/tryon/` |
| `lib/affiliate.ts` | 楽天/Amazon/ZOZO/SHEIN URL生成 | `src/lib/affiliate.ts` |
| `components/ShareSheet.tsx` | iOS風シェアシート + UTM tracking | `src/components/` |
| `app/opengraph-image.tsx` | 動的 OG 画像生成 | `app/opengraph-image.tsx` |
| `components/ErrorScreen.tsx` | カテゴリ別エラー UI + 自動リトライ | `src/components/` |
| `lib/quota.ts` | クォータ管理（**Supabase化して再実装**） | `src/lib/quota.ts` |
| `app/terms/page.tsx` | 利用規約（**内容を統合版に更新**） | `app/terms/page.tsx` |
| `app/privacy/page.tsx` | プライバシーポリシー（**統合版に更新**） | `app/privacy/page.tsx` |
| `components/WheelDatePicker.tsx` | iOS風ホイール日付ピッカー | `src/components/` |
| `components/PhotoSourceSheet.tsx` | カメラ/ギャラリー選択シート | `src/components/` |

### データ型
| GiftWear | StyleMate での扱い |
|---|---|
| `Friend` 型 | tomson の `profiles` テーブルと統合（friend = profile の友人版） |
| `ClothingItem` 型 | tomson の `clothes` テーブルに既存（型は再利用） |
| `TryonResult` 型 | 新規 `tryons` テーブル作成 |
| `DanceVideo` 型 | **移植しない**（ダンス機能除外） |

### API
| GiftWear API | StyleMate 移植 |
|---|---|
| `/api/tryon` (IDM-VTON) | そのまま移植 |
| `/api/face-swap` (roop) | **凍結**（ダンス機能なので不要） |
| `/api/dance` (seedance) | **凍結** |

### 将来追加予定（GiftWear で未実装）
| 機能 | StyleMate でやる |
|---|---|
| LoRA 訓練 (`flux-dev-lora-trainer`) | Phase 5 で実装 |
| LoRA 推論 (`flux-dev-lora`) | Phase 5 で実装 |
| 360° VR (`stability-ai/sv3d`) | Phase 9 で実装 |

---

## ❌ 移植しない

### ダンス関連（凍結）
- `app/api/dance/route.ts`
- `app/api/face-swap/route.ts`
- `app/dance/[tryonId]/generate/page.tsx`
- `app/dance/[tryonId]/select/page.tsx`
- `components/DanceVideoPlayer.tsx`
- `components/DanceVideoModal.tsx`
- `lib/dance.ts`

→ GiftWear リポは archive で残るので、将来必要になったら参照可能。

### tomson 側の古い残骸（削除予定）
- `docs/design.md`（予測市場アプリ用）
- `docs/strategy-review.md`（予測市場アプリ用）
- `scripts/generate-questions.js`（予測市場用質問生成）
- `README.md` の旧予測市場関連記述
- `src/lib/claude.ts` の旧コメント（使われていなければ）

---

## 🔄 統合再設計が必要なもの

### Friend / Profile データモデル
GiftWear の `Friend` 型と tomson の `profiles` テーブルを統合：
- `profiles` = ユーザー本人
- 新規テーブル `friends` を作る：profile の所有する「試着対象人物」リスト

```sql
CREATE TABLE friends (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  height INTEGER,
  body_type TEXT,
  gender TEXT,
  birthday DATE,
  relationship TEXT,
  is_me BOOLEAN DEFAULT false,
  lora_url TEXT,        -- 訓練済み LoRA の Replicate URL
  lora_status TEXT,     -- pending / training / ready / failed
  face_photo_count INTEGER DEFAULT 0,  -- 端末側の枚数だけ記録
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Clothing データモデル
tomson の `clothes` を拡張：
- 既存カラム維持
- `owner_friend_id`（誰の服か：自分 or 友人）を追加検討

### Tryon データモデル
新規：
```sql
CREATE TABLE tryons (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  friend_id UUID REFERENCES friends(id),
  clothing_id UUID REFERENCES clothes(id),
  result_url TEXT,       -- Supabase Storage URL
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### クォータシステム
GiftWear は localStorage ベース → Supabase テーブル化：
```sql
CREATE TABLE quotas (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  tryon_used_today INTEGER DEFAULT 0,
  lora_used_this_month INTEGER DEFAULT 0,
  vr_used_today INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ
);
```

---

## 📝 統合版で書き直すもの

- **利用規約**：tomson + GiftWear 両方の利用規約を統合
- **プライバシーポリシー**：Supabase 利用・顔写真扱い・LoRA訓練を明記
- **README**：StyleMate としての設計・セットアップ手順
- **オンボーディング**：tomson + GiftWear の両方の体験を案内するチュートリアル
