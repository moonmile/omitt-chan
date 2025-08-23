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

interface ValidationResult {
  overall_status: 'good' | 'warning' | 'critical';
  missing_requirements: string[];
  contradictions: string[];
  unclear_requirements: string[];
  recommendations: string[];
  completeness_score: number;
  critical_questions: {
    system_type_missing: boolean;
    personal_data_missing: boolean;
    user_scope_missing: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { requirements } = await request.json() as { requirements: StructuredRequirements };

    const systemPrompt = `
あなたは要件分析の専門家です。提供された構造化要件を分析し、以下の観点で検証してJSONで返してください。
ユーザーは非IT技術者のため、専門用語をできるだけ避けて、わかりやすい日本語で説明してください。
ただし、ユーザーが入力した専門用語や固有名詞はそのまま使用してください。

検証観点：
1. 不足している要件の特定 - システムを作るために必要な要素が足りているか
2. 矛盾している要件の検出 - 互いに相反する要件がないか
3. 曖昧・不明確な要件の指摘 - より具体的にした方が良い要件はないか
4. 改善推奨事項の提案 - より良いシステムにするためのアドバイス
5. 完成度の評価（0-100点） - 現在の要件でシステム開発が可能な程度

以下の構造で返してください：
{
  "overall_status": "good|warning|critical",
  "missing_requirements": ["不足要件1", "不足要件2"],
  "contradictions": ["矛盾点1", "矛盾点2"],
  "unclear_requirements": ["曖昧な要件1", "曖昧な要件2"],
  "recommendations": ["推奨事項1", "推奨事項2"],
  "completeness_score": 85,
  "critical_questions": {
    "system_type_missing": true,
    "personal_data_missing": false,
    "user_scope_missing": true
  }
}

critical_questionsの判定基準：
- system_type_missing: 新規開発か既存システムの移行・改修かが明記されていない場合はtrue
- personal_data_missing: 個人情報を扱うかどうかが明記されていない場合はtrue
- user_scope_missing: 利用者の範囲（特定少数/特定多数/不特定多数）が明記されていない場合はtrue

重要な確認項目（専門用語を避けた表現で指摘）：
- システムが新規作成か移行・改修かの明確化
- システムが個人情報を扱うかどうかの確認
- システムの利用者の範囲（特定の少数、特定の多数、不特定の多数）
- セキュリティ対策の要件（個人情報保護、不正アクセス防止など）
- 性能に関する具体的な数値（同時利用者数、応答速度など）
- 必要な機能の網羅性（ユーザーがやりたいことが全て含まれているか）
- システム間の整合性（矛盾する動作の指定がないか）
- 実現可能性（技術的・予算的に無理のない要求か）
- 使いやすさの要件（操作性、画面の見やすさなど）
- 運用・保守の要件（システム管理、バックアップ、障害対応など）
- データの要件（どんな情報を扱うか、データの形式など）
- 他システムとの連携要件（既存システムとの接続など）
- 法的要件・規制対応（業界ルール、法律への対応など）

overall_status判定基準：
- good: 80点以上、重大な問題なし
- warning: 60-79点、軽微な問題あり
- critical: 60点未満、重大な問題あり

回答は非技術者にもわかりやすく、具体的で実用的なアドバイスを心がけてください。
`;

    const requirementsText = `
機能要件（${requirements.functional_requirements.length}件）：
${requirements.functional_requirements.map(req => `- ${req.title}: ${req.description} [優先度: ${req.priority || '未設定'}]`).join('\n')}

非機能要件（${requirements.non_functional_requirements.length}件）：
${requirements.non_functional_requirements.map(req => `- ${req.title}: ${req.description} [優先度: ${req.priority || '未設定'}]`).join('\n')}

制約条件（${requirements.constraints.length}件）：
${requirements.constraints.map(req => `- ${req.title}: ${req.description}`).join('\n')}

希望・要望（${requirements.wishes.length}件）：
${requirements.wishes.map(req => `- ${req.title}: ${req.description}`).join('\n')}

設計指針（${requirements.design_guidelines.length}件）：
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
          content: `以下の構造化要件を検証してください：\n\n${requirementsText}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0].message.content;
    
    if (!result) {
      throw new Error('OpenAI API returned empty response');
    }

    const validation = JSON.parse(result) as ValidationResult;

    // チャット用のメッセージを生成
    const chatMessage = generateChatMessage(validation);

    return NextResponse.json({
      success: true,
      validation: validation,
      chatMessage: chatMessage
    });

  } catch (error) {
    console.error('Error validating requirements:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '要件検証中にエラーが発生しました。',
        chatMessage: '申し訳ありません。要件の検証中にエラーが発生しました。もう一度お試しください。'
      },
      { status: 500 }
    );
  }
}

function generateChatMessage(validation: ValidationResult): string {
  const statusEmoji = {
    good: '✅',
    warning: '⚠️',
    critical: '❌'
  };

  const statusText = {
    good: '良好',
    warning: '注意が必要',
    critical: '重要な問題あり'
  };

  let message = `📋 **要件の確認結果**\n\n`;
  message += `${statusEmoji[validation.overall_status]} **総合評価**: ${statusText[validation.overall_status]} (${validation.completeness_score}点/100点)\n`;
  
  // 50点以上で合格判定を追加
  if (validation.completeness_score >= 50) {
    message += `🎉 **判定: 合格** - 見積もり・開発検討に進むことができます\n\n`;
  } else {
    message += `📝 **判定: 要検討** - もう少し要件を整理してから進めることをお勧めします\n\n`;
  }

  // クリティカルな質問の確認
  const criticalQuestions = validation.critical_questions;
  const hasCriticalQuestions = criticalQuestions.system_type_missing || 
                              criticalQuestions.personal_data_missing || 
                              criticalQuestions.user_scope_missing;

  if (hasCriticalQuestions) {
    message += `❓ **重要な確認事項** - 以下について教えてください：\n`;
    
    if (criticalQuestions.system_type_missing) {
      message += `• このシステムは **新規作成** ですか？それとも **既存システムの移行・改修** ですか？\n`;
    }
    
    if (criticalQuestions.personal_data_missing) {
      message += `• このシステムは **個人情報を扱います** か？（氏名、メールアドレス、電話番号など）\n`;
    }
    
    if (criticalQuestions.user_scope_missing) {
      message += `• システムの利用者はどの範囲ですか？\n`;
      message += `  - **特定の少数**（社内の特定部署など）\n`;
      message += `  - **特定の多数**（全社員、会員など）\n`;
      message += `  - **不特定の多数**（一般の方々）\n`;
    }
    
    message += `\n`;
  }

  if (validation.missing_requirements.length > 0) {
    message += `🔍 **追加で検討が必要な項目:**\n`;
    validation.missing_requirements.forEach(req => {
      message += `• ${req}\n`;
    });
    message += `\n`;
  }

  if (validation.contradictions.length > 0) {
    message += `⚡ **矛盾する内容:**\n`;
    validation.contradictions.forEach(contradiction => {
      message += `• ${contradiction}\n`;
    });
    message += `\n`;
  }

  if (validation.unclear_requirements.length > 0) {
    message += `❓ **より詳しく決めた方が良い内容:**\n`;
    validation.unclear_requirements.forEach(unclear => {
      message += `• ${unclear}\n`;
    });
    message += `\n`;
  }

  if (validation.recommendations.length > 0) {
    message += `💡 **より良いシステムにするためのご提案:**\n`;
    validation.recommendations.forEach(rec => {
      message += `• ${rec}\n`;
    });
    message += `\n`;
  }

  if (validation.completeness_score >= 50) {
    if (validation.overall_status === 'good') {
      message += `👍 要件がよく整理されています。このまま見積もり・開発の検討を進めることができそうです。`;
    } else if (validation.overall_status === 'warning') {
      message += `🔧 いくつか改善できる点がありますが、対応していただければ見積もり・開発を進められます。`;
    } else {
      message += `⚠️ 一部に重要な確認事項がありますが、基本的な要件は整っています。見積もり検討を進めつつ、詳細を調整していきましょう。`;
    }
  } else {
    message += `🚨 重要な確認事項が多くあります。見積もりの精度を上げるため、これらの内容を整理していただくことをお勧めします。`;
  }

  return message;
}
