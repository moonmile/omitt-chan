import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RequirementItem {
  id: string;
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  type?: string;
}

interface StructuredRequirements {
  functional_requirements: RequirementItem[];
  non_functional_requirements: RequirementItem[];
  constraints: RequirementItem[];
  wishes: RequirementItem[];
  design_guidelines: RequirementItem[];
}

interface SystemComponent {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'security' | 'integration';
  description: string;
  technologies: string[];
  justification: string;
}

interface SystemArchitecture {
  architecture_type: 'web' | 'cloud' | 'hybrid' | 'on_premise' | 'embedded' | 'mobile_app' | 'game' | 'other';
  deployment_environment: 'cloud' | 'on_premise' | 'hybrid';
  components: SystemComponent[];
  network_requirements: string[];
  security_measures: string[];
  scalability_considerations: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { requirements, preferredArchitectureType } = await request.json() as { 
      requirements: StructuredRequirements;
      preferredArchitectureType?: 'web' | 'cloud' | 'hybrid' | 'on_premise' | 'embedded' | 'mobile_app' | 'game' | 'other';
    };

    const systemPrompt = `
あなたはシステムアーキテクトです。提供された要件から最適なシステム構成を設計し、JSONで返してください。

${preferredArchitectureType ? `
優先アーキテクチャタイプ: ${preferredArchitectureType}
- web: ブラウザベースのWebアプリケーション
- mobile_app: iOS/Androidスマートフォンアプリケーション
- game: ゲーム開発に特化したアーキテクチャ（モバイル/PC/コンソール）
- cloud: クラウドネイティブなスケーラブルシステム  
- hybrid: クラウドとオンプレミスの組み合わせ
- on_premise: オンプレミス環境での運用
- embedded: ハードウェア組み込み型リアルタイムシステム
- other: 上記に当てはまらない特殊なシステム構成

このタイプを最優先に考慮して設計してください。
` : ''}

以下の構造で返してください：
{
  "architecture_type": "web|cloud|hybrid|on_premise|embedded|mobile_app|game|other",
  "deployment_environment": "cloud|on_premise|hybrid", 
  "components": [
    {
      "id": "unique_id",
      "name": "コンポーネント名",
      "type": "frontend|backend|database|infrastructure|security|integration",
      "description": "詳細説明",
      "technologies": ["技術名1", "技術名2"],
      "justification": "選択理由"
    }
  ],
  "network_requirements": ["ネットワーク要件1", "ネットワーク要件2"],
  "security_measures": ["セキュリティ対策1", "セキュリティ対策2"],
  "scalability_considerations": ["スケーラビリティ考慮事項1", "スケーラビリティ考慮事項2"]
}

要件分析のポイント：
1. 機能要件からフロントエンド・バックエンド・データベースの必要性を判断
2. 非機能要件から性能・セキュリティ・可用性要件を分析
3. 制約条件から技術選択肢やデプロイメント環境を制限
4. 希望・要望から優先技術や方向性を判断
5. 設計指針からアーキテクチャパターンを決定
${preferredArchitectureType ? `6. 優先アーキテクチャタイプ「${preferredArchitectureType}」に適したコンポーネント構成を選択` : ''}

重要：architecture_typeフィールドには${preferredArchitectureType ? `「${preferredArchitectureType}」を設定` : 'web、mobile_app、game、cloud、hybrid、on_premise、embedded、otherのいずれかを適切に選択'}してください。

${preferredArchitectureType === 'embedded' ? `
組み込みシステム特有の考慮事項：
- リアルタイム性能とレスポンス時間の要件
- メモリとストレージの制約
- 電力消費の最適化
- ハードウェアインターフェース（GPIO、センサー、アクチュエータ）
- 組み込みOS（RTOS、Linux等）の選択
- デバイスドライバーとファームウェア
- セキュリティ（物理セキュリティ、暗号化）
- 遠隔アップデート機能
- 障害処理とフェイルセーフ機構
` : ''}

${preferredArchitectureType === 'mobile_app' ? `
スマートフォンアプリ特有の考慮事項：
- iOS/Androidのネイティブ開発 vs クロスプラットフォーム開発
- アプリストア配布とレビュープロセス
- モバイルデバイスの性能とバッテリー消費
- タッチインターフェースとユーザビリティ
- オフライン機能とデータ同期
- プッシュ通知システム
- モバイル特有のセキュリティ（生体認証、デバイス暗号化）
- 多様な画面サイズへの対応
- ネットワーク接続の不安定性への対処
` : ''}

${preferredArchitectureType === 'game' ? `
ゲーム開発特有の考慮事項：
- ターゲットプラットフォーム（PC、モバイル、コンソール）
- ゲームエンジンの選択（Unity、Unreal Engine、自作エンジン）
- リアルタイム描画とパフォーマンス最適化
- マルチプレイヤー機能とネットワーク同期
- ゲーム進行データの管理と保存
- アセット管理（3Dモデル、テクスチャ、音声）
- 物理演算とコリジョン検出
- AI（敵キャラクター、NPC）の実装
- 課金システムとゲーム内購入
- 不正行為対策とセキュリティ
` : ''}

${preferredArchitectureType === 'other' ? `
その他のシステム特有の考慮事項：
- 要件から特殊な用途やニーズを分析
- 既存システムとの連携や制約
- 特別な技術要件や規制要件
- カスタム仕様や独自プロトコル
- 特殊なハードウェア要件
- 業界固有の標準やガイドライン
- パフォーマンス、セキュリティ、可用性の特別な要求
- 将来の拡張性や移行性の考慮
` : ''}

現代的な技術スタックを推奨し、運用保守性・拡張性を考慮してください。
`;

    const requirementsText = `
機能要件：
${requirements.functional_requirements.map(req => `- ${req.title}: ${req.description}`).join('\n')}

非機能要件：
${requirements.non_functional_requirements.map(req => `- ${req.title}: ${req.description}`).join('\n')}

制約条件：
${requirements.constraints.map(req => `- ${req.title}: ${req.description}`).join('\n')}

希望・要望：
${requirements.wishes.map(req => `- ${req.title}: ${req.description}`).join('\n')}

設計指針：
${requirements.design_guidelines.map(req => `- ${req.title}: ${req.description}`).join('\n')}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `以下の要件からシステム構成を設計してください：\n\n${requirementsText}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0].message.content;
    
    if (!result) {
      throw new Error('OpenAI API returned empty response');
    }

    const systemArchitecture = JSON.parse(result) as SystemArchitecture;

    return NextResponse.json({
      success: true,
      architecture: systemArchitecture
    });

  } catch (error) {
    console.error('Error generating system architecture:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'システム構成の生成中にエラーが発生しました。'
      },
      { status: 500 }
    );
  }
}
