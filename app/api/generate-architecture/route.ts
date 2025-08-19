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
  architecture_type: 'web' | 'cloud' | 'hybrid' | 'on_premise';
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
      preferredArchitectureType?: 'web' | 'cloud' | 'hybrid' | 'on_premise';
    };

    const systemPrompt = `
あなたはシステムアーキテクトです。提供された要件から最適なシステム構成を設計し、JSONで返してください。

${preferredArchitectureType ? `
優先アーキテクチャタイプ: ${preferredArchitectureType}
- web: ブラウザベースのWebアプリケーション
- cloud: クラウドネイティブなスケーラブルシステム  
- hybrid: クラウドとオンプレミスの組み合わせ
- on_premise: オンプレミス環境での運用

このタイプを最優先に考慮して設計してください。
` : ''}

以下の構造で返してください：
{
  "architecture_type": "web|cloud|hybrid|on_premise",
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

重要：architecture_typeフィールドには${preferredArchitectureType ? `「${preferredArchitectureType}」を設定` : 'web、cloud、hybrid、on_premiseのいずれかを適切に選択'}してください。

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
