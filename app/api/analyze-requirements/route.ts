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

interface ExtractedRequirements {
  functional_requirements: RequirementItem[];
  non_functional_requirements: RequirementItem[];
  constraints: RequirementItem[];
  wishes: RequirementItem[];
  design_guidelines: RequirementItem[];
}

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    const systemPrompt = `
あなたは要件分析の専門家です。発注者（非IT技術者）からの自然言語の入力を分析し、以下の構造に分類してJSONで返してください。

分類カテゴリ：
1. 機能要件 (functional_requirements)
2. 非機能要件 (non_functional_requirements) 
3. 制約条件 (constraints)
4. 希望・要望 (wishes)
5. 設計指針 (design_guidelines)

各項目は以下の形式で返してください：
{
  "functional_requirements": [
    {
      "id": "unique_id",
      "title": "機能名",
      "description": "詳細説明",
      "priority": "high|medium|low",
      "category": "認証|データ管理|UI/UX|API|その他"
    }
  ],
  "non_functional_requirements": [
    {
      "id": "unique_id", 
      "title": "非機能要件名",
      "description": "詳細説明",
      "priority": "high|medium|low",
      "category": "性能|セキュリティ|可用性|保守性|その他"
    }
  ],
  "constraints": [
    {
      "id": "unique_id",
      "title": "制約名", 
      "description": "詳細説明",
      "type": "技術的制約|予算制約|期間制約|その他"
    }
  ],
  "wishes": [
    {
      "id": "unique_id",
      "title": "希望事項",
      "description": "詳細説明"
    }
  ],
  "design_guidelines": [
    {
      "id": "unique_id",
      "title": "設計指針",
      "description": "詳細説明"
    }
  ]
}

既存の要件コンテキスト：
${JSON.stringify(context, null, 2)}

新しい入力内容を分析して、追加すべき要件があれば抽出してください。
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
          content: `発注者の入力: ${message}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0].message.content;
    
    if (!result) {
      throw new Error('OpenAI API returned empty response');
    }

    const extractedRequirements = JSON.parse(result);

    return NextResponse.json({
      success: true,
      requirements: extractedRequirements,
      assistantResponse: generateAssistantResponse(extractedRequirements)
    });

  } catch (error) {
    console.error('Error analyzing requirements:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '要件の分析中にエラーが発生しました。',
        assistantResponse: '申し訳ありません。要件の分析中にエラーが発生しました。もう一度お試しください。'
      },
      { status: 500 }
    );
  }
}

function generateAssistantResponse(requirements: ExtractedRequirements): string {
  const totalItems = Object.values(requirements).reduce((sum: number, items: RequirementItem[]) => 
    sum + (Array.isArray(items) ? items.length : 0), 0);
  
  if (totalItems === 0) {
    return 'ご入力いただいた内容から具体的な要件を抽出できませんでした。もう少し詳しく教えていただけますか？';
  }

  const responses = [
    `${totalItems}個の要件を抽出しました。`,
    '他にもご希望の機能や要件はありますか？',
    '詳細について確認したい点があれば、お気軽にお聞かせください。'
  ];

  return responses.join(' ');
}
